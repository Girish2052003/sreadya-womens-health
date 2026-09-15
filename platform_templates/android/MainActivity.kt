package com.sreva.health.sreva

import android.Manifest
import android.app.AlarmManager
import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.util.Base64
import android.view.WindowManager
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.HealthConnectFeatures
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.BasalBodyTemperatureRecord
import androidx.health.connect.client.records.CervicalMucusRecord
import androidx.health.connect.client.records.IntermenstrualBleedingRecord
import androidx.health.connect.client.records.MenstruationFlowRecord
import androidx.health.connect.client.records.OvulationTestRecord
import androidx.health.connect.client.records.SexualActivityRecord
import androidx.health.connect.client.records.metadata.Metadata
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import androidx.health.connect.client.units.Temperature
import io.flutter.embedding.android.FlutterFragmentActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.security.KeyStore
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.ZonedDateTime
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

private const val REMINDER_CHANNEL = "sreva_local_reminders"
private const val REMINDER_CHANNEL_NAME = "Sreva reminders"
private const val ACTION_FIRE = "com.sreva.health.sreva.FIRE_REMINDER"
private const val ACTION_PERIOD_STARTED = "com.sreva.health.sreva.PERIOD_STARTED"
private const val ACTION_SNOOZE = "com.sreva.health.sreva.SNOOZE"

