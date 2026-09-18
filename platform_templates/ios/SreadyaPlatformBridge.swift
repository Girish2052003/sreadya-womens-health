import AVFoundation
import Flutter
import HealthKit
import Speech
import UIKit
import UserNotifications

final class SreadyaPlatformBridge: NSObject, UNUserNotificationCenterDelegate {
    static var shared: SreadyaPlatformBridge?

    private let privacyChannel: FlutterMethodChannel
    private let reminderChannel: FlutterMethodChannel
    private let healthChannel: FlutterMethodChannel
    private let voiceChannel: FlutterMethodChannel
    private let healthStore = HKHealthStore()
    private var protectSensitivePreview = true
    private var blurView: UIVisualEffectView?

    private let audioEngine = AVAudioEngine()
    private var recognitionTask: SFSpeechRecognitionTask?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var voiceResult: FlutterResult?

    private init(controller: FlutterViewController) {
        privacyChannel = FlutterMethodChannel(name: "sreadya/privacy", binaryMessenger: controller.binaryMessenger)
        reminderChannel = FlutterMethodChannel(name: "sreadya/reminders", binaryMessenger: controller.binaryMessenger)
        healthChannel = FlutterMethodChannel(name: "sreadya/health", binaryMessenger: controller.binaryMessenger)
        voiceChannel = FlutterMethodChannel(name: "sreadya/voice", binaryMessenger: controller.binaryMessenger)
        super.init()
        installChannels()
        installPrivacyObservers()
        installNotificationActions()
    }

    static func register(with controller: FlutterViewController) {
        let bridge = SreadyaPlatformBridge(controller: controller)
        shared = bridge
        UNUserNotificationCenter.current().delegate = bridge
    }

    private func installChannels() {
        privacyChannel.setMethodCallHandler { [weak self] call, result in
            self?.handlePrivacy(call, result: result)
        }
        reminderChannel.setMethodCallHandler { [weak self] call, result in
            self?.handleReminder(call, result: result)
        }
        healthChannel.setMethodCallHandler { [weak self] call, result in
            self?.handleHealth(call, result: result)
        }
        voiceChannel.setMethodCallHandler { [weak self] call, result in
            self?.handleVoice(call, result: result)
        }
    }

    // MARK: - Privacy

    private func handlePrivacy(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
        switch call.method {
        case "excludeFromBackup":
            guard let args = call.arguments as? [String: Any], let path = args["path"] as? String else {
                result(FlutterError(code: "bad_args", message: "Missing path", details: nil)); return
            }
            do {
                var url = URL(fileURLWithPath: path)
                var values = URLResourceValues()
                values.isExcludedFromBackup = true
                try url.setResourceValues(values)
                result(nil)
            } catch {
                result(FlutterError(code: "backup_exclusion_failed", message: error.localizedDescription, details: nil))
            }
        case "setSensitiveScreen":
            let args = call.arguments as? [String: Any]
            protectSensitivePreview = args?["enabled"] as? Bool ?? true
            if !protectSensitivePreview { removeBlur() }
            result(nil)
        default:
            result(FlutterMethodNotImplemented)
        }
    }

