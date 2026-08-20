import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Search, ChevronDown, Check, X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { motion, AnimatePresence } from 'framer-motion'

export interface SelectOption {
  id: string
  name: string
  description?: string
  category?: string
  emoji?: string
}

interface SearchableSelectProps {
  options: SelectOption[]
  value?: string
  onChange: (id: string) => void
  placeholder?: string
  label?: string
  error?: string
  searchPlaceholder?: string
  grouped?: boolean
  required?: boolean
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  label,
  error,
  searchPlaceholder = 'Search…',
  grouped = false,
  required,
}) => {
  const [open, setOpen]     = useState(false)
  const [query, setQuery]   = useState('')
  const containerRef        = useRef<HTMLDivElement>(null)
  const inputRef            = useRef<HTMLInputElement>(null)

  const selected = options.find(o => o.id === value)

  const filtered = query.trim()
    ? options.filter(o => o.name.toLowerCase().includes(query.toLowerCase()) || o.category?.toLowerCase().includes(query.toLowerCase()))
    : options

  const grouped_options: Record<string, SelectOption[]> = {}
  if (grouped) {
    filtered.forEach(o => {
      const cat = o.category || 'Other'
      if (!grouped_options[cat]) grouped_options[cat] = []
      grouped_options[cat].push(o)
    })
  }

  const handleSelect = useCallback((id: string) => {
    onChange(id)
    setOpen(false)
    setQuery('')
  }, [onChange])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  const id = `select-${Math.random().toString(36).slice(2)}`

  return (
    <div ref={containerRef} className="relative w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-semibold text-gray-700 mb-1.5">
          {label}{required && <span className="text-muted-danger ml-1">*</span>}
        </label>
      )}

      {/* Trigger */}
      <button
        id={id}
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3 rounded-xl text-base',
          'bg-white border transition-all duration-150',
          'focus:outline-none focus:ring-2 focus:ring-green-forest/30 focus:border-green-forest',
          error ? 'border-muted-danger' : 'border-brown-soft/30',
          open && 'border-green-forest ring-2 ring-green-forest/20',
        )}
      >
        <span className={cn('truncate', !selected && 'text-gray-400')}>
          {selected ? (
            <span className="flex items-center gap-2">
              {selected.emoji && <span>{selected.emoji}</span>}
              {selected.name}
            </span>
          ) : placeholder}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
        </motion.span>
      </button>

      {error && <p role="alert" className="mt-1.5 text-xs text-muted-danger font-medium">{error}</p>}

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1.5 w-full bg-white border border-brown-soft/20 rounded-2xl shadow-card-lg overflow-hidden"
          >
            {/* Search */}
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-9 pr-9 py-2 text-sm bg-green-light rounded-xl focus:outline-none focus:ring-1 focus:ring-green-forest/30"
                />
                {query && (
                  <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Options */}
            <div className="max-h-60 overflow-y-auto py-1" role="listbox">
              {filtered.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-400 text-center">No results</p>
              ) : grouped ? (
                Object.entries(grouped_options).map(([cat, opts]) => (
                  <div key={cat}>
                    <p className="px-4 py-1.5 text-xs font-bold text-green-forest uppercase tracking-wider bg-green-light/50">
                      {cat}
                    </p>
                    {opts.map(opt => <OptionItem key={opt.id} opt={opt} selected={value === opt.id} onSelect={handleSelect} />)}
                  </div>
                ))
              ) : (
                filtered.map(opt => <OptionItem key={opt.id} opt={opt} selected={value === opt.id} onSelect={handleSelect} />)
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const OptionItem = ({ opt, selected, onSelect }: { opt: SelectOption; selected: boolean; onSelect: (id: string) => void }) => (
  <button
    type="button"
    role="option"
    aria-selected={selected}
    onClick={() => onSelect(opt.id)}
    className={cn(
      'w-full flex items-center justify-between px-4 py-2.5 text-sm text-left',
      'hover:bg-green-light transition-colors duration-100',
      selected && 'bg-green-light text-green-forest font-semibold'
    )}
  >
    <span className="flex items-center gap-2">
      {opt.emoji && <span>{opt.emoji}</span>}
      <span>{opt.name}</span>
      {opt.description && <span className="text-xs text-gray-400 ml-1 hidden sm:inline">· {opt.description}</span>}
    </span>
    {selected && <Check className="w-4 h-4 text-green-forest shrink-0" />}
  </button>
)
