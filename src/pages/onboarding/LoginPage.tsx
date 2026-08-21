import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Lock, Eye, EyeOff, Sprout, ShieldCheck, TrendingUp, Smartphone } from 'lucide-react'
import { pageVariants } from '@/animations/variants'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Divider } from '@/components/ui/index'
import { IMAGES } from '@/config/images'

import { MOCK_FARMER } from '@/mock/farmer'
import { useApp } from '@/store/AppContext'
import { useUser } from '@/store/UserContext'
import { useTranslation } from 'react-i18next'

const schema = z.object({
  email:    z.string().min(1, 'This field is required.').email('Please enter a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
})
type FormData = z.infer<typeof schema>

const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const { login } = useUser()
  const { toast } = useApp()
  const { t } = useTranslation()
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 1200))
    setLoading(false)
    
    if (data.email === 'test@cropoctor.com' && data.password === 'test') {
      login(MOCK_FARMER)
      navigate('/home')
      toast.success('Successfully logged in!')
    } else {
      toast.error('Invalid credentials. Use test@cropoctor.com / test')
    }
  }

  const mockOAuth = async (provider: string) => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 1000))
    setLoading(false)
    login(MOCK_FARMER)
    navigate('/home')
    toast.success(`Successfully logged in with ${provider}!`)
  }

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-[#F9F8F4] flex flex-col lg:flex-row select-none">
      {/* Left Panel: High-Quality Realistic Agricultural Photography with Dark Overlay */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden bg-gray-900">
        <img
          src={IMAGES.backgrounds.login}
          alt="Modern crop field with tractor working at sunrise"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Dark Gradient Overlay covering the bottom portion */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />

        {/* Top Brand Accent */}
        <div className="relative z-10 flex items-center gap-2">
          <div className="bg-black/30 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 flex items-center gap-2">
            <span className="text-xl">🌿</span>
            <span className="text-sm font-semibold text-white tracking-wide">Cropoctor Platform</span>
          </div>
        </div>

        {/* Bottom Overlay Content: Title & 3-Column Feature Row */}
        <div className="relative z-10 space-y-6">
          <div>
            <h2 className="text-4xl font-extrabold text-white tracking-tight drop-shadow-md">
              Growing a better tomorrow
            </h2>
            <p className="text-gray-200 text-base font-normal mt-2 max-w-lg drop-shadow-sm leading-relaxed">
              Empower your agricultural decisions with AI precision diagnostics and real-time field insights.
            </p>
          </div>

          {/* 3-Column Feature Row */}
          <div className="grid grid-cols-3 gap-4 pt-5 border-t border-white/20">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 backdrop-blur-md border border-emerald-400/30 flex items-center justify-center shrink-0">
                <Sprout className="w-4 h-4 text-emerald-300" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Smart Farming</p>
                <p className="text-[11px] text-gray-300">AI Precision</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 backdrop-blur-md border border-emerald-400/30 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Crop Health</p>
                <p className="text-[11px] text-gray-300">Early Detection</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 backdrop-blur-md border border-emerald-400/30 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4 text-emerald-300" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Better Yield</p>
                <p className="text-[11px] text-gray-300">Optimized ROI</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Clean Form Container */}
      <div className="flex-1 flex flex-col justify-between px-6 py-10 lg:px-16 max-w-md mx-auto w-full lg:max-w-lg bg-[#F9F8F4] min-h-screen lg:min-h-0">
        <div className="my-auto py-4">
          {/* Logo Aligned Top Center */}
          <div className="flex flex-col items-center justify-center mb-8 text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-green-900/10 text-green-800 mb-3 border border-green-800/10">
              <span className="text-2xl">🌿</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Cropoctor</h1>
            <p className="text-xs text-gray-500 font-medium">Farm Intelligence Platform</p>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">Welcome Back!</h2>
            <p className="text-gray-500 text-sm font-medium">
              Sign in to continue. For testing use <strong className="text-gray-800">test@cropoctor.com</strong> / <strong className="text-gray-800">test</strong>
            </p>
          </div>

          {/* OAuth Buttons (Ghost / Outline Style) */}
          <div className="space-y-3 mb-6">
            <button
              onClick={() => mockOAuth('google')}
              type="button"
              className="w-full flex items-center justify-center gap-3 px-5 py-3 bg-white border border-gray-200 rounded-xl font-medium text-sm text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              {t('auth.google')}
            </button>

            <button
              onClick={() => mockOAuth('phone')}
              type="button"
              className="w-full flex items-center justify-center gap-3 px-5 py-3 bg-white border border-gray-200 rounded-xl font-medium text-sm text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all"
            >
              <Smartphone className="w-4 h-4 text-gray-500" />
              {t('auth.phone')}
            </button>
          </div>

          <Divider label="or" />

          {/* Email Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mb-6">
            <Input
              label={t('auth.emailLabel')}
              type="email"
              placeholder="you@example.com"
              icon={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label={t('auth.passwordLabel')}
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••"
              icon={<Lock className="w-4 h-4" />}
              iconRight={
                <button type="button" onClick={() => setShowPw(v => !v)} aria-label="Toggle password" className="text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              error={errors.password?.message}
              {...register('password')}
            />
            <div className="text-right">
              <button type="button" className="text-xs font-semibold text-[#2E7D32] hover:underline">
                {t('auth.forgotPassword')}
              </button>
            </div>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              className="bg-[#2E7D32] hover:bg-[#256629] text-white py-3.5 rounded-xl font-semibold text-base shadow-md transition-colors"
            >
              {loading ? t('auth.signingIn') : 'Sign In'}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <button onClick={() => navigate('/signup')} className="text-[#2E7D32] font-semibold hover:underline">
              {t('auth.createAccount')}
            </button>
          </p>
        </div>

        {/* Security Indicator at Bottom */}
        <div className="flex items-center justify-center gap-1.5 pt-4 text-xs text-gray-400 border-t border-gray-200/60">
          <ShieldCheck className="w-3.5 h-3.5 text-[#2E7D32]" />
          <span>256-bit Encrypted & Secure Connection</span>
        </div>
      </div>
    </motion.div>
  )
}

export default LoginPage
