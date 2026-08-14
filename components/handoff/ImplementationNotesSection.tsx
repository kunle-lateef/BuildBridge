type ImplementationNotesSectionProps = {
  notes: { id: string; content: string }[];
};

export function ImplementationNotesSection({ notes }: ImplementationNotesSectionProps) {
  if (notes.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[length:var(--font-desktop-heading-3-semi-bold-size)] font-semibold text-[--color-text-primary]">
        Implementation notes
      </h2>
      <div className="flex flex-col gap-2">
        {notes.map((note) => (
          <p
            key={note.id}
            className="rounded-[--radius-lg] border border-[--color-border] p-4 text-[--color-text-body]"
          >
            {note.content}
          </p>
        ))}
      </div>
    </section>
  );
}
