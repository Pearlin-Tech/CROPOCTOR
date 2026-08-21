import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Map, Trash2, Edit3 } from 'lucide-react'
import { pageVariants } from '@/animations/variants'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/index'

const FarmBoundaryPage: React.FC = () => {
  const navigate = useNavigate()
  const [unit, setUnit] = useState<'acres' | 'hectares'>('acres')
  const [pointsAdded, setPointsAdded] = useState(5) // mock: boundary already drawn

  const area = unit === 'acres' ? '2.45 acres' : '0.99 hectares'

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-cream flex flex-col max-w-md mx-auto w-full">
      <div className="px-6 pt-10 pb-4">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-brown-pastel/30 text-brown-earth mb-6 shadow-sm hover:bg-brown-pastel/50 transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <h1 className="text-2xl font-bold text-green-forest mb-1">Mark Your Farm Area</h1>
        <p className="text-text-secondary font-medium text-sm">Tap the map to outline your farm boundary.</p>
      </div>

      {/* Map with drawn boundary */}
      <div className="mx-6 flex-1 min-h-72 bg-green-pastel/20 rounded-3xl overflow-hidden relative border border-green-pastel/40 shadow-inner">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <Map className="w-12 h-12 text-green-forest/50" />
          <div className="bg-cream/95 backdrop-blur-md rounded-2xl px-5 py-3 text-center shadow-card border border-brown-pastel/30">
            <p className="text-sm font-bold text-brown-earth">Farm boundary drawn</p>
            <p className="text-xs text-text-secondary mt-0.5 font-medium">{pointsAdded} points marked</p>
          </div>
          {/* Fake polygon outline */}
          <svg viewBox="0 0 200 150" className="absolute inset-0 w-full h-full opacity-60">
            <polygon points="60,20 140,30 160,100 100,130 40,100 50,50" fill="rgba(141, 98, 69, 0.15)" stroke="#8D6245" strokeWidth="2.5" strokeDasharray="6 4" />
            {[{cx:60,cy:20},{cx:140,cy:30},{cx:160,cy:100},{cx:100,cy:130},{cx:40,cy:100},{cx:50,cy:50}].map((pt,i) => (
              <circle key={i} cx={pt.cx} cy={pt.cy} r="5" fill="#6F4E37" stroke="#FFF" strokeWidth="1.5" />
            ))}
          </svg>
        </div>

        {/* Area label */}
        <div className="absolute bottom-3 left-3 right-3 bg-cream/95 backdrop-blur-md rounded-2xl px-4 py-3 flex items-center justify-between shadow-card border border-brown-pastel/30">
          <div>
            <p className="text-[10px] uppercase font-bold text-brown-earth/80 tracking-wider">Approx. Area</p>
            <p className="text-xl font-bold text-green-forest">{area}</p>
          </div>
          <div className="flex gap-1">
            <Chip selected={unit === 'acres'} onClick={() => setUnit('acres')}>Acres</Chip>
            <Chip selected={unit === 'hectares'} onClick={() => setUnit('hectares')}>Ha</Chip>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-6 py-4 flex gap-3">
        <button onClick={() => setPointsAdded(0)} className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-brown-pastel/50 rounded-xl text-sm font-bold text-brown-earth hover:border-muted-danger hover:text-muted-danger transition-colors shadow-sm">
          <Trash2 className="w-4 h-4" /> Clear
        </button>
        <button className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-brown-pastel/50 rounded-xl text-sm font-bold text-brown-earth hover:border-brown-earth transition-colors shadow-sm">
          <Edit3 className="w-4 h-4" /> Edit
        </button>
        <p className="flex-1 text-[11px] font-medium text-text-secondary flex items-center justify-end pr-1">Tap map to add points</p>
      </div>

      <div className="px-6 pb-8">
        <Button variant="primary" size="xl" fullWidth onClick={() => navigate('/onboarding/farm-details')}>
          Confirm Area →
        </Button>
      </div>
    </motion.div>
  )
}

export default FarmBoundaryPage
