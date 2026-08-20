-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('AnalysisRunCompleted', 'AnalysisRunPartiallyCompleted', 'AnalysisRunFailed', 'DeveloperFlagReceived');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email_notifications_enabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "handoff_id" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link_url" TEXT,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "notifications_handoff_id_idx" ON "notifications"("handoff_id");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_handoff_id_fkey" FOREIGN KEY ("handoff_id") REFERENCES "handoffs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
