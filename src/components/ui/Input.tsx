import React from 'react'
import { cn } from '@/utils/cn'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: React.ReactNode
  iconRight?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  hint,
  icon,
  iconRight,
  className,
  id,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).slice(2)}`
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-semibold text-gray-700 mb-1.5">
          {label}
          {props.required && <span className="text-muted-danger ml-1" aria-hidden>*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full bg-white border rounded-xl px-4 py-3 text-base text-gray-800',
            'placeholder:text-gray-400 transition-all duration-150',
            'focus:outline-none focus:ring-2 focus:ring-green-forest/30 focus:border-green-forest',
            'disabled:bg-gray-50 disabled:text-gray-400',
            icon      && 'pl-11',
            iconRight && 'pr-11',
            error ? 'border-muted-danger bg-red-50' : 'border-brown-soft/30',
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
        {iconRight && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
            {iconRight}
          </span>
        )}
      </div>
      {error && (
        <p id={`${inputId}-error`} role="alert" className="mt-1.5 text-xs text-muted-danger font-medium">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-gray-400">
          {hint}
        </p>
      )}
    </div>
  )
})
Input.displayName = 'Input'
