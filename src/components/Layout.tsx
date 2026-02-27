import { useState, useRef, useEffect, useMemo } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, CalendarDays, ClipboardList, Ticket, CreditCard,
  Users, Package, UserCog, Building2, Search, Bell, LogOut,
  ChevronLeft, Menu, Plus, Sun, Moon, Star, Droplets, Sparkles, MapPin, Check, ChevronsUpDown, Clock, AlertTriangle,
  Megaphone, BarChart3, ScrollText, Ban, Info, ShieldAlert, Zap, AlertCircle, CheckCircle2, Gift,
} from 'lucide-react'
import Logo from '@/assets/Logo.png'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth, type UserRole } from '@/contexts/AuthContext'
import ChatWidget from '@/components/ChatWidget'
import { useStations } from '@/api/stations'
import { useActiveIncidentsByStation, useIncidents, useUpdateIncident } from '@/api/incidents'
import type { Incident, IncidentSeverity } from '@/api/incidents'
import toast from 'react-hot-toast'

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
  { path: '/services-speciaux', label: 'Services Spé.', icon: Sparkles,    roles: ['super_admin', 'manager'] },
  { path: '/employes',      label: 'Employés',          icon: UserCog,         roles: ['super_admin', 'manager'] },
  { path: '/marketing',     label: 'Marketing',         icon: Megaphone,       roles: ['super_admin', 'manager'] },
  { path: '/stations',      label: 'Stations',          icon: Building2,       roles: ['super_admin'] },
  { path: '/audit-logs',   label: "Journal d'audit",   icon: ScrollText,      roles: ['super_admin'] },
  { path: '/mon-espace',    label: 'Mon Espace',        icon: Star,            roles: ['laveur'] },
  { path: '/espace-commercial', label: 'Espace Commercial', icon: Megaphone,     roles: ['commercial'] },
  { path: '/commercial-analytics', label: 'Mes Statistiques', icon: BarChart3,   roles: ['commercial'] },
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

