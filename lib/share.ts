import type { ShareLink } from '@prisma/client';

import { db } from '@/lib/db';
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
  }[];
  components: {
    id: string;
    name: string;
    type: string;
    description: string | null;
    provenance: ProvenanceType;
    reviewStatus: ReviewStatus;
    specifications: {
      id: string;
      category: SpecificationCategory;
      property: string;
      value: string;
      unit: string | null;
      provenance: ProvenanceType;
      reviewStatus: ReviewStatus;
    }[];
    states: {
      id: string;
      name: ComponentStateName;
      description: string | null;
      provenance: ProvenanceType;
      reviewStatus: ReviewStatus;
    }[];
  }[];
  responsiveRules: {
    id: string;
    screenName: string | null;
    viewportCategory: ViewportCategory;
    behavior: string;
    provenance: ProvenanceType;
    reviewStatus: ReviewStatus;
  }[];
  issues: {
    id: string;
    title: string;
    description: string;
    severity: IssueSeverity;
    category: ReadinessCategory;
    recommendation: string | null;
    status: IssueStatus;
    provenance: ProvenanceType;
  }[];
  notes: { id: string; content: string }[];
};

export async function buildDeveloperProjection(handoffId: string): Promise<DeveloperHandoffProjection> {
  const [handoff, screens, components, responsiveRules, issues, notes] = await Promise.all([
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
      include: { specifications: true, states: true },
      orderBy: { createdAt: 'asc' },
    }),
    db.responsiveRule.findMany({
      where: { screen: { handoffId } },
      include: { screen: true },
      orderBy: { createdAt: 'asc' },
    }),
    db.handoffIssue.findMany({ where: { handoffId }, orderBy: { createdAt: 'asc' } }),
    db.designerNote.findMany({ where: { handoffId }, orderBy: { createdAt: 'asc' } }),
  ]);

  const screensWithUrls = await Promise.all(
    screens.map(async (screen) => ({
      id: screen.id,
      name: screen.name,
      imageUrl: await createSignedReadUrl(screen.asset.storageReference),
      analysisStatus: screen.analysisStatus,
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
      specifications: component.specifications.map((spec) => ({
        id: spec.id,
        category: spec.category,
        property: spec.property,
        value: spec.value,
        unit: spec.unit,
        provenance: spec.provenance,
        reviewStatus: spec.reviewStatus,
      })),
      states: component.states.map((state) => ({
        id: state.id,
        name: state.name,
        description: state.description,
        provenance: state.provenance,
        reviewStatus: state.reviewStatus,
      })),
    })),
    responsiveRules: responsiveRules.map((rule) => ({
      id: rule.id,
      screenName: rule.screen?.name ?? null,
      viewportCategory: rule.viewportCategory,
      behavior: rule.behavior,
      provenance: rule.provenance,
      reviewStatus: rule.reviewStatus,
    })),
    issues: issues.map((issue) => ({
      id: issue.id,
      title: issue.title,
      description: issue.description,
      severity: issue.severity,
      category: issue.category,
      recommendation: issue.recommendation,
      status: issue.status,
      provenance: issue.provenance,
    })),
    notes: notes.map((note) => ({ id: note.id, content: note.content })),
  };
}
