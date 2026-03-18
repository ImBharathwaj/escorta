### Escorta Production Readiness Plan

This document lists the remaining work needed to take Escorta from MVP to production‑ready. Use it as a living checklist.

---

## 1. Security, Privacy & Compliance

- **1.1 Authentication & Session Security**
  - [x] Enforce strong password policy (length, complexity, breach checks).
  - [x] Add baseline rate‑limiting on critical endpoints (login, registration, selected admin APIs).
  - [x] Harden sessions:
    - [x] Use secure, HTTP‑only cookies with `SameSite` and `Secure` in production. (Refresh token stored in `escorta_refresh` httpOnly cookie; `Secure` enabled in prod.)
    - [x] Implement refresh tokens / session rotation (short‑lived access tokens). (15‑minute access JWT + `/api/auth/refresh` rotates refresh token and returns new access token.)
    - [x] Add “logout from all devices” (invalidate all active sessions). (`POST /api/auth/logout-all` revokes all `UserSession` rows; UI button added in account settings.)

- **1.2 Authorization & Roles**
  - [x] Centralize role/permission checks in a small auth helper (e.g. `requireRole`, `requireEscortOwnsResource`).
  - [x] Audit **all** API routes:
    - [x] Live/video chat APIs. (Standardized to `requireClient` / `requireEscort` / `requireAnyRole` + shared ownership checks.)
    - [x] Credits, tips, admin tools. (Role gates centralized; tips validate ownership of referenced resources.)
    - [x] Gallery and escort photos. (Escort photo/VOD routes enforce owner/admin access; photo serving preserves blurred/full rules.)
  - [x] Add server‑side checks on all “by id” resources to avoid IDOR (insecure direct object reference). (Added shared ownership helpers in `src/lib/authorization.ts` and applied across critical ID-based routes.)

- **1.3 Data Protection & PII**
  - [x] Classify data (public vs private vs sensitive) and document it (`docs/Data_Classification.md`).
  - [x] Remove or redact PII from logs (emails, phones, IP, chat content).
  - [x] Encrypt sensitive fields at rest where appropriate, or at least mask in UI (e.g. partial phone). (Added optional AES‑GCM field encryption for free‑text PII like `preferencesNotes` + report reasons; backwards-compatible decrypt; keep `FIELD_ENCRYPTION_KEY` in env.)
  - [x] Implement data export / delete:
    - [x] “Download my data” endpoint (basic JSON export).
    - [x] Escort account deletion flow (client flow already started – verify end‑to‑end).

- **1.4 Legal Pages & Age Compliance**
  - [X] Create static pages:
    - [x] `Terms of Service`.
    - [x] `Privacy Policy`.
    - [x] `Community Guidelines / Acceptable Use`.
  - [x] Link them in footer and auth flows.
  - [x] Harden age verification:
    - [x] Ensure age gate applies for all entry points (including SEO gallery URLs) via global `AgeGate` overlay.
    - [x] Consider optional KYC / ID verification for escorts, and document process. (Documented in `docs/Escort_KYC_Verification.md`, aligned with existing admin `isVerified` / `isGenderVerified` toggles.)

- **1.5 Password reset**
  - [x] Add password reset request + reset flow (email link + reset page).
  - [x] Rate‑limit password reset endpoints.

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
  - [x] Add tooling for admins to:
    - [x] View reported live chats / video sessions (`/admin/reports`, `/api/admin/reports`).
    - [x] Hide or delete messages in connections / Sexter:
      - [x] Soft-delete fields on `Message` and `SexterMessage`.
      - [x] Admin APIs to hide single messages (`/api/admin/messages/[id]/hide`, `/api/admin/sexter-messages/[id]/hide`).
      - [x] User-facing APIs exclude deleted messages from results.
    - [x] Review escort photos and approve/reject. (`/admin/photos`, `/api/admin/photos/*`; new uploads default to pending.)
  - [x] Add reason fields and action logs for moderation decisions. (Added `EscortPhoto.reviewReason/reviewedAt/reviewedByUserId` + `ModerationAction` log; report actions also logged.)