class MainActivity : FlutterFragmentActivity() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private lateinit var notificationPermissionLauncher: ActivityResultLauncher<String>
    private lateinit var microphonePermissionLauncher: ActivityResultLauncher<String>
    private lateinit var healthPermissionLauncher: ActivityResultLauncher<Set<String>>
    private var pendingNotificationPermission: MethodChannel.Result? = null
    private var pendingMicrophonePermission: (() -> Unit)? = null
    private var pendingHealthPermission: MethodChannel.Result? = null
    private var requestedHealthPermissions: Set<String> = emptySet()
    private var speechRecognizer: SpeechRecognizer? = null
    private var speechResult: MethodChannel.Result? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        notificationPermissionLauncher = registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            pendingNotificationPermission?.success(granted)
            pendingNotificationPermission = null
        }
        microphonePermissionLauncher = registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            val action = pendingMicrophonePermission
            pendingMicrophonePermission = null
            if (granted) action?.invoke() else speechResult?.success(null).also { speechResult = null }
        }
        healthPermissionLauncher = registerForActivityResult(PermissionController.createRequestPermissionResultContract()) { granted ->
            pendingHealthPermission?.success(granted.containsAll(requestedHealthPermissions))
            pendingHealthPermission = null
            requestedHealthPermissions = emptySet()
            SecurePrefs(this).putString("health.authorization.requested", "true")
        }
        super.onCreate(savedInstanceState)
        SrevaReminderRuntime.ensureNotificationChannel(this)
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        val messenger = flutterEngine.dartExecutor.binaryMessenger
        MethodChannel(messenger, "sreva/privacy").setMethodCallHandler(::handlePrivacy)
        MethodChannel(messenger, "sreva/reminders").setMethodCallHandler(::handleReminder)
        MethodChannel(messenger, "sreva/health").setMethodCallHandler(::handleHealth)
        MethodChannel(messenger, "sreva/voice").setMethodCallHandler(::handleVoice)
    }

    private fun handlePrivacy(call: MethodCall, result: MethodChannel.Result) {
        when (call.method) {
            "excludeFromBackup" -> result.success(null)
            "setSensitiveScreen" -> {
                val enabled = call.argument<Boolean>("enabled") ?: true
                if (enabled) window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
                else window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
                result.success(null)
            }
            else -> result.notImplemented()
        }
    }

    private fun handleReminder(call: MethodCall, result: MethodChannel.Result) {
        val store = SrevaReminderStore(this)
        when (call.method) {
            "permissionStatus" -> {
                val allowed = Build.VERSION.SDK_INT < 33 ||
                    ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
                result.success(mapOf("allowed" to allowed, "description" to if (allowed) "allowed" else "permission required"))
            }
            "requestPermission" -> {
                if (Build.VERSION.SDK_INT < 33) result.success(true)
                else {
                    pendingNotificationPermission = result
                    notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                }
            }
            "schedule" -> {
                val entry = ReminderEntry.fromCall(call) ?: run {
                    result.error("bad_args", "Invalid reminder", null); return
                }
                store.upsert(entry)
                SrevaReminderRuntime.schedule(this, entry)
                result.success(null)
            }
            "cancel" -> {
                val id = call.argument<String>("id") ?: run {
                    result.error("bad_args", "Missing id", null); return
                }
                store.remove(id)
                SrevaReminderRuntime.cancel(this, id)
                result.success(null)
            }
            "pending" -> result.success(store.all().map { entry -> mapOf("id" to entry.id, "timestampMillis" to (entry.scheduledEpochMillis() ?: entry.timestampMillis)) })
            "consumePendingAction" -> result.success(store.consumePendingAction())
            else -> result.notImplemented()
        }
    }

    private fun handleHealth(call: MethodCall, result: MethodChannel.Result) {
        val supported = listOf(
            "menstrualFlow", "intermenstrualBleeding", "basalBodyTemperature",
            "cervicalMucus", "ovulationTest", "sexualActivity"
        )
        when (call.method) {
            "status" -> {
                val available = HealthConnectClient.getSdkStatus(this) == HealthConnectClient.SDK_AVAILABLE
                if (!available) {
                    result.success(mapOf(
                        "available" to false,
                        "authorizationRequested" to (SecurePrefs(this).getString("health.authorization.requested") == "true"),
                        "platformName" to "Health Connect",
                        "supportedCategories" to supported,
                        "historicalReadAvailable" to false,
                        "historicalReadGranted" to false,
                    ))
                    return
                }
                val client = HealthConnectClient.getOrCreate(this)
                scope.launch {
                    try {
                        val granted = withContext(Dispatchers.IO) {
                            client.permissionController.getGrantedPermissions()
                        }
                        result.success(mapOf(
                            "available" to true,
                            "authorizationRequested" to (SecurePrefs(this@MainActivity).getString("health.authorization.requested") == "true"),
                            "platformName" to "Health Connect",
                            "supportedCategories" to supported,
                            "historicalReadAvailable" to historyReadAvailable(client),
                            "historicalReadGranted" to
                                (HealthPermission.PERMISSION_READ_HEALTH_DATA_HISTORY in granted),
                        ))
                    } catch (error: Throwable) {
                        result.error("health_status_failed", error.message, null)
                    }
                }
            }
            "requestAuthorization" -> {
                if (HealthConnectClient.getSdkStatus(this) != HealthConnectClient.SDK_AVAILABLE) {
                    result.success(false); return
                }
                val categories = (call.argument<List<String>>("categories") ?: emptyList()).filter { it in supported }
                val includeHistory = call.argument<Boolean>("includeHistory") ?: false
                val permissions = healthPermissions(categories, includeHistory)
                if (permissions.isEmpty()) { result.success(false); return }
                pendingHealthPermission = result
                requestedHealthPermissions = permissions
                healthPermissionLauncher.launch(permissions)
            }
            "readHealthRecords" -> readHealthRecords(call, result)
            "writeHealthRecord" -> writeHealthRecord(call, result)
            else -> result.notImplemented()
        }
    }

    private fun historyReadAvailable(
        client: HealthConnectClient = HealthConnectClient.getOrCreate(this),
    ): Boolean =
        client.features.getFeatureStatus(
            HealthConnectFeatures.FEATURE_READ_HEALTH_DATA_HISTORY,
        ) == HealthConnectFeatures.FEATURE_STATUS_AVAILABLE

    private fun healthPermissions(
        categories: List<String>,
        includeHistory: Boolean = false,
    ): Set<String> {
        val permissions = mutableSetOf<String>()
        for (category in categories) {
            when (category) {
                "menstrualFlow" -> {
                    permissions += HealthPermission.getReadPermission(MenstruationFlowRecord::class)
                    permissions += HealthPermission.getWritePermission(MenstruationFlowRecord::class)
                }
                "intermenstrualBleeding" -> {
                    permissions += HealthPermission.getReadPermission(IntermenstrualBleedingRecord::class)
                    permissions += HealthPermission.getWritePermission(IntermenstrualBleedingRecord::class)
                }
                "basalBodyTemperature" -> {
                    permissions += HealthPermission.getReadPermission(BasalBodyTemperatureRecord::class)
                    permissions += HealthPermission.getWritePermission(BasalBodyTemperatureRecord::class)
                }
                "cervicalMucus" -> {
                    permissions += HealthPermission.getReadPermission(CervicalMucusRecord::class)
                    permissions += HealthPermission.getWritePermission(CervicalMucusRecord::class)
                }
                "ovulationTest" -> {
                    permissions += HealthPermission.getReadPermission(OvulationTestRecord::class)
                    permissions += HealthPermission.getWritePermission(OvulationTestRecord::class)
                }
                "sexualActivity" -> {
                    permissions += HealthPermission.getReadPermission(SexualActivityRecord::class)
                    permissions += HealthPermission.getWritePermission(SexualActivityRecord::class)
                }
            }
        }
        if (includeHistory && historyReadAvailable()) {
            permissions += HealthPermission.PERMISSION_READ_HEALTH_DATA_HISTORY
        }
        return permissions
    }

    private fun readHealthRecords(call: MethodCall, result: MethodChannel.Result) {
        if (HealthConnectClient.getSdkStatus(this) != HealthConnectClient.SDK_AVAILABLE) {
            result.success(emptyList<Map<String, Any?>>()); return
        }
        val categories = call.argument<List<String>>("categories") ?: emptyList()
        val fromMillis = call.argument<Number>("fromMillis")?.toLong() ?: run { result.success(emptyList<Any>()); return }
        val toMillis = call.argument<Number>("toMillis")?.toLong() ?: run { result.success(emptyList<Any>()); return }
        val requestedFrom = Instant.ofEpochMilli(fromMillis)
        val to = Instant.ofEpochMilli(toMillis)
        val client = HealthConnectClient.getOrCreate(this)
        scope.launch {
            try {
                val granted = withContext(Dispatchers.IO) {
                    client.permissionController.getGrantedPermissions()
                }
                val fallbackFrom = Instant.now().minusSeconds(30L * 24L * 60L * 60L)
                val effectiveFrom =
                    if (HealthPermission.PERMISSION_READ_HEALTH_DATA_HISTORY in granted) {
                        requestedFrom
                    } else if (requestedFrom.isAfter(fallbackFrom)) {
                        requestedFrom
                    } else {
                        fallbackFrom
                    }
                val rows = withContext(Dispatchers.IO) {
                    readRows(client, categories, effectiveFrom, to)
                }
                result.success(rows)
            } catch (error: Throwable) {
                result.error("health_read_failed", error.message, null)
            }
        }
    }

    private suspend fun readRows(client: HealthConnectClient, categories: List<String>, from: Instant, to: Instant): List<Map<String, Any?>> {
        val filter = TimeRangeFilter.between(from, to)
        val rows = mutableListOf<Map<String, Any?>>()
        if ("menstrualFlow" in categories) {
            client.readRecords(ReadRecordsRequest(MenstruationFlowRecord::class, filter)).records.forEach { record ->
                rows += mapOf(
                    "id" to record.metadata.id,
                    "type" to "menstrualFlow",
                    "dateMillis" to record.time.toEpochMilli(),
                    "value" to when (record.flow) {
                        MenstruationFlowRecord.FLOW_LIGHT -> "light"
                        MenstruationFlowRecord.FLOW_MEDIUM -> "medium"
                        MenstruationFlowRecord.FLOW_HEAVY -> "heavy"
                        else -> "spotting"
                    },
                )
            }
        }
        if ("intermenstrualBleeding" in categories) {
            client.readRecords(ReadRecordsRequest(IntermenstrualBleedingRecord::class, filter)).records.forEach { record ->
                rows += mapOf("id" to record.metadata.id, "type" to "intermenstrualBleeding", "dateMillis" to record.time.toEpochMilli(), "value" to "spotting")
            }
        }
        if ("basalBodyTemperature" in categories) {
            client.readRecords(ReadRecordsRequest(BasalBodyTemperatureRecord::class, filter)).records.forEach { record ->
                rows += mapOf(
                    "id" to record.metadata.id,
                    "type" to "basalBodyTemperature",
                    "dateMillis" to record.time.toEpochMilli(),
                    "numericValue" to record.temperature.inCelsius,
                    "unit" to "°C",
                )
            }
        }
        if ("cervicalMucus" in categories) {
            client.readRecords(ReadRecordsRequest(CervicalMucusRecord::class, filter)).records.forEach { record ->
                rows += mapOf(
                    "id" to record.metadata.id,
                    "type" to "cervicalMucus",
                    "dateMillis" to record.time.toEpochMilli(),
                    "value" to when (record.appearance) {
                        CervicalMucusRecord.APPEARANCE_DRY -> "dry"
                        CervicalMucusRecord.APPEARANCE_STICKY -> "sticky"
                        CervicalMucusRecord.APPEARANCE_CREAMY -> "creamy"
                        CervicalMucusRecord.APPEARANCE_WATERY -> "watery"
                        CervicalMucusRecord.APPEARANCE_EGG_WHITE -> "egg white"
                        else -> "recorded"
                    },
                )
            }
        }
        if ("ovulationTest" in categories) {
            client.readRecords(ReadRecordsRequest(OvulationTestRecord::class, filter)).records.forEach { record ->
                rows += mapOf(
                    "id" to record.metadata.id,
                    "type" to "ovulationTest",
                    "dateMillis" to record.time.toEpochMilli(),
                    "value" to when (record.result) {
                        OvulationTestRecord.RESULT_POSITIVE -> "positive"
                        OvulationTestRecord.RESULT_HIGH -> "high"
                        OvulationTestRecord.RESULT_NEGATIVE -> "negative"
                        else -> "indeterminate"
                    },
                )
            }
        }
        if ("sexualActivity" in categories) {
            client.readRecords(ReadRecordsRequest(SexualActivityRecord::class, filter)).records.forEach { record ->
                rows += mapOf(
                    "id" to record.metadata.id,
                    "type" to "sexualActivity",
                    "dateMillis" to record.time.toEpochMilli(),
                    "value" to when (record.protectionUsed) {
                        SexualActivityRecord.PROTECTION_USED_PROTECTED -> "protected"
                        SexualActivityRecord.PROTECTION_USED_UNPROTECTED -> "unprotected"
                        else -> "unknown"
                    },
                )
            }
        }
        return rows.sortedBy { (it["dateMillis"] as? Long) ?: 0L }
    }

    private fun writeHealthRecord(call: MethodCall, result: MethodChannel.Result) {
        if (HealthConnectClient.getSdkStatus(this) != HealthConnectClient.SDK_AVAILABLE) {
            result.success(false); return
        }
        val category = call.argument<String>("category") ?: run { result.success(false); return }
        val instant = Instant.ofEpochMilli(call.argument<Number>("dateMillis")?.toLong() ?: run { result.success(false); return })
        val zone = ZoneId.systemDefault().rules.getOffset(instant)
        val value = call.argument<String>("value")
        val numeric = call.argument<Number>("numericValue")?.toDouble()
        val metadata = Metadata.manualEntry()
        val record = when (category) {
            "menstrualFlow" -> MenstruationFlowRecord(
                time = instant,
                zoneOffset = zone,
                metadata = metadata,
                flow = when (value) {
                    "light" -> MenstruationFlowRecord.FLOW_LIGHT
                    "medium" -> MenstruationFlowRecord.FLOW_MEDIUM
                    "heavy" -> MenstruationFlowRecord.FLOW_HEAVY
                    else -> MenstruationFlowRecord.FLOW_UNKNOWN
                },
            )
            "intermenstrualBleeding" -> IntermenstrualBleedingRecord(instant, zone, metadata)
            "basalBodyTemperature" -> if (numeric != null) BasalBodyTemperatureRecord(
                time = instant,
                zoneOffset = zone,
                metadata = metadata,
                temperature = Temperature.celsius(numeric),
            ) else null
            "cervicalMucus" -> CervicalMucusRecord(
                time = instant,
                zoneOffset = zone,
                metadata = metadata,
                appearance = when (value?.lowercase()) {
                    "dry" -> CervicalMucusRecord.APPEARANCE_DRY
                    "sticky" -> CervicalMucusRecord.APPEARANCE_STICKY
                    "creamy" -> CervicalMucusRecord.APPEARANCE_CREAMY
                    "watery" -> CervicalMucusRecord.APPEARANCE_WATERY
                    "egg white", "eggwhite" -> CervicalMucusRecord.APPEARANCE_EGG_WHITE
                    else -> CervicalMucusRecord.APPEARANCE_UNKNOWN
                },
            )
            "ovulationTest" -> OvulationTestRecord(
                time = instant,
                zoneOffset = zone,
                metadata = metadata,
                result = when (value?.lowercase()) {
                    "positive", "peak" -> OvulationTestRecord.RESULT_POSITIVE
                    "high" -> OvulationTestRecord.RESULT_HIGH
                    "negative" -> OvulationTestRecord.RESULT_NEGATIVE
                    else -> OvulationTestRecord.RESULT_INCONCLUSIVE
                },
            )
            "sexualActivity" -> SexualActivityRecord(
                time = instant,
                zoneOffset = zone,
                metadata = metadata,
                protectionUsed = when (value?.lowercase()) {
                    "protected", "protection used", "yes" ->
                        SexualActivityRecord.PROTECTION_USED_PROTECTED
                    "unprotected", "no protection", "no" ->
                        SexualActivityRecord.PROTECTION_USED_UNPROTECTED
                    else -> SexualActivityRecord.PROTECTION_USED_UNKNOWN
                },
            )
            else -> null
        }
        if (record == null) { result.success(false); return }
        val client = HealthConnectClient.getOrCreate(this)
        scope.launch {
            try {
                withContext(Dispatchers.IO) { client.insertRecords(listOf(record)) }
                result.success(true)
            } catch (error: Throwable) {
                result.error("health_write_failed", error.message, null)
            }
        }
    }

    private fun handleVoice(call: MethodCall, result: MethodChannel.Result) {
        when (call.method) {
            "supportsOfflineRecognition" -> result.success(
                Build.VERSION.SDK_INT >= 31 && SpeechRecognizer.isOnDeviceRecognitionAvailable(this)
            )
            "transcribeOnce" -> {
                if (Build.VERSION.SDK_INT < 31 || !SpeechRecognizer.isOnDeviceRecognitionAvailable(this)) {
                    result.success(null); return
                }
                speechResult = result
                val start = { startOnDeviceSpeech() }
                if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) start()
                else {
                    pendingMicrophonePermission = start
                    microphonePermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                }
            }
            else -> result.notImplemented()
        }
    }

    private fun startOnDeviceSpeech() {
        if (Build.VERSION.SDK_INT < 31) { speechResult?.success(null); speechResult = null; return }
        val recognizer = SpeechRecognizer.createOnDeviceSpeechRecognizer(this)
        speechRecognizer?.destroy()
        speechRecognizer = recognizer
        recognizer.setRecognitionListener(object : RecognitionListener {
            override fun onResults(results: Bundle?) {
                val text = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()
                speechResult?.success(text)
                speechResult = null
                recognizer.destroy()
            }
            override fun onError(error: Int) { speechResult?.success(null); speechResult = null; recognizer.destroy() }
            override fun onReadyForSpeech(params: Bundle?) {}
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() {}
            override fun onPartialResults(partialResults: Bundle?) {}
            override fun onEvent(eventType: Int, params: Bundle?) {}
        })
        recognizer.startListening(Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true)
        })
    }
}

