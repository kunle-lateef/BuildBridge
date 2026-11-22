import { MARKETING_CONTAINER } from '@/components/marketing/container';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { cn } from '@/lib/cn';
import type { IssueSeverity } from '@/lib/types';

const STEPS = ['Upload', 'Analyze', 'Detect gaps', 'Review', 'Resolve', 'Handoff'];
// Figma shows step 03 open, beside the gaps it produces.
const ACTIVE_STEP = 2;
const ACTIVE_DESCRIPTION = 'Missing states, unclear breakpoints and incomplete specs are listed with a severity.';

const GAPS: { severity: IssueSeverity; title: string; description: string; where: string }[] = [
  {
    severity: 'Critical',
    title: 'No declined-card state',
    description: 'The design shows success only. What does the form do when the bank says no?',
    where: 'Checkout · Pay button',
  },
  {
    severity: 'High',
    title: 'Tablet breakpoint undefined',
    description: 'Summary sits beside the form on desktop and below it on mobile. 768px is never shown.',
    where: 'Checkout · layout',
  },
];

/** "How a handoff comes together" — Figma `01 — Home` → "How it works". */
export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="scroll-mt-20">
      <div
        className={cn(
          MARKETING_CONTAINER,
          'grid grid-cols-1 gap-10 pb-20 pt-16 lg:grid-cols-[400px_minmax(0,1fr)] lg:gap-16',
        )}
      >
        <div className="flex flex-col">
          <div className="flex flex-col gap-3 pb-8">
            <h2 className="text-[28px] font-semibold leading-9 tracking-[-0.5px] text-[--color-text-primary] sm:text-[36px] sm:leading-[44px]">
              How a handoff comes together
            </h2>
            <p className="max-w-[360px] text-[16px] leading-6 text-[--color-text-secondary]">
              BuildBridge reads your screens and lists what it finds. Every decision stays with you.
            </p>
          </div>
          <ol className="m-0 flex list-none flex-col p-0">
            {STEPS.map((step, index) => {
              const isActive = index === ACTIVE_STEP;
              return (
                <li
                  key={step}
                  aria-current={isActive ? 'step' : undefined}
                  className={cn(
                    'flex gap-4 py-4 pl-5',
                    isActive ? 'border-l-2 border-[--color-primary]' : 'border-l border-[--color-border]',
                  )}
                >
                  <span
                    className={cn(
                      'w-5 shrink-0 text-[14px] font-medium leading-5 tracking-[0.1px] tabular-nums',
                      isActive ? 'text-[--color-primary]' : 'text-[--color-text-secondary]',
                    )}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="flex flex-col gap-1">
                    <span
                      className={cn(
                        'text-[16px] font-semibold leading-6',
                        isActive ? 'text-[--color-text-primary]' : 'text-[--color-text-secondary]',
                      )}
                    >
                      {step}
                    </span>
                    {isActive && (
                      <span className="text-[14px] leading-5 text-[--color-text-secondary]">{ACTIVE_DESCRIPTION}</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="lg:pt-[180px]">
          <div className="flex flex-col gap-5 rounded-[12px] border border-[--color-border] bg-white px-5 pb-8 pt-7 sm:px-8">
            <div className="flex flex-col gap-0.5">
              <span className="text-[16px] font-semibold leading-6 text-[--color-text-primary]">Gaps on Checkout</span>
              <span className="text-[12px] leading-4 tracking-[0.2px] text-[--color-text-secondary]">
                2 of 6 in this handoff
              </span>
            </div>
            {GAPS.map((gap) => (
              <div
                key={gap.title}
                className="flex flex-col gap-3 rounded-[8px] border border-[--color-border] p-4 sm:flex-row sm:gap-4"
              >
                <span className="w-[84px] shrink-0">
                  <SeverityBadge severity={gap.severity} />
                </span>
                <span className="flex flex-col gap-1">
                  <span className="text-[14px] font-medium leading-5 text-[--color-text-primary]">{gap.title}</span>
                  <span className="text-[14px] leading-5 text-[--color-text-secondary]">{gap.description}</span>
                  <span className="text-[12px] leading-4 tracking-[0.2px] text-[--color-text-secondary]">{gap.where}</span>
                </span>
              </div>
            ))}
            <p className="m-0 text-[12px] leading-4 tracking-[0.2px] text-[--color-text-secondary]">
              An open critical gap keeps the handoff from being ready. Other gaps lower the score.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
