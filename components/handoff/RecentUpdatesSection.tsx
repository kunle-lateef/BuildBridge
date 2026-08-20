type RecentUpdatesSectionProps = {
  updates: { title: string; category: string; createdAt: string }[];
};

/**
 * Public-safe subset of the designer-only re-analysis changelog — only
 * genuinely new items (AnalysisRunFinding's `Created` kind), sourced by
 * lib/share.ts's buildDeveloperProjection. Never Reaffirmed/Conflict, which
 * are internal trust-model concepts with no meaning to an external
 * developer — see security.md's "Share links expose the developer view
 * only."
 */
export function RecentUpdatesSection({ updates }: RecentUpdatesSectionProps) {
  if (updates.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[--color-text-primary]">Recent updates</h2>
      <ul className="flex flex-col gap-2">
        {updates.map((update, index) => (
          <li
            key={index}
            className="flex flex-wrap items-center gap-3 border-b border-[--color-border] py-2 last:border-b-0"
          >
            <span className="text-[--color-text-body]">{update.title}</span>
            <span className="text-[--color-text-secondary]">{update.category}</span>
            <span className="ml-auto text-[length:var(--font-desktop-caption-regular-size)] text-[--color-text-muted]">
              {new Date(update.createdAt).toLocaleDateString()}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
