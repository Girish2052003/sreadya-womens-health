import 'package:local_auth/local_auth.dart';

class AppLockService {
  AppLockService({LocalAuthentication? authentication})
      : _authentication = authentication ?? LocalAuthentication();

  final LocalAuthentication _authentication;

  Future<bool> isAvailable() async {
    final biometrics = await _authentication.canCheckBiometrics;
    return biometrics || await _authentication.isDeviceSupported();
  }

  Future<bool> unlock() async {
    if (!await isAvailable()) return false;
    try {
      return await _authentication.authenticate(
        localizedReason: 'Unlock Sreva to view private cycle information.',
        persistAcrossBackgrounding: false,
        biometricOnly: false,
      );
    } on LocalAuthException {
      return false;
    }
  }
}
