import { useState, useRef, useEffect, useMemo } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, CalendarDays, ClipboardList, Ticket, CreditCard,
  Users, Package, UserCog, Building2, Search, Bell, LogOut,
  ChevronLeft, Menu, Plus, Sun, Moon, Star, Droplets, Sparkles, MapPin, Check, ChevronsUpDown, Clock, AlertTriangle,
  Megaphone, BarChart3, ScrollText, Ban, Info, ShieldAlert, Zap, AlertCircle, CheckCircle2, Gift, Trophy,
} from '@/lib/icons'
import Logo from '@/assets/Logo.png'
import TrophyManager from '@/components/TrophyManager'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth, type UserRole } from '@/contexts/AuthContext'
import ChatWidget from '@/components/ChatWidget'
import { useStations } from '@/api/stations'
import { useActiveIncidentsByStation, useIncidents, useUpdateIncident } from '@/api/incidents'
import type { Incident, IncidentSeverity } from '@/api/incidents'
import toast from 'react-hot-toast'

// ── Brand palette ────────────────────────────────────────────────────────
const NAVY   = '#283852'
const NAVY_L = '#34496a'
const TEAL   = '#33cbcc'
const WASH   = '#e3f6f6'

interface NavItem {
  path: string
  label: string
  icon: React.ElementType
  roles: UserRole[]
}

