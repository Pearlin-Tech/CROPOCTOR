import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { pageVariants } from '@/animations/variants'
import { PageLayout, MobileHeader } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'

const AboutPage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-background">
      <MobileHeader title="About Agri AI" onBack={() => navigate(-1)} />
      <PageLayout className="pt-4 pb-8 space-y-4">
        <h1 className="hidden lg:block text-2xl font-bold text-gray-800 mb-6">About Agri AI</h1>
        <Card padding="md" className="text-center">
          <div className="text-4xl mb-4">🌿</div>
          <h2 className="text-xl font-bold text-green-forest mb-2">Agri AI</h2>
          <p className="text-sm text-gray-500 mb-4">Version 1.0.0</p>
          <p className="text-gray-700">BRICS Agricultural Intelligence Platform.</p>
          <p className="text-xs text-gray-400 mt-6">© 2026 Agri AI. All rights reserved.</p>
        </Card>
      </PageLayout>
    </motion.div>
  )
}

export default AboutPage
