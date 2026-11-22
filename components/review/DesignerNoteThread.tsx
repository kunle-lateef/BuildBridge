'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useRef, useState } from 'react';

import {
  addDesignerNote,
  deleteDesignerNote,
  editDesignerNote,
} from '@/app/(dashboard)/handoffs/[handoffId]/actions';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { AlertCircle, Pencil, Trash2 } from '@/components/ui/icons';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/ToastProvider';
import { useFieldErrors } from '@/components/ui/useFieldErrors';
import type { ActionResult } from '@/lib/types';
import { addDesignerNoteSchema } from '@/lib/validators/note';

// Only the field this form actually collects — handoffId is supplied from
// the closure, not a real form input, so validating the full server schema
// against this form's FormData would spuriously flag a field the user
// never sees.
const addNoteFieldSchema = addDesignerNoteSchema.pick({ content: true });

export type DesignerNoteItem = {
  id: string;
  content: string;
  createdAt: string;
  /** What the note is about: a component or screen name, or "Whole handoff". */
  target: string;
};

type DesignerNoteThreadProps = {
  handoffId: string;
  notes: DesignerNoteItem[];
};

type MutationResult = ActionResult<{ noteId: string }> | null;

function noteTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === now.toDateString()) {
    return `Today, ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Figma `04 — Handoff / Notes tab`. Designer-authored context that appears
 * in the developer view under Implementation notes. Rendered as plain text
 * throughout (React's default escaping); never dangerouslySetInnerHTML —
 * see security.md's XSS section.
 */
export function DesignerNoteThread({ handoffId, notes }: DesignerNoteThreadProps) {
  const router = useRouter();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const { fieldProps } = useFieldErrors(addNoteFieldSchema);
  const [addState, addFormAction, isAdding] = useActionState<MutationResult, FormData>(
    async (_prevState, formData) => addDesignerNote({ handoffId, content: String(formData.get('content') ?? '') }),
    null,
  );

  useEffect(() => {
    if (addState?.ok) {
      toast('Note added');
      formRef.current?.reset();
      router.refresh();
    }
  }, [addState, toast, router]);

  return (
    <div className="flex max-w-[760px] flex-col gap-3">
      <form ref={formRef} action={addFormAction} className="flex flex-col gap-3 rounded-[12px] border border-[--color-border] bg-white p-3">
        <Textarea
          id="new-note-content"
          name="content"
          label="Add a note"
          hideLabel
          rows={3}
          placeholder="Add a note for the developer…"
          {...fieldProps('content')}
        />
        {addState && !addState.ok && (
          <p role="alert" className="m-0 flex items-center gap-2 text-[14px] text-[--color-error]">
            <AlertCircle aria-hidden="true" size={14} />
            {addState.error.message}
          </p>
        )}
        <Button type="submit" disabled={isAdding} className="self-end">
          {isAdding ? 'Adding…' : 'Add note'}
        </Button>
      </form>

      {notes.map((note) => (
        <NoteCard key={note.id} note={note} onChanged={() => router.refresh()} />
      ))}
    </div>
  );
}

function NoteCard({ note, onChanged }: { note: DesignerNoteItem; onChanged: () => void }) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [content, setContent] = useState(note.content);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setIsBusy(true);
    setError(null);
    const result = await editDesignerNote({ noteId: note.id, content });
    setIsBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setIsEditing(false);
    toast('Note updated');
    onChanged();
  }

  async function remove() {
    setIsBusy(true);
    setError(null);
    const result = await deleteDesignerNote(note.id);
    setIsBusy(false);
    setIsConfirmingDelete(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    toast('Note deleted');
    onChanged();
  }

  const contentError = isEditing && content.trim().length === 0 ? 'Note cannot be empty.' : undefined;

  return (
    <article className="flex flex-col gap-2 rounded-[12px] border border-[--color-border] bg-white px-4 py-3.5">
      <div className="flex items-center gap-2 text-[12px] leading-4 text-[--color-text-secondary]">
        <span>{note.target}</span>
        <span className="ml-auto">{noteTime(note.createdAt)}</span>
        {!isEditing && (
          <>
            <button type="button" aria-label="Edit note" onClick={() => setIsEditing(true)} className="rounded-[4px] p-0.5 hover:bg-[--color-surface] hover:text-[--color-text-primary]">
              <Pencil aria-hidden="true" size={14} />
            </button>
            <button type="button" aria-label="Delete note" onClick={() => setIsConfirmingDelete(true)} className="rounded-[4px] p-0.5 hover:bg-[--color-surface] hover:text-[--color-error]">
              <Trash2 aria-hidden="true" size={14} />
            </button>
          </>
        )}
      </div>

      {isEditing ? (
        <>
          <Textarea
            id={`note-${note.id}-content`}
            label="Edit note"
            hideLabel
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={2}
            autoFocus
            maxLength={2000}
            error={contentError}
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={isBusy || !!contentError} onClick={() => void save()}>
              {isBusy ? 'Saving…' : 'Save'}
            </Button>
            <Button type="button" variant="secondary" size="sm" disabled={isBusy} onClick={() => { setContent(note.content); setIsEditing(false); }}>
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <p className="m-0 whitespace-pre-line text-[14px] leading-5 text-[--color-text-primary]">{note.content}</p>
      )}

      {error && (
        <p role="alert" className="m-0 flex items-center gap-2 text-[14px] text-[--color-error]">
          <AlertCircle aria-hidden="true" size={14} />
          {error}
        </p>
      )}

      <ConfirmDialog
        open={isConfirmingDelete}
        onClose={() => setIsConfirmingDelete(false)}
        onConfirm={() => void remove()}
        title="Delete this note?"
        description="Developers stop seeing it on the share link. This can’t be undone."
        confirmLabel="Delete note"
        variant="danger"
        isConfirming={isBusy}
      />
    </article>
  );
}
