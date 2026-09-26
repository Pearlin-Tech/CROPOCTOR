import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Lock, User, Smartphone } from 'lucide-react'
import { pageVariants } from '@/animations/variants'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PhoneInput } from '@/components/ui/PhoneInput'

import { useUser } from '@/store/UserContext'
import { useApp } from '@/store/AppContext'
import { IMAGES } from '@/config/images'
import { useTranslation } from 'react-i18next'
import { authService } from '@/services/authService'
import { userService } from '@/services/userService'
import { auth } from '@/services/firebase'
import type { Farmer } from '@/types'

const emailSchema = z.object({
  name:     z.string().min(2, 'Please enter your full name.'),
  email:    z.string().email('Please enter a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})
type EmailFormData = z.infer<typeof emailSchema>

const SignUpPage: React.FC = () => {
  const navigate = useNavigate()
  const { login, authUser } = useUser()
  const { toast } = useApp()
  const { t } = useTranslation()
  // mode: 'email' | 'phone'
  const [authMode, setAuthMode] = useState<'email' | 'phone'>('email')
  // phone state
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [confirmationResult, setConfirmationResult] = useState<any>(null)
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [phoneName, setPhoneName] = useState('')
  // email verification state
  const [emailSent, setEmailSent] = useState(false)
  const [verifyChecking, setVerifyChecking] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<EmailFormData>({ resolver: zodResolver(emailSchema) })

  // Cleanup recaptcha on unmount
  useEffect(() => {
    return () => {
      if ((window as any).recaptchaVerifier) {
        try { (window as any).recaptchaVerifier.clear() } catch {}
        delete (window as any).recaptchaVerifier
      }
    }
  }, [])

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  const onEmailSubmit = async (data: EmailFormData) => {
    const { user, error } = await authService.signUpWithEmail(data.email, data.password)
    if (error || !user) { toast.error(error || 'Failed to create account'); return }
    await authService.updateUserProfile(user, { displayName: data.name })
    const { error: verifyError } = await authService.sendVerificationEmail(user)
    if (verifyError) {
      toast.error(verifyError)
      return // Stop here if verification email fails to send
    }
    const farmerData: Farmer = {
      id: user.uid,
      name: data.name,
      email: data.email,
      phone: '',
      experience: 'beginner',
      country: 'IN',
      preferredLanguage: 'en',
      createdAt: new Date().toISOString()
    }
    await userService.saveUserProfile(farmerData)
    login(farmerData)
    setResendCooldown(60)
    setEmailSent(true)
  }

  const handleSendOtp = async () => {
    if (!phone) { toast.error('Please enter a phone number.'); return }
    setLoading(true)
    // Init reCAPTCHA lazily here so the DOM container is guaranteed to exist
    let appVerifier = (window as any).recaptchaVerifier
    if (!appVerifier) {
      appVerifier = authService.setupRecaptcha('recaptcha-signup')
    }
    if (!appVerifier) {
      setLoading(false)
      toast.error('reCAPTCHA failed to initialize. Please refresh and try again.')
      return
    }
    const { confirmationResult: res, error } = await authService.signInWithPhone(phone, appVerifier)
    setLoading(false)
    if (error || !res) {
      toast.error(error || 'Failed to send OTP')
      if ((window as any).recaptchaVerifier) {
        try { (window as any).recaptchaVerifier.clear() } catch {}
        delete (window as any).recaptchaVerifier
      }
      return
    }
    setConfirmationResult(res)
    toast.success('OTP sent!')
  }

  const handleVerifyOtp = async () => {
    if (!otp) { toast.error('Please enter the OTP.'); return }
    setLoading(true)
    const { user, error } = await authService.verifyPhoneOtp(confirmationResult, otp)
    setLoading(false)
    if (error || !user) { toast.error(error || 'OTP verification failed'); return }
    setPhoneVerified(true)
    toast.success('Phone verified! Enter your name to complete setup.')
  }

  const handleCompletePhone = async () => {
    if (!phoneName.trim()) { toast.error('Please enter your name.'); return }
    setLoading(true)
    if (authUser) await authService.updateUserProfile(authUser, { displayName: phoneName })
    const farmerData: Farmer = {
      id: authUser?.uid || `phone-${Date.now()}`,
      name: phoneName,
      email: '',
      phone: phone,
      experience: 'beginner',
      country: 'IN',
      preferredLanguage: 'en',
      createdAt: new Date().toISOString()
    }
    if (authUser?.uid) {
      await userService.saveUserProfile(farmerData)
    }
    login(farmerData)
    navigate('/onboarding/profile')
    toast.success('Account created successfully!')
  }

  const handleCheckVerified = async () => {
    const currentUser = auth.currentUser
    if (!currentUser) {
      toast.error('No user session found. Please sign in again.')
      return
    }
    setVerifyChecking(true)
    const { verified, error } = await authService.reloadAndCheckVerified(currentUser)
    setVerifyChecking(false)
    if (error) { toast.error(error); return }
    if (!verified) {
      toast.error('Email not verified yet. Please click the link in your email first.')
      return
    }
    navigate('/onboarding/profile')
    toast.success('Email verified! Welcome to Cropoctor.')
  }

  const handleResendVerification = async () => {
    const currentUser = auth.currentUser
    if (!currentUser) { toast.error('No user session found.'); return }
    const { error } = await authService.sendVerificationEmail(currentUser)
    if (error) { toast.error(error); return }
    setResendCooldown(60)
    toast.success('Verification email resent!')
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

        {/* Email sent / verification state */}
        {emailSent ? (
          <div className="text-center space-y-4 mb-8">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Mail className="w-7 h-7 text-[#2E7D32]" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Verify your email</h3>
            <p className="text-sm text-gray-500">We've sent a verification link to your email. Click the link, then return here and press Continue.</p>
            <Button onClick={handleCheckVerified} loading={verifyChecking} variant="primary" fullWidth className="bg-[#2E7D32] hover:bg-[#256629] text-white py-3.5 rounded-xl font-semibold text-base shadow-md transition-colors">
              I've verified my email — Continue
            </Button>
            <button
              type="button"
              disabled={resendCooldown > 0}
              onClick={handleResendVerification}
              className="text-xs text-[#2E7D32] hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resendCooldown > 0 ? `Resend email in ${resendCooldown}s` : 'Resend verification email'}
            </button>
            <button type="button" onClick={() => setEmailSent(false)} className="block text-xs text-gray-400 hover:underline mx-auto">
              Go back
            </button>
          </div>
        ) : authMode === 'phone' ? (
          /* Phone Sign-Up Flow */
          <div className="space-y-4 mb-6">
            {!phoneVerified ? (
              <>
                {!confirmationResult ? (
                  <>
                    <PhoneInput label="Phone Number" value={phone} onChange={setPhone} />
                    <Button onClick={handleSendOtp} variant="primary" size="lg" fullWidth loading={loading} className="bg-[#2E7D32] hover:bg-[#256629] text-white py-3.5 rounded-xl font-semibold text-base shadow-md transition-colors">
                      Send Verification Code
                    </Button>
                  </>
                ) : (
                  <>
                    <Input label="Verification Code" placeholder="123456" value={otp} onChange={(e) => setOtp(e.target.value)} />
                    <Button onClick={handleVerifyOtp} variant="primary" size="lg" fullWidth loading={loading} className="bg-[#2E7D32] hover:bg-[#256629] text-white py-3.5 rounded-xl font-semibold text-base shadow-md transition-colors">
                      Verify Code
                    </Button>
                  </>
                )}
                <button type="button" onClick={() => { setAuthMode('email'); setConfirmationResult(null); setOtp(''); setPhone('') }} className="text-sm text-gray-500 hover:underline block text-center w-full">
                  Sign up with Email instead
                </button>
              </>
            ) : (
              /* Post-verification: collect name */
              <>
                <Input label="Full Name" placeholder="Rahul Patel" icon={<User className="w-4 h-4" />} value={phoneName} onChange={(e) => setPhoneName(e.target.value)} />
                <Button onClick={handleCompletePhone} variant="primary" size="lg" fullWidth loading={loading} className="bg-[#2E7D32] hover:bg-[#256629] text-white py-3.5 rounded-xl font-semibold text-base shadow-md transition-colors">
                  Complete Setup
                </Button>
              </>
            )}
            <div id="recaptcha-signup"></div>
          </div>
        ) : (
          /* Email Sign-Up Form */
          <>
            <form onSubmit={handleSubmit(onEmailSubmit)} className="space-y-4 mb-4">
              <Input label="Full name" placeholder="Rahul Patel" icon={<User className="w-4 h-4" />} error={errors.name?.message} {...register('name')} />
              <Input label={t('auth.emailLabel')} type="email" placeholder="you@example.com" icon={<Mail className="w-4 h-4" />} error={errors.email?.message} {...register('email')} />
              <Input label={t('auth.passwordLabel')} type="password" placeholder="••••••••" icon={<Lock className="w-4 h-4" />} error={errors.password?.message} {...register('password')} />
              <Input label="Confirm Password" type="password" placeholder="••••••••" icon={<Lock className="w-4 h-4" />} error={errors.confirmPassword?.message} {...register('confirmPassword')} />
              <Button type="submit" variant="primary" size="lg" fullWidth loading={isSubmitting} className="bg-[#2E7D32] hover:bg-[#256629] text-white py-3.5 rounded-xl font-semibold text-base shadow-md transition-colors">{t('auth.createAccount')}</Button>
            </form>
            <div className="text-center mb-6">
              <button type="button" onClick={() => setAuthMode('phone')} className="text-sm text-gray-500 hover:underline">
                <Smartphone className="w-4 h-4 inline-block mr-1" /> Sign up with Phone Number instead
              </button>
            </div>
          </>
        )}

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
