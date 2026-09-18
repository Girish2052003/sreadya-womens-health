# C2 Task 27 Web Security Review

**Review date:** 18 September 2026  
**Scope:** Sreadya Web/PWA release-hardening review for XSS, CSP, service worker, Cache Storage, clickjacking, CSRF, browser-extension boundaries and sensitive-response caching.

## XSS review

Repository source search found no React `dangerouslySetInnerHTML`, `eval(`, `document.write(`, or direct `innerHTML =` sink in the Web application. The one repository search hit for the words `new Function` is outside the Web runtime and is not JavaScript dynamic-code execution. React-rendered user-visible values therefore remain escaped by the framework unless a future change introduces a reviewed HTML sink.

Task 27 treats introduction of an unsafe rendering sink as a release-review event rather than assuming framework escaping makes XSS impossible.

## CSP and hosting limitation

The current static Web/PWA distribution is GitHub Pages. GitHub Pages does not give this repository a normal application-server response-header control plane for a strong per-response Content Security Policy (CSP), frame-ancestor policy, and related security headers. Sreadya therefore does **not** claim that a repository-controlled response-header CSP is currently enforced on that host.

This is an explicit hosting limitation, not a waived security requirement. The current release boundary relies on framework escaping, no reviewed dynamic-code sink, same-origin network rules, no readable health payload in static output, and the service-worker/cache restrictions below. A future host that supports controlled response headers must add and verify an appropriately restrictive CSP and clickjacking protections before those controls are claimed as deployed.

## Service worker and Cache Storage

`web/public/sw.js` is an application-shell worker. API and sync paths are excluded from caching. Private workspace navigation only retains the small reviewed static shell allowlist; health payloads remain outside Cache Storage. Task 27 cross-browser/PWA tests additionally exercise recovery, API and sync cache exclusion.

## CSRF and authenticated requests

The optional sync client uses same-origin authenticated requests plus device-bound signed challenge transcripts for sensitive sync mutations. CSRF remains relevant anywhere cookie-authenticated state changes exist; the signed device challenge/body/path binding is part of the mutation authorization boundary and must not be replaced by cookie presence alone.

## Clickjacking

GitHub Pages cannot currently supply repository-controlled `frame-ancestors` response policy. This remains a hosting limitation to carry into deployment review. No claim of deployed anti-clickjacking response headers is made here.

## Malicious browser extension boundary

A malicious browser extension with page/storage privileges is outside the protection that ordinary Web application code can guarantee. Sreadya minimizes exposure by keeping health state local, avoiding health telemetry, keeping sync ciphertext-only, and preventing application-shell Cache Storage from becoming a health-record cache. This limitation must remain visible in the threat model and release documentation.

## Review conclusion

No new Web XSS sink or sensitive service-worker cache path was identified in the Task 27 source review. CSP/clickjacking response-header enforcement is **not** claimed on GitHub Pages; that hosting limitation remains an external deployment consideration. Automated Task 27 tests cover WCAG-facing routes and service-worker cache privacy, while the existing secret/privacy/dependency scans remain release gates.
