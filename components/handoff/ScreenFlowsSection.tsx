import { ArrowRight } from 'lucide-react';

type ScreenFlowsSectionProps = {
  flows: { id: string; sourceScreenName: string; targetScreenName: string; label: string | null }[];
};

/**
 * Read-only rendering of designer-authored ScreenFlow rows — no
 * DecisionControls, matching every other section on the public developer
 * view. Rendered as part of the Screens section's content, not a separate
 * fixed section in design-system.md's ordering.
 */
export function ScreenFlowsSection({ flows }: ScreenFlowsSectionProps) {
  if (flows.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-[--color-text-secondary]">Flow</h3>
      <ul className="flex flex-col gap-1.5">
        {flows.map((flow) => (
          <li key={flow.id} className="flex items-center gap-2 text-[--color-text-body]">
            <span>{flow.sourceScreenName}</span>
            <ArrowRight aria-hidden="true" size={14} className="text-[--color-text-muted]" />
            <span>{flow.targetScreenName}</span>
            {flow.label && <span className="text-[--color-text-secondary]">— {flow.label}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
