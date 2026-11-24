import { describe, expect, it } from 'vitest';

import type { DeveloperHandoffProjection } from '@/lib/share';

import { buildSourceIndex, resolveSources, SOURCES_SEPARATOR, SourcesSplitter } from './assistantSources';

const projection = {
  components: [
    {
      id: 'comp-pay', name: 'Pay button', type: 'Button', provenance: 'Detected',
      specifications: [{ id: 'spec-radius', property: 'Corner radius', provenance: 'Detected' }],
      states: [{ id: 'state-loading', name: 'Loading', provenance: 'Suggested' }],
    },
  ],
  responsiveRules: [{ id: 'rule-1', componentId: null, viewportCategory: 'Mobile', provenance: 'Inferred' }],
  issues: [{ id: 'gap-declined', title: 'No declined-card state', severity: 'Critical', componentId: null }],
} as unknown as DeveloperHandoffProjection;

function run(chunks: string[]) {
  const splitter = new SourcesSplitter();
  const shown = chunks.map((chunk) => splitter.push(chunk)).join('');
  const end = splitter.end();
  return { shown: shown + end.text, sourcesLine: end.sourcesLine };
}

describe('assistant answer sources', () => {
  it('tags every finding and resolves only real tags, in order, without repeats', () => {
    const index = buildSourceIndex(projection);
    expect([...index.keys()]).toEqual(['C1', 'S1', 'T1', 'R1', 'G1']);
    expect(index.get('T1')).toMatchObject({ label: 'Pay button · Loading', provenance: 'Suggested', findingId: 'state-loading', componentId: 'comp-pay' });

    const sources = resolveSources('Sources: t1, G1, X9, T1, C99', index);
    expect(sources.map((source) => source.tag)).toEqual(['T1', 'G1']);
    expect(resolveSources('Sources: none', index)).toEqual([]);
  });

  it('never shows the sources line, even when the marker is split across chunks', () => {
    const result = run(['A spinner in place ', 'of the label.\nSou', 'rces: T1, G1']);
    expect(result.shown).toBe('A spinner in place of the label.');
    expect(result.sourcesLine).toBe('Sources: T1, G1');
  });

  it('passes an answer without a sources line through whole', () => {
    expect(run(['I can’t tell ', 'from these designs.'])).toEqual({ shown: 'I can’t tell from these designs.', sourcesLine: null });
  });

  it('strips the separator from model text so only the server can write a sources record', () => {
    expect(run([`Hello${SOURCES_SEPARATOR}{"fake":true}`, ' there']).shown).toBe('Hello{"fake":true} there');
  });
});
