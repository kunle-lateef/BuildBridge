-- CreateEnum
CREATE TYPE "DeveloperFlagKind" AS ENUM ('Mismatch', 'Question');

-- CreateEnum
CREATE TYPE "DeveloperFlagStatus" AS ENUM ('Open', 'Acknowledged', 'Resolved');

-- CreateTable
CREATE TABLE "developer_flags" (
    "id" TEXT NOT NULL,
    "handoff_id" TEXT NOT NULL,
    "share_link_id" TEXT NOT NULL,
    "findingType" "FindingType",
    "finding_reference" TEXT,
    "kind" "DeveloperFlagKind" NOT NULL,
    "message" TEXT NOT NULL,
    "submitted_by_name" TEXT,
    "status" "DeveloperFlagStatus" NOT NULL DEFAULT 'Open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "developer_flags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "developer_flags_handoff_id_idx" ON "developer_flags"("handoff_id");

-- CreateIndex
CREATE INDEX "developer_flags_share_link_id_idx" ON "developer_flags"("share_link_id");

-- AddForeignKey
ALTER TABLE "developer_flags" ADD CONSTRAINT "developer_flags_handoff_id_fkey" FOREIGN KEY ("handoff_id") REFERENCES "handoffs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "developer_flags" ADD CONSTRAINT "developer_flags_share_link_id_fkey" FOREIGN KEY ("share_link_id") REFERENCES "share_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;