/* ─── Severity config for incident modal ──────────────────────────── */
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

  // ─── Incident check modal ──────────────────────────────────────────
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
      (s) =>
        s.nom.toLowerCase().includes(q) ||
        s.town.toLowerCase().includes(q) ||
        s.adresse.toLowerCase().includes(q),
    )
  }, [stations, stationSearch])

  const activeStations = useMemo(() => filteredStations.filter(s => s.status === 'active'), [filteredStations])
  const otherStations = useMemo(() => filteredStations.filter(s => s.status !== 'active'), [filteredStations])

  // Close dropdown on outside click
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

  // Focus search when dropdown opens
  useEffect(() => {
    if (stationDropdownOpen && stationSearchRef.current) {
      setTimeout(() => stationSearchRef.current?.focus(), 50)
    }
  }, [stationDropdownOpen])

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

      {/* Incident check modal */}
      <AnimatePresence>
        {showIncidentModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="relative bg-panel border border-edge rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 pt-6 pb-4 border-b border-edge flex-shrink-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 rounded-xl bg-red-500/10">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-ink text-base">
                      Incidents actifs sur votre station
                    </h3>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {currentStation?.nom ?? 'Station'} — {activeIncidents.length} incident{activeIncidents.length > 1 ? 's' : ''} non résolu{activeIncidents.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* Incident list */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                {activeIncidents.map((incident) => {
                  const sev = severityConfig[incident.severity]
                  const SevIcon = sev.icon
                  return (
                    <div
                      key={incident.id}
                      className="bg-inset border border-edge rounded-xl p-4 space-y-2.5"
                    >
                      {/* Severity + date row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`p-1 rounded-lg bg-gradient-to-br ${sev.gradient}`}>
                            <SevIcon className="w-3.5 h-3.5 text-white" />
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-semibold ${sev.bg} ${sev.color}`}>
                            {sev.label}
                          </span>
                          {incident.stopsActivity && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-red-500/10 text-red-600 border border-red-500/20">
                              <Ban className="w-2.5 h-2.5" />
                              Arrête l'activité
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-ink-muted">{formatIncidentDate(incident.dateDeclaration)}</span>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-ink line-clamp-2">{incident.description}</p>

                      {/* Resolve button */}
                      <button
                        onClick={() => handleResolveIncident(incident.id)}
                        disabled={updateIncident.isPending}
                        className="w-full flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Marquer comme résolu
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-edge flex-shrink-0">
                <button
                  onClick={() => setIncidentModalDismissed(true)}
                  className="w-full py-2.5 rounded-xl text-sm font-medium text-ink-muted hover:text-ink bg-raised hover:bg-inset border border-edge transition-colors"
                >
                  Les incidents sont toujours actifs
                </button>
              </div>
            </motion.div>
          </motion.div>
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

        {/* Station Switcher */}
        {stations.length > 0 && (
          <div className="px-3 py-2 border-t border-edge" ref={stationDropdownRef}>
            <div className="relative">
              <button
                onClick={() => {
                  setStationDropdownOpen(!stationDropdownOpen)
                  if (stationDropdownOpen) setStationSearch('')
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-200 ${
                  stationDropdownOpen
                    ? 'border-teal-500/40 bg-accent-wash'
                    : 'border-edge bg-inset hover:border-outline'
                }`}
              >
                <div className="relative flex-shrink-0">
                  <MapPin className={`w-[20px] h-[20px] ${currentStation ? 'text-accent' : 'text-ink-muted'}`} />
                  {currentStation?.status === 'active' && (() => {
                    const iStatus = selectedStationId ? incidentStatusMap?.[selectedStationId] : undefined
                    const dotColor = iStatus?.hasStoppingIncident
                      ? 'bg-red-500'
                      : iStatus?.hasNonStoppingIncident
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    return <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 ${dotColor} rounded-full border border-panel`} />
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
                      <p className="text-xs font-medium text-ink-faded uppercase tracking-wider leading-none mb-0.5">Station</p>
                      <p className="text-sm font-medium text-ink truncate">
                        {currentStation?.nom || 'Aucune station'}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
                {!collapsed && (
                  <ChevronsUpDown className="w-4 h-4 text-ink-muted flex-shrink-0" />
                )}
              </button>

              <AnimatePresence>
                {stationDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className={`absolute bottom-full mb-1 bg-panel border border-edge rounded-xl shadow-xl shadow-black/10 overflow-hidden z-50 ${
                      collapsed ? 'left-0 w-64' : 'left-0 right-0'
                    }`}
                  >
                    {/* Search */}
                    {stations.length > 5 && (
                      <div className="p-2 border-b border-edge">
                        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-inset rounded-lg border border-edge focus-within:border-teal-500/40 transition-colors">
                          <Search className="w-3.5 h-3.5 text-ink-muted flex-shrink-0" />
                          <input
                            ref={stationSearchRef}
                            type="text"
                            value={stationSearch}
                            onChange={(e) => setStationSearch(e.target.value)}
                            placeholder="Rechercher..."
                            className="bg-transparent text-sm text-ink placeholder-ink-muted outline-none w-full"
                          />
                        </div>
                      </div>
                    )}

                    <div className="p-1.5 max-h-72 overflow-y-auto">
                      {filteredStations.length === 0 ? (
                        <p className="text-xs text-ink-muted text-center py-3">Aucun résultat</p>
                      ) : (
                        <>
                          {/* Active stations */}
                          {activeStations.map((s) => {
                            const isSelected = s.id === selectedStationId
                            const sIncident = incidentStatusMap?.[s.id]
                            const dotColor = sIncident?.hasStoppingIncident
                              ? 'bg-red-500'
                              : sIncident?.hasNonStoppingIncident
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            return (
                              <button
                                key={s.id}
                                onClick={() => {
                                  setStation(s.id)
                                  setStationDropdownOpen(false)
                                  setStationSearch('')
                                }}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                                  isSelected
                                    ? 'bg-accent-wash text-accent'
                                    : 'text-ink-faded hover:text-ink hover:bg-raised'
                                }`}
                              >
                                <span className="relative flex h-2 w-2 flex-shrink-0">
                                  <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`} />
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{s.nom}</p>
                                  <p className="text-xs text-ink-muted truncate">{s.town}</p>
                                </div>
                                {isSelected && <Check className="w-4 h-4 text-accent flex-shrink-0" />}
                              </button>
                            )
                          })}

                          {/* Separator */}
                          {activeStations.length > 0 && otherStations.length > 0 && (
                            <div className="my-1 mx-3 border-t border-edge" />
                          )}

                          {/* Inactive / upcoming stations */}
                          {otherStations.map((s) => (
                            <div
                              key={s.id}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left opacity-50 cursor-not-allowed"
                            >
                              <Clock className="w-3.5 h-3.5 text-ink-muted flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-ink-muted truncate">{s.nom}</p>
                                <p className="text-xs text-ink-muted truncate">{s.town}</p>
                              </div>
                              <span className="text-[10px] text-ink-muted font-medium uppercase">
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

      {/* AI Chatbot — restricted to decision-maker roles */}
      {hasRole('super_admin', 'manager', 'comptable') && <ChatWidget />}
    </div>
  )
}
