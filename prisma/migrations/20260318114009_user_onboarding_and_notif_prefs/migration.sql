-- AlterTable
ALTER TABLE "User" ADD COLUMN     "notify_email_connections" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notify_email_earnings" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notify_email_messages" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "onboarding_complete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preferred_city" TEXT;
