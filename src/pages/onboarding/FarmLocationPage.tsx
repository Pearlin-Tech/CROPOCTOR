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
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-brown-pastel/30 text-brown-earth mb-6 shadow-sm hover:bg-brown-pastel/50 transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div className="flex gap-1.5 mb-6">
          {[1,2,3].map(s => <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= 2 ? 'bg-green-forest' : 'bg-brown-pastel/40'}`} />)}
        </div>
        <h1 className="text-2xl font-bold text-green-forest mb-1">Where is your farm?</h1>
        <p className="text-text-secondary font-medium text-sm">Find your farm on the map and drop a pin.</p>
      </div>

      {/* Map placeholder */}
      <div className="mx-6 h-48 bg-green-pastel/20 rounded-3xl overflow-hidden relative mb-4 border border-green-pastel/40 shadow-inner">
        <div className="absolute inset-0 flex items-center justify-center flex-col gap-2">
          <Map className="w-10 h-10 text-green-forest/60" />
          <p className="text-sm text-green-forest font-bold uppercase tracking-wider">Interactive Map</p>
          <p className="text-xs text-green-forest/50 font-medium">(Connected in Stage 4)</p>
        </div>
        {selected && (
          <div className="absolute bottom-3 left-3 right-3 bg-cream/95 backdrop-blur-md rounded-2xl px-4 py-3 flex items-center gap-3 shadow-card border border-brown-pastel/30">
            <div className="w-8 h-8 rounded-full bg-green-forest/10 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-green-forest" />
            </div>
            <p className="text-sm font-bold text-brown-earth truncate">{selected.name}</p>
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
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brown-earth/60" />
          <input
            type="text"
            placeholder="Search village, city or area"
            value={query}
            onChange={e => { setQuery(e.target.value); if (!e.target.value) setResults([]) }}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="w-full pl-10 pr-4 py-3.5 bg-white border border-brown-pastel/50 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-green-forest/30 focus:border-green-forest shadow-sm"
          />
        </div>

        {/* Search results */}
        {results.length > 0 && (
          <div className="bg-white border border-brown-pastel/30 rounded-2xl overflow-hidden shadow-card">
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => { setSelected(r); setResults([]); setQuery(r.name) }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-green-pastel/20 transition-colors border-b last:border-b-0 border-brown-pastel/10"
              >
                <MapPin className="w-4 h-4 text-green-forest shrink-0" />
                <span className="text-sm font-medium text-text-main">{r.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Pick on Map */}
        <button
          onClick={() => navigate('/onboarding/boundary')}
          className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-white border border-brown-pastel/50 rounded-2xl text-brown-earth font-bold hover:border-brown-earth transition-all shadow-sm"
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
