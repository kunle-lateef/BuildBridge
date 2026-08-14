/**
 * The product prompt specifies this exact fallback sentence for both the
 * responsive-analysis stage and the P2 contextual assistant. Defined once
 * here and reused everywhere, rather than letting each caller paraphrase it
 * independently — see code-style.md's "same word means the same thing
 * everywhere" rule, extended to user-facing AI copy.
 */
export const INSUFFICIENT_EVIDENCE_MESSAGE =
  'The available design evidence is insufficient to determine this reliably.';
