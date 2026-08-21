import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'earth' | 'pastelGreen' | 'pastelBrown' | 'cream'
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
  primary:   'bg-green-forest text-white hover:bg-green-deep active:bg-green-deep/90 shadow-[0_4px_14px_rgba(36,92,58,0.25)]',
  secondary: 'bg-beige-warm text-brown-earth hover:bg-[#ebdcc8] active:bg-[#dfcfbb] border border-brown-pastel/50',
  ghost:     'bg-transparent text-green-forest hover:bg-green-light active:bg-green-soft/50',
  danger:    'bg-muted-danger text-white hover:bg-[#b85f56] active:bg-[#a3544c]',
  outline:   'bg-transparent border-2 border-green-forest text-green-forest hover:bg-green-light',
  earth:     'bg-brown-earth text-white hover:bg-brown-secondary active:bg-brown-secondary/90 shadow-[0_4px_14px_rgba(122,81,56,0.25)]',
  pastelGreen: 'bg-green-pastel text-green-forest border border-green-pastel/50 hover:bg-green-light active:bg-green-light/80',
  pastelBrown: 'bg-brown-pastel text-brown-earth border border-brown-pastel/50 hover:bg-beige-warm active:bg-beige-warm/80',
  cream:     'bg-cream text-brown-earth border border-brown-pastel/40 hover:bg-off-white active:bg-off-white/80',
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
