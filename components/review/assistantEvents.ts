/** A finding the designer asked about, e.g. "Pay button · Loading state". */
export type AskAbout = { label: string; suggestions: string[] };

/** A source the assistant's answer came from (lib/ai/assistantSources.ts's AnswerSource). */
export type AnswerSourceView = {
  tag: string;
  kind: 'component' | 'specification' | 'state' | 'responsive' | 'gap';
  label: string;
  provenance: 'Detected' | 'Inferred' | 'Suggested' | null;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Recommendation' | null;
  findingId: string;
  componentId: string | null;
};

const OPEN_IN_PANEL = 'buildbridge:assistant-open-in-panel';
const OPEN_IN_DRAWER = 'buildbridge:assistant-open-in-drawer';
const REVIEW_FINDING = 'buildbridge:review-finding';

/**
 * Opens Ask BuildBridge. On the Review tab the findings panel takes it (Figma
 * `04 — Handoff / Assistant`); anywhere else the header's drawer does. The
 * panel claims the request by cancelling the event, so exactly one opens.
 */
export function openAssistant(about: AskAbout | null) {
  const claimed = !window.dispatchEvent(new CustomEvent(OPEN_IN_PANEL, { detail: about, cancelable: true }));
  if (!claimed) window.dispatchEvent(new CustomEvent(OPEN_IN_DRAWER, { detail: about }));
}

export function onOpenInPanel(handler: (about: AskAbout | null) => void): () => void {
  const listener = (event: Event) => {
    event.preventDefault();
    handler((event as CustomEvent<AskAbout | null>).detail ?? null);
  };
  window.addEventListener(OPEN_IN_PANEL, listener);
  return () => window.removeEventListener(OPEN_IN_PANEL, listener);
}

export function onOpenInDrawer(handler: (about: AskAbout | null) => void): () => void {
  const listener = (event: Event) => handler((event as CustomEvent<AskAbout | null>).detail ?? null);
  window.addEventListener(OPEN_IN_DRAWER, listener);
  return () => window.removeEventListener(OPEN_IN_DRAWER, listener);
}

/** "Review this finding" / "Answer the gap": the findings panel shows it if it can. Returns whether it did. */
export function reviewFinding(source: AnswerSourceView): boolean {
  return !window.dispatchEvent(new CustomEvent(REVIEW_FINDING, { detail: source, cancelable: true }));
}

/** The handler returns true when it showed the finding; otherwise the link's own href is followed. */
export function onReviewFinding(handler: (source: AnswerSourceView) => boolean): () => void {
  const listener = (event: Event) => {
    if (handler((event as CustomEvent<AnswerSourceView>).detail)) event.preventDefault();
  };
  window.addEventListener(REVIEW_FINDING, listener);
  return () => window.removeEventListener(REVIEW_FINDING, listener);
}
