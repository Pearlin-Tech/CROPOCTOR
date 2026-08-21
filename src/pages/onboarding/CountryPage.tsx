import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { pageVariants, cardVariants, listVariants } from '@/animations/variants'
import { Button } from '@/components/ui/Button'
import { COUNTRIES } from '@/config/countries'

const CountryPage: React.FC = () => {
  const navigate = useNavigate()
  const [selected, setSelected] = useState('IN')

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-cream flex flex-col">
      <div className="px-6 pt-12 pb-6">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-2xl">🌿</span>
          <span className="text-xl font-bold text-green-forest">Cropoctor</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Select Your Country</h1>
        <p className="text-gray-500 text-sm">Choose your country to get local insights.</p>
      </div>

      <motion.div
        variants={listVariants} animate="animate"
        className="flex-1 px-6 pb-32"
      >
        {/* BRICS Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {COUNTRIES.map(country => (
            <motion.button
              key={country.code}
              variants={cardVariants}
              onClick={() => setSelected(country.code)}
              className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-150 ${
                selected === country.code
                  ? 'border-green-forest bg-green-light shadow-card'
                  : 'border-transparent bg-white hover:border-green-pastel shadow-sm'
              }`}
            >
              {selected === country.code && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-green-forest flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              <span className="text-4xl">{country.flag}</span>
              <p className="text-xs font-semibold text-gray-700 text-center leading-tight">{country.name}</p>
            </motion.button>
          ))}
        </div>

        <p className="mt-6 text-xs text-center text-gray-400 px-4">
          🌍 Cropoctor supports all 11 BRICS countries with localized crop, soil, and weather insights.
        </p>
      </motion.div>

      <div className="fixed bottom-0 left-0 right-0 px-6 py-6 bg-cream/95 backdrop-blur-sm border-t border-gray-100">
        <Button variant="primary" size="xl" fullWidth onClick={() => navigate('/login')}>
          Continue
        </Button>
      </div>
    </motion.div>
  )
}

export default CountryPage
