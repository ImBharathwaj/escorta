-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "display_name" TEXT,
    "avatar_url" TEXT,
    "password_hash" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_banned" BOOLEAN NOT NULL DEFAULT false,
    "is_premium_member" BOOLEAN NOT NULL DEFAULT false,
    "credits" INTEGER NOT NULL DEFAULT 0,
    "email_verified_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "last_login" TIMESTAMP(3),
    "last_active_at" TIMESTAMP(3),
    "orientation" TEXT,
    "preferences_notes" TEXT,
    "preferred_languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveSession" (
    "id" TEXT NOT NULL,
    "escort_id" TEXT NOT NULL,
    "room_name" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'live',

    CONSTRAINT "LiveSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveSessionViewer" (
    "id" TEXT NOT NULL,
    "live_session_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),
    "watch_expires_at" TIMESTAMP(3),

    CONSTRAINT "LiveSessionViewer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveSessionMessage" (
    "id" TEXT NOT NULL,
    "live_session_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "LiveSessionMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionReport" (
    "id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "report_type" TEXT NOT NULL,
    "reference_id" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoCallRequest" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "escort_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "responded_at" TIMESTAMP(3),

    CONSTRAINT "VideoCallRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoCallSession" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "escort_id" TEXT NOT NULL,
    "room_name" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "VideoCallSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditTransaction" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "related_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "related_user_id" TEXT,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "used_at" TIMESTAMP(3),

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscortProfile" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "alias_name" TEXT NOT NULL,
    "age" INTEGER,
    "city" TEXT,
    "country" TEXT,
    "description" TEXT,
    "price_per_hour" INTEGER,
    "gender" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_gender_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EscortProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscortPremiumRequest" (
    "id" TEXT NOT NULL,
    "escort_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "admin_notes" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EscortPremiumRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscortVod" (
    "id" TEXT NOT NULL,
    "escort_id" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EscortVod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gallery" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "h1" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gallery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryImage" (
    "id" TEXT NOT NULL,
    "gallery_id" TEXT NOT NULL,
    "src" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "caption" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "escort_photo_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GalleryImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscortService" (
    "escort_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,

    CONSTRAINT "EscortService_pkey" PRIMARY KEY ("escort_id","service_id")
);

-- CreateTable
CREATE TABLE "AdultService" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "AdultService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientAdultService" (
    "user_id" TEXT NOT NULL,
    "adult_service_id" TEXT NOT NULL,

    CONSTRAINT "ClientAdultService_pkey" PRIMARY KEY ("user_id","adult_service_id")
);

-- CreateTable
CREATE TABLE "EscortAdultService" (
    "escort_id" TEXT NOT NULL,
    "adult_service_id" TEXT NOT NULL,

    CONSTRAINT "EscortAdultService_pkey" PRIMARY KEY ("escort_id","adult_service_id")
);

-- CreateTable
CREATE TABLE "EscortPhoto" (
    "id" TEXT NOT NULL,
    "escort_id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "allow_gallery" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EscortPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscortAvailability" (
    "id" TEXT NOT NULL,
    "escort_id" TEXT NOT NULL,
    "day_of_week" INTEGER,
    "start_time" TEXT,
    "end_time" TEXT,

    CONSTRAINT "EscortAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "escort_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "booking_time" TIMESTAMP(3),
    "duration_minutes" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "price" INTEGER,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SexterSession" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT,
    "client_id" TEXT,
    "escort_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "SexterSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SexterMessage" (
    "id" TEXT NOT NULL,
    "sexter_session_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "message" TEXT NOT NULL DEFAULT '',
    "attachment_url" TEXT,
    "attachment_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "SexterMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeletedUserEmail" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" TEXT,
    "deleted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeletedUserEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBlock" (
    "blocker_id" TEXT NOT NULL,
    "blocked_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBlock_pkey" PRIMARY KEY ("blocker_id","blocked_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "LiveSession_room_name_key" ON "LiveSession"("room_name");

-- CreateIndex
CREATE INDEX "LiveSession_escort_id_idx" ON "LiveSession"("escort_id");

-- CreateIndex
CREATE INDEX "LiveSession_status_idx" ON "LiveSession"("status");

-- CreateIndex
CREATE INDEX "LiveSessionViewer_live_session_id_idx" ON "LiveSessionViewer"("live_session_id");

-- CreateIndex
CREATE INDEX "LiveSessionViewer_client_id_idx" ON "LiveSessionViewer"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "LiveSessionViewer_live_session_id_client_id_key" ON "LiveSessionViewer"("live_session_id", "client_id");

-- CreateIndex
CREATE INDEX "LiveSessionMessage_live_session_id_idx" ON "LiveSessionMessage"("live_session_id");

-- CreateIndex
CREATE INDEX "SessionReport_report_type_reference_id_idx" ON "SessionReport"("report_type", "reference_id");

-- CreateIndex
CREATE INDEX "SessionReport_reporter_id_idx" ON "SessionReport"("reporter_id");

-- CreateIndex
CREATE UNIQUE INDEX "SessionReport_reporter_id_report_type_reference_id_key" ON "SessionReport"("reporter_id", "report_type", "reference_id");

-- CreateIndex
CREATE INDEX "VideoCallRequest_client_id_idx" ON "VideoCallRequest"("client_id");

-- CreateIndex
CREATE INDEX "VideoCallRequest_escort_id_idx" ON "VideoCallRequest"("escort_id");

-- CreateIndex
CREATE INDEX "VideoCallRequest_escort_id_status_idx" ON "VideoCallRequest"("escort_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "VideoCallSession_room_name_key" ON "VideoCallSession"("room_name");

-- CreateIndex
CREATE INDEX "VideoCallSession_client_id_idx" ON "VideoCallSession"("client_id");

-- CreateIndex
CREATE INDEX "VideoCallSession_escort_id_idx" ON "VideoCallSession"("escort_id");

-- CreateIndex
CREATE INDEX "CreditTransaction_user_id_idx" ON "CreditTransaction"("user_id");

-- CreateIndex
CREATE INDEX "CreditTransaction_user_id_created_at_idx" ON "CreditTransaction"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "Notification_user_id_idx" ON "Notification"("user_id");

-- CreateIndex
CREATE INDEX "Notification_user_id_read_at_idx" ON "Notification"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "Notification_user_id_created_at_idx" ON "Notification"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_token_key" ON "EmailVerificationToken"("token");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_token_idx" ON "EmailVerificationToken"("token");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_user_id_idx" ON "EmailVerificationToken"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_user_id_idx" ON "PasswordResetToken"("user_id");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expires_at_idx" ON "PasswordResetToken"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "EscortProfile_user_id_key" ON "EscortProfile"("user_id");

-- CreateIndex
CREATE INDEX "EscortPremiumRequest_escort_id_idx" ON "EscortPremiumRequest"("escort_id");

-- CreateIndex
CREATE INDEX "EscortPremiumRequest_status_idx" ON "EscortPremiumRequest"("status");

-- CreateIndex
CREATE INDEX "EscortVod_escort_id_idx" ON "EscortVod"("escort_id");

-- CreateIndex
CREATE UNIQUE INDEX "Gallery_slug_key" ON "Gallery"("slug");

-- CreateIndex
CREATE INDEX "GalleryImage_gallery_id_idx" ON "GalleryImage"("gallery_id");

-- CreateIndex
CREATE UNIQUE INDEX "Service_name_key" ON "Service"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AdultService_name_key" ON "AdultService"("name");

-- CreateIndex
CREATE INDEX "UserBlock_blocked_id_idx" ON "UserBlock"("blocked_id");

-- AddForeignKey
ALTER TABLE "LiveSession" ADD CONSTRAINT "LiveSession_escort_id_fkey" FOREIGN KEY ("escort_id") REFERENCES "EscortProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveSessionViewer" ADD CONSTRAINT "LiveSessionViewer_live_session_id_fkey" FOREIGN KEY ("live_session_id") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveSessionViewer" ADD CONSTRAINT "LiveSessionViewer_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveSessionMessage" ADD CONSTRAINT "LiveSessionMessage_live_session_id_fkey" FOREIGN KEY ("live_session_id") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveSessionMessage" ADD CONSTRAINT "LiveSessionMessage_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionReport" ADD CONSTRAINT "SessionReport_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoCallRequest" ADD CONSTRAINT "VideoCallRequest_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoCallRequest" ADD CONSTRAINT "VideoCallRequest_escort_id_fkey" FOREIGN KEY ("escort_id") REFERENCES "EscortProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoCallSession" ADD CONSTRAINT "VideoCallSession_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoCallSession" ADD CONSTRAINT "VideoCallSession_escort_id_fkey" FOREIGN KEY ("escort_id") REFERENCES "EscortProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_related_user_id_fkey" FOREIGN KEY ("related_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscortProfile" ADD CONSTRAINT "EscortProfile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscortPremiumRequest" ADD CONSTRAINT "EscortPremiumRequest_escort_id_fkey" FOREIGN KEY ("escort_id") REFERENCES "EscortProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscortVod" ADD CONSTRAINT "EscortVod_escort_id_fkey" FOREIGN KEY ("escort_id") REFERENCES "EscortProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryImage" ADD CONSTRAINT "GalleryImage_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "Gallery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscortService" ADD CONSTRAINT "EscortService_escort_id_fkey" FOREIGN KEY ("escort_id") REFERENCES "EscortProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscortService" ADD CONSTRAINT "EscortService_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAdultService" ADD CONSTRAINT "ClientAdultService_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAdultService" ADD CONSTRAINT "ClientAdultService_adult_service_id_fkey" FOREIGN KEY ("adult_service_id") REFERENCES "AdultService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscortAdultService" ADD CONSTRAINT "EscortAdultService_escort_id_fkey" FOREIGN KEY ("escort_id") REFERENCES "EscortProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscortAdultService" ADD CONSTRAINT "EscortAdultService_adult_service_id_fkey" FOREIGN KEY ("adult_service_id") REFERENCES "AdultService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscortPhoto" ADD CONSTRAINT "EscortPhoto_escort_id_fkey" FOREIGN KEY ("escort_id") REFERENCES "EscortProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscortAvailability" ADD CONSTRAINT "EscortAvailability_escort_id_fkey" FOREIGN KEY ("escort_id") REFERENCES "EscortProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_escort_id_fkey" FOREIGN KEY ("escort_id") REFERENCES "EscortProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SexterSession" ADD CONSTRAINT "SexterSession_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SexterSession" ADD CONSTRAINT "SexterSession_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SexterSession" ADD CONSTRAINT "SexterSession_escort_id_fkey" FOREIGN KEY ("escort_id") REFERENCES "EscortProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SexterMessage" ADD CONSTRAINT "SexterMessage_sexter_session_id_fkey" FOREIGN KEY ("sexter_session_id") REFERENCES "SexterSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SexterMessage" ADD CONSTRAINT "SexterMessage_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
