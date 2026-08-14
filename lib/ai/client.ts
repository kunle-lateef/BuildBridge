import { readFile } from 'node:fs/promises';
import path from 'node:path';

import Anthropic from '@anthropic-ai/sdk';
import type { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { env } from '@/lib/env';

/**
 * Thrown when Claude returns no tool-use block, or the tool-use input
 * fails its Zod schema. The pipeline (lib/ai/pipeline.ts) catches this
 * specifically to distinguish "this stage's output was invalid" (→ that
 * stage fails, the run becomes PartiallyCompleted) from an unexpected
 * error class it shouldn't try to interpret.
 */
export class AiOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiOutputError';
  }
}

export type ModelTier = 'fast' | 'reasoning';

// Relative, not a fixed model identifier — see architecture.md's "Model
// tier guidance is relative... the developer's call to set and change."
const MODEL_BY_TIER: Record<ModelTier, string> = {
  fast: 'claude-haiku-4-5-20251001',
  reasoning: 'claude-sonnet-5',
};

export type ImageInput = {
  base64: string;
  mediaType: 'image/png' | 'image/jpeg' | 'image/webp';
};

let anthropicClient: Anthropic | null = null;

function getClient(): Anthropic {
  anthropicClient ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return anthropicClient;
}

type CallStructuredArgs<T extends z.ZodTypeAny> = {
  tier: ModelTier;
  systemPrompt: string;
  userPrompt: string;
  images?: ImageInput[];
  schema: T;
  toolName: string;
  toolDescription: string;
  /** Only consulted when USE_AI_FIXTURES is set — see lib/ai/fixtures/. */
  fixtureScenario?: string;
};

/**
 * Calls Claude with a forced tool-use call, validating the result against
 * `schema` before returning it. This is the one function every pipeline
 * stage goes through — see security.md's "AI output is never persisted
 * unvalidated" and the prompt-injection defense noted in the implementation
 * plan: the structured tool-use schema constrains the model's output shape
 * regardless of adversarial text baked into an uploaded screen, so injected
 * content can at worst corrupt a single field's value, never the control
 * flow. Content passed in `userPrompt`/`images` is always treated as data,
 * never as instructions — the system prompt is the only place behavior is
 * defined, and it never incorporates asset-derived content.
 */
export async function callStructured<T extends z.ZodTypeAny>({
  tier,
  systemPrompt,
  userPrompt,
  images = [],
  schema,
  toolName,
  toolDescription,
  fixtureScenario = 'login',
}: CallStructuredArgs<T>): Promise<z.infer<T>> {
  if (env.USE_AI_FIXTURES) {
    return loadFixture(toolName, fixtureScenario, schema);
  }

  const content: Array<Anthropic.Messages.TextBlockParam | Anthropic.Messages.ImageBlockParam> = [
    ...images.map(
      (image): Anthropic.Messages.ImageBlockParam => ({
        type: 'image',
        source: { type: 'base64', media_type: image.mediaType, data: image.base64 },
      }),
    ),
    { type: 'text', text: userPrompt },
  ];

  const response = await getClient().messages.create({
    model: MODEL_BY_TIER[tier],
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content }],
    tools: [
      {
        name: toolName,
        description: toolDescription,
        input_schema: zodToJsonSchema(schema, { target: 'openApi3', $refStrategy: 'none' }) as Anthropic.Messages.Tool.InputSchema,
      },
    ],
    tool_choice: { type: 'tool', name: toolName },
  });

  const toolUseBlock = response.content.find(
    (block): block is Anthropic.Messages.ToolUseBlock => block.type === 'tool_use',
  );

  if (!toolUseBlock) {
    throw new AiOutputError(`No tool-use output returned for ${toolName}.`);
  }

  const parsed = schema.safeParse(toolUseBlock.input);

  if (!parsed.success) {
    throw new AiOutputError(`Schema validation failed for ${toolName}: ${parsed.error.message}`);
  }

  return parsed.data;
}

export type ConversationTurn = {
  role: 'User' | 'Assistant';
  content: string;
};

type StreamAssistantReplyArgs = {
  systemPrompt: string;
  /** Prior turns exactly as stored — never includes the injected context block, see lib/ai/assistant.ts. */
  priorMessages: ConversationTurn[];
  /** The current turn, with the fresh context block already prepended (data, not instructions). */
  userTurnContent: string;
};

/**
 * The one direct (non-queued) Claude call in the app — see
 * architecture.md's Contextual Assistant section for why this stage is the
 * documented exception. Yields text chunks as they arrive; the caller
 * (app/api/assistant/route.ts) forwards them to the client immediately and
 * separately accumulates the full text to validate and persist once the
 * stream ends — see lib/ai/schemas.ts's assistantReplyContentSchema.
 */
export async function* streamAssistantReply({
  systemPrompt,
  priorMessages,
  userTurnContent,
}: StreamAssistantReplyArgs): AsyncGenerator<string> {
  if (env.USE_AI_FIXTURES) {
    yield* streamFixtureReply();
    return;
  }

  const stream = getClient().messages.stream({
    model: MODEL_BY_TIER.reasoning,
    max_tokens: 2048,
    system: systemPrompt,
    messages: [
      ...priorMessages.map(
        (turn): Anthropic.Messages.MessageParam => ({
          role: turn.role === 'User' ? 'user' : 'assistant',
          content: turn.content,
        }),
      ),
      { role: 'user', content: userTurnContent },
    ],
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text;
    }
  }
}

async function* streamFixtureReply(): AsyncGenerator<string> {
  const fixturePath = path.join(process.cwd(), 'lib/ai/fixtures', 'assistant_reply.default.txt');
  const text = await readFile(fixturePath, 'utf-8');
  const CHUNK_SIZE = 24;

  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    yield text.slice(i, i + CHUNK_SIZE);
  }
}

async function loadFixture<T extends z.ZodTypeAny>(
  toolName: string,
  scenario: string,
  schema: T,
): Promise<z.infer<T>> {
  // 'invalid' is a single shared fixture (rather than one per stage) that
  // deliberately fails every stage's schema, used to exercise the
  // PartiallyCompleted path — see the implementation plan's Fixture / Mock
  // Strategy section.
  const filename = scenario === 'invalid' ? 'invalid.json' : `${toolName}.${scenario}.json`;
  const fixturePath = path.join(process.cwd(), 'lib/ai/fixtures', filename);
  const raw = await readFile(fixturePath, 'utf-8');
  const data: unknown = JSON.parse(raw);

  // Fixtures still pass through the real schema in mock mode, so schema
  // drift is caught even without a live API call — see the implementation
  // plan's Fixture / Mock Strategy section.
  const parsed = schema.safeParse(data);

  if (!parsed.success) {
    throw new AiOutputError(`Schema validation failed for fixture ${toolName}.${scenario}: ${parsed.error.message}`);
  }

  return parsed.data;
}
