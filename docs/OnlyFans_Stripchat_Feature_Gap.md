# Escorta Feature Inventory and Gap Analysis (OnlyFans / Stripchat)

## 1) Features currently available in this app

### Account, identity, and access
- User roles: `client`, `escort`, `admin`.
- Email/password auth with JWT + refresh sessions, logout-all, password reset, email verification.
- User onboarding and notification preferences.
- Block/unblock users.
- Basic verification flags on escort profiles (`isVerified`, `isGenderVerified`).

### Profile and discovery
- Escort profile creation/editing (bio, city, price, services, languages, photos, availability, gender).
- Companion browsing pages with filters and city pages.
- Public profile pages and media gallery pages.
- Recommended companions endpoint.

### Communication and paid interactions
- Booking/connection request flow (pending/accepted/rejected/cancelled/completed).
- Connection chat with moderation support (hide/delete by admin).
- Session-based “Sexter” chat with timed credit-based extensions and media attachments.
- Live streaming sessions (LiveKit) with:
  - join/leave
  - watch-time credits and extensions
  - live text chat
  - session reporting
  - tipping
- 1:1 video calls (LiveKit) with:
  - request/accept/decline/cancel flow
  - timed credit blocks + extend
  - tip support

### Monetization
- Credits wallet and transaction ledger.
- Tip economy (`tip`, `tip_earned`).
- Membership purchase flow (Razorpay create order + unlock).
- Admin credit grants.

### Content and media
- Escort photo upload and moderation pipeline (pending/approved/rejected).
- Premium companion VOD upload and playback URL generation.
- Admin gallery management (SEO/media galleries).

### Trust, safety, and operations
- Session reporting (live/video/booking/sexter/user contexts).
- Admin moderation actions, notes, user management, blocks listing.
- Admin analytics endpoints/pages.
- Rate limiting and cron cleanup jobs (stale sessions/viewers).

## 2) What must be added for OnlyFans-like parity

### Core creator-business features (high priority)
- **Paid subscriptions to creators** (monthly recurring billing, subscribe/unsubscribe, renewals, grace period).
- **Creator paywalled content feed** (posts with image/video/text, public/paid/subscriber visibility).
- **PPV DMs and PPV posts** (locked media in messages/feed, one-click unlock with wallet).
- **Follower/subscriber graph** (follow without subscribe, subscriber badges, fan segmentation).
- **Creator earnings dashboard** with MRR, churn, ARPPU, top fans, content revenue split by type.

### Payments and payout stack (high priority)
- **Payment orchestration beyond one-time unlock**:
  - recurring billing support
  - multiple payment methods/regions
  - failed payment retries + dunning
- **Creator payouts**:
  - withdrawable balance
  - payout schedule
  - payout provider integration
  - tax/KYC payout compliance
- **Refund/chargeback workflows** and risk scoring.

### Content product depth
- **Rich post composer** (scheduled posts, bundles, polls, expiration, audience targeting).
- **Mass messaging campaigns** (broadcast DM to fans with optional PPV unlock).
- **Story/highlight format** (ephemeral content).
- **Collections/playlists** and pinned posts.

### Compliance and policy controls
- **18+ and consent workflow hardening** (recorded consent for uploaded content participants).
- **DMCA/takedown workflow** (ticketing + SLA + evidence storage).
- **Geo and policy gating** (country/state restrictions by content type).
- **Audit-ready moderation queue** for content, chat, and account enforcement with escalation states.

## 3) What must be added for Stripchat-like parity

### Live cam monetization depth (high priority)
- **Tip menu** (configurable actions/prices).
- **Tip goals and progress bars**.
- **Private shows and group shows** with per-minute rates.
- **Fan club / room membership tiers**.
- **Interactive room mechanics** (leaderboards, spinning wheel, games, commands).

### Streaming infrastructure and real-time UX
- **WebSocket/data-channel real-time messaging** (replace polling for chat/reactions/events).
- **Broadcaster tooling**:
  - OBS/RTMP ingest support
  - bitrate/connection health
  - stream quality presets
- **Large-room scalability** (chat fan-out, moderation automation, latency controls).

### Discovery and growth
- **Live category/tags ranking** (new, trending, top earning, by niche/language/region).
- **Personalized recommendations** based on watch/tip behavior.
- **Affiliate/referral system** for traffic and creator acquisition.

## 4) Platform capabilities still missing for both models

- **Mobile apps** (or strong PWA parity) for both viewer and creator workflows.
- **Advanced anti-abuse**:
  - device fingerprinting
  - ban evasion controls
  - spam/fraud/bot detection
- **Anti-piracy protections**:
  - visible/invisible watermarking
  - screenshot/screen-record deterrence
  - leak monitoring hooks
- **A/B testing and experimentation framework** for pricing, onboarding, and conversion.
- **Event pipeline + BI layer** (warehouse-ready analytics, cohort and retention dashboards).

## 5) Suggested implementation phases

### Phase 1: Monetization foundation
- Creator subscriptions + recurring billing.
- PPV content unlocks (posts and DMs).
- Withdrawable earnings ledger and payout requests.

### Phase 2: Content and creator tools
- Creator feed, scheduling, mass messaging, audience segmentation.
- Subscriber/follower relationship model.
- Revenue analytics for creators.

### Phase 3: Cam platform depth
- Tip menu, goals, private/group shows.
- Real-time chat/event upgrade to WebSocket/data-channel.
- OBS ingest and stream-quality controls.

### Phase 4: Trust, compliance, and scale
- KYC/payout compliance expansion, DMCA workflow, moderation queue hardening.
- Fraud/risk controls, anti-piracy tooling, recommendation ranking, experiment framework.

## 6) Quick status summary

- Current product is already a strong **escort marketplace + credits + live/video interaction** platform.
- To look like **OnlyFans**, the biggest gap is **subscription + paywalled creator content business model**.
- To look like **Stripchat**, the biggest gap is **advanced cam-room monetization mechanics and real-time room infrastructure**.
