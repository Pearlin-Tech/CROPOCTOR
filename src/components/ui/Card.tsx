import React from 'react'
import { cn } from '@/utils/cn'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'flat' | 'green' | 'earth' | 'primary' | 'secondary' | 'pastelGreen' | 'pastelBrown' | 'cream'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const variantStyles = {
  default:  'bg-off-white shadow-card border border-brown-pastel/30',
  elevated: 'bg-white shadow-card-lg border border-brown-pastel/20',
  flat:     'bg-green-light border border-green-pastel/30',
  green:    'bg-gradient-to-br from-green-forest to-green-deep text-white shadow-card border border-green-forest/20',
  earth:    'bg-gradient-to-br from-brown-earth to-brown-secondary text-white shadow-card border border-brown-earth/20',
  primary:  'bg-gradient-to-br from-green-forest to-green-deep text-white shadow-card border border-green-forest/20',
  secondary:'bg-beige-warm border border-brown-pastel/40 text-brown-earth',
  pastelGreen: 'bg-green-pastel/25 border border-green-pastel/40 text-green-forest',
  pastelBrown: 'bg-brown-pastel/25 border border-brown-pastel/45 text-brown-earth',
  cream:    'bg-cream border border-brown-pastel/35 text-text-main shadow-card',
}

const paddingStyles = {
  none: '',
  sm:   'p-3 md:p-4',
  md:   'p-4 md:p-5',
  lg:   'p-5 md:p-6 lg:p-7',
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(({
  variant = 'default',
  padding = 'md',
  className,
  children,
  ...props
}, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-2xl overflow-hidden',
      variantStyles[variant],
      paddingStyles[padding],
      className
    )}
    {...props}
  >
    {children}
  </div>
))
Card.displayName = 'Card'

// Convenience sub-components
export const CardTitle = ({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn('font-bold text-base md:text-lg text-gray-800 mb-1', className)} {...props}>{children}</h3>
)

export const CardSubtitle = ({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('text-sm text-gray-500', className)} {...props}>{children}</p>
)
