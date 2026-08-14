import { z } from 'zod';

export const sendAssistantMessageSchema = z.object({
  handoffId: z.string().min(1),
  conversationId: z.string().min(1).optional(),
  message: z.string().trim().min(1, 'Message cannot be empty.').max(2000),
});

export type SendAssistantMessageInput = z.infer<typeof sendAssistantMessageSchema>;
