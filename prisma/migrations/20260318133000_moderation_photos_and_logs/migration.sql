-- AlterTable
ALTER TABLE "EscortPhoto"
ADD COLUMN "review_status" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN "reviewed_at" TIMESTAMP(3),
ADD COLUMN "reviewed_by_user_id" TEXT,
ADD COLUMN "review_reason" TEXT;

-- Backfill
UPDATE "EscortPhoto"
SET "review_status" = CASE
  WHEN "is_approved" = true THEN 'approved'
  ELSE 'pending'
END
WHERE "review_status" IS NULL;

-- CreateTable
CREATE TABLE "ModerationAction" (
  "id" TEXT NOT NULL,
  "actor_user_id" TEXT NOT NULL,
  "action_type" TEXT NOT NULL,
  "target_type" TEXT NOT NULL,
  "target_id" TEXT NOT NULL,
  "reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ModerationAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EscortPhoto_escort_id_idx" ON "EscortPhoto"("escort_id");

-- CreateIndex
CREATE INDEX "EscortPhoto_review_status_created_at_idx" ON "EscortPhoto"("review_status", "created_at");

-- CreateIndex
CREATE INDEX "ModerationAction_actor_user_id_idx" ON "ModerationAction"("actor_user_id");

-- CreateIndex
CREATE INDEX "ModerationAction_target_type_target_id_idx" ON "ModerationAction"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "ModerationAction_created_at_idx" ON "ModerationAction"("created_at");

-- AddForeignKey
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

