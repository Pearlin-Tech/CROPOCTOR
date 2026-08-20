import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { pageVariants } from '@/animations/variants'
import { Button } from '@/components/ui/Button'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { CROPS } from '@/config/crops'

const CropSelectionPage: React.FC = () => {
  const navigate = useNavigate()
  const [cropId, setCropId] = useState('groundnut')

  const cropOptions = CROPS.map(c => ({ id: c.id, name: c.name, category: c.category }))

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-cream flex flex-col max-w-md mx-auto w-full px-6 py-10">
      <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-green-light text-green-forest mb-6">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Select Your Crop</h1>
      <p className="text-gray-500 text-sm mb-8">Choose the primary crop for this farm.</p>

      <div className="flex-1">
        <SearchableSelect
          label="Primary Crop"
          required
          options={cropOptions}
          value={cropId}
          onChange={setCropId}
          placeholder="Select Crop"
          searchPlaceholder="Search crops..."
          grouped
        />

        {cropId && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 bg-green-light rounded-2xl border border-green-pastel/30"
          >
            <p className="text-sm font-semibold text-green-forest">
              ✅ {CROPS.find(c => c.id === cropId)?.name} selected
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Category: {CROPS.find(c => c.id === cropId)?.category}
            </p>
          </motion.div>
        )}
      </div>

      <div className="mt-10">
        <Button variant="primary" size="xl" fullWidth onClick={() => navigate('/onboarding/soil')} disabled={!cropId}>
          Continue →
        </Button>
      </div>
    </motion.div>
  )
}

export default CropSelectionPage
