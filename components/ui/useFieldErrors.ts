'use client';

import { useState, type SyntheticEvent } from 'react';
import type { ZodTypeAny } from 'zod';

/**
 * Live, per-field validation for a form, reusing the exact same Zod schema
 * the server action already validates against — no separate client-side
 * rules to keep in sync. A field only starts showing errors after its first
 * blur (so we don't flag "too short" while someone is mid-typing a fresh
 * password), then re-validates live on every change once it's been touched.
 *
 * This never blocks submission — the server action remains the source of
 * truth for whether the form is actually valid. It's purely reactive UX
 * feedback layered on top.
 */
export function useFieldErrors<Schema extends ZodTypeAny>(schema: Schema) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());

  function validate(form: HTMLFormElement) {
    const result = schema.safeParse(Object.fromEntries(new FormData(form)));

    if (result.success) {
      setErrors({});
      return;
    }

    const next: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0];
      if (typeof key === 'string' && !(key in next)) {
        next[key] = issue.message;
      }
    }
    setErrors(next);
  }

  function fieldProps(name: string) {
    return {
      onBlur: (event: SyntheticEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setTouched((prev) => new Set(prev).add(name));
        if (event.currentTarget.form) validate(event.currentTarget.form);
      },
      onChange: (event: SyntheticEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (touched.has(name) && event.currentTarget.form) validate(event.currentTarget.form);
      },
      error: touched.has(name) ? errors[name] : undefined,
    };
  }

  return { fieldProps };
}
