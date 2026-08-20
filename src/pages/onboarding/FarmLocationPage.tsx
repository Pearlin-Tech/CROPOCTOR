import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MapPin, Search, Navigation, Map } from 'lucide-react'
import { pageVariants } from '@/animations/variants'
import { Button } from '@/components/ui/Button'
import { locationService } from '@/services'

const FarmLocationPage: React.FC = () => {
  const navigate = useNavigate()
  const [query, setQuery]       = useState('')
  const [locating, setLocating] = useState(false)
  const [results, setResults]   = useState<Array<{ name: string; lat: number; lng: number }>>([])
  const [selected, setSelected] = useState<{ name: string; lat: number; lng: number } | null>(null)

  const handleUseMyLocation = async () => {
    setLocating(true)
    try {
      const pos = await locationService.getCurrentPosition()
      const addr = await locationService.reverseGeocode(pos.lat, pos.lng)
      setSelected({ name: addr, lat: pos.lat, lng: pos.lng })
    } catch {
      // fallback
      setSelected({ name: 'Rajkot, Gujarat, India', lat: 22.3039, lng: 70.8022 })
    } finally {
      setLocating(false)
    }
  }

  const handleSearch = async () => {
    if (!query.trim()) return
    const res = await locationService.searchPlaces(query)
    setResults(res)
  }

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-cream flex flex-col max-w-md mx-auto w-full">
      {/* Header */}
      <div className="px-6 pt-10 pb-4">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-green-light text-green-forest mb-6">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div className="flex gap-1.5 mb-6">
          {[1,2,3].map(s => <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= 2 ? 'bg-green-forest' : 'bg-gray-200'}`} />)}
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Where is your farm?</h1>
        <p className="text-gray-500 text-sm">Find your farm on the map and drop a pin.</p>
      </div>

      {/* Map placeholder */}
      <div className="mx-6 h-48 bg-[#EAE0D5] rounded-3xl overflow-hidden relative mb-4 border border-brown-pastel/30 shadow-inner">
        <div className="absolute inset-0 flex items-center justify-center flex-col gap-2">
          <Map className="w-10 h-10 text-brown-soft" />
          <p className="text-sm text-brown-earth font-bold uppercase tracking-wider">Interactive Map</p>
          <p className="text-xs text-gray-400">(Connected in Stage 4)</p>
        </div>
        {selected && (
          <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md rounded-2xl px-4 py-3 flex items-center gap-3 shadow-card">
            <div className="w-8 h-8 rounded-full bg-brown-earth/10 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-brown-earth" />
            </div>
            <p className="text-sm font-semibold text-gray-800 truncate">{selected.name}</p>
          </div>
        )}
      </div>

      <div className="px-6 space-y-3 flex-1">
        {/* Use My Location */}
        <button
          onClick={handleUseMyLocation}
          disabled={locating}
          className="w-full flex items-center gap-3 px-5 py-4 bg-brown-earth text-white rounded-2xl font-semibold shadow-button hover:bg-brown-deep transition-all disabled:opacity-60"
        >
          <Navigation className="w-5 h-5 shrink-0" />
          {locating ? 'Finding your location…' : 'Use My Location'}
        </button>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search village, city or area"
            value={query}
            onChange={e => { setQuery(e.target.value); if (!e.target.value) setResults([]) }}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="w-full pl-10 pr-4 py-3.5 bg-white border border-brown-soft/30 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-green-forest/30 focus:border-green-forest"
          />
        </div>

        {/* Search results */}
        {results.length > 0 && (
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-card">
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => { setSelected(r); setResults([]); setQuery(r.name) }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-green-light transition-colors border-b last:border-b-0 border-gray-50"
              >
                <MapPin className="w-4 h-4 text-green-soft shrink-0" />
                <span className="text-sm text-gray-700">{r.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Pick on Map */}
        <button
          onClick={() => navigate('/onboarding/boundary')}
          className="w-full flex items-center gap-3 px-4 py-4 bg-white border border-brown-soft/30 rounded-2xl text-gray-700 font-medium hover:border-green-soft transition-all"
        >
          <Map className="w-5 h-5 text-brown-earth shrink-0" />
          Pick on Map
        </button>
      </div>

      <div className="px-6 py-6">
        <Button
          variant="primary" size="xl" fullWidth
          onClick={() => navigate('/onboarding/boundary')}
          disabled={!selected && !locating}
        >
          Use This Location →
        </Button>
      </div>
    </motion.div>
  )
}

export default FarmLocationPage
