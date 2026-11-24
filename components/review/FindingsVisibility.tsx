'use client';

import { createContext, useContext } from 'react';

/**
 * Lets the Findings panel's "Hide findings" (») button reach the Review
 * workspace that owns the layout (Figma "Review — 1280 laptop, findings
 * hidden"). Null outside a workspace, where the button isn't shown.
 */
export const FindingsVisibilityContext = createContext<{ hide: () => void } | null>(null);

export function useFindingsVisibility() {
  return useContext(FindingsVisibilityContext);
}
