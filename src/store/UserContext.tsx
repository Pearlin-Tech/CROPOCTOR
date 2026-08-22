import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Farmer } from '@/types'
import { authService } from '@/services/authService'
import { userService } from '@/services/userService'
import { useApp } from '@/store/AppContext'
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
  const { setLanguage } = useApp()
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
    let unsubscribe = () => {}
    try {
      unsubscribe = authService.onAuthStateChange((user) => {
        setAuthUser(user)
        if (user) {
          setIsAuth(true)
          const saved = localStorage.getItem('cropoctor-farmer')
          if (saved) {
            try { setFarmer(JSON.parse(saved)) } catch {}
          }
        } else {
          const saved = localStorage.getItem('cropoctor-farmer')
          if (saved) {
            try {
              setFarmer(JSON.parse(saved))
              setIsAuth(true)
            } catch {
              setIsAuth(false)
              setFarmer(null)
            }
          } else {
            setIsAuth(false)
            setFarmer(null)
          }
        }
        setIsAuthLoading(false)
      })
    } catch (err) {
      console.warn("[UserContext] Error setting up auth listener:", err)
      const saved = localStorage.getItem('cropoctor-farmer')
      if (saved) {
        try {
          setFarmer(JSON.parse(saved))
          setIsAuth(true)
        } catch {}
      }
      setIsAuthLoading(false)
    }
    return () => {
      try { unsubscribe() } catch {}
    }
  }, [])

  // Retrieve user language preference from Firestore users/{uid} on auth startup/change
  useEffect(() => {
    if (!authUser?.uid) return
    let isCancelled = false

    userService.getUserProfile(authUser.uid).then(({ data }) => {
      if (isCancelled) return
      const remoteLang = data?.language || data?.preferredLanguage
      if (remoteLang) {
        setLanguage(remoteLang)
        setFarmer(prev => {
          if (!prev) return prev
          const updated = { ...prev, preferredLanguage: remoteLang, language: remoteLang }
          localStorage.setItem('cropoctor-farmer', JSON.stringify(updated))
          return updated
        })
      } else {
        // If document has no saved language in Firestore, seed Firestore with current app language
        const currentLang = localStorage.getItem('agri_ai_language') || 'en'
        userService.saveUserLanguage(authUser.uid, currentLang)
      }
    })

    return () => { isCancelled = true }
  }, [authUser?.uid, setLanguage])

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
