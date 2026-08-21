type HandoffSectionNavProps = {
  sections: { id: string; label: string }[];
};

/**
 * Sticks to the top of the content column (just under the dashboard
 * header's own sticky bar) so a long handoff — Screens, Components, Issues,
 * Notes, Share, and so on — stays navigable without scrolling past
 * everything to reach a section further down. Only ever lists sections the
 * page actually rendered for this handoff, mirroring the same conditionals
 * the page itself uses.
 */
export function HandoffSectionNav({ sections }: HandoffSectionNavProps) {
  if (sections.length < 2) return null;

  return (
    <nav
      aria-label="Handoff sections"
      className="sticky top-16 z-10 -mx-6 flex gap-1 overflow-x-auto border-b border-[--color-border] bg-[--color-background]/95 px-6 py-2 backdrop-blur supports-[backdrop-filter]:bg-[--color-background]/80"
    >
      {sections.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          className="shrink-0 rounded-[--radius-sm] px-3 py-1.5 text-[--color-text-secondary] hover:bg-[--color-surface] hover:text-[--color-text-primary] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
        >
          {section.label}
        </a>
      ))}
    </nav>
  );
}
