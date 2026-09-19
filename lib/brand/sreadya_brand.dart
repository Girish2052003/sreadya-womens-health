import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

abstract final class SreadyaBrand {
  static const Color crimson = Color(0xFF8E123F);
  static const Color rose = Color(0xFFC42664);
  static const Color pink = Color(0xFFF06B9A);
  static const Color blush = Color(0xFFFFE8F0);
  static const Color pearl = Color(0xFFFFF8FB);
  static const Color ink = Color(0xFF2B1720);

  static const List<String> _iconParts = [
    'assets/brand/sreadya_app_icon.webp.b64.01',
    'assets/brand/sreadya_app_icon.webp.b64.02',
    'assets/brand/sreadya_app_icon.webp.b64.03',
    'assets/brand/sreadya_app_icon.webp.b64.04',
  ];

  static final Future<Uint8List> iconBytes = _loadIcon();

  static Future<Uint8List> _loadIcon() async {
    final parts = await Future.wait(_iconParts.map(rootBundle.loadString));
    return base64Decode(parts.join().replaceAll(RegExp(r'\s+'), ''));
  }
}

class SreadyaBrandIcon extends StatelessWidget {
  const SreadyaBrandIcon({this.size = 116, this.semanticLabel, super.key});

  final double size;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: semanticLabel,
      image: semanticLabel != null,
      excludeSemantics: semanticLabel == null,
      child: FutureBuilder<Uint8List>(
        future: SreadyaBrand.iconBytes,
        builder: (context, snapshot) {
          if (!snapshot.hasData) {
            return Container(
              width: size,
              height: size,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [SreadyaBrand.pink, SreadyaBrand.crimson],
                ),
                borderRadius: BorderRadius.circular(size * .24),
              ),
              child: Icon(
                Icons.local_florist_rounded,
                color: Colors.white,
                size: size * .48,
              ),
            );
          }
          return ClipRRect(
            borderRadius: BorderRadius.circular(size * .24),
            child: Image.memory(
              snapshot.data!,
              width: size,
              height: size,
              fit: BoxFit.cover,
              filterQuality: FilterQuality.high,
              gaplessPlayback: true,
            ),
          );
        },
      ),
    );
  }
}
