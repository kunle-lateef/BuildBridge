import { DecisionControls } from '@/components/review/DecisionControls';
import { Check } from '@/components/ui/icons';
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge';
import type { ProvenanceType, ReviewStatus, ViewportCategory } from '@/lib/types';

export type ResponsiveRuleItem = {
  id: string;
  viewportCategory: ViewportCategory;
  behavior: string;
  provenance: ProvenanceType;
  reviewStatus: ReviewStatus;
  isImplemented: boolean;
  /** The value before the designer's latest Modify, for "Modified · was …". */
  previousValue?: string | null;
};

export type ResponsiveGapItem = { id: string; title: string; viewportLabel: string | null };

type ResponsiveRuleListProps = {
  handoffId: string;
  rules: ResponsiveRuleItem[];
  /** Open gaps in the Responsive behavior category: places the design doesn't say. */
  gaps: ResponsiveGapItem[];
};

/**
 * The app knows a rule's viewport category, not a pixel breakpoint. Figma's
 * mock shows "Under 768px"; printing a number the analysis never produced
 * would present a guess as a spec, so the column names the category.
 */
const VIEWPORT_LABEL: Record<ViewportCategory, string> = {
  Mobile: 'Mobile',
  Tablet: 'Tablet',
  Desktop: 'Desktop',
};

/**
 * Figma `04 — Handoff / Responsive tab`: one table of every responsive rule,
 * with its source label and the designer's decision, plus a row for each
 * open gap where the design doesn't show the layout.
 */
export function ResponsiveRuleList({ handoffId, rules, gaps }: ResponsiveRuleListProps) {
  return (
    <div className="overflow-x-auto rounded-[12px] border border-[--color-border] bg-white">
      <table className="w-full min-w-[760px] border-collapse text-left">
        <thead>
          <tr className="text-[12px] leading-4 text-[--color-text-secondary]">
            <th scope="col" className="px-4 py-3 font-medium">Rule</th>
            <th scope="col" className="w-[140px] px-3 py-3 font-medium">Viewport</th>
            <th scope="col" className="w-[120px] px-3 py-3 font-medium">Source</th>
            <th scope="col" className="w-[300px] px-3 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((rule) => (
            <tr key={rule.id} className="border-t border-[--color-border] align-middle">
              <th scope="row" className="px-4 py-3 text-[14px] font-normal leading-5 text-[--color-text-primary]">{rule.behavior}</th>
              <td className="px-3 py-3 font-mono text-[13px] leading-[18px] text-[--color-text-body]">{VIEWPORT_LABEL[rule.viewportCategory]}</td>
              <td className="px-3 py-3"><ProvenanceBadge provenance={rule.provenance} /></td>
              <td className="px-3 py-3 text-[12px] leading-4">
                <RuleStatus rule={rule} />
              </td>
            </tr>
          ))}
          {gaps.map((gap) => (
            <tr key={gap.id} className="border-t border-[--color-border] align-middle">
              <th scope="row" className="px-4 py-3 text-[14px] font-normal leading-5 text-[--color-text-primary]">{gap.title}</th>
              <td className="px-3 py-3 font-mono text-[13px] leading-[18px] text-[--color-text-body]">{gap.viewportLabel ?? '—'}</td>
              <td className="px-3 py-3 text-[12px] font-medium leading-4 text-[--color-error]">Gap</td>
              <td className="px-3 py-3 text-[12px] leading-4 text-[--color-text-secondary]">
                Not shown in the design ·{' '}
                <a href={`/handoffs/${handoffId}?tab=review#issue-${gap.id}`} className="text-[--color-primary] underline">
                  Open gap
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RuleStatus({ rule }: { rule: ResponsiveRuleItem }) {
  const implemented = rule.isImplemented && <span className="text-[--color-text-secondary]"> · Implemented</span>;

  if (rule.reviewStatus === 'Confirmed') {
    return (
      <span className="inline-flex items-center gap-1 font-medium text-[--color-text-primary]">
        <Check aria-hidden="true" size={14} /> Confirmed{implemented}
      </span>
    );
  }
  if (rule.reviewStatus === 'Modified') {
    return (
      <span className="text-[--color-text-secondary]">
        Modified{rule.previousValue ? ` · was “${rule.previousValue}”` : ''}{implemented}
      </span>
    );
  }
  if (rule.reviewStatus === 'Rejected') {
    return <span className="text-[--color-text-secondary]">Rejected</span>;
  }
  return <DecisionControls findingType="ResponsiveRule" findingReference={rule.id} currentValue={rule.behavior} />;
}
