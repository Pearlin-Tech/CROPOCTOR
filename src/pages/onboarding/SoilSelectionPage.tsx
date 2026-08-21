import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { pageVariants } from '@/animations/variants'
import { Button } from '@/components/ui/Button'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { SOILS } from '@/config/soils'

const SoilSelectionPage: React.FC = () => {
  const navigate = useNavigate()
  const [soilId, setSoilId] = useState('loamy')
  const soilOptions = SOILS.map(s => ({ id: s.id, name: s.name, description: s.description }))
  const selectedSoil = SOILS.find(s => s.id === soilId)

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-cream flex flex-col max-w-md mx-auto w-full px-6 py-10">
      <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-brown-pastel/30 text-brown-earth hover:bg-brown-pastel/50 transition-colors mb-6 shadow-sm">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <h1 className="text-2xl font-bold text-green-forest mb-1">Soil Type</h1>
      <p className="text-brown-earth/80 text-sm mb-2 font-medium">Select your farm's soil type.</p>
      <div className="bg-white/60 border border-brown-pastel/40 p-3 rounded-xl mb-6 shadow-sm">
        <p className="text-[11px] text-brown-earth/90 font-medium">💡 Not sure? Select "Unknown" — the AI can still help you.</p>
      </div>

      <div className="flex-1">
        <SearchableSelect
          label="Soil Type"
          options={soilOptions}
          value={soilId}
          onChange={setSoilId}
          placeholder="Select Soil Type"
          searchPlaceholder="Search soil types..."
        />

        {selectedSoil && soilId !== 'unknown' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="mt-5 p-4 bg-brown-pastel/20 rounded-2xl border border-brown-pastel/40 relative overflow-hidden"
          >
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-brown-pastel/30 rounded-full blur-[20px]" />
            <div className="relative z-10">
              <p className="text-sm font-bold text-brown-earth flex items-center gap-2">🟤 {selectedSoil.name}</p>
              <p className="text-xs text-brown-earth/80 mt-1.5 leading-relaxed">{selectedSoil.description}</p>
            </div>
          </motion.div>
        )}
      </div>

      <div className="mt-10">
        <Button variant="primary" size="xl" fullWidth onClick={() => navigate('/onboarding/stage')}>
          Continue →
        </Button>
      </div>
    </motion.div>
  )
}

export default SoilSelectionPage
