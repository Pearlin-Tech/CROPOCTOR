import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type Size    = 'sm' | 'md' | 'lg' | 'xl'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
}

const variantStyles: Record<Variant, string> = {
  primary:   'bg-green-forest text-white hover:bg-[#256427] active:bg-[#1e5222] shadow-[0_4px_14px_rgba(46,125,50,0.3)]',
  secondary: 'bg-beige-warm text-brown-earth hover:bg-[#ede0cf] active:bg-[#e3d4be] border border-brown-soft/30',
  ghost:     'bg-transparent text-green-forest hover:bg-green-light active:bg-[#d4ecda]',
  danger:    'bg-muted-danger text-white hover:bg-[#b85f56] active:bg-[#a3544c]',
  outline:   'bg-transparent border-2 border-green-forest text-green-forest hover:bg-green-light',
}

const sizeStyles: Record<Size, string> = {
  sm: 'text-sm px-4 py-2 rounded-xl gap-1.5 min-h-[36px]',
  md: 'text-base px-5 py-3 rounded-2xl gap-2 min-h-[44px]',
  lg: 'text-lg px-6 py-3.5 rounded-2xl gap-2 min-h-[52px]',
  xl: 'text-xl px-8 py-4 rounded-3xl gap-2.5 min-h-[60px]',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  className,
  children,
  disabled,
  ...props
}, ref) => (
  <motion.button
    ref={ref}
    whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
    transition={{ duration: 0.08 }}
    className={cn(
      'inline-flex items-center justify-center font-semibold',
      'transition-all duration-150 select-none',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-forest',
      'disabled:opacity-50 disabled:pointer-events-none',
      variantStyles[variant],
      sizeStyles[size],
      fullWidth && 'w-full',
      className
    )}
    disabled={disabled || loading}
    {...(props as any)}
  >
    {loading ? (
      <>
        <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        <span>Loading…</span>
      </>
    ) : (
      <>
        {icon && iconPosition === 'left'  && <span className="shrink-0">{icon}</span>}
        {children}
        {icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
      </>
    )}
  </motion.button>
))
Button.displayName = 'Button'
