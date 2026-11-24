import type { DeveloperHandoffProjection } from '@/lib/share';
import type { IssueSeverity, ProvenanceType } from '@/lib/types';

// ---------------------------------------------------------------------------
// Assistant answer sources ("From Pay button · Loading · Review this finding")
//
// Every finding in the assistant's context gets a short tag ([C1], [S3],
// [T2], [R1], [G4]). The prompt asks the model to end each answer with a
// "Sources: S3, G4" line. The server never forwards that line as text: it
// keeps only tags that exist in this handoff's index, turns them into
// names and links, and sends them after the answer as one structured
// record that the model's own text can't imitate (the separator character
// is stripped from model output). An unknown tag links nowhere.
// ---------------------------------------------------------------------------

export type AnswerSource = {
  tag: string;
  kind: 'component' | 'specification' | 'state' | 'responsive' | 'gap';
  /** e.g. "Pay button · Loading". */
  label: string;
  /** Provenance for findings, severity for gaps — shown as the source's badge. */
  provenance: ProvenanceType | null;
  severity: IssueSeverity | null;
  /** The finding's own id, and its component's, for the "Review this finding" link. */
  findingId: string;
  componentId: string | null;
};

export type SourceIndex = Map<string, AnswerSource>;

/** ASCII record separator: marks the server's sources record at the end of a reply. */
export const SOURCES_SEPARATOR = '\u001e';
export const MAX_SOURCES = 3;

/** Tags every finding, in the same order the context lists them. */
export function buildSourceIndex(projection: DeveloperHandoffProjection): SourceIndex {
  const index: SourceIndex = new Map();
  const counters = { C: 0, S: 0, T: 0, R: 0, G: 0 };
  const add = (prefix: keyof typeof counters, source: Omit<AnswerSource, 'tag'>) => {
    counters[prefix] += 1;
    const tag = `${prefix}${counters[prefix]}`;
    index.set(tag, { tag, ...source });
    return tag;
  };
  const componentName = new Map(projection.components.map((component) => [component.id, component.name]));

  for (const component of projection.components) {
    add('C', { kind: 'component', label: component.name, provenance: component.provenance, severity: null, findingId: component.id, componentId: component.id });
    for (const spec of component.specifications) {
      add('S', { kind: 'specification', label: `${component.name} · ${spec.property}`, provenance: spec.provenance, severity: null, findingId: spec.id, componentId: component.id });
    }
    for (const state of component.states) {
      add('T', { kind: 'state', label: `${component.name} · ${state.name}`, provenance: state.provenance, severity: null, findingId: state.id, componentId: component.id });
    }
  }
  for (const rule of projection.responsiveRules) {
    const owner = rule.componentId ? componentName.get(rule.componentId) : null;
    add('R', { kind: 'responsive', label: `${owner ?? 'Layout'} · ${rule.viewportCategory}`, provenance: rule.provenance, severity: null, findingId: rule.id, componentId: rule.componentId });
  }
  for (const issue of projection.issues) {
    add('G', { kind: 'gap', label: issue.title, provenance: null, severity: issue.severity, findingId: issue.id, componentId: issue.componentId });
  }
  return index;
}

/** Looks up the tag for a finding id, so the context builder can prefix its line. */
export function tagFor(index: SourceIndex, findingId: string, kind: AnswerSource['kind']): string | null {
  for (const source of index.values()) {
    if (source.findingId === findingId && source.kind === kind) return source.tag;
  }
  return null;
}

/** Keeps only real tags from a "Sources: …" line, in order, without repeats, at most MAX_SOURCES. */
export function resolveSources(line: string, index: SourceIndex): AnswerSource[] {
  const tags = line.toUpperCase().match(/\b[CSTRG]\d{1,4}\b/g) ?? [];
  const seen = new Set<string>();
  const sources: AnswerSource[] = [];
  for (const tag of tags) {
    const source = index.get(tag);
    if (!source || seen.has(tag)) continue;
    seen.add(tag);
    sources.push(source);
    if (sources.length === MAX_SOURCES) break;
  }
  return sources;
}

const MARKER = /(^|\n)[ \t]*sources:/i;
const HOLD_BACK = 12; // longer than "\n sources:", so a marker split across chunks is never forwarded

/**
 * Splits a streamed reply into the text to show and the trailing
 * "Sources:" line. Text is forwarded as it arrives, except a short tail,
 * held until it's clear it isn't the start of the marker. Anything after
 * the marker is never forwarded. The separator character is removed from
 * model text, so only the server can write a sources record.
 */
export class SourcesSplitter {
  private buffer = '';
  private forwarded = 0;
  private markerAt = -1;

  push(chunk: string): string {
    this.buffer += chunk.split(SOURCES_SEPARATOR).join('');
    if (this.markerAt === -1) {
      const match = MARKER.exec(this.buffer);
      // Cut before the line break too, so the answer doesn't end in one.
      if (match) this.markerAt = match.index;
    }
    const safeEnd = this.markerAt !== -1 ? this.markerAt : Math.max(this.forwarded, this.buffer.length - HOLD_BACK);
    const out = this.buffer.slice(this.forwarded, safeEnd);
    this.forwarded = Math.max(this.forwarded, safeEnd);
    return out;
  }

  /** Call once the stream ends: the remaining text to show, and the raw sources line (if any). */
  end(): { text: string; sourcesLine: string | null } {
    if (this.markerAt === -1) {
      const text = this.buffer.slice(this.forwarded).replace(/\s+$/, '');
      this.forwarded = this.buffer.length;
      return { text, sourcesLine: null };
    }
    const text = this.buffer.slice(this.forwarded, this.markerAt).replace(/\s+$/, '');
    this.forwarded = this.buffer.length;
    return { text, sourcesLine: this.buffer.slice(this.markerAt).trim() };
  }
}
