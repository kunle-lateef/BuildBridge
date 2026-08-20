// Shared types used across the app. Domain enums are Prisma-generated from
// prisma/schema.prisma (the single source of truth for their values) and
// re-exported here rather than redefined, so the database, the API, and the
// UI can never drift apart on what a given enum value means — see
// .agents/rules/code-style.md's Naming section.
export type {
  AIMessageRole,
  AnalysisRunStatus,
  AssetProcessingStatus,
  ComponentStateName,
  DesignerDecisionAction,
  DeveloperFlagKind,
  DeveloperFlagStatus,
  FindingType,
  HandoffStatus,
  IssueSeverity,
  IssueStatus,
  NotificationType,
  PlanTier,
  ProvenanceType,
  ReadinessCategory,
  ReviewStatus,
  ScreenAnalysisStatus,
  ShareLinkStatus,
  SpecificationCategory,
  ViewportCategory,
} from '@prisma/client';

/**
 * The standard success/failure envelope every server action and route
 * handler returns — see .agents/skills/api-route-scaffolder/SKILL.md's
 * Envelope Convention. Defined once here so it can't drift between call
 * sites.
 */
export type ActionResult<T> =
  { ok: true; data: T } | { ok: false; error: { code: string; message: string } };
