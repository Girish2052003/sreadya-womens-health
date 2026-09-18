import AuthenticationServices
import Flutter
import UIKit

final class SreadyaCredentialBridge: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    static var shared: SreadyaCredentialBridge?

    private let channel: FlutterMethodChannel
    private var pendingResult: FlutterResult?

    private init(messenger: FlutterBinaryMessenger) {
        channel = FlutterMethodChannel(name: "sreadya/account", binaryMessenger: messenger)
        super.init()
        channel.setMethodCallHandler { [weak self] call, result in
            self?.handle(call, result: result)
        }
    }

    static func register(messenger: FlutterBinaryMessenger) {
        shared = SreadyaCredentialBridge(messenger: messenger)
    }

    private func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
        switch call.method {
        case "passkey.isAvailable":
            result(true)
        case "passkey.create":
            beginCreate(call, result: result)
        case "passkey.get":
            beginGet(call, result: result)
        default:
            result(FlutterMethodNotImplemented)
        }
    }

    private func requestOptions(_ call: FlutterMethodCall) throws -> [String: Any] {
        guard let args = call.arguments as? [String: Any],
              let requestJSON = args["requestJson"] as? String,
              let data = requestJSON.data(using: .utf8),
              let decoded = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw CredentialBridgeError.invalidRequest
        }
        if let publicKey = decoded["publicKey"] as? [String: Any] { return publicKey }
        return decoded
    }

    private func beginCreate(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
        guard pendingResult == nil else {
            result(FlutterError(code: "passkey_busy", message: "Another passkey ceremony is active", details: nil)); return
        }
        do {
            let options = try requestOptions(call)
            guard let rp = options["rp"] as? [String: Any],
                  let rpID = rp["id"] as? String,
                  let user = options["user"] as? [String: Any],
                  let userName = user["name"] as? String,
                  let userIDText = user["id"] as? String,
                  let challengeText = options["challenge"] as? String,
                  let userID = base64URLDecode(userIDText),
                  let challenge = base64URLDecode(challengeText) else {
                throw CredentialBridgeError.invalidRequest
            }
            let provider = ASAuthorizationPlatformPublicKeyCredentialProvider(relyingPartyIdentifier: rpID)
            let request = provider.createCredentialRegistrationRequest(
                challenge: challenge,
                name: userName,
                userID: userID
            )
            if #available(iOS 17.4, *),
               let excluded = options["excludeCredentials"] as? [[String: Any]] {
                request.excludedCredentials = excluded.compactMap { descriptor in
                    guard let id = descriptor["id"] as? String,
                          let bytes = base64URLDecode(id) else { return nil }
                    return ASAuthorizationPlatformPublicKeyCredentialDescriptor(credentialID: bytes)
                }
            }
            pendingResult = result
            perform(request)
        } catch {
            finishWithError(code: "passkey_create_failed", error: error, fallback: result)
        }
    }

    private func beginGet(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
        guard pendingResult == nil else {
            result(FlutterError(code: "passkey_busy", message: "Another passkey ceremony is active", details: nil)); return
        }
        do {
            let options = try requestOptions(call)
            guard let rpID = options["rpId"] as? String,
                  let challengeText = options["challenge"] as? String,
                  let challenge = base64URLDecode(challengeText) else {
                throw CredentialBridgeError.invalidRequest
            }
            let provider = ASAuthorizationPlatformPublicKeyCredentialProvider(relyingPartyIdentifier: rpID)
            let request = provider.createCredentialAssertionRequest(challenge: challenge)
            if let allowed = options["allowCredentials"] as? [[String: Any]] {
                request.allowedCredentials = allowed.compactMap { descriptor in
                    guard let id = descriptor["id"] as? String,
                          let bytes = base64URLDecode(id) else { return nil }
                    return ASAuthorizationPlatformPublicKeyCredentialDescriptor(credentialID: bytes)
                }
            }
            pendingResult = result
            perform(request)
        } catch {
            finishWithError(code: "passkey_get_failed", error: error, fallback: result)
        }
    }

    private func perform(_ request: ASAuthorizationRequest) {
        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = self
        controller.presentationContextProvider = self
        controller.performRequests()
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        do {
            let object: [String: Any]
            if let registration = authorization.credential as? ASAuthorizationPlatformPublicKeyCredentialRegistration {
                var response: [String: Any] = [
                    "clientDataJSON": base64URLEncode(registration.rawClientDataJSON),
                ]
                if let attestation = registration.rawAttestationObject {
                    response["attestationObject"] = base64URLEncode(attestation)
                }
                let credentialID = base64URLEncode(registration.credentialID)
                object = [
                    "id": credentialID,
                    "rawId": credentialID,
                    "type": "public-key",
                    "response": response,
                    "clientExtensionResults": [:],
                    "authenticatorAttachment": "platform",
                ]
            } else if let assertion = authorization.credential as? ASAuthorizationPlatformPublicKeyCredentialAssertion {
                let credentialID = base64URLEncode(assertion.credentialID)
                object = [
                    "id": credentialID,
                    "rawId": credentialID,
                    "type": "public-key",
                    "response": [
                        "clientDataJSON": base64URLEncode(assertion.rawClientDataJSON),
                        "authenticatorData": base64URLEncode(assertion.rawAuthenticatorData),
                        "signature": base64URLEncode(assertion.signature),
                        "userHandle": base64URLEncode(assertion.userID),
                    ],
                    "clientExtensionResults": [:],
                    "authenticatorAttachment": "platform",
                ]
            } else {
                throw CredentialBridgeError.unsupportedCredential
            }
            let data = try JSONSerialization.data(withJSONObject: object)
            guard let json = String(data: data, encoding: .utf8) else {
                throw CredentialBridgeError.invalidResponse
            }
            let callback = pendingResult
            pendingResult = nil
            callback?(json)
        } catch {
            finishWithError(code: "passkey_response_failed", error: error)
        }
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        finishWithError(code: "passkey_authorization_failed", error: error)
    }

    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        let windows = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
        return windows.first { $0.isKeyWindow } ?? UIWindow()
    }

    private func finishWithError(code: String, error: Error, fallback: FlutterResult? = nil) {
        let callback = pendingResult ?? fallback
        pendingResult = nil
        callback?(FlutterError(code: code, message: error.localizedDescription, details: nil))
    }

    private func base64URLDecode(_ value: String) -> Data? {
        var standard = value.replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        standard += String(repeating: "=", count: (4 - standard.count % 4) % 4)
        return Data(base64Encoded: standard)
    }

    private func base64URLEncode(_ value: Data) -> String {
        value.base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
}

private enum CredentialBridgeError: LocalizedError {
    case invalidRequest
    case invalidResponse
    case unsupportedCredential

    var errorDescription: String? {
        switch self {
        case .invalidRequest: return "Invalid WebAuthn passkey options"
        case .invalidResponse: return "Invalid passkey response"
        case .unsupportedCredential: return "Unsupported passkey credential type"
        }
    }
}