data class ReminderEntry(
    val id: String,
    val kind: String,
    val timestampMillis: Long,
    val targetLocalYear: Int,
    val targetLocalMonth: Int,
    val targetLocalDay: Int,
    val targetLocalHour: Int,
    val targetLocalMinute: Int,
    val title: String,
    val body: String,
    val repeatDaily: Boolean,
    val label: String?,
) {
    fun scheduledEpochMillis(nowMillis: Long = System.currentTimeMillis()): Long? {
        val zone = ZoneId.systemDefault()
        val now = Instant.ofEpochMilli(nowMillis)
        if (repeatDaily) {
            val localNow = now.atZone(zone)
            var target = ZonedDateTime.of(
                localNow.toLocalDate().atTime(targetLocalHour, targetLocalMinute),
                zone,
            )
            if (!target.toInstant().isAfter(now)) target = target.plusDays(1)
            return target.toInstant().toEpochMilli()
        }
        val target = ZonedDateTime.of(
            LocalDateTime.of(
                targetLocalYear,
                targetLocalMonth,
                targetLocalDay,
                targetLocalHour,
                targetLocalMinute,
            ),
            zone,
        ).toInstant()
        return if (target.isAfter(now)) target.toEpochMilli() else null
    }

    fun toJson(): JSONObject = JSONObject().apply {
        put("id", id)
        put("kind", kind)
        put("timestampMillis", timestampMillis)
        put("targetLocalYear", targetLocalYear)
        put("targetLocalMonth", targetLocalMonth)
        put("targetLocalDay", targetLocalDay)
        put("targetLocalHour", targetLocalHour)
        put("targetLocalMinute", targetLocalMinute)
        put("title", title)
        put("body", body)
        put("repeatDaily", repeatDaily)
        put("label", label)
    }

    companion object {
        fun fromTimestamp(
            id: String,
            kind: String,
            timestampMillis: Long,
            title: String,
            body: String,
            repeatDaily: Boolean,
            label: String?,
        ): ReminderEntry {
            val local = Instant.ofEpochMilli(timestampMillis).atZone(ZoneId.systemDefault())
            return ReminderEntry(
                id = id,
                kind = kind,
                timestampMillis = timestampMillis,
                targetLocalYear = local.year,
                targetLocalMonth = local.monthValue,
                targetLocalDay = local.dayOfMonth,
                targetLocalHour = local.hour,
                targetLocalMinute = local.minute,
                title = title,
                body = body,
                repeatDaily = repeatDaily,
                label = label,
            )
        }

        fun fromCall(call: MethodCall): ReminderEntry? {
            val id = call.argument<String>("id") ?: return null
            val kind = call.argument<String>("kind") ?: return null
            val timestamp = call.argument<Number>("timestampMillis")?.toLong() ?: return null
            return fromTimestamp(
                id = id,
                kind = kind,
                timestampMillis = timestamp,
                title = call.argument<String>("title") ?: "Sreva",
                body = call.argument<String>("body") ?: "You have a reminder.",
                repeatDaily = call.argument<Boolean>("repeatDaily") ?: false,
                label = call.argument<String>("label"),
            )
        }

        fun fromJson(json: JSONObject): ReminderEntry {
            val timestamp = json.getLong("timestampMillis")
            val fallback = Instant.ofEpochMilli(timestamp).atZone(ZoneId.systemDefault())
            return ReminderEntry(
                id = json.getString("id"),
                kind = json.getString("kind"),
                timestampMillis = timestamp,
                targetLocalYear = json.optInt("targetLocalYear", fallback.year),
                targetLocalMonth = json.optInt("targetLocalMonth", fallback.monthValue),
                targetLocalDay = json.optInt("targetLocalDay", fallback.dayOfMonth),
                targetLocalHour = json.optInt("targetLocalHour", fallback.hour),
                targetLocalMinute = json.optInt("targetLocalMinute", fallback.minute),
                title = json.optString("title", "Sreva"),
                body = json.optString("body", "You have a reminder."),
                repeatDaily = json.optBoolean("repeatDaily", false),
                label = if (json.isNull("label")) null else json.optString("label"),
            )
        }
    }
}

