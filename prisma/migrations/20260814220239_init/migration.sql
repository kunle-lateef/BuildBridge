-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('Free', 'Paid');

-- CreateEnum
CREATE TYPE "HandoffStatus" AS ENUM ('Draft', 'Analyzing', 'NeedsReview', 'Ready', 'Shared', 'Archived');

-- CreateEnum
CREATE TYPE "AssetProcessingStatus" AS ENUM ('Uploaded', 'Processing', 'Processed', 'Failed', 'Deleted');

-- CreateEnum
CREATE TYPE "ScreenAnalysisStatus" AS ENUM ('Pending', 'Analyzing', 'Analyzed', 'Failed');

-- CreateEnum
CREATE TYPE "AnalysisRunStatus" AS ENUM ('Queued', 'Processing', 'Completed', 'PartiallyCompleted', 'Failed');

-- CreateEnum
CREATE TYPE "ProvenanceType" AS ENUM ('Detected', 'Inferred', 'Suggested');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('Unreviewed', 'Confirmed', 'Modified', 'Rejected', 'Resolved');

-- CreateEnum
CREATE TYPE "IssueSeverity" AS ENUM ('Critical', 'High', 'Medium', 'Low', 'Recommendation');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('Open', 'InReview', 'Resolved', 'Dismissed');

-- CreateEnum
CREATE TYPE "ReadinessCategory" AS ENUM ('VisualSpecifications', 'Components', 'ResponsiveBehavior', 'InteractionStates', 'EdgeCases', 'Accessibility');

-- CreateEnum
CREATE TYPE "SpecificationCategory" AS ENUM ('Spacing', 'Typography', 'Color', 'Dimensions', 'Border', 'Radius', 'Shadow');

-- CreateEnum
CREATE TYPE "ComponentStateName" AS ENUM ('Default', 'Hover', 'Focus', 'Disabled', 'Loading', 'Error', 'Empty');

-- CreateEnum
CREATE TYPE "ViewportCategory" AS ENUM ('Desktop', 'Tablet', 'Mobile');

-- CreateEnum
CREATE TYPE "DesignerDecisionAction" AS ENUM ('Confirm', 'Modify', 'Reject', 'Override');

-- CreateEnum
CREATE TYPE "FindingType" AS ENUM ('Component', 'Specification', 'ComponentState', 'ResponsiveRule', 'HandoffIssue');

-- CreateEnum
CREATE TYPE "ShareLinkStatus" AS ENUM ('Active', 'Revoked');

