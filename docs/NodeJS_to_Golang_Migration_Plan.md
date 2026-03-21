# NodeJS to Golang Migration Plan (Scalability + Low Latency)

## 1. Executive summary

- **Feasibility:** High.
- **Recommended path:** Incremental migration (Strangler Fig), not a big-bang rewrite.
- **What stays on Node:** Next.js frontend/BFF pages initially.
- **What moves to Go first:** Latency-sensitive and high-RPS APIs (auth/session refresh, chat/live polling endpoints, credits ledger writes, notifications fan-out, media token/signing APIs).
- **Expected outcome (after core migration):**
  - lower p95 API latency,
  - lower memory per request,
  - better horizontal scaling under concurrent polling/live traffic.

## 2. Current-state observations (from this codebase)

- Monolithic Next.js app hosts UI + API routes.
- PostgreSQL + Prisma is the data layer.
- Live/video features already exist (LiveKit).
- Hot paths include polling-heavy chat/live/video endpoints.
- In-memory rate limiter exists (single-instance limitation).
- Credits/tips/ledger workflows are central and must remain strongly consistent.

## 3. Migration possibility and strategy

## 3.1 Is migration possible now?

- **Yes**, with minimal product disruption.
- You can run Go services behind the same domain (`/api/*`) and route per-endpoint via reverse proxy or API gateway.
- Database schema can be reused as-is in phase 1.

## 3.2 Recommended target architecture

- **Frontend:** Next.js continues for SSR/pages/UI.
- **API platform:** Go service(s) using clean modular boundaries:
  - Auth & Sessions
  - Profiles & Discovery
  - Bookings/Chat/Sexter
  - Live/Video orchestration
  - Credits/Payments/Ledger
  - Admin/Moderation
- **Infra:** PostgreSQL + Redis + object storage (MinIO/S3), plus queue (later phase).
- **Traffic routing:** Gradual endpoint cutover from Node route handlers to Go handlers.

## 4. Go package availability mapping

| Concern | Node today | Go recommendation | Availability / risk |
|---|---|---|---|
| HTTP framework | Next route handlers | `gin` or `chi` | Mature, low risk |
| JWT | `jsonwebtoken` | `github.com/golang-jwt/jwt/v5` | Mature, low risk |
| Password hashing | `bcrypt` | `golang.org/x/crypto/bcrypt` | Mature, low risk |
| PostgreSQL access | Prisma | `pgx` + `sqlc` (recommended) or `gorm` | Mature, low risk |
| Migrations | Prisma migrations | `golang-migrate/migrate` or Atlas | Mature, low risk |
| Redis/rate limiting | in-memory map | `go-redis` + token bucket middleware | Mature, low risk |
| S3/MinIO | AWS SDK v3 | `aws-sdk-go-v2` (S3 client) | Mature, low risk |
| LiveKit tokens/server ops | `livekit-server-sdk` | `github.com/livekit/server-sdk-go` | Mature, low risk |
| Razorpay | `razorpay` | `github.com/razorpay/razorpay-go` | Available, medium risk (verify maintenance cadence) |
| Observability | Sentry Next | `github.com/getsentry/sentry-go` + OpenTelemetry | Mature, low risk |
| Config/env | dotenv | `caarlos0/env` or `viper` | Mature, low risk |
| Validation | ad hoc | `go-playground/validator/v10` | Mature, low risk |
| Background jobs | cron routes | `asynq` / `gocron` / Temporal (later) | Mature, low-medium risk |
| WebSocket realtime | polling today | `gorilla/websocket` or `nhooyr/websocket` | Mature, low risk |

## 5. Timeline (startup-pragmatic)

Assumption: 3-5 engineers, one dedicated QA, no major scope expansion during migration.

### Phase 0 (Week 1-2): Foundations
- Create Go service skeleton, CI/CD, lint/test baseline.
- Add request IDs, structured logs, tracing, metrics.
- Establish DB access layer (`pgx + sqlc`) with existing schema.
- Set up shared auth contract (same JWT format/secrets).

**Exit criteria**
- Health/readiness endpoints.
- One non-critical read endpoint in production behind feature flag.

### Phase 1 (Week 3-5): Read-heavy APIs first
- Migrate escorts listing/detail, services/adult-services, public discovery APIs.
- Add Redis caching for high-read endpoints.
- Shadow traffic comparison (Node vs Go responses).

