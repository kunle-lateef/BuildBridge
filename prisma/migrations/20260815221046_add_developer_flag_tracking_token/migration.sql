-- AlterTable
ALTER TABLE "developer_flags" ADD COLUMN     "tracking_token_hash" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "developer_flags_tracking_token_hash_key" ON "developer_flags"("tracking_token_hash");
