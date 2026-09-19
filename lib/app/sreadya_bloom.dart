import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../brand/sreadya_brand.dart';

class SreadyaBloom extends StatelessWidget {
  const SreadyaBloom({
    this.subtitle = 'Your cycle. Your rhythm. Your space.',
    super.key,
  });

  final String subtitle;

  @override
  Widget build(BuildContext context) {
    final disableAnimations = MediaQuery.maybeOf(context)?.disableAnimations ?? false;
    final duration = disableAnimations ? Duration.zero : const Duration(milliseconds: 1250);

    return Scaffold(
      backgroundColor: SreadyaBrand.crimson,
      body: Semantics(
        label: 'Sreadya opening',
        child: Stack(
          fit: StackFit.expand,
          children: [
            const _BloomBackdrop(),
            SafeArea(
              child: Center(
                child: TweenAnimationBuilder<double>(
                  duration: duration,
                  curve: Curves.easeOutCubic,
                  tween: Tween(begin: 0, end: 1),
                  builder: (context, value, child) => Opacity(
                    opacity: value,
                    child: Transform.scale(
                      scale: .88 + (.12 * value),
                      child: child,
                    ),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: .14),
                          borderRadius: BorderRadius.circular(36),
                          border: Border.all(
                            color: Colors.white.withValues(alpha: .24),
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: .16),
                              blurRadius: 36,
                              offset: const Offset(0, 18),
                            ),
                          ],
                        ),
                        child: const SreadyaBrandIcon(
                          size: 148,
                          semanticLabel: 'Sreadya app icon',
                        ),
                      ),
                      const SizedBox(height: 24),
                      const Text(
                        'SREADYA',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 38,
                          height: 1,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 3.2,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        subtitle,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: .88),
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          letterSpacing: .25,
                        ),
                      ),
                      const SizedBox(height: 28),
                      Container(
                        width: 54,
                        height: 4,
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: .7),
                          borderRadius: BorderRadius.circular(999),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BloomBackdrop extends StatelessWidget {
  const _BloomBackdrop();

  @override
  Widget build(BuildContext context) {
    return CustomPaint(painter: _BloomPainter());
  }
}

class _BloomPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final background = Paint()
      ..shader = const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [
          Color(0xFFFF4D86),
          Color(0xFFD11659),
          Color(0xFF760C36),
        ],
        stops: [0, .48, 1],
      ).createShader(rect);
    canvas.drawRect(rect, background);

    void glow(Offset center, double radius, Color color) {
      final paint = Paint()
        ..shader = RadialGradient(
          colors: [color, color.withValues(alpha: 0)],
        ).createShader(Rect.fromCircle(center: center, radius: radius));
      canvas.drawCircle(center, radius, paint);
    }

    glow(
      Offset(size.width * .82, size.height * .18),
      size.shortestSide * .52,
      Colors.white.withValues(alpha: .20),
    );
    glow(
      Offset(size.width * .12, size.height * .78),
      size.shortestSide * .50,
      const Color(0xFFFF9ABA).withValues(alpha: .26),
    );

    final petal = Paint()..color = Colors.white.withValues(alpha: .10);
    final center = Offset(size.width / 2, size.height * .52);
    final length = size.shortestSide * .42;
    for (var i = 0; i < 8; i++) {
      final angle = (math.pi * 2 / 8) * i;
      canvas.save();
      canvas.translate(center.dx, center.dy);
      canvas.rotate(angle);
      final path = Path()
        ..moveTo(0, 0)
        ..quadraticBezierTo(length * .20, -length * .20, 0, -length)
        ..quadraticBezierTo(-length * .20, -length * .20, 0, 0);
      canvas.drawPath(path, petal);
      canvas.restore();
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
