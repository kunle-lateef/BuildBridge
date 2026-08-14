import { z } from 'zod';

export const recordDesignerDecisionSchema = z.object({
  findingType: z.enum(['Component', 'Specification', 'ComponentState', 'ResponsiveRule', 'HandoffIssue']),
  findingReference: z.string().min(1),
  action: z.enum(['Confirm', 'Modify', 'Reject', 'Override']),
  newValue: z.string().trim().max(2000).optional(),
  note: z.string().trim().max(2000).optional(),
});

export type RecordDesignerDecisionInput = z.infer<typeof recordDesignerDecisionSchema>;
