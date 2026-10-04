import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Loader2 } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: React.ReactNode
  confirmLabel: string
  cancelLabel: string
  destructive?: boolean
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Accessible confirmation dialog: focus starts on Cancel, Escape and backdrop cancel. */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open, title, description, confirmLabel, cancelLabel, destructive, busy, onConfirm, onCancel
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    cancelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onCancel() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      previouslyFocused?.focus?.()
    }
  }, [open, busy, onCancel])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/40" onClick={() => !busy && onCancel()}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-5 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div>
          <h2 id="confirm-title" className="text-lg font-bold text-text-main">{title}</h2>
          <div id="confirm-desc" className="text-sm text-text-secondary mt-1.5">{description}</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            ref={cancelRef}
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="min-h-[44px] rounded-xl border border-brown-pastel/50 font-semibold text-sm text-text-main hover:bg-gray-50 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-forest"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`min-h-[44px] rounded-xl font-bold text-sm text-white inline-flex items-center justify-center gap-2 disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${destructive ? 'bg-red-600 hover:bg-red-700 focus-visible:outline-red-600' : 'bg-green-forest hover:bg-green-dark focus-visible:outline-green-forest'}`}
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