**Exit criteria**
- 30-40% of read traffic served by Go.
- Response parity validated.

### Phase 2 (Week 6-9): Stateful core APIs
- Migrate auth/me, sessions refresh/logout, notifications read paths.
- Migrate bookings/messages/sexter read+write flows.
- Replace in-memory rate limit with Redis-based distributed limiter.

**Exit criteria**
- No auth regressions.
- Chat polling endpoints stable under load test.

### Phase 3 (Week 10-13): Money and ledger critical paths
- Migrate credits spend/earn ledger logic with strict transaction boundaries.
- Migrate tips endpoints and payment order/unlock flows.
- Add idempotency keys and replay-safe payment handling.

**Exit criteria**
- Financial parity report (Node vs Go ledger outcomes).
- Zero double-spend in concurrency tests.

### Phase 4 (Week 14-16): Live/video and media workflows
- Migrate LiveKit token/session APIs.
- Migrate live/video join/extend/end/report APIs.
- Migrate media signing/stream token endpoints.

**Exit criteria**
- Live/video sessions fully managed by Go APIs.
- p95 improvement demonstrated during peak synthetic load.

### Phase 5 (Week 17-18): Cutover and hardening
- Flip default routing to Go for migrated endpoints.
- Keep Node fallbacks for 1-2 releases.
- Decommission old route handlers gradually.

**Exit criteria**
- 80-90% backend APIs on Go.
- Error budget and latency SLOs met for 2 consecutive weeks.

## 6. Performance expectations and KPIs

Track before/after with the same workloads:

- `p95` and `p99` latency per endpoint group.
- Throughput (req/s) at fixed CPU limits.
- DB query time and connection saturation.
- Memory footprint per pod/instance.
- Cost per 1k requests.

Suggested target after Phase 5:
- `p95 < 250ms` for common read endpoints.
- `p95 < 400ms` for chat/live polling endpoints.
- 2-3x throughput gain on same infra budget for API tier.

## 7. Key risks and mitigations

- **Risk:** Data consistency bugs in credits/tips/ledger.
  - **Mitigation:** transactional invariants, idempotency keys, double-entry checks, replay tests.
- **Risk:** Dual-stack complexity (Node + Go) during migration.
  - **Mitigation:** strict ownership per endpoint, routing matrix, contract tests.
- **Risk:** Team velocity drop from rewrite pressure.
  - **Mitigation:** migrate only bottleneck domains first; keep feature delivery lane active.
- **Risk:** Schema drift between Prisma and Go migrations.
  - **Mitigation:** choose one migration authority by Phase 2 (recommended: SQL migration tool + sqlc).

## 8. Ten miles down the road (startup roadmap)

## 8.1 0-6 months (post migration core)
- Complete Go migration for all high-volume APIs.
- Introduce websocket/event streams for chat/live room events to reduce polling load.
- Build centralized event pipeline for analytics and fraud signals.
- Add creator monetization reliability features (idempotent payouts, dispute workflows).

## 8.2 6-12 months (scale-up)
- Split Go services by domain (Payments/Ledger isolated first).
- Add queue-driven async processing (notifications, media, compliance jobs).
- Add read replicas + query isolation for analytics/reporting.
- Multi-region read edge for lower latency in target geographies.

## 8.3 12-24 months (platform maturity)
- Adopt service mesh/zero-trust auth between services.
- Formal SLO program with autoscaling tied to latency + queue depth.
- Anti-fraud platform (device risk, velocity checks, behavior scoring).
- Progressive migration of Next.js API leftovers to dedicated Go BFF/gateway model.

## 9. Recommended engineering operating model

- Keep two lanes:
  - **Lane A:** Migration and reliability.
  - **Lane B:** Revenue features (do not pause growth roadmap).
- Define migration scorecard weekly:
  - `% endpoints migrated`
  - `% traffic served by Go`
  - incidents/regressions
  - latency and infra cost trend.

## 10. Immediate next steps (next 14 days)

1. Freeze endpoint inventory and classify by risk (read, write, money-critical).
2. Create Go service repo/module and baseline architecture.
3. Implement shared auth middleware and first 3 read endpoints.
4. Add load-test baselines and publish Node vs Go benchmark dashboard.
5. Decide data access standard (`pgx + sqlc` strongly recommended).

