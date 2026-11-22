'use client';

import { useEffect, useState } from 'react';

/**
 * The label for the search shortcut's modifier: "⌘" on Apple devices,
 * "Ctrl" elsewhere (the palette accepts both, DashboardChrome.tsx). Starts
 * as "⌘", as in Figma and on the server, then corrects after mount so
 * hydration never mismatches.
 */
export function useModKey(): string {
  const [label, setLabel] = useState('⌘');
  useEffect(() => {
    const platform =
      (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.platform ?? '';
    if (!/mac|iphone|ipad|ipod/i.test(platform)) setLabel('Ctrl');
  }, []);
  return label;
}
