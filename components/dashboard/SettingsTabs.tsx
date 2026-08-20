'use client';

import { useState, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

type SettingsTab = {
  id: string;
  label: string;
  content: ReactNode;
};

type SettingsTabsProps = {
  tabs: SettingsTab[];
};

export function SettingsTabs({ tabs }: SettingsTabsProps) {
  const [activeId, setActiveId] = useState(tabs[0]?.id);
  const activeTab = tabs.find((tab) => tab.id === activeId);

  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" aria-label="Settings sections" className="flex gap-1 border-b border-[--color-border]">
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveId(tab.id)}
              className={cn(
                'px-4 py-2.5 text-[length:var(--font-desktop-body-small-medium-size)] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]',
                isActive
                  ? 'border-b-2 border-[--color-primary] text-[--color-primary]'
                  : 'border-b-2 border-transparent text-[--color-text-secondary] hover:text-[--color-text-primary]',
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel">{activeTab?.content}</div>
    </div>
  );
}
