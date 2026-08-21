import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
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
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-cream flex flex-col lg:flex-row">
      {/* Desktop: left image panel */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <img src={IMAGES.backgrounds.login} alt="Farm at sunrise" className="absolute inset-0 w-full h-full object-cover" />
        {/* Gradient that fades to cream on the right side to blend with the form */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-cream" />
        <div className="absolute bottom-12 left-12">
          <h2 className="text-4xl font-bold text-white mb-2 drop-shadow-md">Welcome Back.</h2>
          <p className="text-white/90 text-lg drop-shadow-md">Your farm is waiting.</p>
        </div>
      </div>

      {/* Login form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-10 lg:px-16 max-w-md mx-auto w-full lg:max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <span className="text-3xl">🌿</span>
          <div>
            <h1 className="text-2xl font-bold text-green-forest">Cropoctor</h1>
            <p className="text-xs text-gray-400">Farm Intelligence Platform</p>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-text-main mb-1">Welcome Back!</h2>
        <p className="text-text-secondary text-sm mb-8 font-medium">Sign in to continue. For testing use <b>test@cropoctor.com</b> and <b>test</b></p>

        {/* OAuth buttons */}
        <div className="space-y-3 mb-6">
          <button
            onClick={() => mockOAuth('google')}
            className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-white border border-green-pastel/30 rounded-2xl font-semibold text-gray-700 shadow-sm hover:border-green-pastel hover:bg-green-light/50 transition-all"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            {t('auth.google')}
          </button>

          <button
            onClick={() => mockOAuth('phone')}
            className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-white border border-green-pastel/30 rounded-2xl font-semibold text-gray-700 shadow-sm hover:border-green-pastel hover:bg-green-light/50 transition-all"
          >
            📱 {t('auth.phone')}
          </button>
        </div>

        <Divider label="or" />

        {/* Email form */}
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
              <button type="button" onClick={() => setShowPw(v => !v)} aria-label="Toggle password">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
            error={errors.password?.message}
            {...register('password')}
          />
          <div className="text-right">
            <button type="button" className="text-sm text-green-forest font-medium hover:underline">
              {t('auth.forgotPassword')}
            </button>
          </div>
          <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
            {loading ? t('auth.signingIn') : t('welcome.signin').split('?')[1]?.trim() || 'Sign In'}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500">
          Don't have an account?{' '}
          <button onClick={() => navigate('/signup')} className="text-green-forest font-semibold hover:underline">
            {t('auth.createAccount')}
          </button>
        </p>
      </div>
    </motion.div>
  )
}

export default LoginPage
