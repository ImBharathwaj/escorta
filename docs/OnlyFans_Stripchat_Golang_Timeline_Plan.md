# OnlyFans/Stripchat Feature + Golang Execution Plan

## 1) Goal

Build Escorta into an OnlyFans/Stripchat-style platform while migrating backend APIs to Golang for lower latency and higher scalability.

## 2) Strategy

- Keep **Next.js frontend** initially.
- Migrate backend APIs incrementally to **Go** (strangler pattern).
- Ship monetization and creator features in parallel, not after migration.
- Prioritize features that improve revenue early: subscriptions, PPV, live cam monetization.

## 3) Timeline (12 months)

## Phase 0 (Month 0-1): Foundation
- Set up Go service skeleton, CI/CD, observability, Redis, and API gateway routing.
- Define domain ownership: Auth, Ledger, Live/Video, Content, Admin.
- Add contract tests for Node vs Go parity.
- Product design finalization for subscriptions, PPV feed, tip menu, private shows.

**Deliverables**
- Go service running in production for low-risk read endpoints.
- Final PRD for OnlyFans/Stripchat feature set (v1).

## Phase 1 (Month 2-3): Revenue Core v1 (OnlyFans-style)
- Build creator subscriptions (monthly recurring).
- Build paywalled posts and PPV unlocks (post + DM).
- Build follower/subscriber graph and creator dashboard basics.
- Migrate read-heavy discovery/profile APIs to Go.

**Deliverables**
- Subscriptions live.
- PPV posts/DM unlock live.
- 25-35% API traffic on Go.

## Phase 2 (Month 4-5): Live Monetization v1 (Stripchat-style)
- Add live tip menu, tip goals, and room leaderboards.
- Add private show and group show billing model.
- Add fan-club/tiered room access.
- Migrate live/video/session APIs to Go (token, join, extend, end, tips).

**Deliverables**
- Live monetization feature set v1 live.
- 50-60% API traffic on Go.

## Phase 3 (Month 6-7): Payments, Payouts, and Trust
- Add creator withdrawable balance + payout workflow.
- Add payout compliance/KYC workflow and audit trail.
- Add chargeback/refund handling and risk flags.
- Migrate credits/tips/ledger/payment endpoints to Go with idempotency keys.

**Deliverables**
- End-to-end creator earnings and payout pipeline.
- Financially critical APIs on Go with transactional consistency.

## Phase 4 (Month 8-9): Realtime and Scale
- Replace high-frequency polling with WebSocket/data-channel for chat/events.
- Add stream broadcaster tools (OBS/RTMP ingest controls, stream health).
- Add recommendation ranking for live rooms and creator content.
- Move notifications and chat backplane to Redis pub/sub or queue workers in Go.

**Deliverables**
- Lower chat/live latency.
- Higher room concurrency.
- 75-85% API traffic on Go.

## Phase 5 (Month 10-12): Hardening and Full Cutover
- Complete API migration from Node routes to Go for backend domains.
- Keep Node only for frontend SSR/BFF tasks as needed.
- Add anti-fraud, anti-piracy (watermarking), and DMCA/takedown operations.
- Performance tuning, load testing, incident playbooks, SLA/SLO rollout.

**Deliverables**
- 90%+ backend API traffic on Go.
- Production-ready OnlyFans/Stripchat feature baseline.

## 4) Feature-by-feature build order

1. Subscriptions (monthly recurring)
2. Paywalled feed + PPV DMs
3. Creator analytics/revenue dashboard
4. Tip menu + tip goals + leaderboard
5. Private/group shows
6. Fan club tiers
7. Payout and KYC workflows
8. Realtime transport upgrade (WebSocket/data-channel)
9. Ranking/recommendations
10. Anti-fraud and anti-piracy stack

## 5) Golang package stack (recommended)

- HTTP/API: `gin` or `chi`
- DB: `pgx + sqlc`
- Cache/queues: `go-redis`
- Auth: `golang-jwt/jwt/v5`, `bcrypt`
- LiveKit: `livekit/server-sdk-go`
- Storage: `aws-sdk-go-v2` (S3/MinIO)
- Validation: `go-playground/validator/v10`
- Observability: `OpenTelemetry`, `sentry-go`

## 6) Team plan (startup realistic)

- Team split:
  - Squad A: Platform migration (Go + infra)
  - Squad B: Monetization and creator features
  - Shared: QA + DevOps + Product analytics
- Release cadence: bi-weekly.
- Every release includes:
  - one revenue feature increment,
  - one migration increment,
  - one reliability/security increment.

## 7) KPIs by quarter

- Revenue KPIs:
  - subscription conversion rate,
  - PPV unlock rate,
  - ARPPU and creator GMV.
- Platform KPIs:
  - p95 latency,
  - error rate,
  - cost per 1k requests,
  - max concurrent live sessions.
- Migration KPIs:
  - % endpoints on Go,
  - % traffic on Go,
  - parity defects per release.

## 8) Risks and controls

- Risk: migration slows product shipping.
  - Control: dual-track roadmap with fixed feature commitments per sprint.
- Risk: ledger/payment bugs during rewrite.
  - Control: idempotency keys, replay tests, dual-write validation window.
- Risk: realtime scaling bottlenecks.
  - Control: websocket rollout by cohort + load testing gates.
- Risk: compliance exposure as adult platform grows.
  - Control: KYC, consent workflow, moderation audit logs, DMCA operations.

## 9) Immediate next 30-day actions

1. Lock v1 scope for subscriptions + PPV + tip menu + private shows.
2. Stand up Go service with auth, observability, and DB layer.
3. Migrate first low-risk APIs and enable shadow traffic.
4. Implement subscription data model and billing workflow.
5. Publish baseline performance dashboard and target SLOs.

