### Escorta Production Readiness Plan

This document lists the remaining work needed to take Escorta from MVP to production‑ready. Use it as a living checklist.

---

## 1. Security, Privacy & Compliance

- **1.1 Authentication & Session Security**
  - [x] Enforce strong password policy (length, complexity, breach checks).
  - [x] Add baseline rate‑limiting on critical endpoints (login, registration, selected admin APIs).
  - [ ] Harden sessions:
    - [ ] Use secure, HTTP‑only cookies with `SameSite` and `Secure` in production.
    - [ ] Implement refresh tokens / session rotation (short‑lived access tokens).
    - [ ] Add “logout from all devices” (invalidate all active sessions).

- **1.2 Authorization & Roles**
  - [x] Centralize role/permission checks in a small auth helper (e.g. `requireRole`, `requireEscortOwnsResource`).
  - [ ] Audit **all** API routes:
    - [ ] Live/video chat APIs.
    - [ ] Credits, tips, admin tools.
    - [ ] Gallery and escort photos.
  - [ ] Add server‑side checks on all “by id” resources to avoid IDOR (insecure direct object reference).

- **1.3 Data Protection & PII**
  - [x] Classify data (public vs private vs sensitive) and document it (`docs/Data_Classification.md`).
  - [x] Remove or redact PII from logs (emails, phones, IP, chat content).
  - [ ] Encrypt sensitive fields at rest where appropriate, or at least mask in UI (e.g. partial phone).
  - [ ] Implement data export / delete:
    - [x] “Download my data” endpoint (basic JSON export).
    - [x] Escort account deletion flow (client flow already started – verify end‑to‑end).

- **1.5 Password reset**
  - [x] Add password reset request + reset flow (email link + reset page).
  - [x] Rate‑limit password reset endpoints.

- **1.4 Legal Pages & Age Compliance**
  - [ ] Create static pages:
    - [x] `Terms of Service`.
    - [x] `Privacy Policy`.
    - [x] `Community Guidelines / Acceptable Use`.
  - [x] Link them in footer and auth flows.
  - [x] Harden age verification:
    - [x] Ensure age gate applies for all entry points (including SEO gallery URLs) via global `AgeGate` overlay.
    - [ ] Consider optional KYC / ID verification for escorts, and document process.

---

## 2. Payments, Credits & Payouts

- **2.1 Real Money → Credits**
  - [ ] Pick and integrate a payment provider (Stripe / Razorpay / Cashfree).
  - [ ] Implement “Buy credits” flow:
    - [ ] Pricing table (INR → credits).
    - [ ] Checkout page + PSP hosted UI or payment form.
    - [ ] Webhook listener to confirm payments and credit accounts.
  - [ ] Make credit transactions idempotent and auditable (avoid double‑crediting).

- **2.2 Credits Usage Hardening**
  - [ ] Review all credit‑spending flows:
    - [ ] Connections / messages.
    - [ ] Sexter sessions and extensions.
    - [ ] Live/video watch time and call time.
    - [ ] Tips.
  - [ ] Ensure these are all **wrapped in DB transactions** with proper failure handling.
  - [ ] Add clear error states and UI feedback for “insufficient credits”.

- **2.3 Escort Earnings & Payouts**
  - [ ] Add an escort earnings dashboard:
    - [ ] Lifetime credits earned.
    - [ ] Current withdrawable balance.
    - [ ] Earnings by type (chat, live, video calls, tips).
  - [ ] Decide payout model:
    - [ ] Manual bank transfer with admin ledger.
    - [ ] Or payout integration (Stripe Connect / local provider).
  - [ ] Add admin payout tools:
    - [ ] Mark payouts as processed.
    - [ ] Export statements (CSV) by escort/date range.

---

## 3. Moderation, Safety & Abuse Handling

- **3.1 Content Moderation**
  - [ ] Add tooling for admins to:
    - [x] View reported live chats / video sessions (`/admin/reports`, `/api/admin/reports`).
    - [x] Hide or delete messages in connections / Sexter:
      - [x] Soft-delete fields on `Message` and `SexterMessage`.
      - [x] Admin APIs to hide single messages (`/api/admin/messages/[id]/hide`, `/api/admin/sexter-messages/[id]/hide`).
      - [x] User-facing APIs exclude deleted messages from results.
    - [ ] Review escort photos and approve/reject.
  - [ ] Add reason fields and action logs for moderation decisions.

