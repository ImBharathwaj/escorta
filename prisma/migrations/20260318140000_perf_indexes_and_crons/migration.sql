-- LiveSessionViewer
CREATE INDEX IF NOT EXISTS "LiveSessionViewer_live_session_id_left_at_idx"
  ON "LiveSessionViewer"("live_session_id", "left_at");

CREATE INDEX IF NOT EXISTS "LiveSessionViewer_watch_expires_at_idx"
  ON "LiveSessionViewer"("watch_expires_at");

-- LiveSessionMessage
CREATE INDEX IF NOT EXISTS "LiveSessionMessage_live_session_id_created_at_idx"
  ON "LiveSessionMessage"("live_session_id", "created_at");

-- VideoCallRequest
CREATE INDEX IF NOT EXISTS "VideoCallRequest_status_created_at_idx"
  ON "VideoCallRequest"("status", "created_at");

-- VideoCallSession
CREATE INDEX IF NOT EXISTS "VideoCallSession_status_expires_at_idx"
  ON "VideoCallSession"("status", "expires_at");

-- Booking
CREATE INDEX IF NOT EXISTS "Booking_client_id_status_idx"
  ON "Booking"("client_id", "status");

CREATE INDEX IF NOT EXISTS "Booking_escort_id_status_idx"
  ON "Booking"("escort_id", "status");

-- Message
CREATE INDEX IF NOT EXISTS "Message_booking_id_created_at_idx"
  ON "Message"("booking_id", "created_at");

-- SexterSession
CREATE INDEX IF NOT EXISTS "SexterSession_client_id_expires_at_idx"
  ON "SexterSession"("client_id", "expires_at");

CREATE INDEX IF NOT EXISTS "SexterSession_escort_id_expires_at_idx"
  ON "SexterSession"("escort_id", "expires_at");

-- SexterMessage
CREATE INDEX IF NOT EXISTS "SexterMessage_sexter_session_id_created_at_idx"
  ON "SexterMessage"("sexter_session_id", "created_at");

