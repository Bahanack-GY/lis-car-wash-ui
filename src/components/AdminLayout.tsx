import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, UserCheck, AlertTriangle, Building2,
  ScrollText, LogOut, ChevronLeft, Menu, Sun, Moon, ArrowLeft,
} from 'lucide-react'
import Logo from '@/assets/Logo.png'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth, type UserRole } from '@/contexts/AuthContext'
import ChatWidget from '@/components/ChatWidget'

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
  '/global-dashboard': 'Vue d\'ensemble',
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

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={`
          fixed lg:relative z-50 h-full flex flex-col
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          transition-transform duration-300 ease-in-out
          bg-panel border-r border-edge
        `}
        animate={{ width: collapsed ? 80 : 272 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-edge shrink-0">
          <img src={Logo} alt="LIS" className="w-9 h-9 rounded-lg object-contain shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <h1 className="font-heading font-bold text-base text-ink leading-tight">LIS Car Wash</h1>
                <p className="text-[11px] text-ink-muted leading-tight">Administration globale</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                  isActive ? 'bg-accent-wash text-accent' : 'text-ink-faded hover:text-ink hover:bg-raised'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="admin-sidebar-active"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-teal-500 rounded-r-full"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  <item.icon className="w-[20px] h-[20px] shrink-0" />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className="text-sm font-medium overflow-hidden whitespace-nowrap"
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
        <div className="px-3 py-2 border-t border-edge">
          <button
            onClick={() => navigate('/select-station')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-ink-muted hover:text-ink hover:bg-raised transition-colors"
          >
            <ArrowLeft className="w-[20px] h-[20px] shrink-0" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="text-sm font-medium overflow-hidden whitespace-nowrap"
                >
                  Retour aux stations
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* Collapse */}
        <div className="hidden lg:block px-3 py-2 border-t border-edge">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-ink-muted hover:text-ink hover:bg-raised transition-colors"
          >
            <ChevronLeft className={`w-[20px] h-[20px] transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
            {!collapsed && <span className="text-sm">Réduire</span>}
          </button>
        </div>

        {/* User info */}
        <div className="px-3 py-4 border-t border-edge shrink-0">
          <div className="flex items-center gap-3 px-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white font-bold text-xs shrink-0">
              {initials}
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="overflow-hidden flex-1 min-w-0"
                >
                  <p className="text-sm font-medium text-ink truncate">{user ? `${user.prenom} ${user.nom}` : '—'}</p>
                  <p className="text-xs text-ink-muted truncate">{user ? roleLabel[user.role as UserRole] : ''}</p>
                </motion.div>
              )}
            </AnimatePresence>
            {!collapsed && (
              <button onClick={handleLogout} className="text-ink-muted hover:text-red-500 transition-colors shrink-0" title="Déconnexion">
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="h-16 border-b border-edge bg-panel flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden text-ink-muted hover:text-ink transition-colors">
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="font-heading font-semibold text-ink text-lg">{pageTitle}</h2>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden md:flex items-center gap-2 text-sm text-ink-muted">
                <span className="font-medium text-ink">{user.prenom} {user.nom}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-accent-wash text-accent font-medium">
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

        <main className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
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
