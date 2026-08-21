import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Farmer } from '@/types'
import { MOCK_FARMER } from '@/mock/farmer'
import { authService } from '@/services/authService'
import type { User } from 'firebase/auth'

interface UserContextValue {
  farmer: Farmer | null
  authUser: User | null
  isAuthenticated: boolean
  isAuthLoading: boolean
  isOnboarded: boolean
  login:   (farmer: Farmer) => void
  logout:  () => void
  updateFarmer: (updates: Partial<Farmer>) => void
  setOnboarded: (v: boolean) => void
}

const UserContext = createContext<UserContextValue | null>(null)

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [farmer, setFarmer] = useState<Farmer | null>(() => {
    const saved = localStorage.getItem('cropoctor-farmer')
    return saved ? JSON.parse(saved) : null
  })
  const [isAuthenticated, setIsAuth] = useState(false)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [authUser, setAuthUser] = useState<User | null>(null)
  const [isOnboarded, setIsOnboarded] = useState(
    () => localStorage.getItem('cropoctor-onboarded') === 'true'
  )

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange((user) => {
      setAuthUser(user)
      if (user) {
        setIsAuth(true)
        // Restore farmer from localStorage if available
        const saved = localStorage.getItem('cropoctor-farmer')
        if (saved) setFarmer(JSON.parse(saved))
      } else {
        setIsAuth(false)
        setFarmer(null)
        localStorage.removeItem('cropoctor-farmer')
      }
      setIsAuthLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const login = (f: Farmer) => { 
    setFarmer(f)
    setIsAuth(true)
    localStorage.setItem('cropoctor-farmer', JSON.stringify(f))
  }
  
  const logout = async () => {
    await authService.logout()
    setFarmer(null)
    setIsAuth(false)
    setAuthUser(null)
    setIsOnboarded(false)
    localStorage.removeItem('cropoctor-onboarded')
    localStorage.removeItem('cropoctor-farmer')
  }
  
  const updateFarmer = (updates: Partial<Farmer>) => {
    setFarmer(prev => {
      if (!prev) return null
      const updated = { ...prev, ...updates }
      localStorage.setItem('cropoctor-farmer', JSON.stringify(updated))
      return updated
    })
  }

  const setOnboarded = (v: boolean) => {
    setIsOnboarded(v)
    localStorage.setItem('cropoctor-onboarded', String(v))
  }

  return (
    <UserContext.Provider value={{ farmer, authUser, isAuthenticated, isAuthLoading, isOnboarded, login, logout, updateFarmer, setOnboarded }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = (): UserContextValue => {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used inside UserProvider')
  return ctx
}
