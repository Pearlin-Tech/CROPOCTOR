import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Home, Leaf, Bot, Stethoscope, User, CloudSun, BarChart2, Bell, History, Settings } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useApp } from '@/store/AppContext'

const MOBILE_NAV = [
  { to: '/home',    icon: Home,         label: 'Home'     },
  { to: '/farms',   icon: Leaf,         label: 'My Farm'  },
  { to: '/advisor', icon: Bot,          label: 'Advisor'  },
  { to: '/diagnose',icon: Stethoscope,  label: 'Diagnose' },
  { to: '/profile', icon: User,         label: 'Profile'  },
]

const DESKTOP_NAV = [
  { to: '/home',      icon: Home,        label: 'Home'      },
  { to: '/farms',     icon: Leaf,        label: 'My Farm'   },
  { to: '/advisor',   icon: Bot,         label: 'AI Advisor'},
  { to: '/diagnose',  icon: Stethoscope, label: 'Crop Doctor'},
  { to: '/weather',   icon: CloudSun,    label: 'Weather'   },
  { to: '/insights',  icon: BarChart2,   label: 'Insights'  },
  { to: '/history',   icon: History,     label: 'History'   },
  { to: '/notifications', icon: Bell,    label: 'Notifications'},
]

// ─── Bottom Nav (Mobile) ──────────────────────────────────────────────────────
export const BottomNav: React.FC = () => {
  const location = useLocation()
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-gray-100 shadow-nav md:hidden"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around h-[68px] px-1 safe-area-inset-bottom">
        {MOBILE_NAV.map(({ to, icon: Icon, label }) => {
          const active = location.pathname.startsWith(to)
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
                active ? 'bg-green-light' : 'bg-transparent',
                to === '/advisor' && !active && 'bg-green-50 animate-pulse-soft'
              )}>
                <Icon
                  className={cn(
                    'w-5 h-5 transition-colors duration-150', 
                    active ? 'text-green-forest' : (to === '/advisor' ? 'text-green-forest/80' : 'text-gray-400')
                  )}
                  strokeWidth={active ? 2.5 : (to === '/advisor' ? 2 : 1.8)}
                />
              </div>
              <span className={cn(
                'text-[10px] font-semibold transition-colors duration-150', 
                active ? 'text-green-forest' : (to === '/advisor' ? 'text-green-forest/90' : 'text-gray-400')
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
  return (
    <aside
      className="hidden lg:flex flex-col w-64 min-h-screen bg-off-white border-r border-green-pastel/20 fixed left-0 top-0 bottom-0 z-40"
      aria-label="Sidebar navigation"
    >
      {/* Logo */}
      <div className="px-6 py-6 border-b border-green-pastel/20">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🌿</span>
          <div>
            <h1 className="font-bold text-xl text-green-forest leading-none">Agri AI</h1>
            <p className="text-xs text-gray-400 mt-0.5">Farm Intelligence</p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {DESKTOP_NAV.map(({ to, icon: Icon, label }) => {
          const active = location.pathname.startsWith(to)
          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-150',
                'focus-visible:outline-2 focus-visible:outline-green-forest',
                active
                  ? 'bg-green-light text-green-forest'
                  : 'text-gray-600 hover:bg-green-light/50 hover:text-green-forest'
              )}
            >
              <Icon className={cn('w-5 h-5 shrink-0', active ? 'text-green-forest' : 'text-gray-400')} strokeWidth={active ? 2.5 : 1.8} />
              {label}
              {active && <div className="ml-auto w-1.5 h-5 rounded-full bg-green-forest" />}
            </NavLink>
          )
        })}
      </nav>

      {/* Bottom links */}
      <div className="px-3 py-4 border-t border-green-pastel/20 space-y-1">
        {[
          { to: '/profile',  icon: User,     label: 'Profile'  },
          { to: '/settings', icon: Settings, label: 'Settings' },
        ].map(({ to, icon: Icon, label }) => {
          const active = location.pathname.startsWith(to)
          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all',
                active ? 'bg-green-light text-green-forest' : 'text-gray-500 hover:bg-green-light/50'
              )}
            >
              <Icon className="w-5 h-5 shrink-0" strokeWidth={1.8} />
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
  return (
    <nav
      className="hidden md:flex lg:hidden items-center justify-between px-4 py-3 bg-off-white border-b border-green-pastel/20 sticky top-0 z-40 shadow-sm"
      aria-label="Tablet navigation"
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl">🌿</span>
        <span className="font-bold text-lg text-green-forest">Agri AI</span>
      </div>
      <div className="flex items-center gap-1">
        {MOBILE_NAV.map(({ to, icon: Icon, label }) => {
          const active = location.pathname.startsWith(to)
          return (
            <NavLink
              key={to}
              to={to}
              title={label}
              aria-label={label}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all',
                active ? 'bg-green-light text-green-forest' : 'text-gray-400 hover:text-green-forest hover:bg-green-light/50'
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