class SecurePrefs(context: Context) {
    private val prefs = context.getSharedPreferences("sreva.secure.native", Context.MODE_PRIVATE)
    private val alias = "sreva.native.local.v1"

    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (store.getKey(alias, null) as? SecretKey)?.let { return it }
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        generator.init(
            KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .build()
        )
        return generator.generateKey()
    }

    fun putString(name: String, value: String?) {
        if (value == null) {
            prefs.edit().remove(name).apply()
            return
        }
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key())
        val encrypted = cipher.doFinal(value.toByteArray(Charsets.UTF_8))
        val joined = cipher.iv + encrypted
        prefs.edit().putString(name, Base64.encodeToString(joined, Base64.NO_WRAP)).apply()
    }

    fun getString(name: String): String? {
        val encoded = prefs.getString(name, null) ?: return null
        return try {
            val bytes = Base64.decode(encoded, Base64.NO_WRAP)
            val iv = bytes.copyOfRange(0, 12)
            val body = bytes.copyOfRange(12, bytes.size)
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, iv))
            String(cipher.doFinal(body), Charsets.UTF_8)
        } catch (_: Throwable) {
            null
        }
    }
}

class SrevaReminderStore(private val context: Context) {
    private val secure = SecurePrefs(context)

    fun all(): MutableList<ReminderEntry> {
        val raw = secure.getString("reminders") ?: return mutableListOf()
        return try {
            val array = JSONArray(raw)
            MutableList(array.length()) { index -> ReminderEntry.fromJson(array.getJSONObject(index)) }
        } catch (_: Throwable) {
            mutableListOf()
        }
    }

