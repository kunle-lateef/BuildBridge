'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type ScreenPinRequest = {
  screenId: string;
  highlightedKey: string | null;
  /**
   * Incrementing counter, not derived from screenId/highlightedKey — clicking
   * the same FindingPinLink twice in a row must reliably re-trigger
   * ScreenThumbnail's open-on-request effect even though neither of those
   * two values changed between clicks.
   */
  requestId: number;
};

type ScreenPinActions = {
  openScreenPin: (request: { screenId: string; highlightedKey: string }) => void;
  clear: () => void;
};

const ScreenPinStateContext = createContext<ScreenPinRequest | null>(null);

const noopActions: ScreenPinActions = { openScreenPin: () => undefined, clear: () => undefined };
const ScreenPinActionsContext = createContext<ScreenPinActions>(noopActions);

/**
 * Bridges the Components/Responsive/Issues sections (where a "show on
 * screen" link lives) to the Screens section (where the Modal that link
 * needs to open actually lives) — two independent parts of the page tree
 * with no other shared state. The first React Context in this codebase;
 * both hooks fall back to safe no-op defaults so ScreenThumbnail's other
 * caller (the preview/share pages' ScreensSection.tsx, which renders with
 * no provider) keeps working unchanged.
 */
export function ScreenPinProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ScreenPinRequest | null>(null);

  const actions = useMemo<ScreenPinActions>(
    () => ({
      openScreenPin: ({ screenId, highlightedKey }) =>
        setState((prev) => ({ screenId, highlightedKey, requestId: (prev?.requestId ?? 0) + 1 })),
      clear: () => setState(null),
    }),
    [],
  );

  return (
    <ScreenPinActionsContext.Provider value={actions}>
      <ScreenPinStateContext.Provider value={state}>{children}</ScreenPinStateContext.Provider>
    </ScreenPinActionsContext.Provider>
  );
}

function useScreenPinState(): ScreenPinRequest | null {
  return useContext(ScreenPinStateContext);
}

export function useScreenPinActions(): ScreenPinActions {
  return useContext(ScreenPinActionsContext);
}

/**
 * Convenience for ScreenThumbnail: true exactly when the current pin
 * request targets this screen, keyed off requestId so it fires again even
 * if the same screen/pin is requested twice in a row. Callers still own
 * their own "am I open" state — this only tells them a new request arrived.
 */
export function useScreenPinRequestFor(screenId: string): ScreenPinRequest | null {
  const state = useScreenPinState();
  return state?.screenId === screenId ? state : null;
}
