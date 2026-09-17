# C2 Task 20 — Sync Service Scaffold Closure

**Status:** FORMALLY CLOSED

**Closure baseline:** `cf76942130ac205c1461621967541328f9a2f329`

**Dedicated workflow:** `C2 Task 20 Sync Service Scaffold`

**Exact-head workflow run:** `35168702858`

**Conclusion:** SUCCESS

The provider-independent Go identity/sync scaffold is frozen at this baseline. The closure gate verifies:

- committed Go module graph is reproducible under Go 1.27.1;
- frozen direct dependencies remain `github.com/go-chi/chi/v5 v5.3.2` and `github.com/jackc/pgx/v5 v5.11.0`;
- `go test ./...` passes on the exact closure SHA;
- `go vet ./...` passes on the exact closure SHA;
- PostgreSQL compatibility target remains 18.6;
- migrations contain no readable health semantics prohibited by the C2 plan;
- provider-independent configuration, HTTP health/readiness boundary and PostgreSQL Store adapter are covered by executable tests.

Task 21 must branch from the closure baseline above so the passkey/account boundary does not depend on a red or unverified Task-20 state.
