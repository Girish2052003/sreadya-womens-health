import 'package:flutter/services.dart';

class PrivacyPlatform {
  static const MethodChannel _channel = MethodChannel('sreadya/privacy');

  Future<void> excludePathFromBackup(String path) async {
    try {
      await _channel.invokeMethod<void>('excludeFromBackup', {'path': path});
    } on MissingPluginException {
      // Unit/widget tests and unsupported desktop hosts do not install this channel.
    }
  }

  Future<void> setSensitiveScreen(bool enabled) async {
    try {
      await _channel.invokeMethod<void>('setSensitiveScreen', {
        'enabled': enabled,
      });
    } on MissingPluginException {
      // Production iOS/Android hosts install this channel.
    }
  }
}