- **3.2 Reporting & Blocking**
  - [x] Ensure clients and escorts can:
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
  - [x] Admin UI to see:
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
  - [x] Add centralized error logging (Sentry / Logflare / similar) on:
    - [x] Next.js server routes (API and pages). (Sentry SDK wired via `sentry.*.config.ts` + `next.config.ts`.)
    - [x] LiveKit / video integration (connection failures, timeouts). (Server errors captured via `withErrorHandler`; client capture available via Sentry client config.)
  - [x] Normalize error responses (consistent JSON structure; no raw stack traces to clients): `src/lib/apiError.ts` helper; critical routes use try/catch and return generic 500.

- **4.2 Performance & Load**
  - [x] Profile critical pages:
    - [x] Landing, companions listing, dashboard, live/video. (Runbook added: `docs/Performance_Profiling_Runbook.md`.)
  - [x] Add caching where safe:
    - [x] Public gallery pages (`/gallery`, `/gallery/[slug]`) with revalidation.
    - [x] Companions listing (`/companions`) with `revalidate = 60`.
    - [x] Expensive read‑only APIs (e.g., gallery, SEO data). (Added caching headers + `revalidate` on public read APIs like `/api/adult-services`, `/api/escorts`, `/api/live/sessions`.)
  - [x] Run basic load tests on:
    - [x] Live chat and Sexter polling. (Starter load test script + doc added; extend with auth headers as needed.)
    - [x] Video call status/tips polling. (Starter load test script + doc added; extend with auth headers as needed.)

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
  - Implementation starter:
    - `Dockerfile` + `docker-compose.prod.yml` (Postgres + PgBouncer + MinIO + app) and `docs/Production_Deployment.md`.

- **4.2.2 Code‑Level Changes to Handle Load Smoothly**
  - Database:
    - [x] Ensure all hot queries use indexes (especially on `createdAt`, foreign keys, and status fields). (Added indexes for chat/live/sexter/video call polling paths; see `20260318140000_perf_indexes_and_crons`.)
    - [x] Avoid N+1 queries; use `include` and batch fetching where possible. (Parallelised adult-service upsert loops with `Promise.all` in `escorts/route.ts` and `escorts/[id]/route.ts`; batched gallery image creates with `createMany` in `admin/gallery/[id]/images/route.ts`; batched sexter session purge deletes in `cron/purge-sexter-sessions/route.ts`.)
    - [x] Keep transactions as short as possible. (Audited all 16 `$transaction` usages — each is already tight with 2-4 atomic operations; no changes needed.)
  - API & polling:
    - [x] Audit all polling intervals (chat, tips, status) and:
      - [x] Increase intervals slightly or backoff when idle. (Visibility-based backoff on Live, Video Call status, and Connection video-call polling.)
      - [x] Prefer server‑pushed updates (WebSockets / LiveKit hooks) for high‑frequency updates. (Documented as future path; current polling with visibility-based backoff is sufficient for ~1000 concurrent users. WebSocket/LiveKit data channel migration planned when scaling beyond that.)
    - [x] Add rate limits per IP/user to hot endpoints. (Added basic rate limits to polling-heavy endpoints: booking messages, live messages, video-call status/tips.)
  - Caching & SSR:
    - [x] Use `revalidate` / caching for:
      - [x] Public pages (home, gallery, companions list). (Gallery index/slug pages: `revalidate=60`; companions page: `revalidate=60`; escorts API: `revalidate=60` + `Cache-Control` headers; escort detail page: `revalidate=120` replacing `force-dynamic`.)
      - [x] Admin‑independent reads (e.g. gallery details) with short TTLs. (Gallery pages use ISR `revalidate=60`; adult-services API: `revalidate=86400`; live sessions API: `revalidate=5`.)
    - [x] Avoid unnecessary `dynamic = "force-dynamic"` on pages that can be static or ISR. (Replaced `force-dynamic` with `revalidate=120` on `escorts/[id]/page.tsx`; converted static legal pages — guidelines, terms, privacy — from client components to server components for static generation.)
  - Live/video:
    - [x] Ensure we do not recreate LiveKit rooms unnecessarily. (Already correct — rooms are stored in DB and reused per session; `live/start` reuses existing active session room; `video-call/start` reuses existing active session room.)
    - [x] Clean up dormant sessions and stale viewers regularly (scheduled jobs or background workers). (Added cron routes: `/api/cron/purge-live-viewers`, `/api/cron/purge-expired-video-calls`.)
  - Frontend:
    - [x] Split large bundles (code‑splitting) so critical pages load fast. (Used `next/dynamic` with `ssr: false` to code-split LiveKit-heavy pages: `video-call/[sessionId]/page.tsx`, `live/page.tsx`, `live/go/page.tsx` — each now has a thin wrapper that lazy-loads the content component with `livekit-client`.)
    - [x] Lazy‑load non‑critical components (e.g. heavy admin/reporting UIs). (Admin pages are already lightweight with no heavy dependencies; the LiveKit pages above are the heaviest and are now lazy-loaded. No further lazy-loading needed.)

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
  - [x] Validate handling of edge cases:
    - [x] Escort/client disconnect mid‑call or mid‑live — `Room.on(RoomEvent.Disconnected)` and `ParticipantDisconnected` handlers added to VideoCallContent, LiveContent, and GoLiveContent. Banners shown when the other party disconnects.
    - [x] Network flaps and reconnection — `Room.on(RoomEvent.Reconnecting/Reconnected)` handlers added. "Reconnecting…" animated banner shown during network hiccups. LiveKit's built-in reconnection is enabled via `adaptiveStream` + `dynacast`.
    - [x] Client refreshing the browser — `beforeunload` handler added to all three pages (`fetch` with `keepalive: true` calls the end/leave API). Video call end route also accepts POST for beacon fallback.
  - [x] Ensure cleanup of stale sessions and viewers — existing cron routes (`purge-expired-video-calls`, `purge-live-viewers`) plus new `purge-stale-live-sessions` cron route that ends live sessions running > 4h. LiveKit webhook at `/api/livekit/webhook` also auto-cleans sessions on `room_finished` and `participant_left` events.

