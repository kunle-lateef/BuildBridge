'use client';

import { AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState } from 'react';

import {
  addDesignerNote,
  editDesignerNote,
} from '@/app/(dashboard)/handoffs/[handoffId]/actions';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
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

type DesignerNoteItem = {
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
  const { toast } = useToast();
  const { fieldProps } = useFieldErrors(addNoteFieldSchema);
  const [addState, addFormAction, isAdding] = useActionState<MutationResult, FormData>(
    async (_prevState, formData) => {
      const content = String(formData.get('content') ?? '');
      const result = await addDesignerNote({ handoffId, content });
      return result;
    },
    null,
  );

  useEffect(() => {
    if (addState?.ok) {
      toast('Note added.');
    }
  }, [addState, toast]);

  return (
    <div className="flex flex-col gap-3">
      {notes.length === 0 ? (
        <p className="text-[--color-text-muted]">No notes yet. Add context for the developer below.</p>
      ) : (
        notes.map((note) => <NoteRow key={note.id} note={note} onSaved={() => router.refresh()} />)
      )}

      <form
        action={(formData) => {
          addFormAction(formData);
        }}
        className="flex flex-col gap-2"
      >
        <Textarea
          id="new-note-content"
          name="content"
          label="Add a note"
          hideLabel
          rows={2}
          placeholder="Add a note for the developer…"
          {...fieldProps('content')}
        />
        {addState && !addState.ok && (
          <p role="alert" className="flex items-center gap-1.5 text-[--color-error]">
            <AlertCircle aria-hidden="true" size={14} />
            {addState.error.message}
          </p>
        )}
        <Button type="submit" variant="secondary" size="sm" disabled={isAdding} className="self-start">
          {isAdding ? 'Adding…' : 'Add note'}
        </Button>
      </form>
    </div>
  );
}

function NoteRow({ note, onSaved }: { note: DesignerNoteItem; onSaved: () => void }) {
  const { toast } = useToast();
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
    toast('Note updated.');
    onSaved();
  }

  if (isEditing) {
    const contentError = content.trim().length === 0 ? 'Note cannot be empty.' : undefined;

    return (
      <Card className="flex flex-col gap-1.5">
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
          <Button type="button" size="sm" disabled={isSaving || !!contentError} onClick={() => void save()}>
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isSaving}
            onClick={() => {
              setContent(note.content);
              setIsEditing(false);
            }}
          >
            Cancel
          </Button>
        </div>
        {error && (
          <p role="alert" className="flex items-center gap-1.5 text-[--color-error]">
            <AlertCircle aria-hidden="true" size={14} />
            {error}
          </p>
        )}
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-1">
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
    </Card>
  );
}
