import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Lock, User } from 'lucide-react'
import { pageVariants } from '@/animations/variants'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

import { useUser } from '@/store/UserContext'
import { MOCK_FARMER } from '@/mock/farmer'
import { useApp } from '@/store/AppContext'
import { IMAGES } from '@/config/images'
import { useTranslation } from 'react-i18next'

const schema = z.object({
  name:     z.string().min(2, 'Please enter your full name.'),
  email:    z.string().email('Please enter a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
})
type FormData = z.infer<typeof schema>

const SignUpPage: React.FC = () => {
  const navigate = useNavigate()
  const { login } = useUser()
  const { toast } = useApp()
  const { t } = useTranslation()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async () => {
    await new Promise(r => setTimeout(r, 1200))
    login(MOCK_FARMER)
    navigate('/home')
    toast.success('Account created successfully!')
  }

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-[#F9F8F4] flex flex-col lg:flex-row-reverse select-none">
      {/* Desktop: right image panel */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-end p-12 overflow-hidden bg-gray-900">
        <img src={IMAGES.backgrounds.welcome} alt="Farm at sunrise" className="absolute inset-0 w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20" />
        <div className="relative z-10 text-left space-y-2">
          <h2 className="text-4xl font-extrabold text-white tracking-tight drop-shadow-md">Join Cropoctor.</h2>
          <p className="text-gray-200 text-base font-normal drop-shadow-sm">Transform your farm with intelligent AI crop management.</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex flex-col justify-center px-6 py-10 lg:px-16 max-w-md mx-auto w-full lg:max-w-lg bg-[#F9F8F4]">
        <div className="flex items-center gap-2 mb-8">
          <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-200/60 text-gray-700 hover:bg-gray-200 mr-2 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <span className="text-2xl">🌿</span>
          <span className="text-xl font-bold text-gray-900">Cropoctor</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('auth.createAccount')}</h1>
        <p className="text-gray-500 text-sm mb-8 font-medium">Join Cropoctor to get personalized farm insights.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mb-6">
          <Input label="Full name" placeholder="Rahul Patel" icon={<User className="w-4 h-4" />} error={errors.name?.message} {...register('name')} />
          <Input label={t('auth.emailLabel')} type="email" placeholder="you@example.com" icon={<Mail className="w-4 h-4" />} error={errors.email?.message} {...register('email')} />
          <Input label={t('auth.passwordLabel')} type="password" placeholder="••••••••" icon={<Lock className="w-4 h-4" />} error={errors.password?.message} {...register('password')} />
          <Button type="submit" variant="primary" size="lg" fullWidth loading={isSubmitting} className="bg-[#2E7D32] hover:bg-[#256629] text-white py-3.5 rounded-xl font-semibold text-base shadow-md transition-colors">{t('auth.createAccount')}</Button>
        </form>

        <p className="text-center text-sm text-gray-500">
          Already have an account?{' '}
          <button onClick={() => navigate('/login')} className="text-[#2E7D32] font-semibold hover:underline">{t('welcome.signin').split('?')[1]?.trim() || 'Sign In'}</button>
        </p>

        <p className="text-center text-xs text-gray-400 mt-6 px-4">
          By creating an account, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </motion.div>
  )
}

export default SignUpPage
