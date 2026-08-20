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
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async () => {
    await new Promise(r => setTimeout(r, 1200))
    login(MOCK_FARMER)
    navigate('/home')
    toast.success('Account created successfully!')
  }

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-cream flex flex-col lg:flex-row-reverse">
      {/* Desktop: right image panel */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <img src={IMAGES.backgrounds.welcome} alt="Farm at sunrise" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-l from-black/20 via-transparent to-cream" />
        <div className="absolute bottom-12 right-12 text-right">
          <h2 className="text-4xl font-bold text-white mb-2 drop-shadow-md">Join Agri AI.</h2>
          <p className="text-white/90 text-lg drop-shadow-md">Unlock the potential of your farm.</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex flex-col justify-center px-6 py-10 lg:px-16 max-w-md mx-auto w-full lg:max-w-lg">
        <div className="flex items-center gap-2 mb-8">
          <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-green-light text-green-forest mr-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <span className="text-2xl">🌿</span>
          <span className="text-xl font-bold text-green-forest">Agri AI</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-1">Create Account</h1>
        <p className="text-gray-500 text-sm mb-8">Join Agri AI to get personalized farm insights.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mb-6">
          <Input label="Full name" placeholder="Rahul Patel" icon={<User className="w-4 h-4" />} error={errors.name?.message} {...register('name')} />
          <Input label="Email address" type="email" placeholder="you@example.com" icon={<Mail className="w-4 h-4" />} error={errors.email?.message} {...register('email')} />
          <Input label="Password" type="password" placeholder="••••••••" icon={<Lock className="w-4 h-4" />} error={errors.password?.message} {...register('password')} />
          <Button type="submit" variant="primary" size="lg" fullWidth loading={isSubmitting}>Create Account</Button>
        </form>

        <p className="text-center text-sm text-gray-500">
          Already have an account?{' '}
          <button onClick={() => navigate('/login')} className="text-green-forest font-semibold hover:underline">Sign in</button>
        </p>

        <p className="text-center text-xs text-gray-400 mt-4 px-4">
          By creating an account, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </motion.div>
  )
}

export default SignUpPage
