# SREVA capability registry

`shared/capabilities/sreva-capabilities.v1.json` is the machine-readable launch contract for C2.

The approved architecture specification remains the human-auditable source of capability IDs and names. `tool/generate_c2_capability_registry.py` deterministically extracts that frozen Section 1 contract and adds explicit lifecycle and applicability metadata.

## Lifecycle states

- `contract` — the requirement is frozen, but this state **does not claim implementation**.
- `implemented` — implementation exists for the declared platform scope, but release verification is not yet complete.
- `verified` — executable evidence satisfies the declared test requirements for the applicable platform scope.
- `future` — explicitly outside the initial worldwide launch contract.

A capability must never be promoted merely to make a dashboard green. Evidence comes first.

## Platform applicability

Every launch record explicitly declares Android, iOS, Web and PWA as `full`, `adapted`, or `na`. `adapted` means the product promise is preserved through a platform-appropriate mechanism. `na` is reserved for a genuinely unavailable platform integration, such as HealthKit on Web; it never means the underlying health capability disappears.

## Marketing eligibility

The registry starts launch requirements with `marketing_eligible: false`. Public claims are enabled only after implementation, verification and the applicable privacy/regulatory review. The 258-ID count is an engineering traceability mechanism, not a public marketing number.

## Regeneration

Run:

```bash
python tool/generate_c2_capability_registry.py
python -m pytest -q verification/reference/test_cross_platform_capability_registry.py
```

A regeneration that changes the approved 258 launch rows or 11 future rows must be treated as an architecture-contract change and reviewed before implementation proceeds.
