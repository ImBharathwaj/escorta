# Escort KYC / ID Verification (Optional)

This document describes an **optional** KYC/ID verification process for escorts to increase trust and reduce abuse, without turning Escorta into a regulated identity vault.

The current product already supports manual verification flags:

- `EscortProfile.isVerified` (general “profile verified”)
- `EscortProfile.isGenderVerified` (admin-verified gender)

Admins can toggle these from the existing admin UI (`/admin/escorts`).

---

## Goals

- Increase user trust (verified badges).
- Reduce fraud (fake profiles, catfishing).
- Improve moderation outcomes with stronger identity confidence.

---

## Non-goals

- Do **not** store raw government IDs in our database long-term.
- Do **not** perform credit checks / address verification.
- Do **not** create a KYC vault unless required by payments/regulation later.

---

## Recommended Verification Levels

### Level 1: Basic profile verification (`isVerified`)

**Signals (one or more):**

- Live selfie video call with admin/moderator (short).
- Social proof / consistency checks (photos match profile; no obvious stock images).
- Optional: manual check of a masked ID photo (see handling rules below).

**Admin action:**

- Set `EscortProfile.isVerified = true`

### Level 2: Gender verification (`isGenderVerified`)

Only for escorts who set `gender = "female"` and want a badge.

**Signals (choose one):**

- Live selfie video call + explicit confirmation.
- Third-party verification provider result (preferred if adopted later).

**Admin action:**

- Set `EscortProfile.isGenderVerified = true`

---

## Collection & Handling Rules (Privacy)

If any ID is used during review:

- Prefer **live review** (e.g. admin sees ID briefly over a call) over file upload.
- If file upload is temporarily needed:
  - Require the user to **mask** non-essential fields (address, ID number).
  - Do not store the raw file in Postgres.
  - Store it in private object storage with **short TTL** (e.g. 24–72 hours) and delete after decision.
  - Restrict access to a small admin group.
  - Log access for audit (who viewed, when).

**Never collect:**

- Full address, full ID number, full DOB (18+ is the only requirement).

---

## Suggested Operational Workflow

1. **Escort requests verification**
   - In MVP, this can be handled via support email or an admin-managed queue.
2. **Admin reviews**
   - Confirm the escort is active, profile looks consistent, and request is legitimate.
3. **Optional live check**
   - Short call to compare face to profile media.
4. **Decision**
   - Toggle `isVerified` and/or `isGenderVerified`.
5. **Communication**
   - Notify the escort of status (approved/rejected) and next steps.

---

## Future Extension (If needed)

If you later want a full in-product request flow:

- Add a `EscortVerificationRequest` model with:
  - `escortId`, `status`, `createdAt`, `reviewedAt`, `reviewedByUserId`, `notes`
- Add admin UI for the queue and decisioning.
- Use a third-party KYC provider rather than storing IDs yourself.

