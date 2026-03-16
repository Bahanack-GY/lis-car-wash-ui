import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, UserCheck, AlertTriangle, Building2,
  ScrollText, LogOut, ChevronLeft, Menu, Sun, Moon, ArrowLeft,
} from '@/lib/icons'
import Logo from '@/assets/Logo.png'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth, type UserRole } from '@/contexts/AuthContext'
import ChatWidget from '@/components/ChatWidget'

const NAVY = '#283852'
const TEAL = '#33cbcc'
const WASH = '#e3f6f6'

interface NavItem {
  path: string
  label: string
  icon: React.ElementType
  end?: boolean
}

const navItems: NavItem[] = [
  { path: '/global-dashboard',           label: 'Tableau de bord',  icon: LayoutDashboard, end: true },
  { path: '/global-dashboard/employees', label: 'Employés',         icon: Users },
  { path: '/global-dashboard/clients',   label: 'Clients',          icon: UserCheck },
  { path: '/global-dashboard/incidents',  label: 'Incidents',        icon: AlertTriangle },
  { path: '/global-dashboard/stations',  label: 'Stations',         icon: Building2 },
  { path: '/global-dashboard/audit',     label: "Journal d'audit",  icon: ScrollText },
]

const roleLabel: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  manager: 'Manager',
  controleur: 'Contrôleur',
  caissiere: 'Caissière',
  laveur: 'Laveur',
  commercial: 'Commercial',
  comptable: 'Comptable',
}

const pageTitles: Record<string, string> = {
  '/global-dashboard': "Vue d'ensemble",
  '/global-dashboard/employees': 'Employés',
  '/global-dashboard/clients': 'Clients',
  '/global-dashboard/incidents': 'Incidents',
  '/global-dashboard/stations': 'Stations',
  '/global-dashboard/audit': "Journal d'audit",
}

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { isDark, toggle } = useTheme()
  const { user, logout } = useAuth()

  const initials = user ? `${user.prenom[0]}${user.nom[0]}` : '?'
  const pageTitle = pageTitles[location.pathname] ?? 'Administration'

  const handleLogout = () => { logout(); navigate('/') }

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar ───────────────────────────────────── */}
      <motion.aside
        className={`
          fixed lg:relative z-50 h-full flex flex-col
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          transition-transform duration-300 ease-in-out
        `}
        style={{ background: NAVY }}
        animate={{ width: collapsed ? 72 : 272 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex-shrink-0">
            {collapsed ? (
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(51,203,204,0.15)' }}>
                <img src={Logo} alt="LIS" className="w-5 h-5 object-contain" />
              </div>
            ) : (
              <img src={Logo} alt="LIS" className="w-9 h-9 object-contain" />
            )}
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <h1 className="font-heading font-bold text-sm leading-tight text-white">LIS Car Wash</h1>
                <p className="text-[10px] leading-tight font-body" style={{ color: TEAL, opacity: 0.7, fontFamily: 'var(--font-body)' }}>
                  Admin Global
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto sidebar-scroll">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                  isActive ? 'text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                } ${collapsed ? 'justify-center px-0' : ''}`
              }
              style={({ isActive }) => ({ background: isActive ? 'rgba(51,203,204,0.18)' : undefined })}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="admin-sidebar-active"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full"
                      style={{ background: TEAL }}
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  <item.icon
                    className={`flex-shrink-0 ${collapsed ? 'w-5 h-5' : 'w-[18px] h-[18px]'}`}
                    style={{ color: isActive ? TEAL : undefined }}
                  />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }}
                        className="text-sm overflow-hidden whitespace-nowrap font-body"
                        style={{ fontFamily: 'var(--font-body)', fontWeight: isActive ? 500 : 400 }}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Back to stations */}
        <div className="px-3 py-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={() => navigate('/select-station')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-white/30 hover:text-white/60 hover:bg-white/5 ${collapsed ? 'justify-center px-0' : ''}`}
          >
            <ArrowLeft className="w-[18px] h-[18px] flex-shrink-0" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }}
                  className="text-sm font-body overflow-hidden whitespace-nowrap"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Retour aux stations
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* Collapse */}
        <div className="hidden lg:block px-3 py-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`flex items-center gap-3 px-3 py-2.5 w-full rounded-xl transition-colors text-white/30 hover:text-white/60 hover:bg-white/5 ${collapsed ? 'justify-center px-0' : ''}`}
          >
            <ChevronLeft
              className="w-[18px] h-[18px] transition-transform duration-300"
              style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
            {!collapsed && <span className="text-sm font-body" style={{ fontFamily: 'var(--font-body)' }}>Réduire</span>}
          </button>
        </div>

        {/* User info */}
        <div className="px-3 py-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : 'px-2'}`}>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
              style={{ background: TEAL }}
            >
              {initials}
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }}
                  className="overflow-hidden flex-1 min-w-0"
                >
                  <p className="text-sm font-medium text-white truncate font-body" style={{ fontFamily: 'var(--font-body)' }}>
                    {user ? `${user.prenom} ${user.nom}` : '—'}
                  </p>
                  <p className="text-xs truncate font-body" style={{ color: WASH, opacity: 0.4, fontFamily: 'var(--font-body)' }}>
                    {user ? roleLabel[user.role as UserRole] : ''}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
            {!collapsed && (
              <button onClick={handleLogout} className="text-white/30 hover:text-red-400 transition-colors flex-shrink-0" title="Déconnexion">
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.aside>

      {/* ── Main area ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-16 border-b border-edge bg-panel flex items-center justify-between px-4 sm:px-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden text-ink-muted hover:text-ink transition-colors">
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="font-heading font-bold text-ink text-lg" style={{ letterSpacing: '-0.01em' }}>{pageTitle}</h2>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden md:flex items-center gap-2 text-sm text-ink-muted">
                <span className="font-medium text-ink font-body" style={{ fontFamily: 'var(--font-body)' }}>
                  {user.prenom} {user.nom}
                </span>
                <span
                  className="text-xs px-2.5 py-1 rounded-full font-medium font-body"
                  style={{ background: WASH, color: NAVY, fontFamily: 'var(--font-body)' }}
                >
                  {roleLabel[user.role as UserRole] ?? user.role}
                </span>
              </div>
            )}
            <button
              onClick={toggle}
              className="text-ink-muted hover:text-ink transition-colors p-2 rounded-xl hover:bg-raised"
              title={isDark ? 'Mode clair' : 'Mode sombre'}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <ChatWidget />
    </div>
  )
}