- **3.2 Reporting & Blocking**
  - [ ] Ensure clients and escorts can:
    - [x] Report sessions from key screens:
      - [x] Generic reporting API (`/api/reports`) using `SessionReport`.
      - [x] Report connection chats from `/connections/[id]` (type `booking`).
      - [x] Report Sexter sessions from escort Sexter chat (type `sexter_session`).
      - [x] Report 1‑1 video calls from `/video-call/[sessionId]` (type `video_call`).
    - [x] Block users (prevent new requests/messages) at API level:
      - [x] `UserBlock` model and relations.
      - [x] `/api/block`, `/api/unblock`, `/api/blocks`.
      - [x] Enforcement on:
        - [x] Connection requests (`POST /api/bookings`).
        - [x] Connection chat messages (`POST /api/bookings/[id]/messages`).
        - [x] Sexter sessions (client + escort message APIs).
        - [x] Video call requests (`POST /api/video-call/request`).
  - [ ] Admin UI to see:
    - [x] Open reports (`/admin/reports` with actions to resolve/ban).
    - [x] Block relationships (`/admin/blocks`, `/api/admin/blocks`).
  - [x] Block user from connection chat: “Block” button in header calls `POST /api/bookings/[id]/block`, then redirects to dashboard.

- **3.3 Safety UX**
  - [x] Add safety tips / reminders in key areas:
    - [x] Before 1‑1 video calls (copy in video call header).
    - [x] In connection chat header for all matches.
  - [x] Disclaimers that offline meetups are at users’ own risk; platform is a discovery tool, not a booking agent (footer disclaimer + block button in connection chat).

---

## 4. Reliability, Performance & Observability

- **4.1 Error Handling & Logging**
  - [ ] Add centralized error logging (Sentry / Logflare / similar) on:
    - [ ] Next.js server routes (API and pages).
    - [ ] LiveKit / video integration (connection failures, timeouts).
  - [x] Normalize error responses (consistent JSON structure; no raw stack traces to clients): `src/lib/apiError.ts` helper; critical routes use try/catch and return generic 500.

- **4.2 Performance & Load**
  - [ ] Profile critical pages:
    - [ ] Landing, companions listing, dashboard, live/video.
  - [ ] Add caching where safe:
    - [x] Public gallery pages (`/gallery`, `/gallery/[slug]`) with revalidation.
    - [x] Companions listing (`/companions`) with `revalidate = 60`.
    - [ ] Expensive read‑only APIs (e.g., gallery, SEO data).
  - [ ] Run basic load tests on:
    - [ ] Live chat and Sexter polling.
    - [ ] Video call status/tips polling.

- **4.2.1 Target Architecture for ~1000 Concurrent Users**
  - Assumptions:
    - ~1000 online users at peak (mix of guests, clients, escorts).
    - Majority on browsing / chat; a smaller fraction in live/video at any instant.
  - Suggested baseline:
    - **App server (Next.js)**:
      - 2× containers / VMs (or autoscaling group) with 2–4 vCPU and 4–8 GB RAM each.
      - Behind a load balancer (NGINX / cloud LB).
    - **Database (Postgres)**:
      - Managed instance (e.g. 2–4 vCPU, 8–16 GB RAM) with automated backups.
      - Connection pooler (PgBouncer) in front of the DB.
    - **LiveKit / media servers**:
      - Separate from the app:
        - One or more LiveKit nodes sized per their docs (CPU, bandwidth).
      - Use regional SFU nodes close to users if latency is an issue.
    - **Object storage (MinIO/S3)**:
      - Dedicated bucket for user media and gallery assets.
    - **CDN**:
      - Front the app and static assets with a CDN (Cloudflare / AWS CloudFront) for global caching.

- **4.2.2 Code‑Level Changes to Handle Load Smoothly**
  - Database:
    - [ ] Ensure all hot queries use indexes (especially on `createdAt`, foreign keys, and status fields).
    - [ ] Avoid N+1 queries; use `include` and batch fetching where possible.
    - [ ] Keep transactions as short as possible.
  - API & polling:
    - [ ] Audit all polling intervals (chat, tips, status) and:
      - [ ] Increase intervals slightly or backoff when idle.
      - [ ] Prefer server‑pushed updates (WebSockets / LiveKit hooks) for high‑frequency updates.
    - [ ] Add rate limits per IP/user to hot endpoints.
  - Caching & SSR:
    - [ ] Use `revalidate` / caching for:
      - [ ] Public pages (home, gallery, companions list).
      - [ ] Admin‑independent reads (e.g. gallery details) with short TTLs.
    - [ ] Avoid unnecessary `dynamic = "force-dynamic"` on pages that can be static or ISR.
  - Live/video:
    - [ ] Ensure we do not recreate LiveKit rooms unnecessarily.
    - [ ] Clean up dormant sessions and stale viewers regularly (scheduled jobs or background workers).
  - Frontend:
    - [ ] Split large bundles (code‑splitting) so critical pages load fast.
    - [ ] Lazy‑load non‑critical components (e.g. heavy admin/reporting UIs).