    fun write(values: List<ReminderEntry>) {
        val array = JSONArray()
        values.forEach { array.put(it.toJson()) }
        secure.putString("reminders", array.toString())
    }

    fun upsert(entry: ReminderEntry) {
        val values = all()
        values.removeAll { it.id == entry.id }
        values += entry
        write(values)
    }

    fun remove(id: String) = write(all().filterNot { it.id == id })
    fun putPendingAction(value: String) = secure.putString("pendingAction", value)
    fun consumePendingAction(): String? = secure.getString("pendingAction").also { secure.putString("pendingAction", null) }
}

object SrevaReminderRuntime {
    fun ensureNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= 26) {
            val manager = context.getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(
                NotificationChannel(REMINDER_CHANNEL, REMINDER_CHANNEL_NAME, NotificationManager.IMPORTANCE_DEFAULT)
            )
        }
    }

    fun schedule(context: Context, entry: ReminderEntry) {
        ensureNotificationChannel(context)
        val target = entry.scheduledEpochMillis() ?: return
        val manager = context.getSystemService(AlarmManager::class.java)
        val intent = Intent(context, SrevaAlarmReceiver::class.java)
            .setAction(ACTION_FIRE)
            .putExtra("id", entry.id)
        val pending = PendingIntent.getBroadcast(
            context,
            entry.id.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, target, pending)
    }

    fun cancel(context: Context, id: String) {
        val manager = context.getSystemService(AlarmManager::class.java)
        val pending = PendingIntent.getBroadcast(
            context,
            id.hashCode(),
            Intent(context, SrevaAlarmReceiver::class.java).setAction(ACTION_FIRE).putExtra("id", id),
            PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE,
        )
        if (pending != null) {
            manager.cancel(pending)
            pending.cancel()
        }
    }

    fun rescheduleAll(context: Context) {
        val store = SrevaReminderStore(context)
        val kept = mutableListOf<ReminderEntry>()
        for (entry in store.all()) {
            if (entry.repeatDaily || entry.scheduledEpochMillis() != null) {
                kept += entry
                schedule(context, entry)
            }
        }
        store.write(kept)
    }
}

class SrevaAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getStringExtra("id") ?: return
        val store = SrevaReminderStore(context)
        val entry = store.all().firstOrNull { it.id == id } ?: return
        SrevaReminderRuntime.ensureNotificationChannel(context)
        val manager = context.getSystemService(NotificationManager::class.java)
        val contentIntent = PendingIntent.getActivity(
            context,
            id.hashCode(),
            context.packageManager.getLaunchIntentForPackage(context.packageName),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val builder = NotificationCompat.Builder(context, REMINDER_CHANNEL)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(entry.title)
            .setContentText(entry.body)
            .setAutoCancel(true)
            .setContentIntent(contentIntent)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
        if (entry.kind.startsWith("period")) {
            val started = PendingIntent.getBroadcast(
                context,
                (id + "started").hashCode(),
                Intent(context, SrevaActionReceiver::class.java).setAction(ACTION_PERIOD_STARTED),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
            val snooze = PendingIntent.getBroadcast(
                context,
                (id + "snooze").hashCode(),
                Intent(context, SrevaActionReceiver::class.java).setAction(ACTION_SNOOZE),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
            builder.addAction(0, "Period started", started).addAction(0, "Snooze 2 hours", snooze)
        }
        manager.notify(id.hashCode(), builder.build())
        if (entry.repeatDaily) {
            SrevaReminderRuntime.schedule(context, entry)
        } else {
            store.remove(entry.id)
        }
    }
}

class SrevaActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val store = SrevaReminderStore(context)
        when (intent.action) {
            ACTION_PERIOD_STARTED -> {
                store.putPendingAction("periodStarted")
                context.packageManager.getLaunchIntentForPackage(context.packageName)?.also { launch ->
                    launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                    context.startActivity(launch)
                }
            }
            ACTION_SNOOZE -> {
                val id = "snooze-${System.currentTimeMillis()}"
                val entry = ReminderEntry.fromTimestamp(
                    id = id,
                    kind = "snooze",
                    timestampMillis = System.currentTimeMillis() + 2 * 60 * 60 * 1000L,
                    title = "Sreva",
                    body = "You have a reminder.",
                    repeatDaily = false,
                    label = null,
                )
                store.upsert(entry)
                SrevaReminderRuntime.schedule(context, entry)
            }
        }
    }
}

class SrevaBootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        SrevaReminderRuntime.rescheduleAll(context)
    }
}