-- CreateEnum
CREATE TYPE "AIMessageRole" AS ENUM ('User', 'Assistant');

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "avatar" TEXT,
    "password_hash" TEXT NOT NULL,
    "session_version" INTEGER NOT NULL DEFAULT 0,
    "plan_tier" "PlanTier" NOT NULL DEFAULT 'Free',
    "analysis_quota" INTEGER NOT NULL DEFAULT 5,
    "analysis_usage_count" INTEGER NOT NULL DEFAULT 0,
    "billing_cycle_start" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "handoffs" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "HandoffStatus" NOT NULL DEFAULT 'Draft',
    "readiness_score" INTEGER,
    "readiness_algorithm_version" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "handoffs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "design_assets" (
    "id" TEXT NOT NULL,
    "handoff_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "media_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storage_reference" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "processing_status" "AssetProcessingStatus" NOT NULL DEFAULT 'Uploaded',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "design_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "screens" (
    "id" TEXT NOT NULL,
    "handoff_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "dimensions" JSONB,
    "analysis_status" "ScreenAnalysisStatus" NOT NULL DEFAULT 'Pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "screens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_runs" (
    "id" TEXT NOT NULL,
    "handoff_id" TEXT NOT NULL,
    "status" "AnalysisRunStatus" NOT NULL DEFAULT 'Queued',
    "model_identifier" TEXT,
    "analysis_version" INTEGER NOT NULL,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "error_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "components" (
    "id" TEXT NOT NULL,
    "handoff_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL,
    "provenance" "ProvenanceType" NOT NULL,
    "review_status" "ReviewStatus" NOT NULL DEFAULT 'Unreviewed',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "component_instances" (
    "id" TEXT NOT NULL,
    "component_id" TEXT NOT NULL,
    "screen_id" TEXT NOT NULL,
    "region_reference" TEXT NOT NULL,
    "dimensions" JSONB,
    "properties" JSONB,

    CONSTRAINT "component_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "specifications" (
    "id" TEXT NOT NULL,
    "screen_id" TEXT,
    "component_id" TEXT,
    "category" "SpecificationCategory" NOT NULL,
    "property" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "unit" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL,
    "provenance" "ProvenanceType" NOT NULL,
    "review_status" "ReviewStatus" NOT NULL DEFAULT 'Unreviewed',
    "source_reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "specifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "component_states" (
    "id" TEXT NOT NULL,
    "component_id" TEXT NOT NULL,
    "name" "ComponentStateName" NOT NULL,
    "description" TEXT,
    "status" TEXT,
    "provenance" "ProvenanceType" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "review_status" "ReviewStatus" NOT NULL DEFAULT 'Unreviewed',

    CONSTRAINT "component_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "responsive_rules" (
    "id" TEXT NOT NULL,
    "screen_id" TEXT,
    "component_id" TEXT,
    "viewport_category" "ViewportCategory" NOT NULL,
    "behavior" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "provenance" "ProvenanceType" NOT NULL,
    "review_status" "ReviewStatus" NOT NULL DEFAULT 'Unreviewed',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "responsive_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "handoff_issues" (
    "id" TEXT NOT NULL,
    "handoff_id" TEXT NOT NULL,
    "screen_id" TEXT,
    "component_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "IssueSeverity" NOT NULL,
    "category" "ReadinessCategory" NOT NULL,
    "recommendation" TEXT,
    "status" "IssueStatus" NOT NULL DEFAULT 'Open',
    "provenance" "ProvenanceType" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "handoff_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "designer_decisions" (
    "id" TEXT NOT NULL,
    "handoff_id" TEXT NOT NULL,
    "finding_type" "FindingType" NOT NULL,
    "finding_reference" TEXT NOT NULL,
    "action" "DesignerDecisionAction" NOT NULL,
    "previous_value" TEXT,
    "new_value" TEXT,
    "note" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "designer_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "designer_notes" (
    "id" TEXT NOT NULL,
    "handoff_id" TEXT NOT NULL,
    "screen_id" TEXT,
    "component_id" TEXT,
    "content" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "designer_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_links" (
    "id" TEXT NOT NULL,
    "handoff_id" TEXT NOT NULL,
    "token_reference" TEXT NOT NULL,
    "status" "ShareLinkStatus" NOT NULL DEFAULT 'Active',
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "share_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_conversations" (
    "id" TEXT NOT NULL,
    "handoff_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "role" "AIMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "citations" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "handoffs_owner_id_idx" ON "handoffs"("owner_id");

-- CreateIndex
CREATE INDEX "design_assets_handoff_id_idx" ON "design_assets"("handoff_id");

-- CreateIndex
CREATE INDEX "design_assets_checksum_idx" ON "design_assets"("checksum");

-- CreateIndex
CREATE INDEX "screens_handoff_id_idx" ON "screens"("handoff_id");

-- CreateIndex
CREATE INDEX "screens_asset_id_idx" ON "screens"("asset_id");

-- CreateIndex
CREATE INDEX "analysis_runs_handoff_id_idx" ON "analysis_runs"("handoff_id");

-- CreateIndex
CREATE INDEX "components_handoff_id_idx" ON "components"("handoff_id");

-- CreateIndex
CREATE INDEX "component_instances_component_id_idx" ON "component_instances"("component_id");

-- CreateIndex
CREATE INDEX "component_instances_screen_id_idx" ON "component_instances"("screen_id");

-- CreateIndex
CREATE INDEX "specifications_screen_id_idx" ON "specifications"("screen_id");

-- CreateIndex
CREATE INDEX "specifications_component_id_idx" ON "specifications"("component_id");

-- CreateIndex
CREATE INDEX "component_states_component_id_idx" ON "component_states"("component_id");

-- CreateIndex
CREATE INDEX "responsive_rules_screen_id_idx" ON "responsive_rules"("screen_id");

-- CreateIndex
CREATE INDEX "responsive_rules_component_id_idx" ON "responsive_rules"("component_id");

-- CreateIndex
CREATE INDEX "handoff_issues_handoff_id_idx" ON "handoff_issues"("handoff_id");

-- CreateIndex
CREATE INDEX "handoff_issues_screen_id_idx" ON "handoff_issues"("screen_id");

-- CreateIndex
CREATE INDEX "handoff_issues_component_id_idx" ON "handoff_issues"("component_id");

-- CreateIndex
CREATE INDEX "designer_decisions_handoff_id_idx" ON "designer_decisions"("handoff_id");

-- CreateIndex
CREATE INDEX "designer_decisions_finding_type_finding_reference_idx" ON "designer_decisions"("finding_type", "finding_reference");

-- CreateIndex
CREATE INDEX "designer_notes_handoff_id_idx" ON "designer_notes"("handoff_id");

-- CreateIndex
CREATE UNIQUE INDEX "share_links_token_reference_key" ON "share_links"("token_reference");

-- CreateIndex
CREATE INDEX "share_links_handoff_id_idx" ON "share_links"("handoff_id");

-- CreateIndex
CREATE INDEX "ai_conversations_handoff_id_idx" ON "ai_conversations"("handoff_id");

-- CreateIndex
CREATE INDEX "ai_messages_conversation_id_idx" ON "ai_messages"("conversation_id");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handoffs" ADD CONSTRAINT "handoffs_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_assets" ADD CONSTRAINT "design_assets_handoff_id_fkey" FOREIGN KEY ("handoff_id") REFERENCES "handoffs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screens" ADD CONSTRAINT "screens_handoff_id_fkey" FOREIGN KEY ("handoff_id") REFERENCES "handoffs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screens" ADD CONSTRAINT "screens_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "design_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_handoff_id_fkey" FOREIGN KEY ("handoff_id") REFERENCES "handoffs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "components" ADD CONSTRAINT "components_handoff_id_fkey" FOREIGN KEY ("handoff_id") REFERENCES "handoffs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "component_instances" ADD CONSTRAINT "component_instances_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "components"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "component_instances" ADD CONSTRAINT "component_instances_screen_id_fkey" FOREIGN KEY ("screen_id") REFERENCES "screens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specifications" ADD CONSTRAINT "specifications_screen_id_fkey" FOREIGN KEY ("screen_id") REFERENCES "screens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specifications" ADD CONSTRAINT "specifications_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "components"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "component_states" ADD CONSTRAINT "component_states_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "components"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responsive_rules" ADD CONSTRAINT "responsive_rules_screen_id_fkey" FOREIGN KEY ("screen_id") REFERENCES "screens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responsive_rules" ADD CONSTRAINT "responsive_rules_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "components"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handoff_issues" ADD CONSTRAINT "handoff_issues_handoff_id_fkey" FOREIGN KEY ("handoff_id") REFERENCES "handoffs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handoff_issues" ADD CONSTRAINT "handoff_issues_screen_id_fkey" FOREIGN KEY ("screen_id") REFERENCES "screens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handoff_issues" ADD CONSTRAINT "handoff_issues_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "components"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "designer_decisions" ADD CONSTRAINT "designer_decisions_handoff_id_fkey" FOREIGN KEY ("handoff_id") REFERENCES "handoffs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "designer_decisions" ADD CONSTRAINT "designer_decisions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "designer_notes" ADD CONSTRAINT "designer_notes_handoff_id_fkey" FOREIGN KEY ("handoff_id") REFERENCES "handoffs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "designer_notes" ADD CONSTRAINT "designer_notes_screen_id_fkey" FOREIGN KEY ("screen_id") REFERENCES "screens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "designer_notes" ADD CONSTRAINT "designer_notes_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "components"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "designer_notes" ADD CONSTRAINT "designer_notes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_handoff_id_fkey" FOREIGN KEY ("handoff_id") REFERENCES "handoffs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_handoff_id_fkey" FOREIGN KEY ("handoff_id") REFERENCES "handoffs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
