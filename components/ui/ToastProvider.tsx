'use client';

import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

type ToastVariant = 'success' | 'error' | 'info';

type ToastRecord = {
  id: string;
  message: string;
  variant: ToastVariant;
};

type ToastActions = {
  /** Fire-and-forget confirmation for an action that already succeeded — never blocks, never replaces the inline `role="alert"` banners forms already use for validation/failure. */
  toast: (message: string, variant?: ToastVariant) => void;
};

const noopActions: ToastActions = { toast: () => undefined };
const ToastActionsContext = createContext<ToastActions>(noopActions);

const AUTO_DISMISS_MS = 4000;

const VARIANT_ICON: Record<ToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const VARIANT_COLOR: Record<ToastVariant, string> = {
  success: 'text-[--color-success]',
  error: 'text-[--color-error]',
  info: 'text-[--color-primary]',
};

/**
 * App-wide confirmation toasts — see the UX audit's "no toast system exists
 * anywhere" finding. Archive/revoke/decision/note actions previously
 * succeeded with only an ambient state change as feedback (a button label
 * flipping, a row updating) and no explicit confirmation. One shared
 * Context (same pattern as ScreenPinProvider/MobileSidebarProvider) so any
 * client component under it can call `useToast().toast(...)` without prop
 * drilling.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = 'success') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [...prev, { id, message, variant }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), AUTO_DISMISS_MS),
      );
    },
    [dismiss],
  );

  const actions = useMemo<ToastActions>(() => ({ toast }), [toast]);

  return (
    <ToastActionsContext.Provider value={actions}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-2"
      >
        {toasts.map((item) => {
          const Icon = VARIANT_ICON[item.variant];
          return (
            <div
              key={item.id}
              role="status"
              className="pointer-events-auto flex max-w-sm items-start gap-2 rounded-[--radius-lg] border border-[--color-border] bg-[--color-background] p-3 shadow-lg"
            >
              <Icon aria-hidden="true" size={18} className={cn('mt-0.5 shrink-0', VARIANT_COLOR[item.variant])} />
              <p className="flex-1 text-[--color-text-body]">{item.message}</p>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="Dismiss"
                className="shrink-0 rounded-[--radius-sm] p-0.5 text-[--color-text-muted] hover:bg-[--color-surface] hover:text-[--color-text-primary] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
              >
                <X aria-hidden="true" size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastActionsContext.Provider>
  );
}

export function useToast(): ToastActions {
  return useContext(ToastActionsContext);
}
