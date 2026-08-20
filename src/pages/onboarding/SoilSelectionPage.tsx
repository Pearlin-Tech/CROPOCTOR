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
      <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-green-light text-green-forest mb-6">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Soil Type</h1>
      <p className="text-gray-500 text-sm mb-2">Select your farm's soil type.</p>
      <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-xl mb-6">💡 Not sure? Select "I don't know" — the AI can still help you.</p>

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
            className="mt-4 p-4 bg-beige-warm rounded-2xl border border-brown-soft/20"
          >
            <p className="text-sm font-semibold text-brown-earth">🌱 {selectedSoil.name}</p>
            <p className="text-xs text-gray-500 mt-1">{selectedSoil.description}</p>
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
