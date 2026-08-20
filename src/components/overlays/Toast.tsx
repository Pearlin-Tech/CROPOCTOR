import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import { useApp, type Toast } from '@/store/AppContext'
import { toastVariants } from '@/animations/variants'
import { cn } from '@/utils/cn'

const toastConfig = {
  success: { icon: CheckCircle, bg: 'bg-green-light border-green-pastel', text: 'text-green-forest', iconColor: 'text-green-forest' },
  error:   { icon: XCircle,     bg: 'bg-red-50 border-red-200',           text: 'text-red-700',      iconColor: 'text-muted-danger' },
  warning: { icon: AlertTriangle,bg:'bg-amber-50 border-amber-200',       text: 'text-amber-800',    iconColor: 'text-muted-warning' },
  info:    { icon: Info,         bg: 'bg-blue-50 border-blue-200',         text: 'text-blue-700',     iconColor: 'text-blue-500' },
}

const ToastItem: React.FC<{ toast: Toast }> = ({ toast }) => {
  const { dismissToast } = useApp()
  const { icon: Icon, bg, text, iconColor } = toastConfig[toast.type]
  return (
    <motion.div
      layout
      variants={toastVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={cn('flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-card-lg max-w-sm w-full', bg)}
      role="alert"
      aria-live="polite"
    >
      <Icon className={cn('w-5 h-5 shrink-0', iconColor)} />
      <p className={cn('text-sm font-medium flex-1', text)}>{toast.message}</p>
      <button onClick={() => dismissToast(toast.id)} className="shrink-0 opacity-50 hover:opacity-100 transition-opacity">
        <X className={cn('w-4 h-4', text)} />
      </button>
    </motion.div>
  )
}

export const ToastContainer: React.FC = () => {
  const { toasts } = useApp()
  return (
    <div
      aria-label="Notifications"
      className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 w-full px-4 pointer-events-none"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
