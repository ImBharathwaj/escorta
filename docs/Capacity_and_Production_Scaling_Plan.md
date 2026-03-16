# Capacity Assessment & Production Scaling Plan

This document estimates how much user traffic the **current** codebase and infrastructure can handle, and outlines a plan to scale to **production level**.

---

## 1. Current Stack Summary

| Layer | Technology | Notes |
|-------|------------|--------|
| App | Next.js 16 (App Router), React 19 | Single Node process by default (`next start`) |
| API | Route handlers (server-side) | No edge/serverless config; all run on Node |
| Database | PostgreSQL + Prisma | Default Prisma client; no connection pool config |
| Storage | MinIO (S3-compatible) | Images, avatars, sexter media |
| Auth | JWT (stateless) | No server-side session store |
| Payments | Razorpay | External API |
| Email | Resend (or console in dev) | External API |
| Image processing | Sharp | CPU + memory per request (photo blur/proxy) |

**Deployment:** No Dockerfile or platform config in repo; assumed single VM or PaaS (e.g. one dyno/container) running `next start`.

---

## 2. Current Traffic Capacity (Rough Estimates)

Estimates assume **one app instance**, **one PostgreSQL instance**, and **one MinIO instance** with default/small resources (e.g. 1–2 vCPU, 2–4 GB RAM).

### 2.1 Bottlenecks (in order of impact)

1. **Photo proxy + Sharp** (`/api/photos/[id]`)
   - Every (non-cached) image view: fetch from MinIO → Sharp resize/blur → response.
   - CPU and memory per request; no CDN, no in-memory cache.
   - **Rough limit:** ~20–50 image requests/second per instance before CPU saturates (depends on image size and blur).

2. **Database connections**
   - Prisma uses a single connection pool (default size ~num_cores + 1 or similar).
   - Each API request can run multiple queries (e.g. auth + booking + escort + photo checks).
   - **Rough limit:** With default pool, ~50–150 concurrent requests per app instance before connection wait or DB CPU becomes an issue (depends on query complexity and DB size).

3. **Polling load**
   - **Per active client:** Chat list ~every 4 s, messages ~every 10 s, dashboard bookings ~every 4 s when pending.
   - **Per active companion:** Bookings ~every 4 s, sexter clients ~every 15 s, sexter messages ~every 10 s per open chat.
   - So **one active user** can generate ~5–15 API calls per minute across widgets/pages.
   - **Rough limit:** 100–300 **concurrent active users** (with chat/dashboard open) before the single instance is doing hundreds of requests per minute and approaching CPU/DB limits.

4. **MinIO**
   - Single node; throughput depends on disk and network. Usually not the first bottleneck for a small app.

5. **Next.js single process**
   - One Node process handles all API and SSR. No horizontal scaling in current setup.

### 2.2 Summary: How Many Users Can We Manage Today?

| Metric | Conservative | Optimistic |
|--------|--------------|------------|
| **Concurrent active users** (browsing, chat, dashboard open) | ~50–100 | ~150–250 |
| **Peak requests per second** (all endpoints) | ~10–20 req/s | ~30–50 req/s |
| **Registered users** (total) | Unlimited* | Unlimited* |
| **Simultaneous chat/sexter sessions** | ~20–40 | ~60–80 |

\* DB and MinIO can store many users; the limit is **concurrent request load** on the single app instance and DB.

**“Active”** here means users with the app open and polling (dashboard, chat widget, sexter, etc.). **Idle registered users** do not add load.

---

## 3. What “Production Level” Means (Goals)

Define production targets so the plan is measurable:

| Goal | Target |
|------|--------|
| **Availability** | 99%+ uptime (excluding planned maintenance) |
| **Concurrent users** | Support 500–1,000+ active users without degradation |
| **Peak RPS** | Handle 100–200+ requests/second |
| **Latency** | p95 API response < 2 s under normal load |
| **Data safety** | Backups, point-in-time recovery where needed |
| **Security** | HTTPS, secrets in env, no credentials in client |
| **Observability** | Logs, metrics, alerts on errors and saturation |

