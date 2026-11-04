import React from 'react';
import { useSystem } from '../context/SystemContext';
import { CheckCircle2, AlertTriangle, XCircle, Info, X, Terminal } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useSystem();

  if (toasts.length === 0) return null;

  return (
    <aside aria-label="System notifications" className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex flex-col gap-1.5 p-3.5 rounded-lg border shadow-xl backdrop-blur-md transition-all animate-in slide-in-from-bottom-2 ${
              isSuccess
                ? 'bg-slate-900/95 border-emerald-500/40 text-slate-100 shadow-emerald-950/20'
                : isError
                ? 'bg-slate-900/95 border-rose-500/40 text-slate-100 shadow-rose-950/20'
                : isWarning
                ? 'bg-slate-900/95 border-amber-500/40 text-slate-100 shadow-amber-950/20'
                : 'bg-slate-900/95 border-sky-500/40 text-slate-100 shadow-sky-950/20'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                {isError && <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                {isWarning && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
                {!isSuccess && !isError && !isWarning && <Info className="w-4 h-4 text-sky-400 shrink-0" />}
                <h4 className="text-xs font-semibold tracking-wide uppercase text-slate-300">
                  {toast.title}
                </h4>
              </div>
              <button
                onClick={() => dismissToast(toast.id)}
                className="text-slate-400 hover:text-slate-200 transition-colors p-0.5"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans pl-6">
              {toast.message}
            </p>

            {toast.command && (
              <div className="ml-6 mt-1 flex items-center gap-1.5 px-2 py-1 rounded bg-black/50 border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto">
                <Terminal className="w-3 h-3 text-slate-500 shrink-0" />
                <span className="truncate">{toast.command}</span>
              </div>
            )}
          </div>
        );
      })}
    </aside>
  );
};
