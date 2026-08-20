import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { pageVariants } from '@/animations/variants'
import { Button } from '@/components/ui/Button'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { CROP_STAGES } from '@/config/soils'
import { Input } from '@/components/ui/Input'

const CropStagePage: React.FC = () => {
  const navigate = useNavigate()
  const [stage, setStage] = useState('flowering')
  const [date, setDate]   = useState('')
  const stageOptions = CROP_STAGES.map(s => ({ id: s.id, name: s.name }))

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-cream flex flex-col max-w-md mx-auto w-full px-6 py-10">
      <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-green-light text-green-forest mb-6">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Crop Stage</h1>
      <p className="text-gray-500 text-sm mb-8">What stage is your crop at?</p>

      <div className="flex-1 space-y-5">
        <SearchableSelect
          label="Crop Stage"
          options={stageOptions}
          value={stage}
          onChange={setStage}
          placeholder="Select Crop Stage"
          searchPlaceholder="Search stages..."
        />
        <Input
          label="When did you plant? (optional)"
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          hint="This helps us calculate fertilizer and irrigation timing."
        />
      </div>

      <div className="mt-10">
        <Button variant="primary" size="xl" fullWidth onClick={() => navigate('/onboarding/complete')}>
          Almost Done →
        </Button>
      </div>
    </motion.div>
  )
}

export default CropStagePage
