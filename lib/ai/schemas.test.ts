import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';


import { INSUFFICIENT_EVIDENCE_MESSAGE } from '@/lib/ai/copy';
import { ASSISTANT_SYSTEM_PROMPT, RESPONSIVE_ANALYSIS_SYSTEM_PROMPT } from '@/lib/ai/prompts';

import {
  assistantReplyContentSchema,
  componentDetectionResultSchema,
  gapDetectionResultSchema,
  responsiveAnalysisResultSchema,
  specificationExtractionResultSchema,
  stateAnalysisResultSchema,
} from './schemas';

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

async function readFixture(filename: string): Promise<unknown> {
  const raw = await readFile(path.join(FIXTURES_DIR, filename), 'utf-8');
  return JSON.parse(raw);
}

describe('pipeline stage schemas against their fixtures', () => {
  const cases = [
    { toolName: 'detect_components', schema: componentDetectionResultSchema },
    { toolName: 'extract_specifications', schema: specificationExtractionResultSchema },
    { toolName: 'analyze_states', schema: stateAnalysisResultSchema },
    { toolName: 'analyze_responsive', schema: responsiveAnalysisResultSchema },
    { toolName: 'detect_gaps', schema: gapDetectionResultSchema },
  ] as const;

  for (const { toolName, schema } of cases) {
    for (const scenario of ['login', 'dashboard']) {
      it(`${toolName}.${scenario}.json satisfies its schema`, async () => {
        const data = await readFixture(`${toolName}.${scenario}.json`);
        const result = schema.safeParse(data);

        expect(result.success).toBe(true);
      });
    }

    it(`invalid.json fails ${toolName}'s schema (proves the PartiallyCompleted path is reachable)`, async () => {
      const data = await readFixture('invalid.json');
      const result = schema.safeParse(data);

      expect(result.success).toBe(false);
    });
  }
});

describe('assistantReplyContentSchema', () => {
  it('accepts a normal reply', () => {
    expect(assistantReplyContentSchema.safeParse('The sidebar collapses into a drawer on mobile.').success).toBe(
      true,
    );
  });

  it('rejects an empty accumulated stream (e.g. the API returned nothing)', () => {
    expect(assistantReplyContentSchema.safeParse('').success).toBe(false);
    expect(assistantReplyContentSchema.safeParse('   ').success).toBe(false);
  });

  it('rejects a reply longer than the bound', () => {
    expect(assistantReplyContentSchema.safeParse('a'.repeat(4001)).success).toBe(false);
  });
});

describe('the "insufficient evidence" fallback path is actually wired up', () => {
  it("the assistant's system prompt instructs it to use the exact shared fallback sentence, not a paraphrase", () => {
    expect(ASSISTANT_SYSTEM_PROMPT).toContain(INSUFFICIENT_EVIDENCE_MESSAGE);
  });

  it('stage 4 (responsive analysis) uses the same shared constant, not an independently-worded one', () => {
    expect(RESPONSIVE_ANALYSIS_SYSTEM_PROMPT).toContain(INSUFFICIENT_EVIDENCE_MESSAGE);
  });
});
