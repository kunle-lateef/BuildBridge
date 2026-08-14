'use client';

import { AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useActionState, useState } from 'react';

import {
  addDesignerNote,
  editDesignerNote,
} from '@/app/(dashboard)/handoffs/[handoffId]/actions';
import type { ActionResult } from '@/lib/types';

export type DesignerNoteItem = {
  id: string;
  content: string;
  createdAt: string;
};

type DesignerNoteThreadProps = {
  handoffId: string;
  notes: DesignerNoteItem[];
};

type MutationResult = ActionResult<{ noteId: string }> | null;

/**
 * Designer-authored context that survives into the developer view — see
 * ImplementationNotesSection.tsx on app/share/[token]. Rendered as plain
 * text throughout (React's default escaping); never dangerouslySetInnerHTML
 * — see security.md's XSS section.
 */
export function DesignerNoteThread({ handoffId, notes }: DesignerNoteThreadProps) {
  const router = useRouter();
  const [addState, addFormAction, isAdding] = useActionState<MutationResult, FormData>(
    async (_prevState, formData) => {
      const content = String(formData.get('content') ?? '');
      const result = await addDesignerNote({ handoffId, content });
      return result;
    },
    null,
  );

  return (
    <div className="flex flex-col gap-3">
      {notes.map((note) => (
        <NoteRow key={note.id} note={note} onSaved={() => router.refresh()} />
      ))}

      <form
        action={(formData) => {
          addFormAction(formData);
        }}
        className="flex flex-col gap-2"
      >
        <textarea
          name="content"
          rows={2}
          placeholder="Add a note for the developer…"
          className="rounded-[--radius-md] border border-[--color-border] bg-[--color-background] px-3 py-2 text-[--color-text-body] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
        />
        {addState && !addState.ok && (
          <p role="alert" className="flex items-center gap-1.5 text-[--color-error]">
            <AlertCircle aria-hidden="true" size={14} />
            {addState.error.message}
          </p>
        )}
        <button
          type="submit"
          disabled={isAdding}
          className="self-start rounded-[--radius-md] border border-[--color-border] px-3 py-1.5 text-[--color-text-body] hover:bg-[--color-surface] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary] disabled:opacity-50"
        >
          {isAdding ? 'Adding…' : 'Add note'}
        </button>
      </form>
    </div>
  );
}

function NoteRow({ note, onSaved }: { note: DesignerNoteItem; onSaved: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(note.content);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setIsSaving(true);
    setError(null);
    const result = await editDesignerNote({ noteId: note.id, content });
    setIsSaving(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setIsEditing(false);
    onSaved();
  }

  if (isEditing) {
    return (
      <div className="flex flex-col gap-1.5 rounded-[--radius-lg] border border-[--color-border] p-3">
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={2}
          autoFocus
          className="rounded-[--radius-md] border border-[--color-border] bg-[--color-background] px-2 py-1.5 text-[--color-text-body] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
        />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => void save()}
            className="rounded-[--radius-sm] bg-[--color-primary] px-2 py-1 text-[length:var(--font-desktop-caption-medium-size)] text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary] disabled:opacity-50"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => {
              setContent(note.content);
              setIsEditing(false);
            }}
            className="rounded-[--radius-sm] border border-[--color-border] px-2 py-1 text-[length:var(--font-desktop-caption-medium-size)] text-[--color-text-body] hover:bg-[--color-surface]"
          >
            Cancel
          </button>
        </div>
        {error && (
          <p role="alert" className="flex items-center gap-1.5 text-[--color-error]">
            <AlertCircle aria-hidden="true" size={14} />
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 rounded-[--radius-lg] border border-[--color-border] p-3">
      <p className="text-[--color-text-body]">{note.content}</p>
      <div className="flex items-center gap-2">
        <span className="text-[length:var(--font-desktop-caption-regular-size)] text-[--color-text-muted]">
          {new Date(note.createdAt).toLocaleString()}
        </span>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="text-[length:var(--font-desktop-caption-medium-size)] text-[--color-primary] hover:underline"
        >
          Edit
        </button>
      </div>
    </div>
  );
}
