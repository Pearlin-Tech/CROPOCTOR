import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { isRTL } from '@/config/countries'

// ─── Toast types ──────────────────────────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'info' | 'warning'
export interface Toast {
  id: string
  type: ToastType
  message: string
}

// ─── AppContext type ───────────────────────────────────────────────────────────
interface AppContextValue {
  language: string
  setLanguage: (lang: string) => void
  isRTLActive: boolean
  isOnline: boolean
  toasts: Toast[]
  toast: {
    success: (msg: string) => void
    error:   (msg: string) => void
    info:    (msg: string) => void
    warning: (msg: string) => void
  }
  dismissToast: (id: string) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLangState] = useState<string>(
    () => localStorage.getItem('agri_ai_language') || 'en'
  )
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [toasts, setToasts] = useState<Toast[]>([])

  const isRTLActive = isRTL(language)

  // Apply RTL to document
  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = isRTLActive ? 'rtl' : 'ltr'
  }, [language, isRTLActive])

  // Online/offline detection
  useEffect(() => {
    const on  = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  const setLanguage = useCallback((lang: string) => {
    setLangState(lang)
    localStorage.setItem('agri_ai_language', lang)
  }, [])

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = `toast-${Date.now()}`
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = {
    success: (msg: string) => addToast('success', msg),
    error:   (msg: string) => addToast('error',   msg),
    info:    (msg: string) => addToast('info',    msg),
    warning: (msg: string) => addToast('warning', msg),
  }

  return (
    <AppContext.Provider value={{ language, setLanguage, isRTLActive, isOnline, toasts, toast, dismissToast }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = (): AppContextValue => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
