import React from 'react'
import { cn } from '@/utils/cn'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'green' | 'earth' | 'warning' | 'danger' | 'gray' | 'demo'
  size?: 'sm' | 'md'
  dot?: boolean
}

const variantStyles = {
  green:   'bg-green-light text-green-forest border border-green-pastel/50',
  earth:   'bg-beige-warm text-brown-earth border border-brown-soft/30',
  warning: 'bg-amber-50 text-muted-warning border border-amber-200',
  danger:  'bg-red-50 text-muted-danger border border-red-200',
  gray:    'bg-gray-100 text-gray-600 border border-gray-200',
  demo:    'bg-amber-50 text-amber-700 border border-amber-200',
}

const sizeStyles = {
  sm: 'text-xs px-2 py-0.5 rounded-lg',
  md: 'text-sm px-3 py-1 rounded-xl',
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'green', size = 'sm', dot, className, children, ...props }) => (
  <span className={cn('inline-flex items-center gap-1.5 font-semibold', variantStyles[variant], sizeStyles[size], className)} {...props}>
    {dot && <span className={cn('w-1.5 h-1.5 rounded-full', { green: 'bg-green-forest', earth: 'bg-brown-earth', warning: 'bg-muted-warning', danger: 'bg-muted-danger', gray: 'bg-gray-500', demo: 'bg-amber-500' }[variant])} />}
    {children}
  </span>
)

// ─── ProgressBar ──────────────────────────────────────────────────────────────
interface ProgressBarProps {
  value: number // 0–100
  size?: 'sm' | 'md' | 'lg'
  color?: 'green' | 'earth' | 'warning' | 'danger'
  label?: string
  showValue?: boolean
}

const progressColors = {
  green:   'bg-gradient-to-r from-green-forest to-green-soft',
  earth:   'bg-gradient-to-r from-brown-earth to-brown-soft',
  warning: 'bg-gradient-to-r from-yellow-400 to-muted-warning',
  danger:  'bg-gradient-to-r from-red-400 to-muted-danger',
}

const progressSizes = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' }

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value, size = 'md', color = 'green', label, showValue
}) => (
  <div className="w-full">
    {(label || showValue) && (
      <div className="flex justify-between mb-1.5">
        {label    && <span className="text-xs font-medium text-gray-600">{label}</span>}
        {showValue && <span className="text-xs font-bold text-gray-800">{value}%</span>}
      </div>
    )}
    <div className={cn('w-full bg-gray-100 rounded-full overflow-hidden', progressSizes[size])}>
      <div
        className={cn('h-full rounded-full transition-all duration-700', progressColors[color])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  </div>
)

// ─── Chip (selectable tag) ────────────────────────────────────────────────────
interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
}

export const Chip: React.FC<ChipProps> = ({ selected, className, children, ...props }) => (
  <button
    type="button"
    className={cn(
      'px-4 py-1.5 rounded-full text-sm font-semibold border transition-all duration-150',
      'focus-visible:outline-2 focus-visible:outline-green-forest',
      selected
        ? 'bg-green-forest text-white border-green-forest shadow-button'
        : 'bg-white text-gray-600 border-gray-200 hover:border-green-soft hover:text-green-forest',
      className
    )}
    {...props}
  >
    {children}
  </button>
)

// ─── Divider ──────────────────────────────────────────────────────────────────
export const Divider = ({ label, className }: { label?: string; className?: string }) => (
  <div className={cn('flex items-center gap-3 my-4', className)}>
    <div className="flex-1 h-px bg-gray-100" />
    {label && <span className="text-xs text-gray-400 font-medium whitespace-nowrap">{label}</span>}
    <div className="flex-1 h-px bg-gray-100" />
  </div>
)
