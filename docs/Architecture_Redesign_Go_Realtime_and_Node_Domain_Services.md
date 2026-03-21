# Architecture Redesign Summary: Reduce Polling with Go Realtime Services

## 1. Goal

Redesign the current Next.js monolith so polling-heavy traffic moves to focused Go services, while Node.js continues to own product/domain APIs:

- Keep Node.js for: Auth, User, Content, Stream lifecycle, Chat token issuance, payments/credits, admin.
- Add Go for: WebSocket gateway, token validation, realtime messaging fan-out.
- Result: lower request volume to Node/Postgres, lower p95 latency on chat/live/video surfaces.

---

## 2. Current State (Observed in Repo)

The repo is a Next.js app serving both frontend and API routes from one Node runtime.

- Frontend polling hotspots:
  - `ChatWidget`: `/api/connections` every 4s, `/api/bookings/:id/messages` every 10s.
  - `LiveContent`: `/api/live/sessions` every 10s, `/api/live/:id/messages` every 5s (12s when hidden), `/api/live/:id` every 5s.
  - `VideoCallContent`: `/api/video-call/:id/status` repeatedly.
  - `NotificationBell`: `/api/notifications` every 25s.
  - `sexter` pages: repeated 3s–15s polling loops.
- API layer characteristics:
  - Auth/JWT checks are repeated in route handlers.
  - Rate limiting is in-memory (`src/lib/rateLimit.ts`) and not distributed.
  - Message endpoints query full message lists repeatedly.
  - `Cache-Control: no-store` used on hot routes, increasing backend load.

This design scales poorly as concurrent active users increase because each user generates frequent polling traffic.

---

## 3. Target Architecture (Node + Go)

## 3.1 Node.js (System of Record, Domain Logic)

Node remains primary owner of business workflows and writes to Postgres:

- Auth and refresh/session rotation.
- User/profile/content APIs.
- Stream/video/booking lifecycle state changes.
- Credits/ledger/payment logic (strict consistency).
- Notification persistence.
- Chat token issuance endpoint for realtime authorization.

## 3.2 Go Services (Traffic Offload + Low-Latency Realtime)

Introduce three focused Go services:

1. `realtime-gateway` (WebSocket/SSE)
- Accepts client realtime connections.
- Handles room subscription (booking/live/video/sexter).
- Broadcasts events to connected clients.
- Uses Redis pub/sub for horizontal fan-out.

2. `token-validator`
- Validates JWT/chat tokens once per connection.
- Caches token introspection response with short TTL.
- Returns normalized auth context (`userId`, `role`, scopes, room access).

3. `messaging-service`
- Handles lightweight realtime message ingest/fan-out.
- Publishes durable writes to Node-owned write API or queue.
- Supports acks, delivery events, and sequence IDs for resume/backfill.

Supporting infra:
- Redis (pub/sub + distributed rate limit + ephemeral presence).
- Optional queue (NATS/Kafka/SQS) for durable async handoff.

---

## 4. Request Flow (After Redesign)

1. Client gets auth in Node as today.
2. Client requests chat/realtime token from Node (`/api/chat/token` or equivalent).
3. Client opens WebSocket to Go gateway with token.
4. Go validator verifies token (or introspects with Node) and grants room scopes.
5. Realtime events/messages flow through Go + Redis pub/sub.
6. Durable state updates still land in Node/Postgres (synchronously or via queue worker).
7. Client uses polling only as fallback for recovery/reconnect/backfill.

---

## 5. API Ownership Split

Keep Node endpoints as source of truth:

- `/api/auth/*`
- `/api/users/*`
- `/api/escorts/*`, `/api/bookings/*` domain writes
- `/api/live/*` session lifecycle (start/join/extend/end)
- `/api/video-call/*` call lifecycle
- `/api/tips`, credits, ledger, payments
- `/api/admin/*`

Move high-frequency realtime reads from polling to Go streams:

- Booking chat message updates.
- Live chat updates and viewer count updates.
- Video call status updates.
- Notification push delivery.
- Sexter session realtime updates.

---

## 6. Migration Plan (Pragmatic)

## Phase 1: Foundation

- Deploy Redis.
- Create Go `token-validator` + `realtime-gateway`.
- Add Node chat-token endpoint with short TTL and room-scoped claims.
- Keep all current polling routes untouched.

## Phase 2: Chat First

- Switch booking/live chat UI from interval polling to WebSocket subscription.
- Keep HTTP GET history API for initial load and reconnect backfill.
- Add sequence/offset in message payloads.

## Phase 3: Presence + Status

- Move video-call status and live viewer count to push events.
- Add presence heartbeats in Go and store ephemeral state in Redis.

## Phase 4: Notifications

- Push unread badge deltas + latest notifications via realtime channel.
- Keep `/api/notifications` as fallback and initial hydrate.

## Phase 5: Hardening + Scale

- Distributed rate limits in Redis (replace in-memory limiter behavior for realtime path).
- Add canary routing and fallback to polling on websocket failure.
- Add SLOs and autoscaling on ws connections, publish lag, and p95 send latency.

---

## 7. Contracts to Define Early

- Token schema:
  - `sub`, `role`, `scopes`, `roomIds`, `exp`, `jti`.
- Message envelope:
  - `eventType`, `roomId`, `sequence`, `ts`, `payload`.
- Reliability:
  - At-least-once delivery + idempotent client merge by `id/sequence`.
- Access model:
  - Node is policy authority; Go only enforces token claims.

---

## 8. Expected Impact

- 50%+ reduction in polling traffic on active chat/live pages.
- Lower DB read amplification from repeated message/status fetches.
- Better horizontal scaling by separating realtime connection load from Node domain APIs.
- Node remains optimized for feature velocity and transactional correctness.

---

## 9. Risks and Mitigations

- Dual-stack complexity (Node + Go):
  - Mitigation: strict ownership boundaries and versioned contracts.
- Eventual consistency surprises:
  - Mitigation: Node remains source of truth; include message sequence + backfill APIs.
- Auth drift between services:
  - Mitigation: centralized token claim spec + conformance tests.
- Operational overhead:
  - Mitigation: start with 3 small Go services and one Redis cluster, then split only when needed.

---

## 10. Immediate Repo-Level Next Steps

1. Add `docs/realtime-contracts.md` for token + websocket event schemas.
2. Add Node endpoint for short-lived chat/realtime token issuance.
3. Add feature flag in frontend to switch polling -> websocket per surface (`chat`, `live`, `videoStatus`, `notifications`).
4. Build Go `realtime-gateway` MVP for one room type first (`booking` chat), then expand.
5. Keep existing polling APIs as fallback until websocket reliability SLOs are met.

