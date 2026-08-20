import React, { createContext, useContext, useState, type ReactNode } from 'react'
import type { Farm } from '@/types'
import { MOCK_FARMS, MOCK_ACTIVE_FARM } from '@/mock/farms'

interface FarmContextValue {
  farms: Farm[]
  activeFarm: Farm | null
  setActiveFarm: (farm: Farm) => void
  addFarm: (farm: Farm) => void
  updateFarm: (id: string, updates: Partial<Farm>) => void
  removeFarm: (id: string) => void
}

const FarmContext = createContext<FarmContextValue | null>(null)

export const FarmProvider = ({ children }: { children: ReactNode }) => {
  const [farms, setFarms]           = useState<Farm[]>(MOCK_FARMS)
  const [activeFarm, setActiveFarmState] = useState<Farm | null>(MOCK_ACTIVE_FARM)

  const setActiveFarm = (farm: Farm) => setActiveFarmState(farm)

  const addFarm = (farm: Farm) => {
    setFarms(prev => [...prev, farm])
    setActiveFarmState(farm)
  }

  const updateFarm = (id: string, updates: Partial<Farm>) => {
    setFarms(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f))
    setActiveFarmState(prev => prev?.id === id ? { ...prev, ...updates } : prev)
  }

  const removeFarm = (id: string) => {
    setFarms(prev => {
      const next = prev.filter(f => f.id !== id)
      if (activeFarm?.id === id) setActiveFarmState(next[0] || null)
      return next
    })
  }

  return (
    <FarmContext.Provider value={{ farms, activeFarm, setActiveFarm, addFarm, updateFarm, removeFarm }}>
      {children}
    </FarmContext.Provider>
  )
}

export const useFarm = (): FarmContextValue => {
  const ctx = useContext(FarmContext)
  if (!ctx) throw new Error('useFarm must be used inside FarmProvider')
  return ctx
}
