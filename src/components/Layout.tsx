import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, CalendarDays, ClipboardList, Ticket, CreditCard,
  Users, Package, UserCog, Building2, Search, Bell, LogOut,
  ChevronLeft, Menu, Plus, Sun, Moon, Star, Droplets,
} from 'lucide-react'
import Logo from '@/assets/Logo.png'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth, type UserRole } from '@/contexts/AuthContext'

interface NavItem {
  path: string
  label: string
  icon: React.ElementType
  roles: UserRole[]
}

const allNavItems: NavItem[] = [
  { path: '/dashboard',     label: 'Tableau de bord',  icon: LayoutDashboard, roles: ['super_admin', 'manager'] },
  { path: '/nouveau-lavage',label: 'Nouveau Lavage',    icon: Plus,            roles: ['super_admin', 'manager', 'controleur'] },
  { path: '/reservations',  label: 'Réservations',      icon: CalendarDays,    roles: ['super_admin', 'manager', 'controleur', 'caissiere'] },
  { path: '/fiches-piste',  label: 'Fiches de Piste',   icon: ClipboardList,   roles: ['super_admin', 'manager', 'controleur'] },
  { path: '/coupons',       label: 'Coupons',           icon: Ticket,          roles: ['super_admin', 'manager', 'controleur', 'caissiere'] },
  { path: '/caisse',        label: 'Caisse',            icon: CreditCard,      roles: ['super_admin', 'manager', 'caissiere'] },
  { path: '/clients',       label: 'Clients',           icon: Users,           roles: ['super_admin', 'manager', 'controleur', 'caissiere'] },
  { path: '/inventaire',    label: 'Inventaire',        icon: Package,         roles: ['super_admin', 'manager'] },
  { path: '/types-lavage',  label: 'Types de Lavage',   icon: Droplets,        roles: ['super_admin', 'manager'] },
  { path: '/employes',      label: 'Employés',          icon: UserCog,         roles: ['super_admin', 'manager'] },
  { path: '/stations',      label: 'Stations',          icon: Building2,       roles: ['super_admin'] },
  { path: '/mon-espace',    label: 'Mon Espace',        icon: Star,            roles: ['laveur'] },
]

const roleLabel: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  manager: 'Manager',
  controleur: 'Contrôleur',
  caissiere: 'Caissière',
  laveur: 'Laveur',
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { isDark, toggle } = useTheme()
  const { user, logout, hasRole } = useAuth()

  const navItems = allNavItems.filter((item) =>
    user ? item.roles.includes(user.role as UserRole) : false
  )

  // Hide the "Nouveau Lavage" CTA button for roles that can't access that page
  const canCreateWash = hasRole('super_admin', 'manager', 'controleur')

  // "Nouveau Lavage" is in nav for controleur, so deduplicate from CTA
  const currentPage = navItems.find((i) => location.pathname.startsWith(i.path))
  const pageTitle = currentPage?.label ?? 'Mon Espace'

  const initials = user ? `${user.prenom[0]}${user.nom[0]}` : '?'

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
        <div className="flex items-center gap-3 px-5 h-16 border-b border-edge flex-shrink-0">
          <img src={Logo} alt="LIS" className="w-9 h-9 rounded-lg object-contain flex-shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <h1 className="font-heading font-bold text-base text-ink leading-tight">LIS Car Wash</h1>
                <p className="text-[11px] text-ink-muted leading-tight">Système de gestion</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* New Wash CTA — only for roles that can create a wash */}
        {canCreateWash && (
          <div className="px-3 pt-4 pb-2">
            <button
              onClick={() => { navigate('/nouveau-lavage'); setMobileOpen(false) }}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold text-sm shadow-lg shadow-teal-500/25 hover:shadow-teal-500/35 transition-all ${collapsed ? 'px-0' : 'px-4'}`}
            >
              <Plus className="w-4 h-4 flex-shrink-0" />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="overflow-hidden whitespace-nowrap">
                    Nouveau Lavage
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        )}

        {/* Nav */}
        <nav className={`flex-1 py-2 px-3 space-y-0.5 overflow-y-auto ${!canCreateWash ? 'pt-4' : ''}`}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
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
                      layoutId="sidebar-active"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-teal-500 rounded-r-full"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  <item.icon className="w-[20px] h-[20px] flex-shrink-0" />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="text-sm font-medium overflow-hidden whitespace-nowrap">
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </>
              )}
            </NavLink>
          ))}
        </nav>

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
        <div className="px-3 py-4 border-t border-edge flex-shrink-0">
          <div className="flex items-center gap-3 px-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
              {initials}
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="overflow-hidden flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{user ? `${user.prenom} ${user.nom}` : '—'}</p>
                  <p className="text-xs text-ink-muted truncate">{user ? roleLabel[user.role as UserRole] : ''}</p>
                </motion.div>
              )}
            </AnimatePresence>
            {!collapsed && (
              <button onClick={handleLogout} className="text-ink-muted hover:text-red-500 transition-colors flex-shrink-0" title="Déconnexion">
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="h-16 border-b border-edge bg-panel flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden text-ink-muted hover:text-ink transition-colors">
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="font-heading font-semibold text-ink text-lg">{pageTitle}</h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 bg-inset rounded-xl px-4 py-2 border border-edge focus-within:border-teal-500/40 transition-colors">
              <Search className="w-4 h-4 text-ink-muted" />
              <input type="text" placeholder="Rechercher..." className="bg-transparent text-sm text-ink placeholder-ink-muted outline-none w-44" />
            </div>

            <button
              onClick={toggle}
              className="text-ink-muted hover:text-ink transition-colors p-2 rounded-xl hover:bg-raised"
              title={isDark ? 'Mode clair' : 'Mode sombre'}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button className="relative text-ink-muted hover:text-ink transition-colors p-2 rounded-xl hover:bg-raised">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-teal-500 rounded-full" />
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
    </div>
  )
}
