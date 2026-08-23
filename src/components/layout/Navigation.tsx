import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Home, Leaf, Bot, Stethoscope, User, CloudSun, BarChart2, Bell, History } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useApp } from '@/store/AppContext'

import { useTranslation } from 'react-i18next'

const MOBILE_NAV = [
  { to: '/home',    icon: Home,         labelKey: 'nav.home'     },
  { to: '/farms',   icon: Leaf,         labelKey: 'nav.myFarm'  },
  { to: '/advisor', icon: Bot,          labelKey: 'nav.advisor'  },
  { to: '/diagnose',icon: Stethoscope,  labelKey: 'nav.diagnose' },
  { to: '/profile', icon: User,         labelKey: 'nav.profile'  },
]

const DESKTOP_NAV = [
  { to: '/home',      icon: Home,        labelKey: 'nav.home'      },
  { to: '/farms',     icon: Leaf,        labelKey: 'nav.myFarm'   },
  { to: '/advisor',   icon: Bot,         labelKey: 'nav.advisor'},
  { to: '/diagnose',  icon: Stethoscope, labelKey: 'nav.diagnose'},
  { to: '/weather',   icon: CloudSun,    labelKey: 'nav.weather'   },
  { to: '/insights',  icon: BarChart2,   labelKey: 'nav.insights'  },
  { to: '/history',   icon: History,     labelKey: 'nav.history'   },
  { to: '/notifications', icon: Bell,    labelKey: 'nav.notifications'},
]

// ─── Bottom Nav (Mobile) ──────────────────────────────────────────────────────
export const BottomNav: React.FC = () => {
  const location = useLocation()
  const { t } = useTranslation()
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-gray-100 shadow-nav md:hidden"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around h-[68px] px-1 safe-area-inset-bottom">
        {MOBILE_NAV.map(({ to, icon: Icon, labelKey }) => {
          const active = location.pathname.startsWith(to)
          const label = t(labelKey)
          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full',
                'transition-all duration-150',
                'focus-visible:outline-2 focus-visible:outline-green-forest rounded-xl',
              )}
              aria-label={label}
            >
              <div className={cn(
                'p-1.5 rounded-xl transition-all duration-200',
                active ? 'bg-green-pastel/30' : 'bg-transparent',
                to === '/advisor' && !active && 'bg-green-pastel/20 animate-pulse-soft'
              )}>
                <Icon
                  className={cn(
                    'w-6 h-6 transition-colors duration-150', 
                    active ? 'text-green-forest' : (to === '/advisor' ? 'text-green-forest' : 'text-brown-earth/70')
                  )}
                  strokeWidth={active ? 2.5 : (to === '/advisor' ? 2 : 1.8)}
                />
              </div>
              <span className={cn(
                'text-[10px] font-semibold transition-colors duration-150', 
                active ? 'text-green-forest' : (to === '/advisor' ? 'text-green-forest' : 'text-brown-earth/70')
              )}>
                {label}
              </span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}

// ─── Sidebar (Desktop) ────────────────────────────────────────────────────────
export const Sidebar: React.FC = () => {
  const location = useLocation()
  const { t } = useTranslation()
  return (
    <aside
      className="hidden lg:flex flex-col w-64 min-h-screen bg-off-white border-r border-green-pastel/20 fixed left-0 top-0 bottom-0 z-40"
      aria-label="Sidebar navigation"
    >
      {/* Logo */}
      <div className="px-6 py-6 border-b border-brown-pastel/40">
        <div className="flex items-center gap-3">
          <img src="/images/logo.jpg" alt="Cropoctor Logo" className="w-10 h-10 rounded-xl object-cover border border-brown-pastel/30 shadow-sm" />
          <div>
            <h1 className="font-bold text-xl text-green-forest leading-none tracking-tight">{t('app.name')}</h1>
            <p className="text-[11px] text-brown-earth mt-1 font-medium">{t('app.tagline')}</p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {DESKTOP_NAV.map(({ to, icon: Icon, labelKey }) => {
          const active = location.pathname.startsWith(to)
          const label = t(labelKey)
          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-3 px-3 py-3 rounded-xl font-medium text-sm transition-all duration-150',
                'focus-visible:outline-2 focus-visible:outline-green-forest',
                active
                  ? 'bg-green-pastel/30 text-green-forest'
                  : 'text-brown-earth/80 hover:bg-green-pastel/10 hover:text-green-forest'
              )}
            >
              <Icon className={cn('w-5 h-5 shrink-0', active ? 'text-green-forest' : 'text-brown-earth/70')} strokeWidth={active ? 2.5 : 1.8} />
              {label}
              {active && <div className="ml-auto w-1.5 h-5 rounded-full bg-green-forest" />}
            </NavLink>
          )
        })}
      </nav>

      {/* Bottom links */}
      <div className="px-3 py-4 border-t border-brown-pastel/40 space-y-1">
        {[
          { to: '/profile',  icon: User,     labelKey: 'nav.profile'  },
        ].map(({ to, icon: Icon, labelKey }) => {
          const active = location.pathname.startsWith(to)
          const label = t(labelKey)
          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all',
                active ? 'bg-green-pastel/30 text-green-forest' : 'text-brown-earth/80 hover:bg-green-pastel/10 hover:text-green-forest'
              )}
            >
              <Icon className={cn('w-5 h-5 shrink-0', active ? 'text-green-forest' : 'text-brown-earth/70')} strokeWidth={active ? 2.5 : 1.8} />
              {label}
            </NavLink>
          )
        })}
      </div>
    </aside>
  )
}

// ─── Top Nav (Tablet — md only) ───────────────────────────────────────────────
export const TopNav: React.FC = () => {
  const location = useLocation()
  const { t } = useTranslation()
  return (
    <nav
      className="hidden md:flex lg:hidden items-center justify-between px-4 py-3 bg-off-white border-b border-brown-pastel/40 sticky top-0 z-40 shadow-sm"
      aria-label="Tablet navigation"
    >
      <div className="flex items-center gap-3">
        <img src="/images/logo.jpg" alt="Cropoctor Logo" className="w-8 h-8 rounded-lg object-cover border border-brown-pastel/30" />
        <span className="font-bold text-lg text-green-forest tracking-tight">{t('app.name')}</span>
      </div>
      <div className="flex items-center gap-1">
        {MOBILE_NAV.map(({ to, icon: Icon, labelKey }) => {
          const active = location.pathname.startsWith(to)
          const label = t(labelKey)
          return (
            <NavLink
              key={to}
              to={to}
              title={label}
              aria-label={label}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all',
                active ? 'bg-green-pastel/30 text-green-forest' : 'text-brown-earth/80 hover:text-green-forest hover:bg-green-pastel/10'
              )}
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[10px] font-semibold">{label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
