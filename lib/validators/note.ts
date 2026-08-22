import { z } from 'zod';

// Rendered as plain text everywhere (React's default escaping) — never via
// dangerouslySetInnerHTML — per security.md's XSS section. No markdown/HTML
// parsing, so no sanitizer is needed on the render side either.
export const addDesignerNoteSchema = z.object({
  handoffId: z.string().min(1),
  content: z.string().trim().min(1, 'Note cannot be empty.').max(2000),
  screenId: z.string().min(1).optional(),
  componentId: z.string().min(1).optional(),
});

export const editDesignerNoteSchema = z.object({
  noteId: z.string().min(1),
  content: z.string().trim().min(1, 'Note cannot be empty.').max(2000),
});