- **4.3 Uptime & Infrastructure**
  - [ ] Choose production hosting:
    - [ ] Next.js app (e.g. Vercel / Render / custom Docker).
    - [ ] Postgres database (managed service with backups).
    - [ ] MinIO/S3 storage (with backups and monitoring).
  - [ ] Set up:
    - [ ] Automatic database backups and restore runbook.
    - [ ] Health checks and alerts for downtime.

---

## 5. Live & Video Chat Hardening

- **5.1 LiveKit / WebRTC**
  - [ ] Validate handling of edge cases:
    - [ ] Escort/client disconnect mid‑call or mid‑live.
    - [ ] Network flaps and reconnection.
    - [ ] Client refreshing the browser.
  - [ ] Ensure cleanup of stale sessions and viewers.

- **5.2 Real‑Time UX**
  - [ ] Replace or augment polling with WebSockets / LiveKit webhooks where feasible (for chat and notifications).
  - [ ] Ensure all timers (call expiry, live watch expiry) are consistent between server and client.

- **5.3 Device & Browser Compatibility**
  - [ ] Test:
    - [ ] Mobile Safari, Chrome, Firefox (Android + iOS).
    - [ ] Desktop browsers.
  - [ ] Document supported devices/browsers and known limitations.

---

## 6. Escort & Client Experience Polish

- **6.1 Onboarding & Profile Completion**
  - [ ] Guided onboarding for new clients:
    - [ ] Collect preferences (city, languages, meetup types).
    - [ ] Explain credits, live, Sexter, and gallery.
  - [ ] Guided onboarding for new escorts:
    - [ ] Minimum required profile completeness for going “visible”.
    - [ ] Checklist for photos, description, verification.

- **6.2 Search & Matching**
  - [ ] Improve companions search:
    - [ ] Filter by language, city, services, and budgets.
    - [ ] Consider “recommended for you” based on previous activity.

- **6.3 Notifications & Email**
  - [ ] Email / push notifications (where legal and desired) for:
    - [ ] New connection requests.
    - [ ] New chat messages when offline.
    - [ ] Earnings events (tips, completed calls).
  - [ ] Add notification preferences to user settings.

---

## 7. SEO, Marketing & Analytics

- **7.1 SEO Cleanup**
  - [ ] Review all main pages for:
    - [x] Unique titles and meta descriptions (e.g. `/companions` has title + description).
    - [x] Canonical URLs where applicable (e.g. `/companions` uses `APP_URL`).
    - [x] Noindex on admin and internal dashboard pages.
  - [ ] Confirm gallery JSON‑LD is valid in Rich Results tester.

- **7.2 Analytics & Funnels**
  - [ ] Integrate privacy‑respecting analytics (Plausible / PostHog / GA).
  - [ ] Track key events:
    - [ ] Visit → registration → first connection → first paid action.
    - [ ] Gallery views and exit links to companion pages.

- **7.3 Marketing Pages**
  - [ ] Add a few focused landing pages:
    - [ ] City‑specific pages (e.g. “Companions in Chennai”).
    - [ ] Scenario‑specific pages (dinner, travel, events).
  - [ ] Link gallery and landing pages together for better internal linking.

---

## 8. Operations, Admin & Support

- **8.1 Admin Panel Completeness**
  - [ ] Ensure admins can:
    - [x] Search and filter users, escorts, and clients (`/admin/users` with q, banned, role; `/admin/escorts`; reports/blocks).
    - [x] View and manage reports, blocks, and bans (`/admin/reports`, `/admin/blocks`, `/admin/users` ban/unban).
    - [ ] Manage galleries, SEO content, and spotlighted companions (galleries done; spotlight TBD).

- **8.2 Support Tools**
  - [ ] Add internal notes on users and sessions (visible to admins only).
  - [x] Basic support inbox / contact form with spam protection.

- **8.3 Runbooks & Documentation**
  - [x] Internal docs for:
    - [x] How to onboard new escorts (`docs/Runbooks.md`).
    - [x] How to handle abuse reports (`docs/Runbooks.md`).
    - [x] How to recover from downtime or data issues (`docs/Runbooks.md`).

---

## 9. Final Launch Checklist

- [ ] Run a full regression test across:
  - [ ] Auth, profiles, connections, messaging.
  - [ ] Sexter, live, and video calls.
  - [ ] Credits, tips, admin tools, and galleries.
- [ ] Verify SEO pages (`/`, `/gallery`, `/gallery/[slug]`, `/companions`) render correctly in production.
- [ ] Verify payments in sandbox and live modes.
- [ ] Enable monitoring and alerting.
- [ ] Perform a soft launch with a small group of users, gather feedback, and iterate before wider promotion.

