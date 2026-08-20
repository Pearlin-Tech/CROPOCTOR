import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { pageVariants } from '@/animations/variants'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Chip } from '@/components/ui/index'

const FarmerProfilePage: React.FC = () => {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [experience, setExperience] = useState<string>('intermediate')

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-cream flex flex-col max-w-md mx-auto w-full px-6 py-10">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-green-light text-green-forest mb-6">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M15 18l-6-6 6-6" /></svg>
      </button>

      {/* Progress */}
      <div className="flex gap-1.5 mb-8">
        {[1,2,3].map(s => <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= 1 ? 'bg-green-forest' : 'bg-gray-200'}`} />)}
      </div>
      <p className="text-xs text-gray-400 font-medium mb-2">Step 1 of 3</p>

      <h1 className="text-2xl font-bold text-gray-800 mb-1">Your Profile</h1>
      <p className="text-gray-500 text-sm mb-8">Tell us a bit about yourself.</p>

      {/* Avatar */}
      <div className="flex justify-center mb-8">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-green-light flex items-center justify-center text-4xl border-4 border-white shadow-card">
            👨‍🌾
          </div>
          <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-forest rounded-full flex items-center justify-center text-white text-xs shadow">+</div>
        </div>
      </div>

      <div className="space-y-6 flex-1">
        <Input
          label="Full name"
          placeholder="e.g. Rahul Patel"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">Farming experience</label>
          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'beginner', label: 'Beginner' },
              { id: 'intermediate', label: 'Intermediate' },
              { id: 'expert', label: 'Expert' },
            ].map(opt => (
              <Chip key={opt.id} selected={experience === opt.id} onClick={() => setExperience(opt.id)}>
                {opt.label}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-10">
        <Button
          variant="primary" size="xl" fullWidth
          onClick={() => navigate('/onboarding/location')}
          disabled={!name.trim()}
        >
          Continue →
        </Button>
      </div>
    </motion.div>
  )
}

export default FarmerProfilePage
