import React, { createContext, useContext, useState, type ReactNode } from 'react'
import type { Farmer } from '@/types'
import { MOCK_FARMER } from '@/mock/farmer'

interface UserContextValue {
  farmer: Farmer | null
  isAuthenticated: boolean
  isOnboarded: boolean
  login:   (farmer: Farmer) => void
  logout:  () => void
  updateFarmer: (updates: Partial<Farmer>) => void
  setOnboarded: (v: boolean) => void
}

const UserContext = createContext<UserContextValue | null>(null)

export const UserProvider = ({ children }: { children: ReactNode }) => {
  // Check local storage for existing session
  const [farmer, setFarmer] = useState<Farmer | null>(() => {
    const saved = localStorage.getItem('agri-ai-farmer')
    return saved ? JSON.parse(saved) : null
  })
  const [isAuthenticated, setIsAuth] = useState(() => !!localStorage.getItem('agri-ai-farmer'))
  const [isOnboarded, setIsOnboarded] = useState(
    () => localStorage.getItem('agri-ai-onboarded') === 'true'
  )

  const login = (f: Farmer) => { 
    setFarmer(f)
    setIsAuth(true)
    localStorage.setItem('agri-ai-farmer', JSON.stringify(f))
  }
  
  const logout = () => {
    setFarmer(null)
    setIsAuth(false)
    setIsOnboarded(false)
    localStorage.removeItem('agri-ai-onboarded')
    localStorage.removeItem('agri-ai-farmer')
  }
  
  const updateFarmer = (updates: Partial<Farmer>) => {
    setFarmer(prev => {
      if (!prev) return null
      const updated = { ...prev, ...updates }
      localStorage.setItem('agri-ai-farmer', JSON.stringify(updated))
      return updated
    })
  }

  const setOnboarded = (v: boolean) => {
    setIsOnboarded(v)
    localStorage.setItem('agri-ai-onboarded', String(v))
  }

  return (
    <UserContext.Provider value={{ farmer, isAuthenticated, isOnboarded, login, logout, updateFarmer, setOnboarded }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = (): UserContextValue => {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used inside UserProvider')
  return ctx
}
