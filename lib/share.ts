import type { ShareLink } from '@prisma/client';

import { db } from '@/lib/db';
import { buildScreenPins, type ScreenPin } from '@/lib/screenPins';
import { createSignedReadUrl } from '@/lib/storage';
import { generateSecureToken, hashSecureToken } from '@/lib/tokens';
import type {
  ComponentStateName,
  IssueSeverity,
  IssueStatus,
  ProvenanceType,
  ReadinessCategory,
  ReviewStatus,
  ScreenAnalysisStatus,
  SpecificationCategory,
  ViewportCategory,
} from '@/lib/types';

/**
 * Generates a new bearer token for a share link. The raw token is returned
 * once, to embed in the URL shown to the designer — it is never persisted.
 * Only its SHA-256 hash is stored (ShareLink.tokenReference), so a database
 * read can never recover a usable token. See security.md's "a share-link
 * token is effectively a bearer credential" and lib/tokens.ts, which this
 * shares with the password-reset flow.
 */
export function generateShareToken(): { rawToken: string; tokenHash: string } {
  return generateSecureToken();
}

export function hashToken(rawToken: string): string {
  return hashSecureToken(rawToken);
}

/**
 * Looks up a ShareLink by its raw token and validates it's usable. Fails
 * closed: an unknown, revoked, or expired token all return null — the
 * caller must not distinguish between them in what it shows the requester,
 * per security.md's "Expired or revoked tokens return 404/410, not a
 * partial response."
 */
export async function resolveShareLink(rawToken: string): Promise<ShareLink | null> {
  const tokenHash = hashToken(rawToken);
  const shareLink = await db.shareLink.findUnique({ where: { tokenReference: tokenHash } });

  if (!shareLink) return null;
  if (shareLink.status !== 'Active') return null;
  if (shareLink.expiresAt && shareLink.expiresAt.getTime() < Date.now()) return null;

  return shareLink;
}

// ---------------------------------------------------------------------------
// Developer-facing projection
//
// Single source of truth for what a share link exposes, called by both
// app/share/[token]/page.tsx and app/api/share/[token]/route.ts so their
// data shapes can never drift apart. Deliberately excludes ownerId and
// every other designer-only field — see security.md's "Share links expose
// the developer view only."
// ---------------------------------------------------------------------------

export type DeveloperHandoffProjection = {
  name: string;
  description: string | null;
  readinessScore: number | null;
  readinessAlgorithmVersion: number | null;
  screens: {
    id: string;
    name: string;
    imageUrl: string;
    analysisStatus: ScreenAnalysisStatus;
    /** See lib/screenPins.ts — same pin data the designer review page shows, derived from already-persisted regions. */
    pins: ScreenPin[];
  }[];
  components: {
    id: string;
    name: string;
    type: string;
    description: string | null;
    provenance: ProvenanceType;
    reviewStatus: ReviewStatus;
    implemented: boolean;
    /** Which screen a "show on screen" link for this component (or any of its specs/states) should open — null when it has no derivable region. */
    pinScreenId: string | null;
    specifications: {
      id: string;
      category: SpecificationCategory;
      property: string;
      value: string;
      unit: string | null;
      provenance: ProvenanceType;
      reviewStatus: ReviewStatus;
      implemented: boolean;
    }[];
    states: {
      id: string;
      name: ComponentStateName;
      description: string | null;
      provenance: ProvenanceType;
      reviewStatus: ReviewStatus;
      implemented: boolean;
    }[];
  }[];
  responsiveRules: {
    id: string;
    componentId: string | null;
    screenName: string | null;
    viewportCategory: ViewportCategory;
    behavior: string;
    provenance: ProvenanceType;
    reviewStatus: ReviewStatus;
    implemented: boolean;
    pinScreenId: string | null;
  }[];
  issues: {
    id: string;
    componentId: string | null;
    title: string;
    description: string;
    severity: IssueSeverity;
    category: ReadinessCategory;
    recommendation: string | null;
    status: IssueStatus;
    provenance: ProvenanceType;
    pinScreenId: string | null;
  }[];
  notes: { id: string; content: string }[];
  screenFlows: { id: string; sourceScreenName: string; targetScreenName: string; label: string | null }[];
  recentUpdates: { title: string; category: ReadinessCategory; createdAt: string }[];
};

const RECENT_UPDATES_LIMIT = 10;

/** `"${findingType}:${findingReference}"` — the same composite key ImplementationMark's unique constraint is built on. */
function markKey(findingType: string, findingReference: string): string {
  return `${findingType}:${findingReference}`;
}

