import { z } from 'zod';

export const createScreenFlowSchema = z
  .object({
    handoffId: z.string().min(1),
    sourceScreenId: z.string().min(1),
    targetScreenId: z.string().min(1),
    label: z.string().trim().max(200).optional(),
  })
  .refine((input) => input.sourceScreenId !== input.targetScreenId, {
    message: 'A screen cannot lead to itself.',
    path: ['targetScreenId'],
  });
