/// Future seam for a separately reviewed live partner-sharing transport.
///
/// Worldwide v1 deliberately ships no implementation: partner sharing is
/// explicit preview + QR/system share sheet only. Any later implementation
/// must be end-to-end encrypted and must not make a developer health database
/// authoritative.
abstract interface class PartnerTransport {
  Future<void> sendEncryptedGrant({
    required String grantId,
    required List<int> encryptedPayload,
  });

  Future<void> revokeGrant(String grantId);
}