    private func installPrivacyObservers() {
        NotificationCenter.default.addObserver(self, selector: #selector(addBlur), name: UIApplication.willResignActiveNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(removeBlur), name: UIApplication.didBecomeActiveNotification, object: nil)
    }

    private func activeWindow() -> UIWindow? {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
            .first { $0.isKeyWindow }
    }

    @objc private func addBlur() {
        guard protectSensitivePreview, blurView == nil, let window = activeWindow() else { return }
        let blur = UIVisualEffectView(effect: UIBlurEffect(style: .systemMaterial))
        blur.frame = window.bounds
        blur.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        window.addSubview(blur)
        blurView = blur
    }

    @objc private func removeBlur() {
        blurView?.removeFromSuperview()
        blurView = nil
    }

    // MARK: - Reminders

    private func installNotificationActions() {
        let started = UNNotificationAction(identifier: "SREADYA_PERIOD_STARTED", title: "Period started", options: [.foreground])
        let snooze = UNNotificationAction(identifier: "SREADYA_SNOOZE", title: "Snooze 2 hours", options: [])
        let category = UNNotificationCategory(identifier: "SREADYA_PERIOD", actions: [started, snooze], intentIdentifiers: [], options: [])
        UNUserNotificationCenter.current().setNotificationCategories([category])
    }

    private func handleReminder(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
        let center = UNUserNotificationCenter.current()
        switch call.method {
        case "permissionStatus":
            center.getNotificationSettings { settings in
                let allowed: Bool
                switch settings.authorizationStatus {
                case .authorized, .provisional, .ephemeral: allowed = true
                default: allowed = false
                }
                DispatchQueue.main.async {
                    result(["allowed": allowed, "description": String(describing: settings.authorizationStatus)])
                }
            }
        case "requestPermission":
            center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
                DispatchQueue.main.async { result(granted) }
            }
        case "schedule":
            guard let args = call.arguments as? [String: Any],
                  let id = args["id"] as? String,
                  let millis = args["timestampMillis"] as? NSNumber,
                  let title = args["title"] as? String,
                  let body = args["body"] as? String else {
                result(FlutterError(code: "bad_args", message: "Invalid reminder", details: nil)); return
            }
            let repeatDaily = args["repeatDaily"] as? Bool ?? false
            let date = Date(timeIntervalSince1970: millis.doubleValue / 1000.0)
            let content = UNMutableNotificationContent()
            content.title = title
            content.body = body
            content.sound = .default
            content.categoryIdentifier = "SREADYA_PERIOD"
            let components: DateComponents
            if repeatDaily {
                components = Calendar.current.dateComponents([.hour, .minute], from: date)
            } else {
                components = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: date)
            }
            let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: repeatDaily)
            center.add(UNNotificationRequest(identifier: id, content: content, trigger: trigger)) { error in
                DispatchQueue.main.async {
                    if let error = error {
                        result(FlutterError(code: "schedule_failed", message: error.localizedDescription, details: nil))
                    } else { result(nil) }
                }
            }
        case "cancel":
            guard let args = call.arguments as? [String: Any], let id = args["id"] as? String else {
                result(FlutterError(code: "bad_args", message: "Missing reminder id", details: nil)); return
            }
            center.removePendingNotificationRequests(withIdentifiers: [id])
            result(nil)
        case "pending":
            center.getPendingNotificationRequests { requests in
                let output: [[String: Any]] = requests.map { request in
                    var row: [String: Any] = ["id": request.identifier]
                    if let date = (request.trigger as? UNCalendarNotificationTrigger)?.nextTriggerDate() {
                        row["nextMillis"] = Int64(date.timeIntervalSince1970 * 1000)
                    }
                    return row
                }
                DispatchQueue.main.async { result(output) }
            }
        case "consumePendingAction":
            let defaults = UserDefaults.standard
            let value = defaults.string(forKey: "sreadya.pending.notification.action")
            defaults.removeObject(forKey: "sreadya.pending.notification.action")
            result(value)
        default:
            result(FlutterMethodNotImplemented)
        }
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .sound])
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        switch response.actionIdentifier {
        case "SREADYA_PERIOD_STARTED":
            UserDefaults.standard.set("periodStarted", forKey: "sreadya.pending.notification.action")
        case "SREADYA_SNOOZE":
            let content = UNMutableNotificationContent()
            content.title = "Sreadya"
            content.body = "You have a reminder."
            content.sound = .default
            content.categoryIdentifier = "SREADYA_PERIOD"
            let request = UNNotificationRequest(
                identifier: "sreadya-snooze-\(UUID().uuidString)",
                content: content,
                trigger: UNTimeIntervalNotificationTrigger(timeInterval: 2 * 60 * 60, repeats: false)
            )
            center.add(request)
        default: break
        }
        completionHandler()
    }

    // MARK: - HealthKit

    private func healthObjectType(for key: String) -> HKObjectType? {
        switch key {
        case "menstrualFlow": return HKObjectType.categoryType(forIdentifier: .menstrualFlow)
        case "intermenstrualBleeding": return HKObjectType.categoryType(forIdentifier: .intermenstrualBleeding)
        case "basalBodyTemperature": return HKObjectType.quantityType(forIdentifier: .basalBodyTemperature)
        case "cervicalMucus": return HKObjectType.categoryType(forIdentifier: .cervicalMucusQuality)
        case "ovulationTest": return HKObjectType.categoryType(forIdentifier: .ovulationTestResult)
        case "pregnancyTest": return HKObjectType.categoryType(forIdentifier: .pregnancyTestResult)
        case "sexualActivity": return HKObjectType.categoryType(forIdentifier: .sexualActivity)
        default: return nil
        }
    }

    private func healthShareType(for key: String) -> HKSampleType? {
        // Sexual activity is deliberately read-only in Sreadya V1. The user may
        // log it locally without granting any platform write permission.
        switch key {
        case "menstrualFlow": return HKObjectType.categoryType(forIdentifier: .menstrualFlow)
        case "intermenstrualBleeding": return HKObjectType.categoryType(forIdentifier: .intermenstrualBleeding)
        case "basalBodyTemperature": return HKObjectType.quantityType(forIdentifier: .basalBodyTemperature)
        case "cervicalMucus": return HKObjectType.categoryType(forIdentifier: .cervicalMucusQuality)
        case "ovulationTest": return HKObjectType.categoryType(forIdentifier: .ovulationTestResult)
        case "pregnancyTest": return HKObjectType.categoryType(forIdentifier: .pregnancyTestResult)
        default: return nil
        }
    }

    private func selectedHealthTypes(_ args: [String: Any]?) -> (read: Set<HKObjectType>, share: Set<HKSampleType>) {
        let categories = args?["categories"] as? [String] ?? []
        var read = Set<HKObjectType>()
        var share = Set<HKSampleType>()
        for key in categories {
            if let type = healthObjectType(for: key) { read.insert(type) }
            if let type = healthShareType(for: key) { share.insert(type) }
        }
        return (read, share)
    }

    private func handleHealth(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
        switch call.method {
        case "status":
            result([
                "available": HKHealthStore.isHealthDataAvailable(),
                // HealthKit intentionally does not reveal whether read access
                // was denied for an individual type. We therefore expose only
                // whether Sreadya has presented a permission choice before.
                "authorizationRequested": UserDefaults.standard.bool(forKey: "sreadya.health.authorization.requested"),
                "platformName": "Apple Health",
                "supportedCategories": ["menstrualFlow", "intermenstrualBleeding", "basalBodyTemperature", "cervicalMucus", "ovulationTest", "pregnancyTest", "sexualActivity"]
            ])
        case "requestAuthorization":
            guard HKHealthStore.isHealthDataAvailable(), let args = call.arguments as? [String: Any] else {
                result(false); return
            }
            let types = selectedHealthTypes(args)
            guard !types.read.isEmpty else { result(false); return }
            healthStore.requestAuthorization(toShare: types.share, read: types.read) { success, _ in
                if success { UserDefaults.standard.set(true, forKey: "sreadya.health.authorization.requested") }
                DispatchQueue.main.async { result(success) }
            }
        case "readHealthRecords":
            guard let args = call.arguments as? [String: Any],
                  let categories = args["categories"] as? [String],
                  let fromMillis = args["fromMillis"] as? NSNumber,
                  let toMillis = args["toMillis"] as? NSNumber else {
                result([]); return
            }
            let from = Date(timeIntervalSince1970: fromMillis.doubleValue / 1000.0)
            let to = Date(timeIntervalSince1970: toMillis.doubleValue / 1000.0)
            readHealthRows(categories: categories, from: from, to: to, result: result)
        case "writeHealthRecord":
            guard let args = call.arguments as? [String: Any],
                  let category = args["category"] as? String,
                  let millis = args["dateMillis"] as? NSNumber else {
                result(false); return
            }
            let date = Date(timeIntervalSince1970: millis.doubleValue / 1000.0)
            writeHealthRecord(category: category, date: date, args: args, result: result)
        default:
            result(FlutterMethodNotImplemented)
        }
    }

    private func readHealthRows(categories: [String], from: Date, to: Date, result: @escaping FlutterResult) {
        let predicate = HKQuery.predicateForSamples(withStart: from, end: to, options: [.strictStartDate])
        let group = DispatchGroup()
        let lock = NSLock()
        var rows: [[String: Any]] = []
        var firstError: Error?

        for key in categories {
            guard let type = healthObjectType(for: key) as? HKSampleType else { continue }
            group.enter()
            let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { [weak self] _, samples, error in
                defer { group.leave() }
                if let error = error {
                    lock.lock(); if firstError == nil { firstError = error }; lock.unlock(); return
                }
                let mapped = (samples ?? []).compactMap { self?.healthRow(key: key, sample: $0) }
                lock.lock(); rows.append(contentsOf: mapped); lock.unlock()
            }
            healthStore.execute(query)
        }

        group.notify(queue: .main) {
            if let error = firstError {
                result(FlutterError(code: "health_read_failed", message: error.localizedDescription, details: nil))
            } else {
                rows.sort { (($0["dateMillis"] as? Int64) ?? 0) < (($1["dateMillis"] as? Int64) ?? 0) }
                result(rows)
            }
        }
    }

    private func healthRow(key: String, sample: HKSample) -> [String: Any]? {
        var row: [String: Any] = [
            "id": sample.uuid.uuidString,
            "type": key,
            "dateMillis": Int64(sample.startDate.timeIntervalSince1970 * 1000)
        ]
        if let quantity = sample as? HKQuantitySample, key == "basalBodyTemperature" {
            row["numericValue"] = quantity.quantity.doubleValue(for: HKUnit.degreeCelsius())
            row["unit"] = "°C"
            return row
        }
        guard let category = sample as? HKCategorySample else { return nil }
        switch key {
        case "menstrualFlow":
            switch category.value {
            case HKCategoryValueMenstrualFlow.light.rawValue: row["value"] = "light"
            case HKCategoryValueMenstrualFlow.medium.rawValue: row["value"] = "medium"
            case HKCategoryValueMenstrualFlow.heavy.rawValue: row["value"] = "heavy"
            default: row["value"] = "spotting"
            }
        case "intermenstrualBleeding":
            row["value"] = "spotting"
        case "cervicalMucus":
            if let value = HKCategoryValueCervicalMucusQuality(rawValue: category.value) {
                switch value {
                case .dry: row["value"] = "dry"
                case .sticky: row["value"] = "sticky"
                case .creamy: row["value"] = "creamy"
                case .watery: row["value"] = "watery"
                case .eggWhite: row["value"] = "egg white"
                @unknown default: row["value"] = "recorded"
                }
            } else { row["value"] = "recorded" }
        case "ovulationTest":
            if let value = HKCategoryValueOvulationTestResult(rawValue: category.value) {
                switch value {
                case .negative: row["value"] = "negative"
                case .luteinizingHormoneSurge: row["value"] = "LH surge"
                case .estrogenSurge: row["value"] = "estrogen surge"
                case .indeterminate: row["value"] = "indeterminate"
                @unknown default: row["value"] = "recorded"
                }
            } else { row["value"] = "recorded" }
        case "pregnancyTest":
            if let value = HKCategoryValuePregnancyTestResult(rawValue: category.value) {
                switch value {
                case .positive: row["value"] = "positive"
                case .negative: row["value"] = "negative"
                case .indeterminate: row["value"] = "indeterminate"
                @unknown default: row["value"] = "recorded"
                }
            } else { row["value"] = "recorded" }
        case "sexualActivity":
            row["value"] = "recorded"
        default:
            row["value"] = "recorded"
        }
        return row
    }

    private func writeHealthRecord(category: String, date: Date, args: [String: Any], result: @escaping FlutterResult) {
        let end = Calendar.current.date(byAdding: .minute, value: 1, to: date) ?? date
        var sample: HKSample?

        switch category {
        case "basalBodyTemperature":
            guard let type = HKObjectType.quantityType(forIdentifier: .basalBodyTemperature),
                  let numeric = args["numericValue"] as? NSNumber else { result(false); return }
            let quantity = HKQuantity(unit: HKUnit.degreeCelsius(), doubleValue: numeric.doubleValue)
            sample = HKQuantitySample(type: type, quantity: quantity, start: date, end: end)
        case "menstrualFlow":
            guard let type = HKObjectType.categoryType(forIdentifier: .menstrualFlow),
                  let value = args["value"] as? String else { result(false); return }
            let raw: HKCategoryValueMenstrualFlow
            switch value {
            case "light": raw = .light
            case "medium": raw = .medium
            case "heavy": raw = .heavy
            default: result(false); return
            }
            sample = HKCategorySample(type: type, value: raw.rawValue, start: date, end: end)
        case "intermenstrualBleeding":
            guard let type = HKObjectType.categoryType(forIdentifier: .intermenstrualBleeding) else { result(false); return }
            sample = HKCategorySample(type: type, value: HKCategoryValue.notApplicable.rawValue, start: date, end: end)
        case "cervicalMucus":
            guard let type = HKObjectType.categoryType(forIdentifier: .cervicalMucusQuality),
                  let value = args["value"] as? String else { result(false); return }
            let raw: HKCategoryValueCervicalMucusQuality
            switch value.lowercased() {
            case "dry": raw = .dry
            case "sticky": raw = .sticky
            case "creamy": raw = .creamy
            case "watery": raw = .watery
            case "egg white", "eggwhite": raw = .eggWhite
            default: result(false); return
            }
            sample = HKCategorySample(type: type, value: raw.rawValue, start: date, end: end)
        case "ovulationTest":
            guard let type = HKObjectType.categoryType(forIdentifier: .ovulationTestResult),
                  let value = args["value"] as? String else { result(false); return }
            let raw: HKCategoryValueOvulationTestResult
            switch value.lowercased() {
            case "negative": raw = .negative
            case "lh surge", "positive", "peak": raw = .luteinizingHormoneSurge
            case "estrogen surge", "high": raw = .estrogenSurge
            case "indeterminate": raw = .indeterminate
            default: result(false); return
            }
            sample = HKCategorySample(type: type, value: raw.rawValue, start: date, end: end)
        case "pregnancyTest":
            guard let type = HKObjectType.categoryType(forIdentifier: .pregnancyTestResult),
                  let value = args["value"] as? String else { result(false); return }
            let raw: HKCategoryValuePregnancyTestResult
            switch value.lowercased() {
            case "positive": raw = .positive
            case "negative": raw = .negative
            case "indeterminate": raw = .indeterminate
            default: result(false); return
            }
            sample = HKCategorySample(type: type, value: raw.rawValue, start: date, end: end)
        default:
            result(false); return
        }

        guard let sample = sample else { result(false); return }
        healthStore.save(sample) { success, error in
            DispatchQueue.main.async {
                if let error = error {
                    result(FlutterError(code: "health_write_failed", message: error.localizedDescription, details: nil))
                } else {
                    result(success)
                }
            }
        }
    }

    // MARK: - Offline speech recognition

    private func handleVoice(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
        switch call.method {
        case "supportsOfflineRecognition":
            result(SFSpeechRecognizer(locale: Locale.current)?.supportsOnDeviceRecognition ?? false)
        case "transcribeOnce":
            startOfflineTranscription(result: result)
        default:
            result(FlutterMethodNotImplemented)
        }
    }

    private func startOfflineTranscription(result: @escaping FlutterResult) {
        guard voiceResult == nil,
              let recognizer = SFSpeechRecognizer(locale: Locale.current),
              recognizer.supportsOnDeviceRecognition else { result(nil); return }

        SFSpeechRecognizer.requestAuthorization { [weak self] speechStatus in
            guard speechStatus == .authorized else { DispatchQueue.main.async { result(nil) }; return }
            AVAudioSession.sharedInstance().requestRecordPermission { granted in
                guard granted else { DispatchQueue.main.async { result(nil) }; return }
                DispatchQueue.main.async { self?.beginAudioRecognition(recognizer: recognizer, result: result) }
            }
        }
    }

    private func beginAudioRecognition(recognizer: SFSpeechRecognizer, result: @escaping FlutterResult) {
        voiceResult = result
        let request = SFSpeechAudioBufferRecognitionRequest()
        request.requiresOnDeviceRecognition = true
        request.shouldReportPartialResults = false
        recognitionRequest = request

        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.record, mode: .measurement, options: .duckOthers)
            try session.setActive(true, options: .notifyOthersOnDeactivation)
            let input = audioEngine.inputNode
            let format = input.outputFormat(forBus: 0)
            input.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in request.append(buffer) }
            audioEngine.prepare()
            try audioEngine.start()
        } catch {
            finishVoice(text: nil)
            return
        }

        recognitionTask = recognizer.recognitionTask(with: request) { [weak self] transcription, error in
            if let text = transcription?.bestTranscription.formattedString, transcription?.isFinal == true {
                self?.finishVoice(text: text)
            } else if error != nil {
                self?.finishVoice(text: nil)
            }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 10) { [weak self] in
            self?.recognitionRequest?.endAudio()
        }
    }

    private func finishVoice(text: String?) {
        if audioEngine.isRunning { audioEngine.stop() }
        audioEngine.inputNode.removeTap(onBus: 0)
        recognitionRequest?.endAudio()
        recognitionTask?.cancel()
        recognitionTask = nil
        recognitionRequest = nil
        let callback = voiceResult
        voiceResult = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        callback?(text)
    }
}
