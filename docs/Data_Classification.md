# Data Classification

This document classifies data held by Escorta for security and compliance.

## Public

- **Companion listings**: alias name, age, city, country, description, gender, verified badges, primary photo (and gallery-approved photos), services. Shown on `/companions` and escort profile pages.
- **Gallery**: Admin-created galleries and images with SEO metadata; escort photos only when explicitly allowed for gallery.
- **Legal pages**: Terms, Privacy, Guidelines (static content).
- **Landing page**: Marketing copy and CTAs.

## Private (authenticated user only)

- **Own profile**: email, phone, display name, avatar, preferences, password hash (never exposed in API).
- **Own credits and transactions**: balance, history (type, amount, reference, related user for display).
- **Own connections/bookings**: list and messages for connections the user is part of.
- **Own sexter sessions**: messages and tips for sessions where the user is client or escort.
- **Own live/video sessions**: participation, watch time, call status.
- **Own notifications**: last 5, read state.
- **Own blocks**: list of users blocked by me and users who blocked me.

## Sensitive (admin or system only)

- **All user PII**: full email, phone, display name for any user (admin panel only).
- **Password hashes**: never returned in any API; used only for verification.
- **Session reports**: reporter identity, reference IDs, reasons (admin reports UI).
- **User blocks**: full list (admin blocks UI).
- **Bans**: `User.isBanned`, `User.isActive` (admin users UI).
- **Internal notes**: if added later on users/sessions (admin only).
- **Support contact submissions**: content and submitter context (admin/support only).

## Retention and deletion

- **Account deletion**: User record soft-deleted (`deletedAt`), PII moved to `DeletedUserEmail` for legal/compliance; escort profile deactivated; photos and related data handled per Privacy Policy.
- **Messages**: Connection and sexter messages retained for the life of the connection/session; soft-delete (`deletedAt`) for moderation hides from UI but may be retained for abuse investigations.
- **Reports and blocks**: Retained for safety and abuse handling; no automatic expiry in current implementation.
