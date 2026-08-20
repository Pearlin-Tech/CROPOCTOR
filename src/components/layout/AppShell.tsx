import React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav, Sidebar, TopNav } from './Navigation'
import { ToastContainer } from '@/components/overlays/Toast'
import { cn } from '@/utils/cn'

// Routes where navigation is hidden (full-screen flows)
const HIDDEN_NAV_ROUTES = [
  '/splash', '/welcome', '/language', '/country',
  '/login', '/signup',
  '/onboarding/profile', '/onboarding/location', '/onboarding/boundary',
  '/onboarding/farm-details', '/onboarding/crop', '/onboarding/soil',
  '/onboarding/stage', '/onboarding/complete',
  '/voice', '/image-analysis',
]

export const AppShell: React.FC = () => {
  const location = useLocation()
  const hideNav = HIDDEN_NAV_ROUTES.some(r => location.pathname.startsWith(r))

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      {!hideNav && <Sidebar />}

      {/* Main content area */}
      <div className={cn('flex-1 flex flex-col min-h-screen', !hideNav && 'lg:ml-64')}>
        {/* Tablet top nav */}
        {!hideNav && <TopNav />}

        {/* Page content */}
        <main
          className={cn(
            'flex-1',
            !hideNav && 'pb-[84px] md:pb-0' // space for mobile bottom nav
          )}
          id="main-content"
        >
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      {!hideNav && <BottomNav />}

      {/* Global toast portal */}
      <ToastContainer />
    </div>
  )
}

// ─── Page wrapper with consistent padding ─────────────────────────────────────
interface PageLayoutProps {
  children: React.ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

const maxWidths = {
  sm:   'max-w-lg',
  md:   'max-w-2xl',
  lg:   'max-w-4xl',
  xl:   'max-w-6xl',
  full: 'max-w-none',
}

export const PageLayout: React.FC<PageLayoutProps> = ({ children, className, maxWidth = 'xl' }) => (
  <div className={cn('w-full mx-auto px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8', maxWidths[maxWidth], className)}>
    {children}
  </div>
)

// ─── Mobile page header ───────────────────────────────────────────────────────
interface MobileHeaderProps {
  title: string
  subtitle?: string
  onBack?: () => void
  action?: React.ReactNode
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({ title, subtitle, onBack, action }) => (
  <div className="flex items-center gap-3 px-4 py-4 bg-off-white border-b border-green-pastel/20 sticky top-0 z-30 md:hidden">
    {onBack && (
      <button
        onClick={onBack}
        aria-label="Go back"
        className="w-9 h-9 flex items-center justify-center rounded-xl bg-green-light text-green-forest shrink-0"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
    )}
    <div className="flex-1 min-w-0">
      <h1 className="font-bold text-lg text-gray-800 leading-none truncate">{title}</h1>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
)
