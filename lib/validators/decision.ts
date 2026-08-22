import { z } from 'zod';

export const recordDesignerDecisionSchema = z.object({
  findingType: z.enum(['Component', 'Specification', 'ComponentState', 'ResponsiveRule', 'HandoffIssue']),
  findingReference: z.string().min(1),
  action: z.enum(['Confirm', 'Modify', 'Reject', 'Override']),
  newValue: z.string().trim().max(2000).optional(),
  note: z.string().trim().max(2000).optional(),
});

// Confirm/Reject only — Modify/Override both need a per-item newValue and
// aren't bulk-safe. One provenance tier per call, verified server-side
// against each finding's real stored provenance, never trusted from the
// client — see lib/decisions.ts's fetchFindingsForBulk.
export const bulkRecordDecisionSchema = z.object({
  handoffId: z.string().min(1),
  findingType: z.enum(['Component', 'Specification', 'ComponentState', 'ResponsiveRule', 'HandoffIssue']),
  provenance: z.enum(['Detected', 'Inferred', 'Suggested']),
  action: z.enum(['Confirm', 'Reject']),
  findingReferences: z.array(z.string().min(1)).min(1).max(100),
});
