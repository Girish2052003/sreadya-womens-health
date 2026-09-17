package com.sreva.health.sreva

import android.os.Build
import androidx.credentials.CreatePublicKeyCredentialRequest
import androidx.credentials.CreatePublicKeyCredentialResponse
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetPublicKeyCredentialOption
import androidx.credentials.PublicKeyCredential
import io.flutter.embedding.android.FlutterFragmentActivity
import io.flutter.plugin.common.BinaryMessenger
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class SrevaCredentialBridge(
    private val activity: FlutterFragmentActivity,
    messenger: BinaryMessenger,
) {
    private val channel = MethodChannel(messenger, "sreva/account")
    private val credentialManager = CredentialManager.create(activity)
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    fun register() {
        channel.setMethodCallHandler(::handle)
    }

    private fun handle(call: MethodCall, result: MethodChannel.Result) {
        when (call.method) {
            "passkey.isAvailable" -> result.success(Build.VERSION.SDK_INT >= Build.VERSION_CODES.P)
            "passkey.create" -> createPasskey(call, result)
            "passkey.get" -> getPasskey(call, result)
            else -> result.notImplemented()
        }
    }

    private fun requestJson(call: MethodCall, result: MethodChannel.Result): String? {
        val value = call.argument<String>("requestJson")
        if (value.isNullOrBlank()) {
            result.error("bad_args", "Missing WebAuthn request JSON", null)
            return null
        }
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) {
            result.error("passkey_unavailable", "Passkeys require Android 9 or later", null)
            return null
        }
        return value
    }

    private fun createPasskey(call: MethodCall, result: MethodChannel.Result) {
        val requestJson = requestJson(call, result) ?: return
        scope.launch {
            try {
                val response = credentialManager.createCredential(
                    activity,
                    CreatePublicKeyCredentialRequest(requestJson = requestJson),
                )
                val publicKey = response as? CreatePublicKeyCredentialResponse
                    ?: throw IllegalStateException("Credential provider returned an unexpected response")
                result.success(publicKey.registrationResponseJson)
            } catch (error: Throwable) {
                result.error("passkey_create_failed", error.message ?: "Passkey creation failed", null)
            }
        }
    }

    private fun getPasskey(call: MethodCall, result: MethodChannel.Result) {
        val requestJson = requestJson(call, result) ?: return
        scope.launch {
            try {
                val response = credentialManager.getCredential(
                    activity,
                    GetCredentialRequest(
                        credentialOptions = listOf(
                            GetPublicKeyCredentialOption(requestJson = requestJson),
                        ),
                    ),
                )
                val publicKey = response.credential as? PublicKeyCredential
                    ?: throw IllegalStateException("Credential provider returned an unexpected credential")
                result.success(publicKey.authenticationResponseJson)
            } catch (error: Throwable) {
                result.error("passkey_get_failed", error.message ?: "Passkey sign-in failed", null)
            }
        }
    }
}
