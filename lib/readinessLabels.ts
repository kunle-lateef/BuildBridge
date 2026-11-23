import type { IssueSeverity, ReadinessCategory } from '@/lib/types';

/** Display names for the six readiness categories. Client-safe (no db import). */
export const READINESS_CATEGORY_LABEL: Record<ReadinessCategory, string> = {
  VisualSpecifications: 'Visual specifications',
  Components: 'Components',
  ResponsiveBehavior: 'Responsive behavior',
  InteractionStates: 'Interaction states',
  EdgeCases: 'Edge cases',
  Accessibility: 'Accessibility',
};

export const SEVERITY_ORDER: IssueSeverity[] = ['Critical', 'High', 'Medium', 'Low', 'Recommendation'];
