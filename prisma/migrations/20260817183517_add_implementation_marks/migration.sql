-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'ImplementationMarked';

-- CreateTable
CREATE TABLE "implementation_marks" (
    "id" TEXT NOT NULL,
    "handoff_id" TEXT NOT NULL,
    "share_link_id" TEXT NOT NULL,
    "finding_type" "FindingType" NOT NULL,
    "finding_reference" TEXT NOT NULL,
    "marked_by_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "implementation_marks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "implementation_marks_handoff_id_idx" ON "implementation_marks"("handoff_id");

-- CreateIndex
CREATE UNIQUE INDEX "implementation_marks_finding_type_finding_reference_key" ON "implementation_marks"("finding_type", "finding_reference");

-- AddForeignKey
ALTER TABLE "implementation_marks" ADD CONSTRAINT "implementation_marks_handoff_id_fkey" FOREIGN KEY ("handoff_id") REFERENCES "handoffs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "implementation_marks" ADD CONSTRAINT "implementation_marks_share_link_id_fkey" FOREIGN KEY ("share_link_id") REFERENCES "share_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;
