import { buildSourceIndex, tagFor, type SourceIndex } from '@/lib/ai/assistantSources';
import { assistantReplyContentSchema } from '@/lib/ai/schemas';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { DeveloperHandoffProjection } from '@/lib/share';

/**
 * Formats the same projection the share-link view renders
 * (lib/share.ts's buildDeveloperProjection) into a readable text block for
 * the assistant's context — one source of truth for "what does this
 * handoff contain," reused rather than re-queried. Provenance and review
 * state are included explicitly so the model can honor the "prefer
 * designer-confirmed information" rule from its system prompt.
 */
export function buildAssistantContextSummary(
  projection: DeveloperHandoffProjection,
  index: SourceIndex = buildSourceIndex(projection),
): string {
  // Each finding line starts with its short tag ([S3]) so an answer can
  // cite it; see lib/ai/assistantSources.ts. Tags, never database ids.
  const tag = (findingId: string, kind: Parameters<typeof tagFor>[2]) => {
    const value = tagFor(index, findingId, kind);
    return value ? `[${value}] ` : '';
  };
  const lines: string[] = [
    `Handoff: ${projection.name}`,
    projection.description ? `Description: ${projection.description}` : null,
    projection.readinessScore !== null ? `Readiness score: ${projection.readinessScore}%` : null,
    `Screens: ${projection.screens.map((screen) => screen.name).join(', ') || 'none'}`,
    '',
  ].filter((line): line is string => line !== null);

  for (const component of projection.components) {
    lines.push(`${tag(component.id, 'component')}Component: ${component.name} (${component.type}) — review status: ${component.reviewStatus}`);
    if (component.description) lines.push(`  Description: ${component.description}`);

    for (const spec of component.specifications) {
      lines.push(
        `  ${tag(spec.id, 'specification')}Spec — ${spec.property}: ${spec.value}${spec.unit ?? ''} [${spec.provenance}, ${spec.reviewStatus}]`,
      );
    }

    for (const state of component.states) {
      lines.push(
        `  ${tag(state.id, 'state')}State — ${state.name}: ${state.description ?? 'no description'} [${state.provenance}, ${state.reviewStatus}]`,
      );
    }
  }

  if (projection.responsiveRules.length > 0) {
    lines.push('', 'Responsive behavior:');
    for (const rule of projection.responsiveRules) {
      lines.push(
        `  ${tag(rule.id, 'responsive')}${rule.viewportCategory}${rule.screenName ? ` (${rule.screenName})` : ''}: ${rule.behavior} [${rule.provenance}, ${rule.reviewStatus}]`,
      );
    }
  }

  if (projection.issues.length > 0) {
    lines.push('', 'Open questions / issues:');
    for (const issue of projection.issues) {
      lines.push(`  ${tag(issue.id, 'gap')}[${issue.severity}] ${issue.title} — ${issue.description} (status: ${issue.status})`);
    }
  }

  if (projection.notes.length > 0) {
    lines.push('', 'Designer notes:');
    for (const note of projection.notes) {
      lines.push(`  - ${note.content}`);
    }
  }

  return lines.join('\n');
}

/**
 * Finds an existing conversation to continue, or starts a new one. A
 * conversationId that doesn't belong to this handoff is treated as absent
 * rather than an error — starts fresh instead of leaking another handoff's
 * thread, the same fail-closed instinct as the share-link boundary.
 */
export async function getOrCreateConversation(
  handoffId: string,
  userId: string,
  conversationId: string | undefined,
): Promise<string> {
  if (conversationId) {
    const existing = await db.aIConversation.findUnique({ where: { id: conversationId } });
    if (existing && existing.handoffId === handoffId) {
      return existing.id;
    }
  }

  const conversation = await db.aIConversation.create({ data: { handoffId, createdBy: userId } });
  return conversation.id;
}

export async function getConversationHistory(
  conversationId: string,
): Promise<{ role: 'User' | 'Assistant'; content: string }[]> {
  const messages = await db.aIMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    select: { role: true, content: true },
  });
  return messages;
}

export async function persistUserMessage(conversationId: string, content: string): Promise<void> {
  await db.aIMessage.create({ data: { conversationId, role: 'User', content } });
}

/**
 * Validates the accumulated streamed text before persisting — see
 * lib/ai/schemas.ts's assistantReplyContentSchema. AI output is never
 * trusted until validated, streaming doesn't change that; it only moves
 * validation from "before displaying" (impossible mid-stream) to "before
 * persisting as trusted conversation history."
 */
export async function persistAssistantReply(conversationId: string, accumulatedText: string): Promise<void> {
  const parsed = assistantReplyContentSchema.safeParse(accumulatedText);

  if (!parsed.success) {
    logger.error('assistant.reply_validation_failed', { conversationId, error: parsed.error.message });
    return;
  }

  await db.aIMessage.create({ data: { conversationId, role: 'Assistant', content: parsed.data } });
}
