import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, RefreshCw, LogOut, CheckCircle } from 'lucide-react'
import { pageVariants } from '@/animations/variants'
import { Button } from '@/components/ui/Button'
import { useUser } from '@/store/UserContext'
import { useApp } from '@/store/AppContext'
import { authService } from '@/services/authService'
import { auth } from '@/services/firebase'
import { useTranslation } from 'react-i18next'

const EmailVerificationPage: React.FC = () => {
  const navigate = useNavigate()
  const { logout, authUser } = useUser()
  const { toast } = useApp()
  const { t } = useTranslation()
  const [checking, setChecking] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  const handleCheckVerified = async () => {
    const currentUser = auth.currentUser
    if (!currentUser) {
      toast.error(t('auth.errors.noSession', 'No user session. Please sign in again.'))
      navigate('/login', { replace: true })
      return
    }
    setChecking(true)
    const { verified, error } = await authService.reloadAndCheckVerified(currentUser)
    setChecking(false)
    if (error) {
      toast.error(error)
      return
    }
    if (!verified) {
      toast.error(t('auth.errors.notVerified', 'Email not verified yet. Please click the link in your email first.'))
      return
    }
    toast.success(t('auth.verified', 'Email verified! Welcome to Cropoctor.'))
    navigate('/home', { replace: true })
  }

  const handleResend = async () => {
    const currentUser = auth.currentUser
    if (!currentUser) {
      toast.error(t('auth.errors.noSession', 'No session found.'))
      return
    }
    setResending(true)
    const { error } = await authService.sendVerificationEmail(currentUser)
    setResending(false)
    if (error) {
      toast.error(error)
      return
    }
    setResendCooldown(60)
    toast.success(t('auth.verificationResent', 'Verification email resent!'))
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="min-h-screen bg-[#F9F8F4] flex items-center justify-center px-6"
    >
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto shadow-sm">
          <Mail className="w-10 h-10 text-[#2E7D32]" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">
            {t('auth.verifyEmailTitle', 'Verify your email')}
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            {t('auth.verifyEmailDesc', "We sent a verification link to")}
            {authUser?.email && (
              <><br /><strong className="text-gray-800">{authUser.email}</strong></>
            )}
            <br />
            {t('auth.verifyEmailInstructions', 'Click the link in the email, then press the button below.')}
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleCheckVerified}
            loading={checking}
            variant="primary"
            fullWidth
            icon={<CheckCircle className="w-4 h-4" />}
            className="bg-[#2E7D32] hover:bg-[#256629] text-white py-3.5 rounded-xl font-semibold"
          >
            {t('auth.iHaveVerified', "I've verified my email — Continue")}
          </Button>

          <button
            type="button"
            disabled={resendCooldown > 0 || resending}
            onClick={handleResend}
            className="w-full flex items-center justify-center gap-2 text-sm text-[#2E7D32] font-semibold hover:underline disabled:opacity-50 disabled:cursor-not-allowed py-2"
          >
            <RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
            {resendCooldown > 0
              ? t('auth.resendIn', `Resend in ${resendCooldown}s`, { seconds: resendCooldown })
              : t('auth.resendVerification', 'Resend verification email')}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors py-2"
          >
            <LogOut className="w-4 h-4" />
            {t('auth.signOut', 'Sign out')}
          </button>
        </div>

        <p className="text-xs text-gray-400">
          {t('auth.checkSpam', "Can't find the email? Check your spam or junk folder.")}
        </p>
      </div>
    </motion.div>
  )
}

export default EmailVerificationPage
