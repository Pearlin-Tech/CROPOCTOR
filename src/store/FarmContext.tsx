import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Farm } from '@/types'
import { farmService } from '@/services'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/services/firebase'

interface FarmContextValue {
  farms: Farm[]
  activeFarm: Farm | null
  loading: boolean
  error: string | null
  setActiveFarm: (farm: Farm | null) => void
  addFarm: (farm: Farm) => void
  updateFarm: (id: string, updates: Partial<Farm>) => void
  removeFarm: (id: string) => void
}

const FarmContext = createContext<FarmContextValue | null>(null)

export const FarmProvider = ({ children }: { children: ReactNode }) => {
  const [farms, setFarms] = useState<Farm[]>([])
  const [activeFarm, setActiveFarmState] = useState<Farm | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let unsubscribeFarms: (() => void) | undefined;
    
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      console.log('🔐 [FarmContext] onAuthStateChanged fired. user?.uid:', user?.uid, 'email:', user?.email);
      if (user) {
        console.log('🔐 [FarmContext] User IS authenticated. Subscribing to farms for uid:', user.uid);
        setLoading(true);
        if (farmService.subscribeToUserFarms) {
          console.log('🔐 [FarmContext] Calling subscribeToUserFarms with userId:', user.uid);
          unsubscribeFarms = farmService.subscribeToUserFarms(
            user.uid,
            (fetchedFarms) => {
              console.log('🔐 [FarmContext] farms callback received. count:', fetchedFarms.length);
              setFarms(fetchedFarms);
              setActiveFarmState(prev => {
                if (!prev && fetchedFarms.length > 0) return fetchedFarms[0];
                if (prev && !fetchedFarms.find(f => f.id === prev.id)) return fetchedFarms[0] || null;
                return prev;
              });
              setLoading(false);
              setError(null);
            },
            (err) => {
              console.error('🔐 [FarmContext] farms error callback received:', err.message);
              setError(err.message);
              setLoading(false);
            }
          );
        } else {
           farmService.getFarms(user.uid).then(f => {
             setFarms(f)
             if (f.length > 0) setActiveFarmState(f[0])
             setLoading(false)
           }).catch(err => {
             setError(err.message)
             setLoading(false)
           })
        }
      } else {
        console.log('🔐 [FarmContext] User is NOT authenticated (null). Clearing farms.');
        setFarms([]);
        setActiveFarmState(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFarms) unsubscribeFarms();
    };
  }, [])

  const setActiveFarm = (farm: Farm | null) => setActiveFarmState(farm)

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
    <FarmContext.Provider value={{ farms, activeFarm, loading, error, setActiveFarm, addFarm, updateFarm, removeFarm }}>
      {children}
    </FarmContext.Provider>
  )
}

export const useFarm = (): FarmContextValue => {
  const ctx = useContext(FarmContext)
  if (!ctx) throw new Error('useFarm must be used inside FarmProvider')
  return ctx
}
