-- CreateEnum
CREATE TYPE "AnalysisRunFindingKind" AS ENUM ('Created', 'Reaffirmed', 'Conflict');

-- AlterTable
ALTER TABLE "handoff_issues" ADD COLUMN     "source_analysis_run_id" TEXT;

-- CreateTable
CREATE TABLE "analysis_run_findings" (
    "id" TEXT NOT NULL,
    "analysis_run_id" TEXT NOT NULL,
    "handoff_issue_id" TEXT NOT NULL,
    "kind" "AnalysisRunFindingKind" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_run_findings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analysis_run_findings_analysis_run_id_idx" ON "analysis_run_findings"("analysis_run_id");

-- CreateIndex
CREATE INDEX "analysis_run_findings_handoff_issue_id_idx" ON "analysis_run_findings"("handoff_issue_id");

-- AddForeignKey
ALTER TABLE "analysis_run_findings" ADD CONSTRAINT "analysis_run_findings_analysis_run_id_fkey" FOREIGN KEY ("analysis_run_id") REFERENCES "analysis_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_run_findings" ADD CONSTRAINT "analysis_run_findings_handoff_issue_id_fkey" FOREIGN KEY ("handoff_issue_id") REFERENCES "handoff_issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handoff_issues" ADD CONSTRAINT "handoff_issues_source_analysis_run_id_fkey" FOREIGN KEY ("source_analysis_run_id") REFERENCES "analysis_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
