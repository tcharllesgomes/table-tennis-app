'use client'

import { useToast } from './use-toast'
import { X, CheckCircle2, AlertCircle } from 'lucide-react'

export function Toaster() {
  const { toasts, dismiss } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg min-w-[280px] max-w-sm bg-white animate-in slide-in-from-right-5 ${
            toast.variant === 'destructive'
              ? 'border-red-200 bg-red-50'
              : toast.variant === 'success'
              ? 'border-green-200 bg-green-50'
              : 'border-slate-200'
          }`}
        >
          {toast.variant === 'success' && <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />}
          {toast.variant === 'destructive' && <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />}
          <div className="flex-1 min-w-0">
            {toast.title && (
              <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
            )}
            {toast.description && (
              <p className="text-sm text-slate-600">{toast.description}</p>
            )}
          </div>
          <button onClick={() => dismiss(toast.id)} className="text-slate-400 hover:text-slate-600 shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