---

## 4. Production Scaling Plan

### Phase 1 — Stabilise & Harden (Single Instance)

**Goal:** Run reliably on one app instance and one DB, with clear limits and safety nets.

| # | Action | Why |
|---|--------|-----|
| 1.1 | **Add Prisma connection pooling** | Avoid exhausting DB connections; use a pool size appropriate for one app instance (e.g. 10–20). |
| 1.2 | **Configure DB connection string** | Use a connection limit in PostgreSQL and/or use PgBouncer if you run multiple app replicas later. |
| 1.3 | **Add request timeouts** | Prevent long-running requests (e.g. Sharp, MinIO) from holding connections indefinitely. |
| 1.4 | **Health checks** | `GET /api/health` that checks DB (and optionally MinIO) and returns 503 if unhealthy. |
| 1.5 | **Structured logging** | Log request id, user id (if auth), route, duration, errors; avoid logging PII. |
| 1.6 | **Secrets & env** | All secrets from env; no hardcoded keys; use different JWT_SECRET and DB per environment. |
| 1.7 | **HTTPS only** | Terminate TLS at load balancer or reverse proxy; redirect HTTP → HTTPS. |

**Outcome:** One instance can run predictably up to the ~50–150 concurrent active user range with fewer connection and timeout issues.

---

### Phase 2 — Reduce Load Per User (Efficiency)

**Goal:** Lower polling and duplicate work so the same instance can serve more users.

| # | Action | Why |
|---|--------|-----|
| 2.1 | **Increase polling intervals** | e.g. Chat list 4 s → 8 s, messages 10 s → 15 s where UX allows. Fewer requests per user. |
| 2.2 | **Cache photo proxy responses** | In-memory or Redis cache for blurred/full image by `photoId` + role/connection (with short TTL). Reduces Sharp and MinIO load. |
| 2.3 | **CDN for static assets** | Serve JS/CSS/images (e.g. Next.js static) from CDN to reduce app and origin load. |
| 2.4 | **Lazy-load chat widget** | Only start polling when widget is opened; stop when closed. Cuts load from users who never open chat. |
| 2.5 | **Paginate heavy lists** | Escorts, connections, credit history: limit + offset or cursor; avoid large JSON payloads. |

**Outcome:** Same hardware supports more concurrent users (e.g. 1.5–2×) and better p95 latency under load.

---

### Phase 3 — Horizontal Scaling (Multi-Instance)

**Goal:** Add more app instances behind a load balancer so traffic is shared.

| # | Action | Why |
|---|--------|-----|
| 3.1 | **Stateless app** | Already true (JWT auth, no in-memory sessions). Ensure no local file or in-memory state that must be shared. |
| 3.2 | **Load balancer** | Put 2+ Next.js instances behind a load balancer (e.g. AWS ALB, GCP LB, Nginx). Health check on `/api/health`. |
| 3.3 | **DB connection budget** | With N app instances, each with pool size P, total connections ≈ N × P. Set PostgreSQL `max_connections` and/or use PgBouncer so DB is not overwhelmed. |
| 3.4 | **Session affinity** | Optional: sticky session for WebSocket if you add it later; not required for current REST-only setup. |
| 3.5 | **MinIO / S3** | MinIO or S3 is already shared; no change. For production, consider managed S3 with CDN in front for reads. |

**Outcome:** 2–4 app instances can share load; effective capacity scales roughly linearly with instance count (until DB becomes the bottleneck).

---

### Phase 4 — Database Scaling

**Goal:** Keep DB performant as data and request volume grow.

| # | Action | Why |
|---|--------|-----|
| 4.1 | **Indexes** | Ensure indexes on hot paths: e.g. `Booking(clientId, status)`, `Booking(escortId, status)`, `Message(bookingId)`, `CreditTransaction(userId, createdAt)`, `SexterSession(clientId, escortId)`. |
| 4.2 | **Read replica** | Use one primary (writes) + one or more read replicas; route read-only queries (e.g. list escorts, get profile) to replica via Prisma or separate client. |
| 4.3 | **Connection pooler** | PgBouncer (or managed pooler) in front of PostgreSQL to handle many app connections with fewer DB connections. |
| 4.4 | **Backups** | Automated daily backups; test restore; optional point-in-time recovery for production. |

