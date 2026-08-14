'use client';

import { AlertCircle, CheckCircle2, Loader2, UploadCloud } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import { recordUpload } from '@/app/(dashboard)/handoffs/[handoffId]/actions';
import { cn } from '@/lib/cn';
import { ALLOWED_UPLOAD_MEDIA_TYPES, MAX_UPLOAD_SIZE_BYTES } from '@/lib/validators/upload';

type UploadItem = {
  id: string;
  filename: string;
  status: 'uploading' | 'processing' | 'done' | 'error';
  message?: string;
};

type UploadDropzoneProps = {
  handoffId: string;
};

export function UploadDropzone({ handoffId }: UploadDropzoneProps) {
  const router = useRouter();
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadOne(file: File) {
    const id = `${file.name}-${Date.now()}`;
    setItems((prev) => [...prev, { id, filename: file.name, status: 'uploading' }]);

    if (!ALLOWED_UPLOAD_MEDIA_TYPES.includes(file.type as never)) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: 'error', message: 'Unsupported file type.' } : item,
        ),
      );
      return;
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: 'error', message: 'File is larger than 25MB.' } : item,
        ),
      );
      return;
    }

    try {
      const urlResponse = await fetch('/api/uploads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handoffId,
          filename: file.name,
          mediaType: file.type,
          size: file.size,
        }),
      });
      const urlResult = await urlResponse.json();

      if (!urlResult.ok) {
        throw new Error(urlResult.error?.message ?? 'Could not prepare the upload.');
      }

      const { uploadUrl, storageKey } = urlResult.data as { uploadUrl: string; storageKey: string };

      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status: 'processing' } : item)));

      const recordResult = await recordUpload({
        handoffId,
        storageKey,
        filename: file.name,
        mediaType: file.type,
        size: file.size,
      });

      if (!recordResult.ok) {
        throw new Error(recordResult.error.message);
      }

      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status: 'done' } : item)));
      router.refresh();
    } catch (error) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, status: 'error', message: error instanceof Error ? error.message : 'Upload failed.' }
            : item,
        ),
      );
    }
  }

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    Array.from(fileList).forEach((file) => {
      void uploadOne(file);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-[--radius-lg] border border-dashed border-[--color-border] px-6 py-10 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]',
          isDragging && 'border-[--color-primary] bg-[--color-surface]',
        )}
      >
        <UploadCloud aria-hidden="true" size={24} className="text-[--color-text-muted]" />
        <span className="text-[--color-text-body]">Drop screens here, or click to browse</span>
        <span className="text-[--color-text-muted]">PNG, JPG, or WebP — up to 25MB each</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ALLOWED_UPLOAD_MEDIA_TYPES.join(',')}
          onChange={(event) => handleFiles(event.target.files)}
          className="hidden"
        />
      </button>

      {items.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2 rounded-[--radius-md] border border-[--color-border] px-3 py-2"
            >
              {item.status === 'uploading' || item.status === 'processing' ? (
                <Loader2
                  aria-hidden="true"
                  size={16}
                  className="animate-spin text-[--color-text-muted] motion-reduce:animate-none"
                />
              ) : item.status === 'done' ? (
                <CheckCircle2 aria-hidden="true" size={16} className="text-[--color-success]" />
              ) : (
                <AlertCircle aria-hidden="true" size={16} className="text-[--color-error]" />
              )}
              <span className="text-[--color-text-body]">{item.filename}</span>
              <span className="ml-auto text-[--color-text-secondary]">
                {item.status === 'uploading' && 'Uploading…'}
                {item.status === 'processing' && 'Validating…'}
                {item.status === 'done' && 'Done'}
                {item.status === 'error' && (item.message ?? 'Failed')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
