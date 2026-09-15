import 'package:flutter/services.dart';

class VoicePlatform {
  static const MethodChannel _channel = MethodChannel('sreva/voice');

  Future<bool> supportsOfflineRecognition() async {
    try {
      return await _channel.invokeMethod<bool>('supportsOfflineRecognition') ??
          false;
    } on MissingPluginException {
      return false;
    }
  }

  Future<String?> transcribeOnce() async {
    try {
      return await _channel.invokeMethod<String>('transcribeOnce');
    } on MissingPluginException {
      return null;
    }
  }
}