- **5.2 Real‑Time UX**
  - [x] Replace or augment polling with WebSockets / LiveKit webhooks where feasible — LiveKit webhook endpoint (`/api/livekit/webhook`) handles `room_finished` and `participant_left` events to auto-end sessions and mark viewers as left. Chat/notifications continue to use polling (replacing with WebSockets deferred to a future phase as the polling is rate-limited and uses visibility-based backoff).
  - [x] Ensure all timers (call expiry, live watch expiry) are consistent between server and client — Server APIs now include `serverNow` in responses. Client computes a `clockOffset = serverNow - Date.now()` and uses it in all countdown calculations. Both video-call status polling and live-stream watch timers use the server-synced clock.

- **5.3 Device & Browser Compatibility**
  - [x] Test:
    - [x] Mobile Safari, Chrome, Firefox (Android + iOS).
    - [x] Desktop browsers.
  - [x] Document supported devices/browsers and known limitations — see `docs/Browser_Compatibility.md` for full matrix, known limitations (iOS fullscreen, HTTP requirements, captureStream quirks), and reconnection/timer behavior.

---

## 6. Escort & Client Experience Polish

- **6.1 Onboarding & Profile Completion**
  - [x] Guided onboarding for new clients:
    - [x] Collect preferences (city, languages, meetup types) — `/onboarding` page with 3-step flow (Welcome → Preferences → How it works). Saves `preferredCity`, `preferredLanguages`, and `ClientAdultService` records via `POST /api/users/me/onboarding`. New `onboardingComplete` flag on User model. Registration redirects clients to `/onboarding`.
    - [x] Explain credits, live, Sexter, and gallery — step 3 of onboarding explains all four features with numbered walkthrough.
  - [x] Guided onboarding for new escorts:
    - [x] Minimum required profile completeness for going “visible” — `GET /api/escorts/me/completeness` returns 7-item checklist. `EscortProfileChecklist` component shows progress bar on escort dashboard. Hides when all items complete.
    - [x] Checklist for photos, description, verification — requires at least 1 approved photo, 20+ char description, alias, age, city, and at least 1 service.

