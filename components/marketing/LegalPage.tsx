import { MARKETING_CONTAINER } from '@/components/marketing/container';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { cn } from '@/lib/cn';

export type LegalSection = {
  id: string;
  heading: string;
  body: string[];
  /** Figma tints one section (and its "On this page" link) to call it out. */
  isHighlighted?: boolean;
};

/**
 * Privacy and Terms, as in Figma `01 — Home` → "Privacy policy" / "Terms of
 * service": an "On this page" list beside a 680px article.
 */
export function LegalPage({ title, description, sections }: { title: string; description: string; sections: LegalSection[] }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <MarketingHeader />
      <main
        className={cn(
          MARKETING_CONTAINER,
          'grid flex-1 grid-cols-1 gap-10 pb-24 pt-16 lg:grid-cols-[240px_minmax(0,680px)] lg:gap-20',
        )}
      >
        <nav aria-label="On this page" className="hidden lg:block">
          <div className="sticky top-24 flex flex-col gap-2.5">
            <span className="text-[12px] font-semibold uppercase leading-4 tracking-[1.5px] text-[--color-text-secondary]">
              On this page
            </span>
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={cn(
                  'text-[14px] leading-5 hover:text-[--color-text-primary]',
                  section.isHighlighted ? 'text-[--color-primary]' : 'text-[--color-text-secondary]',
                )}
              >
                {section.heading}
              </a>
            ))}
          </div>
        </nav>

        <article className="flex flex-col gap-8">
          <header className="flex flex-col gap-3">
            <h1 className="m-0 text-[28px] font-semibold leading-9 tracking-[-0.5px] text-[--color-text-primary] sm:text-[36px] sm:leading-[44px]">
              {title}
            </h1>
            <p className="m-0 text-[16px] leading-6 text-[--color-text-secondary]">{description}</p>
          </header>
          {sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className={cn(
                'flex scroll-mt-24 flex-col gap-2.5',
                section.isHighlighted && 'rounded-[12px] bg-[--color-primary-light] px-5 py-[18px]',
              )}
            >
              <h2 className="m-0 text-[16px] font-semibold leading-6 text-[--color-text-primary]">{section.heading}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph} className="m-0 text-[16px] leading-6 text-[--color-text-body]">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </article>
      </main>
      <MarketingFooter />
    </div>
  );
}
