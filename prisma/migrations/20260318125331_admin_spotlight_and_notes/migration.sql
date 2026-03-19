-- AlterTable
ALTER TABLE "EscortProfile" ADD COLUMN     "is_spotlighted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AdminNote" (
    "id" TEXT NOT NULL,
    "target_user_id" TEXT NOT NULL,
    "author_user_id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_ref_id" TEXT,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminNote_target_user_id_idx" ON "AdminNote"("target_user_id");

-- CreateIndex
CREATE INDEX "AdminNote_target_type_target_ref_id_idx" ON "AdminNote"("target_type", "target_ref_id");

-- CreateIndex
CREATE INDEX "AdminNote_author_user_id_idx" ON "AdminNote"("author_user_id");

-- CreateIndex
CREATE INDEX "AdminNote_created_at_idx" ON "AdminNote"("created_at");

-- AddForeignKey
ALTER TABLE "AdminNote" ADD CONSTRAINT "AdminNote_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminNote" ADD CONSTRAINT "AdminNote_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
