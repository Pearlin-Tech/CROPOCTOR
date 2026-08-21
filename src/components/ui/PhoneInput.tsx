import React, { useState, useEffect } from 'react'
import { cn } from '@/utils/cn'

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string
  onChange: (val: string) => void
  label?: string
  error?: string
}

const COUNTRY_CODES = [
  { code: '+91', label: 'India (+91)' },
  { code: '+1',  label: 'US/Canada (+1)' },
  { code: '+44', label: 'UK (+44)' },
  { code: '+61', label: 'Australia (+61)' },
  { code: '+55', label: 'Brazil (+55)' },
  { code: '+81', label: 'Japan (+81)' },
  { code: '+86', label: 'China (+86)' },
]

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(({
  value,
  onChange,
  label,
  error,
  className,
  id,
  ...props
}, ref) => {
  const inputId = id || `phone-input-${Math.random().toString(36).slice(2)}`
  
  // Extract initial country code if present
  const initialCode = COUNTRY_CODES.find(c => value.startsWith(c.code))?.code || '+91'
  const initialNumber = value.startsWith(initialCode) ? value.slice(initialCode.length) : value

  const [countryCode, setCountryCode] = useState(initialCode)
  const [phoneNumber, setPhoneNumber] = useState(initialNumber)

  useEffect(() => {
    // Only call onChange if there is an actual phone number typed
    if (phoneNumber) {
      onChange(`${countryCode}${phoneNumber}`)
    } else {
      onChange('')
    }
  }, [countryCode, phoneNumber])

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-semibold text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="flex gap-2">
        <select
          value={countryCode}
          onChange={(e) => setCountryCode(e.target.value)}
          className={cn(
            'border rounded-xl px-3 py-3 text-base transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-green-forest/30 focus:border-green-forest',
            'bg-white border-brown-pastel/40 text-text-main cursor-pointer min-w-[100px]',
            error ? 'border-muted-danger bg-red-50 focus:ring-muted-danger/30' : ''
          )}
        >
          {COUNTRY_CODES.map(c => (
            <option key={c.code} value={c.code}>
              {c.code}
            </option>
          ))}
        </select>
        <div className="relative flex-1">
          <input
            ref={ref}
            id={inputId}
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
            className={cn(
              'w-full border rounded-xl px-4 py-3 text-base transition-all duration-150 focus:outline-none focus:ring-2',
              'bg-white border-brown-pastel/40 text-text-main placeholder:text-muted-text/50 focus:ring-green-forest/30 focus:border-green-forest',
              error ? 'border-muted-danger bg-red-50 focus:ring-muted-danger/30' : '',
              className
            )}
            placeholder="9876543210"
            aria-invalid={!!error}
            {...props}
          />
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-muted-danger font-medium">
          {error}
        </p>
      )}
    </div>
  )
})
PhoneInput.displayName = 'PhoneInput'
