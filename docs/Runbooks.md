# Runbooks

Internal procedures for operations and support.

---

## Onboarding new escorts

1. **Application**: Escorts sign up via the app (register as escort, complete profile).
2. **Profile completeness**: Ensure profile has alias, at least one photo, and description. Use **Admin → Escorts** to review.
3. **Photo approval**: In Escort verification, set **Photo approved** so photos appear on listing. Use **Gender verified** only after ID/verification if you run that process.
4. **Visibility**: Escort is visible on **Companions** when profile is active and at least one photo is approved. No separate “go live” step in current flow.
5. **Gallery (optional)**: Escort can mark photos “Allow for gallery” in their profile; admin adds those to galleries via **Admin → Gallery**.

---

## Handling abuse reports

1. **Review**: Open **Admin → Reports**. Each row is a report (type, reference ID, reporter, reason).
2. **Context**: Use reference ID to find the session:
   - `live_session` → Live session ID (live stream).
   - `video_call` → Video call session ID.
   - `booking` → Booking/connection ID (use **Connections** or DB if needed).
   - `sexter_session` → Sexter session ID.
3. **Actions**:
   - **Mark resolved**: Removes the report (use when no action needed or after handling).
   - **Ban reporter**: If the reporter is abusive (e.g. false reports), use **Ban reporter** to set `User.isBanned` and `User.isActive = false`.
   - To **ban the reported user** (e.g. the companion or client who was reported): go to **Admin → Users**, search by email/name, then **Ban**.
4. **Message/session moderation**: To hide a specific message in a connection or sexter chat, use the admin hide APIs (e.g. `PATCH /api/admin/messages/[id]/hide` or `/api/admin/sexter-messages/[id]/hide`) with an admin token. (UI for this can be added later.)
5. **Blocks**: **Admin → Blocks** shows who blocked whom. Unblock only via DB or a future admin “Unblock” action if required by policy.

---

## Recovering from downtime or data issues

1. **App down**:
   - Check hosting (Vercel/Render/containers) and process health.
   - Check database connectivity (connection string, pooler if used).
   - Check env vars (e.g. `DATABASE_URL`, `JWT_SECRET`, `APP_URL`, LiveKit env if used).
   - Restart app or scale up if needed.

2. **Database**:
   - Use managed provider’s backup/restore (e.g. point-in-time restore).
   - If you have migrations pending: `npx prisma migrate deploy` in production. Never run `migrate dev` in prod.

3. **Storage (MinIO/S3)**:
   - Ensure bucket exists and app has correct credentials.
   - If objects are missing, restore from bucket backups if available.

4. **LiveKit / video**:
   - If video/live fails, check LiveKit project and keys; ensure `LIVEKIT_URL` and `LIVEKIT_API_*` are set and correct.
   - Restarting the app does not disconnect existing LiveKit rooms; users may need to refresh.

5. **Data correction**:
   - **Unban a user**: Admin → Users → search → **Unban**.
   - **Credits**: Use **Admin → Add credits** to grant test credits; no UI for reducing credits (DB or script if needed).
   - **Delete content**: Use admin hide APIs for messages; for full account deletion use the user-facing delete-account flow or DB with care.

6. **Logs**: Check server logs (and any centralized logging like Sentry/Logflare if configured) for stack traces and failed requests. Never expose raw stack traces to clients; use normalized error responses.