const allNavItems: NavItem[] = [
  { path: '/dashboard',     label: 'Tableau de bord',  icon: LayoutDashboard, roles: ['super_admin', 'manager', 'comptable'] },
  { path: '/nouveau-lavage',label: 'Nouveau Lavage',    icon: Plus,            roles: ['super_admin', 'manager', 'controleur'] },
  { path: '/reservations',  label: 'Réservations',      icon: CalendarDays,    roles: ['super_admin', 'manager', 'controleur', 'caissiere'] },
  { path: '/fiches-piste',  label: 'Fiches de Piste',   icon: ClipboardList,   roles: ['super_admin', 'manager', 'controleur'] },
  { path: '/coupons',       label: 'Coupons',           icon: Ticket,          roles: ['super_admin', 'manager', 'controleur', 'caissiere', 'comptable'] },
  { path: '/caisse',        label: 'Caisse',            icon: CreditCard,      roles: ['super_admin', 'manager', 'caissiere', 'comptable'] },
  { path: '/depenses',      label: 'Dépenses',          icon: CreditCard,      roles: ['super_admin', 'manager', 'caissiere', 'comptable'] },
  { path: '/bons-lavage',   label: 'Bons de Lavage',    icon: Gift,            roles: ['super_admin', 'manager'] },
  { path: '/clients',       label: 'Clients',           icon: Users,           roles: ['super_admin', 'manager', 'controleur', 'caissiere'] },
  { path: '/inventaire',    label: 'Inventaire',        icon: Package,         roles: ['super_admin', 'manager'] },
  { path: '/incidents',     label: 'Incidents',          icon: AlertTriangle,   roles: ['super_admin', 'manager'] },
  { path: '/types-lavage',  label: 'Types de Lavage',   icon: Droplets,        roles: ['super_admin', 'manager'] },
  { path: '/services-speciaux', label: 'Services Spé.', icon: Sparkles,        roles: ['super_admin', 'manager'] },
  { path: '/employes',      label: 'Employés',          icon: UserCog,         roles: ['super_admin', 'manager'] },
  { path: '/marketing',     label: 'Marketing',         icon: Megaphone,       roles: ['super_admin', 'manager'] },
  { path: '/stations',      label: 'Stations',          icon: Building2,       roles: ['super_admin'] },
  { path: '/audit-logs',   label: "Journal d'audit",   icon: ScrollText,      roles: ['super_admin'] },
  { path: '/mon-espace',    label: 'Mon Espace',        icon: Star,            roles: ['laveur'] },
  { path: '/espace-commercial', label: 'Espace Commercial', icon: Megaphone,   roles: ['commercial'] },
  { path: '/commercial-analytics', label: 'Mes Statistiques', icon: BarChart3, roles: ['commercial'] },
  { path: '/classement',    label: 'Classement',         icon: Trophy,          roles: ['laveur', 'commercial', 'controleur', 'super_admin', 'manager'] },
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

const severityConfig: Record<IncidentSeverity, { label: string; color: string; bg: string; icon: React.ElementType; gradient: string }> = {
  low:      { label: 'Faible',   color: 'text-blue-600',   bg: 'bg-blue-500/10',   icon: Info,        gradient: 'from-blue-500 to-sky-500' },
  medium:   { label: 'Moyen',    color: 'text-amber-600',  bg: 'bg-amber-500/10',  icon: AlertCircle, gradient: 'from-amber-500 to-yellow-500' },
  high:     { label: 'Élevé',    color: 'text-orange-600', bg: 'bg-orange-500/10', icon: ShieldAlert, gradient: 'from-orange-500 to-red-400' },
  critical: { label: 'Critique', color: 'text-red-600',    bg: 'bg-red-500/10',    icon: Zap,         gradient: 'from-red-600 to-red-500' },
}

const formatIncidentDate = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [stationDropdownOpen, setStationDropdownOpen] = useState(false)
  const [stationSearch, setStationSearch] = useState('')
  const stationDropdownRef = useRef<HTMLDivElement>(null)
  const stationSearchRef = useRef<HTMLInputElement>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const { isDark, toggle } = useTheme()
  const { user, logout, hasRole, selectedStationId, setStation } = useAuth()
  const { data: stationsList } = useStations()
  const stations = stationsList || []
  const { data: incidentStatusMap } = useActiveIncidentsByStation()
  const currentStation = stations.find(s => s.id === selectedStationId)

  const [incidentModalDismissed, setIncidentModalDismissed] = useState(false)

  const { data: stationIncidentsData } = useIncidents(
    selectedStationId ? { stationId: selectedStationId, limit: 50 } : undefined,
  )
  const updateIncident = useUpdateIncident()

  const activeIncidents: Incident[] = useMemo(() => {
    if (!stationIncidentsData) return []
    const list = Array.isArray(stationIncidentsData)
      ? stationIncidentsData
      : (stationIncidentsData as any).data ?? []
    return list.filter((i: Incident) => i.statut !== 'resolved')
  }, [stationIncidentsData])

  const showIncidentModal =
    activeIncidents.length > 0 &&
    !incidentModalDismissed &&
    !!selectedStationId &&
    hasRole('super_admin', 'manager', 'controleur')

  const handleResolveIncident = (id: number) => {
    updateIncident.mutate(
      { id, data: { statut: 'resolved', resolvedAt: new Date().toISOString() } },
      { onSuccess: () => toast.success('Incident résolu'), onError: () => toast.error('Erreur lors de la mise à jour') },
    )
  }

  const filteredStations = useMemo(() => {
    if (!stationSearch.trim()) return stations
    const q = stationSearch.toLowerCase()
    return stations.filter(
      (s) => s.nom.toLowerCase().includes(q) || s.town.toLowerCase().includes(q) || s.adresse.toLowerCase().includes(q),
    )
  }, [stations, stationSearch])

  const activeStations = useMemo(() => filteredStations.filter(s => s.status === 'active'), [filteredStations])
  const otherStations = useMemo(() => filteredStations.filter(s => s.status !== 'active'), [filteredStations])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (stationDropdownRef.current && !stationDropdownRef.current.contains(e.target as Node)) {
        setStationDropdownOpen(false)
        setStationSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (stationDropdownOpen && stationSearchRef.current) {
      setTimeout(() => stationSearchRef.current?.focus(), 50)
    }
  }, [stationDropdownOpen])

  const navItems = allNavItems.filter((item) =>
    user ? item.roles.includes(user.role as UserRole) : false
  )

  const canCreateWash = hasRole('super_admin', 'manager', 'controleur')
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
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Incident modal ───────────────────────────── */}
      <AnimatePresence>
        {showIncidentModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="relative bg-panel border border-edge rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
            >
              <div className="px-6 pt-6 pb-4 border-b border-edge flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-red-500/10">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-ink text-base">Incidents actifs</h3>
                    <p className="text-xs text-ink-muted mt-0.5 font-body">
                      {currentStation?.nom ?? 'Station'} — {activeIncidents.length} non résolu{activeIncidents.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                {activeIncidents.map((incident) => {
                  const sev = severityConfig[incident.severity]
                  const SevIcon = sev.icon
                  return (
                    <div key={incident.id} className="bg-inset border border-edge rounded-xl p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`p-1 rounded-lg bg-gradient-to-br ${sev.gradient}`}>
                            <SevIcon className="w-3.5 h-3.5 text-white" />
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-semibold font-body ${sev.bg} ${sev.color}`}>
                            {sev.label}
                          </span>
                          {incident.stopsActivity && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold font-body bg-red-500/10 text-red-600 border border-red-500/20">
                              <Ban className="w-2.5 h-2.5" />
                              Arrête l'activité
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-ink-muted font-body">{formatIncidentDate(incident.dateDeclaration)}</span>
                      </div>
                      <p className="text-sm text-ink line-clamp-2 font-body">{incident.description}</p>
                      <button
                        onClick={() => handleResolveIncident(incident.id)}
                        disabled={updateIncident.isPending}
                        className="w-full flex items-center justify-center gap-1.5 text-xs font-medium font-body py-2 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Marquer comme résolu
                      </button>
                    </div>
                  )
                })}
              </div>

              <div className="px-6 py-4 border-t border-edge flex-shrink-0">
                <button
                  onClick={() => setIncidentModalDismissed(true)}
                  className="w-full py-2.5 rounded-xl text-sm font-medium font-body text-ink-muted hover:text-ink bg-raised hover:bg-inset border border-edge transition-colors"
                >
                  Les incidents sont toujours actifs
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sidebar — Navy ───────────────────────────── */}
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
        <div
          className="flex items-center gap-3 px-4 h-16 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex-shrink-0">
            {collapsed ? (
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(51,203,204,0.15)' }}
              >
                <img src={Logo} alt="LIS" className="w-5 h-5 object-contain" />
              </div>
            ) : (
              <img src={Logo} alt="LIS" className="w-9 h-9 object-contain" />
            )}
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <h1 className="font-heading font-bold text-sm leading-tight text-white">LIS Car Wash</h1>
                <p className="text-[10px] leading-tight font-body" style={{ color: WASH, opacity: 0.5 }}>
                  Système de gestion
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* CTA — Nouveau Lavage */}
        {canCreateWash && (
          <div className="px-3 pt-4 pb-2">
            <button
              onClick={() => { navigate('/nouveau-lavage'); setMobileOpen(false) }}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-body font-semibold text-sm transition-all ${collapsed ? 'px-0' : 'px-4'}`}
              style={{
                background: TEAL,
                color: '#fff',
                boxShadow: `0 4px 12px rgba(51,203,204,0.3)`,
              }}
            >
              <Plus className="w-4 h-4 flex-shrink-0" />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    Nouveau Lavage
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        )}

        {/* Nav */}
        <nav className={`flex-1 py-2 px-2 space-y-0.5 overflow-y-auto sidebar-scroll ${!canCreateWash ? 'pt-4' : ''}`}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'text-white'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                } ${collapsed ? 'justify-center px-0' : ''}`
              }
              style={({ isActive }) => ({
                background: isActive ? 'rgba(51,203,204,0.18)' : undefined,
              })}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
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
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className="text-sm overflow-hidden whitespace-nowrap font-body"
                        style={{ fontWeight: isActive ? 500 : 400 }}
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

        {/* Station Switcher */}
        {stations.length > 0 && (
          <div
            className="px-3 py-2"
            style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
            ref={stationDropdownRef}
          >
            <div className="relative">
              <button
                onClick={() => {
                  setStationDropdownOpen(!stationDropdownOpen)
                  if (stationDropdownOpen) setStationSearch('')
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-200 ${
                  stationDropdownOpen
                    ? 'border-teal-400/40 bg-white/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                } ${collapsed ? 'justify-center' : ''}`}
              >
                <div className="relative flex-shrink-0">
                  <MapPin className="w-[18px] h-[18px]" style={{ color: currentStation ? TEAL : 'rgba(255,255,255,0.4)' }} />
                  {currentStation?.status === 'active' && (() => {
                    const iStatus = selectedStationId ? incidentStatusMap?.[selectedStationId] : undefined
                    const dotColor = iStatus?.hasStoppingIncident
                      ? '#ef4444'
                      : iStatus?.hasNonStoppingIncident ? '#f59e0b' : '#22c55e'
                    return (
                      <span
                        className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border"
                        style={{ background: dotColor, borderColor: NAVY }}
                      />
                    )
                  })()}
                </div>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.div
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="flex-1 min-w-0 text-left overflow-hidden"
                    >
                      <p className="text-[10px] font-medium uppercase tracking-wider leading-none mb-0.5 font-body" style={{ color: WASH, opacity: 0.4 }}>
                        Station
                      </p>
                      <p className="text-sm font-medium text-white truncate font-body">
                        {currentStation?.nom || 'Aucune station'}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
                {!collapsed && <ChevronsUpDown className="w-4 h-4 flex-shrink-0 text-white/30" />}
              </button>

              <AnimatePresence>
                {stationDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className={`absolute bottom-full mb-1 bg-panel border border-edge rounded-xl shadow-xl overflow-hidden z-50 ${
                      collapsed ? 'left-0 w-64' : 'left-0 right-0'
                    }`}
                  >
                    {stations.length > 5 && (
                      <div className="p-2 border-b border-edge">
                        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-inset rounded-lg border border-edge">
                          <Search className="w-3.5 h-3.5 text-ink-muted flex-shrink-0" />
                          <input
                            ref={stationSearchRef}
                            type="text"
                            value={stationSearch}
                            onChange={(e) => setStationSearch(e.target.value)}
                            placeholder="Rechercher..."
                            className="bg-transparent text-sm text-ink placeholder-ink-muted outline-none w-full font-body"
                          />
                        </div>
                      </div>
                    )}
                    <div className="p-1.5 max-h-72 overflow-y-auto">
                      {filteredStations.length === 0 ? (
                        <p className="text-xs text-ink-muted text-center py-3 font-body">Aucun résultat</p>
                      ) : (
                        <>
                          {activeStations.map((s) => {
                            const isSelected = s.id === selectedStationId
                            const sIncident = incidentStatusMap?.[s.id]
                            const dotColor = sIncident?.hasStoppingIncident ? '#ef4444'
                              : sIncident?.hasNonStoppingIncident ? '#f59e0b' : '#22c55e'
                            return (
                              <button
                                key={s.id}
                                onClick={() => { setStation(s.id); setStationDropdownOpen(false); setStationSearch('') }}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                                  isSelected ? 'bg-accent-wash text-accent' : 'text-ink-faded hover:text-ink hover:bg-raised'
                                }`}
                              >
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dotColor }} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate font-body">{s.nom}</p>
                                  <p className="text-xs text-ink-muted truncate font-body">{s.town}</p>
                                </div>
                                {isSelected && <Check className="w-4 h-4 text-accent flex-shrink-0" />}
                              </button>
                            )
                          })}
                          {activeStations.length > 0 && otherStations.length > 0 && (
                            <div className="my-1 mx-3 border-t border-edge" />
                          )}
                          {otherStations.map((s) => (
                            <div key={s.id} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg opacity-40 cursor-not-allowed">
                              <Clock className="w-3.5 h-3.5 text-ink-muted flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-ink-muted truncate font-body">{s.nom}</p>
                                <p className="text-xs text-ink-muted truncate font-body">{s.town}</p>
                              </div>
                              <span className="text-[10px] text-ink-muted font-medium uppercase font-body">
                                {s.status === 'upcoming' ? 'Bientôt' : 'Inactive'}
                              </span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Collapse */}
        <div
          className="hidden lg:block px-3 py-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
        >
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`flex items-center gap-3 px-3 py-2.5 w-full rounded-xl transition-colors text-white/30 hover:text-white/60 hover:bg-white/5 ${collapsed ? 'justify-center px-0' : ''}`}
          >
            <ChevronLeft
              className="w-[18px] h-[18px] transition-transform duration-300"
              style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
            {!collapsed && <span className="text-sm font-body">Réduire</span>}
          </button>
        </div>

        {/* User info */}
        <div
          className="px-3 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : 'px-2'}`}>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs flex-shrink-0 font-body"
              style={{ background: TEAL }}
            >
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
                  <p className="text-sm font-medium text-white truncate font-body">
                    {user ? `${user.prenom} ${user.nom}` : '—'}
                  </p>
                  <p className="text-xs truncate font-body" style={{ color: WASH, opacity: 0.4 }}>
                    {user ? roleLabel[user.role as UserRole] : ''}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
            {!collapsed && (
              <button
                onClick={handleLogout}
                className="text-white/30 hover:text-red-400 transition-colors flex-shrink-0"
                title="Déconnexion"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.aside>

      {/* ── Main area ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Top bar */}
        <header className="h-16 border-b border-edge bg-panel flex items-center justify-between px-4 sm:px-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden text-ink-muted hover:text-ink transition-colors">
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="font-heading font-bold text-ink text-lg" style={{ letterSpacing: '-0.01em' }}>
              {pageTitle}
            </h2>
          </div>

          <div className="flex items-center gap-3">


            <button
              onClick={toggle}
              className="text-ink-muted hover:text-ink transition-colors p-2 rounded-xl hover:bg-raised"
              title={isDark ? 'Mode clair' : 'Mode sombre'}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button className="relative text-ink-muted hover:text-ink transition-colors p-2 rounded-xl hover:bg-raised">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: TEAL }} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
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

      {hasRole('super_admin', 'manager', 'comptable') && <ChatWidget />}
      <TrophyManager />
    </div>
  )
}
