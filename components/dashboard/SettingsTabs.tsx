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
  /** The tab to open on, e.g. from `?tab=notifications`; unknown ids fall back to the first. */
  initialId?: string;
};

/** Figma `06 — Settings` tabs: 14px labels, 24px apart, a primary underline on the active one. */
export function SettingsTabs({ tabs, initialId }: SettingsTabsProps) {
  const [activeId, setActiveId] = useState(tabs.some((tab) => tab.id === initialId) ? initialId : tabs[0]?.id);
  const activeTab = tabs.find((tab) => tab.id === activeId);

  return (
    <div className="flex flex-col">
      <div role="tablist" aria-label="Settings sections" className="flex gap-6 border-b border-[--color-border]">
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              id={`settings-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls="settings-panel"
              onClick={() => setActiveId(tab.id)}
              className={cn(
                '-mb-px border-b-2 pb-3 text-[14px] leading-5',
                isActive
                  ? 'border-[--color-primary] font-medium text-[--color-text-primary]'
                  : 'border-transparent text-[--color-text-secondary] hover:text-[--color-text-primary]',
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div id="settings-panel" role="tabpanel" aria-labelledby={`settings-tab-${activeId}`} className="pt-6">
        {activeTab?.content}
      </div>
    </div>
  );
}

/**
 * One Settings row: what it is on the left, the controls on the right,
 * a rule underneath. Stacks on narrow screens.
 */
export function SettingsRow({ title, description, isDanger, children }: {
  title: string; description: string; isDanger?: boolean; children: ReactNode;
}) {
  return (
    <section className="grid max-w-[880px] grid-cols-1 gap-4 border-b border-[--color-border] py-8 md:grid-cols-[280px_minmax(0,1fr)] md:gap-12">
      <div className="flex flex-col gap-1">
        <h2 className={cn('m-0 text-[16px] font-medium leading-6', isDanger ? 'text-[--color-error]' : 'text-[--color-text-primary]')}>
          {title}
        </h2>
        <p className="m-0 text-[14px] leading-5 text-[--color-text-secondary]">{description}</p>
      </div>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </section>
  );
}
