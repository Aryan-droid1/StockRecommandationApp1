import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { ToastItem } from '../types/navigation';

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-full max-w-sm flex-col gap-2.5"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-lg dark:border-[#263247] dark:bg-[#111827]"
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#16C784]" />
          ) : toast.type === 'error' ? (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#EA3943]" />
          ) : (
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
          )}

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-900 dark:text-white">
              {toast.title}
            </p>
            {toast.message && (
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                {toast.message}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
            className="rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