**Outcome:** DB can handle higher read/write volume and more app instances without becoming the first bottleneck.

---

### Phase 5 — Image & Media Scaling

**Goal:** Remove image and media load from the app server and improve global latency.

| # | Action | Why |
|---|--------|-----|
| 5.1 | **CDN in front of MinIO/S3** | Serve images (and optionally blurred variants) via CDN; reduce load on app and MinIO. |
| 5.2 | **Pre-compute blurred thumbnails** | On upload, generate and store a blurred version; serve it for non-connected clients instead of Sharp on-the-fly. |
| 5.3 | **Signed URL redirect** | For full-size images, return 302 to signed MinIO/S3 URL instead of streaming through the app (where acceptable for privacy). |
| 5.4 | **Managed object storage** | Consider AWS S3 / GCS / equivalent with CDN for production instead of self-hosted MinIO if ops burden is a concern. |

**Outcome:** Photo and media traffic no longer saturate app CPU; better latency and scalability.

---

### Phase 6 — Observability & Operations

**Goal:** Run production with visibility and automated reactions.

| # | Action | Why |
|---|--------|-----|
| 6.1 | **Metrics** | Expose or send metrics (e.g. request count, latency, error rate, DB pool usage). Use Prometheus, Datadog, or platform metrics. |
| 6.2 | **Alerts** | Alert on high error rate, high latency, DB connection exhaustion, disk usage, health check failures. |
| 6.3 | **Log aggregation** | Send logs to a central store (e.g. CloudWatch, Logtail, Datadog) with levels and request ids. |
| 6.4 | **Cron / scheduled jobs** | Run purge and maintenance jobs (e.g. sexter session purge) via cron or scheduler; protect with secret header. |
| 6.5 | **Rate limiting** | Optional: rate limit by IP or user on login/register and expensive APIs to reduce abuse and burst load. |

**Outcome:** You can detect and respond to incidents and capacity limits before users are impacted.

---

## 5. Suggested Order & Effort

| Phase | Focus | Relative effort | When |
|-------|--------|------------------|------|
| 1 | Stabilise & harden | Low | Before or at launch |
| 2 | Efficiency (polling, cache, CDN) | Medium | Before scaling out |
| 3 | Horizontal scaling | Medium | When single instance is near limit |
| 4 | Database scaling | Medium | When DB is bottleneck |
| 5 | Image/media scaling | Medium | When photo traffic is high |
| 6 | Observability | Ongoing | From day 1 in production |

---

## 6. Capacity After Scaling (Targets)

| Scenario | After Phase 1–2 | After Phase 3–4 | After Phase 5 |
|----------|------------------|------------------|----------------|
| **Concurrent active users** | ~150–300 | ~500–1,000+ | ~1,000+ |
| **Peak RPS** | ~30–60 | ~100–200+ | ~200+ |
| **Photo/media load** | Still on app | Still on app | Offloaded to CDN/storage |

---

## 7. Quick Reference: Current vs Production

| Aspect | Current | Production target |
|--------|---------|-------------------|
| **App instances** | 1 | 2+ behind LB |
| **DB connections** | Default pool | Configured pool + optional PgBouncer |
| **Image handling** | Sharp on every request | Cache + CDN + pre-computed blur |
| **Polling** | 4–10 s in many places | Slightly slower or replaced by WebSocket later |
| **Caching** | None (no-store on many APIs) | Redis or in-memory for hot paths |
| **Health & monitoring** | None in repo | Health endpoint, metrics, alerts, logs |
| **Backups** | Manual / unknown | Automated, tested restore |

This plan, applied in phases, should take the current codebase from **~50–150 concurrent active users** to **production level** (500–1,000+ active users, 99%+ uptime, and room to grow further with DB and CDN scaling).
