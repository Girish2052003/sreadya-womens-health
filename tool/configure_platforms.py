#!/usr/bin/env python3
"""Materialize Sreva's production Android/iOS host configuration.

The Flutter host folders may be generated on a clean CI runner, but the generated
stock shells are not sufficient for Sreva. This script installs the audited
native bridges and the platform privacy/health/account configuration that the
Dart application expects.
"""

from __future__ import annotations

import argparse
import plistlib
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

ANDROID_DEPENDENCIES = r'''

dependencies {
    implementation("androidx.health.connect:connect-client:1.1.0")
    implementation("androidx.credentials:credentials:1.6.0")
    implementation("androidx.credentials:credentials-play-services-auth:1.6.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.11.0")
}
'''

ANDROID_MANIFEST = r'''<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />

    <uses-permission android:name="android.permission.health.READ_MENSTRUATION" />
    <uses-permission android:name="android.permission.health.WRITE_MENSTRUATION" />
    <uses-permission android:name="android.permission.health.READ_INTERMENSTRUAL_BLEEDING" />
    <uses-permission android:name="android.permission.health.WRITE_INTERMENSTRUAL_BLEEDING" />
    <uses-permission android:name="android.permission.health.READ_BASAL_BODY_TEMPERATURE" />
    <uses-permission android:name="android.permission.health.WRITE_BASAL_BODY_TEMPERATURE" />
    <uses-permission android:name="android.permission.health.READ_CERVICAL_MUCUS" />
    <uses-permission android:name="android.permission.health.WRITE_CERVICAL_MUCUS" />
    <uses-permission android:name="android.permission.health.READ_OVULATION_TEST" />
    <uses-permission android:name="android.permission.health.WRITE_OVULATION_TEST" />
    <uses-permission android:name="android.permission.health.READ_SEXUAL_ACTIVITY" />
    <uses-permission android:name="android.permission.health.WRITE_SEXUAL_ACTIVITY" />
    <uses-permission android:name="android.permission.health.READ_HEALTH_DATA_HISTORY" />

    <queries>
        <package android:name="com.google.android.apps.healthdata" />
        <intent>
            <action android:name="android.intent.action.PROCESS_TEXT" />
            <data android:mimeType="text/plain" />
        </intent>
    </queries>

    <application
        android:label="Sreva"
        android:name="${applicationName}"
        android:icon="@mipmap/ic_launcher"
        android:allowBackup="false"
        android:fullBackupContent="false">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:taskAffinity=""
            android:theme="@style/LaunchTheme"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|smallestScreenSize|locale|layoutDirection|fontScale|screenLayout|density|uiMode"
            android:hardwareAccelerated="true"
            android:windowSoftInputMode="adjustResize">
            <meta-data
                android:name="io.flutter.embedding.android.NormalTheme"
                android:resource="@style/NormalTheme" />
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <activity
            android:name=".PermissionsRationaleActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE" />
            </intent-filter>
        </activity>
        <activity-alias
            android:name="ViewPermissionUsageActivity"
            android:exported="true"
            android:targetActivity=".PermissionsRationaleActivity"
            android:permission="android.permission.START_VIEW_PERMISSION_USAGE">
            <intent-filter>
                <action android:name="android.intent.action.VIEW_PERMISSION_USAGE" />
                <category android:name="android.intent.category.HEALTH_PERMISSIONS" />
            </intent-filter>
        </activity-alias>

        <receiver
            android:name=".SrevaAlarmReceiver"
            android:exported="false" />
        <receiver
            android:name=".SrevaActionReceiver"
            android:exported="false" />
        <receiver
            android:name=".SrevaBootReceiver"
            android:enabled="true"
            android:exported="false">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />
                <action android:name="android.intent.action.TIME_SET" />
                <action android:name="android.intent.action.TIMEZONE_CHANGED" />
            </intent-filter>
        </receiver>

        <meta-data android:name="flutterEmbedding" android:value="2" />
    </application>
</manifest>
'''

