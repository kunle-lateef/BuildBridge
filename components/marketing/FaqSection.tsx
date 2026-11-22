import { MARKETING_CONTAINER } from '@/components/marketing/container';
import { Minus, Plus } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

// Questions from Figma `01 — Home` → FAQ. Figma shows the first answer
// open; the others are the approved answers in code-phase-plan.md §9.
const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: 'What happens if my design doesn’t show every state?',
    answer:
      'BuildBridge marks what it can’t confirm as Suggested, or flags it as a gap. It never invents a hover state or breakpoint behavior it didn’t see.',
  },
  {
    question: 'How many handoffs can I analyze?',
    answer:
      'A free account includes 5 analyses each month and 3 active handoffs at a time. Running analysis again on a handoff that hasn’t changed doesn’t use one.',
  },
  {
    question: 'Can a developer edit anything on the shared link?',
    answer:
      'They can’t change any values. They can flag something that’s unclear and mark values as implemented, and you see both on your side.',
  },
  {
    question: 'What if I disagree with a finding?',
    answer:
      'Reject it, or modify it to the right value. If a later analysis disagrees with your decision, the change comes back to you to review. It’s never applied on its own.',
  },
  {
    question: 'Can I revoke a shared link?',
    answer: 'Yes. Revoke it any time from the handoff page and it stops working straight away.',
  },
];

/** "Common questions" — Figma `01 — Home` → FAQ. */
export function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-20">
      <div
        className={cn(
          MARKETING_CONTAINER,
          'grid grid-cols-1 gap-8 py-16 lg:grid-cols-[400px_minmax(0,720px)] lg:justify-between lg:gap-20',
        )}
      >
        <h2 className="text-[28px] font-semibold leading-9 tracking-[-0.5px] text-[--color-text-primary] sm:text-[36px] sm:leading-[44px]">
          Common questions
        </h2>
        <div className="flex flex-col border-t border-[--color-border]">
          {FAQ_ITEMS.map((item, index) => (
            <details key={item.question} open={index === 0} className="group border-b border-[--color-border] py-[22px]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[16px] font-medium leading-6 text-[--color-text-primary] [&::-webkit-details-marker]:hidden">
                {item.question}
                <Plus aria-hidden="true" size={18} className="shrink-0 text-[--color-text-secondary] group-open:hidden" />
                <Minus aria-hidden="true" size={18} className="hidden shrink-0 text-[--color-text-secondary] group-open:block" />
              </summary>
              <p className="m-0 mt-3 text-[16px] leading-6 text-[--color-text-secondary]">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
