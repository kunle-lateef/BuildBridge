'use client';

import { usePathname } from 'next/navigation';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type MobileSidebarContextValue = {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
};

const MobileSidebarContext = createContext<MobileSidebarContextValue>({
  isOpen: false,
  toggle: () => {},
  close: () => {},
});

/**
 * Open/closed state for the sidebar's off-canvas mode below the `lg`
 * breakpoint — shared between MobileSidebarToggle (in the header) and
 * Sidebar (in the left rail), which aren't nested inside each other, so a
 * plain lifted-state prop wouldn't reach both. Same Context pattern
 * ScreenPinProvider already established for the same kind of problem.
 */
export function MobileSidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // An open drawer surviving a route change would cover the new page with
  // no visible way to dismiss it until the user finds the backdrop.
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <MobileSidebarContext.Provider
      value={{ isOpen, toggle: () => setIsOpen((prev) => !prev), close: () => setIsOpen(false) }}
    >
      {children}
    </MobileSidebarContext.Provider>
  );
}

export function useMobileSidebar(): MobileSidebarContextValue {
  return useContext(MobileSidebarContext);
}