RATIONALE_ACTIVITY = r'''

class PermissionsRationaleActivity : android.app.Activity() {
    override fun onCreate(savedInstanceState: android.os.Bundle?) {
        super.onCreate(savedInstanceState)
        title = "Sreva privacy"
        val padding = (24 * resources.displayMetrics.density).toInt()
        val text = android.widget.TextView(this).apply {
            setPadding(padding, padding, padding, padding)
            textSize = 16f
            text = "Sreva processes reproductive-health information on this device. " +
                "Health Connect access is optional and is used only for the categories you explicitly authorize. " +
                "Sreva does not maintain a developer-operated database containing your menstrual history. " +
                "You can revoke Health Connect permissions at any time in Android settings."
        }
        setContentView(android.widget.ScrollView(this).apply { addView(text) })
    }
}
'''

IOS_APP_DELEGATE = r'''import AVFoundation
import AuthenticationServices
import Flutter
import HealthKit
import Speech
import UIKit
import UserNotifications

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
    override func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        return super.application(application, didFinishLaunchingWithOptions: launchOptions)
    }

    func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
        GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)
        let messenger = engineBridge.applicationRegistrar.messenger()
        SrevaPlatformBridge.register(messenger: messenger)
        SrevaCredentialBridge.register(messenger: messenger)
    }
}

'''


def require(path: Path, description: str) -> None:
    if not path.exists():
        raise SystemExit(f"Missing {description}: {path}")


def configure_android() -> None:
    app_dir = ROOT / "android" / "app"
    require(app_dir, "generated Android project; run flutter create first")

    gradle_path = app_dir / "build.gradle.kts"
    require(gradle_path, "generated Android app Gradle file")
    gradle = gradle_path.read_text(encoding="utf-8")
    if "minSdk = flutter.minSdkVersion" in gradle:
        gradle = gradle.replace("minSdk = flutter.minSdkVersion", "minSdk = 26")
    elif "minSdk = 26" not in gradle:
        raise SystemExit("Unable to locate Flutter minSdk declaration in generated Android Gradle file")
    if 'androidx.health.connect:connect-client:1.1.0' not in gradle:
        gradle = gradle.rstrip() + ANDROID_DEPENDENCIES
    gradle_path.write_text(gradle, encoding="utf-8")

    manifest = app_dir / "src" / "main" / "AndroidManifest.xml"
    manifest.parent.mkdir(parents=True, exist_ok=True)
    manifest.write_text(ANDROID_MANIFEST, encoding="utf-8")

    source = ROOT / "platform_templates" / "android" / "MainActivity.kt"
    credential_source = ROOT / "platform_templates" / "android" / "SrevaCredentialBridge.kt"
    require(source, "Android native bridge template")
    require(credential_source, "Android credential bridge template")
    target_dir = app_dir / "src" / "main" / "kotlin" / "com" / "sreva" / "health" / "sreva"
    target = target_dir / "MainActivity.kt"
    credential_target = target_dir / "SrevaCredentialBridge.kt"
    target_dir.mkdir(parents=True, exist_ok=True)
    kotlin = source.read_text(encoding="utf-8")
    registration = '        MethodChannel(messenger, "sreva/voice").setMethodCallHandler(::handleVoice)'
    if "SrevaCredentialBridge(this, messenger).register()" not in kotlin:
        if registration not in kotlin:
            raise SystemExit("Unable to locate Android Flutter channel registration point")
        kotlin = kotlin.replace(
            registration,
            registration + '\n        SrevaCredentialBridge(this, messenger).register()',
        )
    if "class PermissionsRationaleActivity" not in kotlin:
        kotlin += RATIONALE_ACTIVITY
    target.write_text(kotlin, encoding="utf-8")
    credential_target.write_text(credential_source.read_text(encoding="utf-8"), encoding="utf-8")

    check_android()