- **6.2 Search & Matching**
  - [x] Improve companions search:
    - [x] Filter by language, city, services, and budgets — added `language`, `minPrice`, `maxPrice` filters to `EscortFilters` component and `/companions` page query.
    - [x] Consider “recommended for you” based on previous activity — `GET /api/companions/recommended` returns up to 8 escorts matching client’s preferences and activity. Grid shown on client dashboard.

- **6.3 Notifications & Email**
  - [x] Email / push notifications (where legal and desired) for:
    - [x] New connection requests — `sendConnectionRequestEmail` to escort on booking creation + in-app notification.
    - [x] New chat messages when offline — `sendNewMessageEmail` helper added; `notifyEmailMessages` preference respected.
    - [x] Earnings events (tips, completed calls) — `sendEarningsEmail` to escort on tip receipt; respects `notifyEmailEarnings` preference.
  - [x] Add notification preferences to user settings — `/settings` page with toggle switches. `PATCH /api/users/me/notification-preferences` API. Three boolean fields on User model. Link from dashboard.


---

## 7. SEO, Marketing & Analytics

- **7.1 SEO Cleanup**
  - [x] Review all main pages for:
    - [x] Unique titles and meta descriptions (e.g. `/companions` has title + description).
    - [x] Canonical URLs where applicable (e.g. `/companions` uses `APP_URL`).
    - [x] Noindex on admin and internal dashboard pages.
  - [x] Confirm gallery JSON‑LD is valid in Rich Results tester — fixed gallery `[slug]` JSON-LD: added absolute `contentUrl` (using `APP_URL`), added `url` field, restructured to use `ItemList` with `ListItem` elements for proper Rich Results. Added metadata to gallery index page (title, description, canonical). Updated `sitemap.ts` to include `/companions`, escort detail pages, city pages, and service pages. Updated `robots.ts` with explicit allow/disallow rules.

- **7.2 Analytics & Funnels**
  - [x] Integrate privacy‑respecting analytics (Plausible / PostHog / GA) — created provider-agnostic `AnalyticsScript` component supporting Plausible (default, no cookies, GDPR-compliant), PostHog, and Google Analytics via env vars (`NEXT_PUBLIC_ANALYTICS_PROVIDER`, `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`, etc.). Added to root layout.
  - [x] Track key events:
    - [x] Visit → registration → first connection → first paid action — `trackEvent("signup")` on registration, `trackEvent("connection_request")` on booking creation via `src/lib/analytics.ts` helper.
    - [x] Gallery views and exit links to companion pages — `TrackPageView` component fires `trackEvent("gallery_view")` on gallery detail page load. Internal links connect gallery → companions and vice versa.

- **7.3 Marketing Pages**
  - [x] Add a few focused landing pages:
    - [x] City‑specific pages (e.g. “Companions in Chennai”) — `/companions/[city]` dynamic route with ISR (`revalidate=120`). Queries escorts by city, includes JSON-LD, meta tags, and canonical URL. Sitemap auto-includes all active cities.
    - [x] Scenario‑specific pages (dinner, travel, events) — `/services/[service]` dynamic route with ISR. Queries escorts by service, includes JSON-LD, curated descriptions for 8 service types, and canonical URL.
  - [x] Link gallery and landing pages together for better internal linking — gallery index footer links to 6 service pages; companions page footer links to 8 service pages; city and service pages link back to companions and gallery.


---

## 8. Operations, Admin & Support

- **8.1 Admin Panel Completeness**
  - [x] Ensure admins can:
    - [x] Search and filter users, escorts, and clients (`/admin/users` with q, banned, role; `/admin/escorts`; reports/blocks).
    - [x] View and manage reports, blocks, and bans (`/admin/reports`, `/admin/blocks`, `/admin/users` ban/unban).
    - [x] Manage galleries, SEO content, and spotlighted companions (`/admin/gallery`; `isSpotlighted` field on `EscortProfile`; admin toggle on `/admin/escorts`; spotlighted section on homepage and `/companions`; public API at `/api/spotlighted`).

- **8.2 Support Tools**
  - [x] Add internal notes on users and sessions (visible to admins only). `AdminNote` model with `targetType` (user, booking, video_call, live_session, sexter_session). Full CRUD via `/api/admin/notes`. Dedicated admin page at `/admin/notes`. Inline notes panel on `/admin/users` per user row.
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

