'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { AlertCircle, CheckCircle2, Info, X } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

type ToastVariant = 'success' | 'error' | 'info';

type ToastAction = {
  /** "Undo" or "Retry". Only offer Undo where the action can really be undone. */
  label: string;
  onClick: () => void;
};

type ToastRecord = {
  id: number;
  message: string;
  variant: ToastVariant;
  action?: ToastAction;
};

type ToastActions = {
  /** Fire-and-forget confirmation for an action that already succeeded — never blocks, never replaces the inline `role="alert"` banners forms already use for validation/failure. */
  toast: (message: string, variant?: ToastVariant, options?: { action?: ToastAction }) => void;
};

const noopActions: ToastActions = { toast: () => undefined };
const ToastActionsContext = createContext<ToastActions>(noopActions);

const AUTO_DISMISS_MS = 5000;

const VARIANT_ICON: Record<ToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const VARIANT_COLOR: Record<ToastVariant, string> = {
  success: 'text-[--color-text-primary]',
  error: 'text-[--color-error]',
  info: 'text-[--color-primary]',
};

/**
 * App-wide toasts, per Figma `11 — System / Toasts`: bottom-right on
 * desktop, bottom-centre on mobile; one at a time (a new one replaces the
 * old); success and info close after 5s, errors stay until dismissed. An
 * optional action button carries "Undo" or "Retry".
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<ToastRecord | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(0);

  const dismiss = useCallback(() => {
    setCurrent(null);
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const toast = useCallback<ToastActions['toast']>(
    (message, variant = 'success', options) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      nextId.current += 1;
      setCurrent({ id: nextId.current, message, variant, action: options?.action });
      if (variant !== 'error') {
        timer.current = setTimeout(() => setCurrent(null), AUTO_DISMISS_MS);
      }
    },
    [],
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const actions = useMemo<ToastActions>(() => ({ toast }), [toast]);
  const Icon = current ? VARIANT_ICON[current.variant] : null;

  return (
    <ToastActionsContext.Provider value={actions}>
      {children}
      <div
        aria-live={current?.variant === 'error' ? 'assertive' : 'polite'}
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-center sm:inset-x-auto sm:right-6 sm:bottom-6 sm:justify-end"
      >
        {current && Icon && (
          <div
            key={current.id}
            role={current.variant === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto flex max-w-[560px] items-center gap-3 rounded-[8px] border border-[--color-border] bg-white px-3 py-2.5 shadow-md"
          >
            <Icon aria-hidden="true" size={16} className={cn('shrink-0', VARIANT_COLOR[current.variant])} />
            <p className="m-0 text-[14px] leading-5 text-[--color-text-primary]">{current.message}</p>
            {current.action && (
              <button
                type="button"
                onClick={() => {
                  current.action?.onClick();
                  dismiss();
                }}
                className="shrink-0 text-[14px] font-medium leading-5 text-[--color-primary] hover:underline"
              >
                {current.action.label}
              </button>
            )}
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              className="shrink-0 rounded-[4px] p-0.5 text-[--color-text-secondary] hover:bg-[--color-surface] hover:text-[--color-text-primary]"
            >
              <X aria-hidden="true" size={14} />
            </button>
          </div>
        )}
      </div>
    </ToastActionsContext.Provider>
  );
}

export function useToast(): ToastActions {
  return useContext(ToastActionsContext);
}