def check_android() -> None:
    gradle = ROOT / "android" / "app" / "build.gradle.kts"
    manifest = ROOT / "android" / "app" / "src" / "main" / "AndroidManifest.xml"
    source_dir = ROOT / "android" / "app" / "src" / "main" / "kotlin" / "com" / "sreva" / "health" / "sreva"
    source = source_dir / "MainActivity.kt"
    credential_source = source_dir / "SrevaCredentialBridge.kt"
    for path in (gradle, manifest, source, credential_source):
        require(path, "configured Android file")
    checks = {
        gradle: [
            'minSdk = 26',
            'androidx.health.connect:connect-client:1.1.0',
            'androidx.credentials:credentials:1.6.0',
            'androidx.credentials:credentials-play-services-auth:1.6.0',
            'kotlinx-coroutines-android:1.11.0',
        ],
        manifest: [
            'android:allowBackup="false"',
            'android.permission.health.READ_MENSTRUATION',
            'android.permission.health.READ_SEXUAL_ACTIVITY',
            'android.permission.health.WRITE_SEXUAL_ACTIVITY',
            'android.permission.health.READ_HEALTH_DATA_HISTORY',
            '.SrevaBootReceiver',
            'android.intent.category.HEALTH_PERMISSIONS',
        ],
        source: [
            'MethodChannel(messenger, "sreva/privacy")',
            'MethodChannel(messenger, "sreva/reminders")',
            'MethodChannel(messenger, "sreva/health")',
            'MethodChannel(messenger, "sreva/voice")',
            'SrevaCredentialBridge(this, messenger).register()',
            'class PermissionsRationaleActivity',
        ],
        credential_source: [
            'MethodChannel(messenger, "sreva/account")',
            'CreatePublicKeyCredentialRequest',
            'GetPublicKeyCredentialOption',
        ],
    }
    for path, markers in checks.items():
        text = path.read_text(encoding="utf-8")
        missing = [marker for marker in markers if marker not in text]
        if missing:
            raise SystemExit(f"Android configuration incomplete in {path}: {missing}")
    print("Android native host configuration: OK")


def _strip_swift_imports(template: str) -> str:
    return re.sub(r"^import [^\n]+\n", "", template, flags=re.MULTILINE).lstrip()


def _transform_ios_bridge(template: str) -> str:
    body = _strip_swift_imports(template)
    body = body.replace(
        "private init(controller: FlutterViewController) {",
        "private init(messenger: FlutterBinaryMessenger) {",
    )
    body = body.replace("controller.binaryMessenger", "messenger")
    body = body.replace(
        "static func register(with controller: FlutterViewController) {\n        let bridge = SrevaPlatformBridge(controller: controller)",
        "static func register(messenger: FlutterBinaryMessenger) {\n        let bridge = SrevaPlatformBridge(messenger: messenger)",
    )
    if "FlutterViewController" in body:
        raise SystemExit("iOS bridge still depends on FlutterViewController after UIScene migration")
    return body


