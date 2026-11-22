import { MARKETING_CONTAINER } from '@/components/marketing/container';
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge';
import { cn } from '@/lib/cn';
import type { ProvenanceType } from '@/lib/types';

const CARDS: {
  provenance: ProvenanceType;
  property: string;
  value: string;
  description: string;
  cardClass: string;
  left: string;
}[] = [
  {
    provenance: 'Detected',
    property: 'Corner radius',
    value: '8px',
    description: 'Read directly from the design.',
    cardClass: 'border-solid border-[--color-detected] bg-[--color-detected-light]',
    left: 'lg:left-[3.333%]',
  },
  {
    provenance: 'Inferred',
    property: 'Hover state',
    value: 'darkens 8%',
    description: 'Reasoned from visual evidence, not explicitly shown.',
    cardClass: 'border-dashed border-[--color-inferred] bg-[--color-inferred-light]',
    left: 'lg:left-[35.333%]',
  },
  {
    provenance: 'Suggested',
    property: 'Loading state',
    value: 'Spinner only',
    description: 'A best guess where the design doesn’t say. You decide whether to keep it.',
    cardClass: 'border-dotted border-[--color-ai-suggested] bg-[--color-ai-suggested-light]',
    left: 'lg:left-[67.333%]',
  },
];

// Connector geometry from Figma's 1200 × 433 "Provenance stage": stems leave
// the Pay button at ¼, ½ and ¾ of its width and drop to each card's centre.
// x scales with the stage width; y stays in pixels.
const CONNECTORS: { d: string; color: string; dash?: string; dots: [number, number][] }[] = [
  { d: 'M545 110 V158 H216 V234', color: 'var(--color-detected)', dots: [[545, 110], [216, 234]] },
  { d: 'M600 110 V234', color: 'var(--color-inferred)', dash: '4 3', dots: [[600, 110], [600, 234]] },
  { d: 'M655 110 V158 H984 V234', color: 'var(--color-ai-suggested)', dash: '1 4', dots: [[655, 110], [984, 234]] },
];

/** "Every finding shows how sure it is" — Figma `01 — Home` → "Accuracy". */
export function AccuracySection() {
  return (
    <section id="trust" className="scroll-mt-20 bg-[--color-surface]">
      <div className={cn(MARKETING_CONTAINER, 'flex flex-col gap-10 py-20')}>
        <div className="flex max-w-[720px] flex-col gap-4">
          <h2 className="text-[28px] font-semibold leading-9 tracking-[-0.5px] text-[--color-text-primary] sm:text-[36px] sm:leading-[44px]">
            Every finding shows how sure it is
          </h2>
          <p className="max-w-[560px] text-[16px] leading-6 text-[--color-text-secondary]">
            BuildBridge isn’t always certain, so every value says how it knows: detected, inferred or suggested. The label
            stays visible everywhere, including your developer’s link.
          </p>
        </div>

        <div className="relative flex flex-col items-center gap-6 rounded-[12px] border border-[--color-border] bg-white p-5 lg:block lg:h-[433px] lg:p-0">
          <svg
            aria-hidden="true"
            className="absolute inset-0 hidden h-[433px] w-full lg:block"
            viewBox="0 0 1200 433"
            preserveAspectRatio="none"
          >
            {CONNECTORS.map((connector) => (
              <path
                key={connector.d}
                d={connector.d}
                fill="none"
                stroke={connector.color}
                strokeWidth="1.5"
                strokeDasharray={connector.dash}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
          {CONNECTORS.flatMap((connector) =>
            connector.dots.map(([x, y]) => (
              <span
                key={`${x}-${y}`}
                aria-hidden="true"
                className="absolute hidden h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full lg:block"
                style={{ left: `${(x / 1200) * 100}%`, top: y, backgroundColor: connector.color }}
              />
            )),
          )}

          <p className="m-0 text-center text-[12px] leading-4 tracking-[0.2px] text-[--color-text-secondary] lg:absolute lg:left-1/2 lg:top-7 lg:-translate-x-1/2 lg:whitespace-nowrap">
            Same component, three kinds of evidence &nbsp;·&nbsp; Checkout / Pay button
          </p>
          {/* The customer's own button, in their brand colour, not a BuildBridge token. */}
          <span className="inline-flex h-11 w-[220px] items-center justify-center rounded-[8px] bg-[#4F46E5] text-[14px] font-semibold leading-5 text-white lg:absolute lg:left-1/2 lg:top-16 lg:-translate-x-1/2">
            Pay $43.45
          </span>

          {CARDS.map((card) => (
            <div
              key={card.provenance}
              className={cn(
                'flex w-full flex-col gap-3 rounded-[12px] border-[1.5px] px-6 pb-6 pt-5 lg:absolute lg:top-[236px] lg:w-[29.333%]',
                card.cardClass,
                card.left,
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[14px] leading-5 text-[--color-text-secondary]">{card.property}</span>
                <ProvenanceBadge provenance={card.provenance} />
              </div>
              <span className="font-mono text-[20px] leading-[26px] text-[--color-text-primary]">{card.value}</span>
              <span className="text-[14px] leading-5 text-[--color-text-secondary]">{card.description}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
