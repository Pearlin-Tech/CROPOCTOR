import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

// ─── Farm Setup State ───────────────────────────────────────────────────────
// Accumulated across onboarding steps before the final Firestore write.

export interface FarmSetupState {
  // Step 1 – Location
  location: {
    name: string
    lat: number
    lng: number
  } | null

  // Step 2 – Boundary / Area  
  area: number
  areaUnit: 'acres' | 'hectares'
  boundary?: Array<{ lat: number; lng: number }>

  // Step 3 – Farm Details
  farmName: string

  // Step 4 – Crop
  cropId: string
  cropName: string

  // Step 5 – Soil
  soilId: string
  soilName: string

  // Step 6 – Stage
  cropStage: string
  plantingDate: string
}

const DEFAULT_STATE: FarmSetupState = {
  location: null,
  area: 0,
  areaUnit: 'acres',
  farmName: '',
  cropId: '',
  cropName: '',
  soilId: '',
  soilName: '',
  cropStage: '',
  plantingDate: '',
}

interface FarmSetupContextValue {
  setup: FarmSetupState
  setLocation: (loc: { name: string; lat: number; lng: number }) => void
  setArea: (area: number, unit: 'acres' | 'hectares', boundary?: Array<{lat: number, lng: number}>) => void
  setFarmName: (name: string) => void
  setCrop: (id: string, name: string) => void
  setSoil: (id: string, name: string) => void
  setCropStage: (stage: string, plantingDate?: string) => void
  reset: () => void
}

const FarmSetupContext = createContext<FarmSetupContextValue | null>(null)

export const FarmSetupProvider = ({ children }: { children: ReactNode }) => {
  const [setup, setSetup] = useState<FarmSetupState>(DEFAULT_STATE)

  const setLocation = (loc: { name: string; lat: number; lng: number }) =>
    setSetup(prev => ({ ...prev, location: loc }))

  const setArea = (area: number, unit: 'acres' | 'hectares', boundary?: Array<{lat: number, lng: number}>) =>
    setSetup(prev => ({ ...prev, area, areaUnit: unit, boundary }))

  const setFarmName = (name: string) =>
    setSetup(prev => ({ ...prev, farmName: name }))

  const setCrop = (id: string, name: string) =>
    setSetup(prev => ({ ...prev, cropId: id, cropName: name }))

  const setSoil = (id: string, name: string) =>
    setSetup(prev => ({ ...prev, soilId: id, soilName: name }))

  const setCropStage = (stage: string, plantingDate = '') =>
    setSetup(prev => ({ ...prev, cropStage: stage, plantingDate }))

  const reset = () => setSetup(DEFAULT_STATE)

  return (
    <FarmSetupContext.Provider value={{
      setup, setLocation, setArea, setFarmName, setCrop, setSoil, setCropStage, reset
    }}>
      {children}
    </FarmSetupContext.Provider>
  )
}

export const useFarmSetup = (): FarmSetupContextValue => {
  const ctx = useContext(FarmSetupContext)
  if (!ctx) throw new Error('useFarmSetup must be used inside FarmSetupProvider')
  return ctx
}

/**
 * Setup state lives in memory only. If it was lost (page refresh, direct link) a later step
 * sends the farmer back to the first step instead of letting them fill in the rest for nothing.
 */
export const useRequireSetupLocation = () => {
  const { setup } = useFarmSetup()
  const navigate = useNavigate()
  useEffect(() => {
    if (!setup.location) navigate('/onboarding/location', { replace: true })
  }, [setup.location, navigate])
  return !!setup.location
}