def configure_ios() -> None:
    runner = ROOT / "ios" / "Runner"
    require(runner, "generated iOS project; run flutter create first")

    bridge_path = ROOT / "platform_templates" / "ios" / "SrevaPlatformBridge.swift"
    credential_path = ROOT / "platform_templates" / "ios" / "SrevaCredentialBridge.swift"
    require(bridge_path, "iOS native bridge template")
    require(credential_path, "iOS credential bridge template")
    bridge = _transform_ios_bridge(bridge_path.read_text(encoding="utf-8"))
    credential_bridge = _strip_swift_imports(credential_path.read_text(encoding="utf-8"))
    (runner / "AppDelegate.swift").write_text(
        IOS_APP_DELEGATE + bridge + "\n\n" + credential_bridge,
        encoding="utf-8",
    )

    info_path = runner / "Info.plist"
    require(info_path, "iOS Info.plist")
    with info_path.open("rb") as handle:
        info = plistlib.load(handle)
    info.update(
        {
            "CFBundleDisplayName": "Sreva",
            "NSHealthShareUsageDescription": "Sreva can import the reproductive-health categories you choose from Apple Health to keep your local cycle history consistent.",
            "NSHealthUpdateUsageDescription": "Sreva can save the reproductive-health categories you explicitly choose to Apple Health.",
            "NSSpeechRecognitionUsageDescription": "Sreva uses on-device speech recognition when available so you can log cycle information by voice.",
            "NSMicrophoneUsageDescription": "Sreva needs microphone access only when you explicitly start a voice logging action.",
        }
    )
    with info_path.open("wb") as handle:
        plistlib.dump(info, handle, sort_keys=False)

    entitlements = {"com.apple.developer.healthkit": True}
    with (runner / "Runner.entitlements").open("wb") as handle:
        plistlib.dump(entitlements, handle, sort_keys=False)

    project = ROOT / "ios" / "Runner.xcodeproj" / "project.pbxproj"
    require(project, "iOS Xcode project")
    pbx = project.read_text(encoding="utf-8")
    pbx = re.sub(r"IPHONEOS_DEPLOYMENT_TARGET = [0-9.]+;", "IPHONEOS_DEPLOYMENT_TARGET = 17.0;", pbx)
    if "CODE_SIGN_ENTITLEMENTS = Runner/Runner.entitlements;" not in pbx:
        bundle_line = "PRODUCT_BUNDLE_IDENTIFIER = com.sreva.health.sreva;"
        pbx = pbx.replace(
            bundle_line,
            "CODE_SIGN_ENTITLEMENTS = Runner/Runner.entitlements;\n\t\t\t\t" + bundle_line,
        )
    project.write_text(pbx, encoding="utf-8")

    check_ios()


def check_ios() -> None:
    app_delegate = ROOT / "ios" / "Runner" / "AppDelegate.swift"
    info_path = ROOT / "ios" / "Runner" / "Info.plist"
    entitlements = ROOT / "ios" / "Runner" / "Runner.entitlements"
    project = ROOT / "ios" / "Runner.xcodeproj" / "project.pbxproj"
    for path in (app_delegate, info_path, entitlements, project):
        require(path, "configured iOS file")
    source = app_delegate.read_text(encoding="utf-8")
    for marker in (
        "FlutterImplicitEngineDelegate",
        "didInitializeImplicitFlutterEngine",
        "SrevaPlatformBridge.register(",
        "SrevaCredentialBridge.register(",
        "engineBridge.applicationRegistrar.messenger()",
        'FlutterMethodChannel(name: "sreva/privacy"',
        'FlutterMethodChannel(name: "sreva/reminders"',
        'FlutterMethodChannel(name: "sreva/health"',
        'FlutterMethodChannel(name: "sreva/voice"',
        'FlutterMethodChannel(name: "sreva/account"',
    ):
        if marker not in source:
            raise SystemExit(f"iOS native bridge marker missing: {marker}")
    with info_path.open("rb") as handle:
        info = plistlib.load(handle)
    for key in (
        "NSHealthShareUsageDescription",
        "NSHealthUpdateUsageDescription",
        "NSSpeechRecognitionUsageDescription",
        "NSMicrophoneUsageDescription",
    ):
        if not info.get(key):
            raise SystemExit(f"iOS usage description missing: {key}")
    with entitlements.open("rb") as handle:
        rights = plistlib.load(handle)
    if rights.get("com.apple.developer.healthkit") is not True:
        raise SystemExit("HealthKit entitlement is missing")
    pbx = project.read_text(encoding="utf-8")
    if "IPHONEOS_DEPLOYMENT_TARGET = 17.0;" not in pbx:
        raise SystemExit("iOS 17 deployment target was not materialized")
    if "CODE_SIGN_ENTITLEMENTS = Runner/Runner.entitlements;" not in pbx:
        raise SystemExit("Runner.entitlements is not linked from the Xcode project")
    print("iOS native host configuration: OK")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("platform", choices=("android", "ios", "all"))
    parser.add_argument("--check", action="store_true", help="validate only; do not rewrite files")
    args = parser.parse_args()

    platforms = ("android", "ios") if args.platform == "all" else (args.platform,)
    for platform in platforms:
        if platform == "android":
            check_android() if args.check else configure_android()
        else:
            check_ios() if args.check else configure_ios()


if __name__ == "__main__":
    main()