export async function buildDeveloperProjection(handoffId: string): Promise<DeveloperHandoffProjection> {
  const [
    handoff,
    screens,
    components,
    responsiveRules,
    issues,
    notes,
    screenFlows,
    recentUpdates,
    implementationMarks,
  ] = await Promise.all([
    db.handoff.findUniqueOrThrow({
      where: { id: handoffId },
      select: { name: true, description: true, readinessScore: true, readinessAlgorithmVersion: true },
    }),
    db.screen.findMany({
      where: { handoffId, asset: { processingStatus: 'Processed' } },
      include: { asset: true },
      orderBy: { order: 'asc' },
    }),
    db.component.findMany({
      where: { handoffId },
      include: { specifications: true, states: true, instances: true },
      orderBy: { createdAt: 'asc' },
    }),
    db.responsiveRule.findMany({
      where: { screen: { handoffId } },
      include: { screen: true },
      orderBy: { createdAt: 'asc' },
    }),
    db.handoffIssue.findMany({ where: { handoffId }, orderBy: { createdAt: 'asc' } }),
    db.designerNote.findMany({ where: { handoffId }, orderBy: { createdAt: 'asc' } }),
    db.screenFlow.findMany({
      where: { handoffId },
      include: { sourceScreen: true, targetScreen: true },
      orderBy: { createdAt: 'asc' },
    }),
    // Public-safe subset of the designer-only changelog (lib/changelog.ts):
    // only genuinely-new (`Created`) findings, never Reaffirmed/Conflict —
    // those are internal trust-model concepts (see AnalysisChangelogPanel)
    // that would confuse or alarm an external developer with no context on
    // the designer's review workflow. See security.md's "Share links
    // expose the developer view only."
    db.analysisRunFinding.findMany({
      where: { kind: 'Created', analysisRun: { handoffId } },
      include: { handoffIssue: { select: { title: true, category: true } } },
      orderBy: { createdAt: 'desc' },
      take: RECENT_UPDATES_LIMIT,
    }),
    db.implementationMark.findMany({
      where: { handoffId },
      select: { findingType: true, findingReference: true },
    }),
  ]);

  const markedKeys = new Set(implementationMarks.map((mark) => markKey(mark.findingType, mark.findingReference)));
  const isMarked = (findingType: string, findingReference: string) => markedKeys.has(markKey(findingType, findingReference));

  // Same derivation the designer review page uses (lib/screenPins.ts) — no
  // AI call, no new schema, just the regions already persisted on
  // ComponentInstance. See app/(dashboard)/handoffs/[handoffId]/page.tsx's
  // own call for the pattern this mirrors.
  const { pinsByScreen, pinScreenIdByComponentId } = buildScreenPins({
    components,
    responsiveRules,
    issues,
    screens: screens.map((screen) => ({ id: screen.id, order: screen.order })),
  });

  const screensWithUrls = await Promise.all(
    screens.map(async (screen) => ({
      id: screen.id,
      name: screen.name,
      imageUrl: await createSignedReadUrl(screen.asset.storageReference),
      analysisStatus: screen.analysisStatus,
      pins: pinsByScreen.get(screen.id) ?? [],
    })),
  );

  return {
    name: handoff.name,
    description: handoff.description,
    readinessScore: handoff.readinessScore,
    readinessAlgorithmVersion: handoff.readinessAlgorithmVersion,
    screens: screensWithUrls,
    components: components.map((component) => ({
      id: component.id,
      name: component.name,
      type: component.type,
      description: component.description,
      provenance: component.provenance,
      reviewStatus: component.reviewStatus,
      implemented: isMarked('Component', component.id),
      pinScreenId: pinScreenIdByComponentId.get(component.id) ?? null,
      specifications: component.specifications.map((spec) => ({
        id: spec.id,
        category: spec.category,
        property: spec.property,
        value: spec.value,
        unit: spec.unit,
        provenance: spec.provenance,
        reviewStatus: spec.reviewStatus,
        implemented: isMarked('Specification', spec.id),
      })),
      states: component.states.map((state) => ({
        id: state.id,
        name: state.name,
        description: state.description,
        provenance: state.provenance,
        reviewStatus: state.reviewStatus,
        implemented: isMarked('ComponentState', state.id),
      })),
    })),
    responsiveRules: responsiveRules.map((rule) => ({
      id: rule.id,
      componentId: rule.componentId,
      screenName: rule.screen?.name ?? null,
      viewportCategory: rule.viewportCategory,
      behavior: rule.behavior,
      provenance: rule.provenance,
      reviewStatus: rule.reviewStatus,
      implemented: isMarked('ResponsiveRule', rule.id),
      pinScreenId: rule.componentId ? (pinScreenIdByComponentId.get(rule.componentId) ?? null) : null,
    })),
    issues: issues.map((issue) => ({
      id: issue.id,
      componentId: issue.componentId,
      title: issue.title,
      description: issue.description,
      severity: issue.severity,
      category: issue.category,
      recommendation: issue.recommendation,
      status: issue.status,
      provenance: issue.provenance,
      pinScreenId: issue.componentId ? (pinScreenIdByComponentId.get(issue.componentId) ?? null) : null,
    })),
    notes: notes.map((note) => ({ id: note.id, content: note.content })),
    screenFlows: screenFlows.map((flow) => ({
      id: flow.id,
      sourceScreenName: flow.sourceScreen.name,
      targetScreenName: flow.targetScreen.name,
      label: flow.label,
    })),
    recentUpdates: recentUpdates.map((finding) => ({
      title: finding.handoffIssue.title,
      category: finding.handoffIssue.category,
      createdAt: finding.createdAt.toISOString(),
    })),
  };
}
