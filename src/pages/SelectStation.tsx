import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2, MapPin, Users, ArrowRight, LogOut, Sun, Moon, Clock, Search,
  AlertTriangle, UserCog, BarChart3, Plus, X, Shield, Check, Loader2,
  LayoutList, LayoutGrid,
} from '@/lib/icons'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'
import Logo from '@/assets/Logo.png'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { useStations, useCreateStation } from '@/api/stations'
import { useActiveIncidentsByStation } from '@/api/incidents'
import { useCreateUser, useAssignStation } from '@/api/users'

// ── Brand palette ────────────────────────────────────────────────────────
const NAVY = '#283852'
const TEAL = '#33cbcc'
const WASH = '#e3f6f6'

type StatusFilter   = 'all' | 'active' | 'inactive' | 'upcoming'
type IncidentFilter = 'all' | 'no_incident' | 'incident' | 'stopped'

const statusTabs: { key: StatusFilter; label: string }[] = [
  { key: 'all',      label: 'Toutes'   },
  { key: 'active',   label: 'Actives'  },
  { key: 'inactive', label: 'Inactives'},
  { key: 'upcoming', label: 'À venir'  },
]

const incidentTabs: { key: IncidentFilter; label: string }[] = [
  { key: 'all',         label: 'Tous'              },
  { key: 'no_incident', label: 'Sans incident'     },
  { key: 'incident',    label: 'Avec incident'     },
  { key: 'stopped',     label: 'Arrêt d\'activité' },
]

// ── Small reusable input ─────────────────────────────────────────────────
function Field({
  label, value, onChange, placeholder, type = 'text', required,
}: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; required?: boolean
}) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5 font-body" style={{ color: NAVY, fontFamily: 'var(--font-body)' }}>
        {label}{required && ' *'}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 bg-inset border border-edge rounded-xl text-ink text-sm outline-none transition-all font-body placeholder:text-ink-muted"
        style={{ fontFamily: 'var(--font-body)' }}
        onFocus={(e) => { e.target.style.borderColor = TEAL; e.target.style.boxShadow = `0 0 0 3px rgba(51,203,204,0.12)` }}
        onBlur={(e)  => { e.target.style.borderColor = ''; e.target.style.boxShadow = '' }}
      />
    </div>
  )
}

export default function SelectStation() {
  const navigate = useNavigate()
  const { isDark, toggle } = useTheme()
  const { user, logout, setStation, defaultPath } = useAuth()
  const { data: stationsData, isLoading, isError } = useStations()
  const { data: incidentStatusMap } = useActiveIncidentsByStation()

  const [view,           setView]           = useState<'table' | 'grid'>('table')
  const [search,         setSearch]         = useState('')
  const [statusFilter,   setStatusFilter]   = useState<StatusFilter>('all')
  const [incidentFilter, setIncidentFilter] = useState<IncidentFilter>('all')
  const [townFilter,     setTownFilter]     = useState('all')

  // Modal state
  const [showModal,         setShowModal]         = useState(false)
  const [modalStep,         setModalStep]         = useState<1 | 2>(1)
  const [createdStationId,  setCreatedStationId]  = useState<number | null>(null)
  const [createdStationName, setCreatedStationName] = useState('')

  const [stationForm, setStationForm] = useState({
    nom: '', adresse: '', town: '', contact: '', status: 'active' as const,
  })
  const [managerForm, setManagerForm] = useState({
    nom: '', prenom: '', email: '', telephone: '', password: '',
  })

  const createStation = useCreateStation()
  const createUser    = useCreateUser()
  const assignStation = useAssignStation()

  const stationsList = stationsData || []

  const towns = useMemo(() => {
    const set = new Set(stationsList.map(s => s.town))
    return Array.from(set).sort()
  }, [stationsList])

  const filtered = useMemo(() => {
    let list = stationsList
    if (statusFilter !== 'all')   list = list.filter(s => s.status === statusFilter)
    if (townFilter   !== 'all')   list = list.filter(s => s.town   === townFilter)
    if (incidentFilter !== 'all' && incidentStatusMap) {
      list = list.filter(s => {
        const iStatus = incidentStatusMap[s.id]
        if (incidentFilter === 'no_incident') return !iStatus
        if (incidentFilter === 'incident')    return !!iStatus
        if (incidentFilter === 'stopped')     return iStatus?.hasStoppingIncident
        return true
      })
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(s =>
        s.nom.toLowerCase().includes(q) ||
        s.adresse.toLowerCase().includes(q) ||
        s.town.toLowerCase().includes(q) ||
        (s.managerName && s.managerName.toLowerCase().includes(q)),
      )
    }
    return list
  }, [stationsList, search, statusFilter, townFilter, incidentFilter, incidentStatusMap])

  const statusCounts = useMemo(() => ({
    all:      stationsList.length,
    active:   stationsList.filter(s => s.status === 'active').length,
    inactive: stationsList.filter(s => s.status === 'inactive').length,
    upcoming: stationsList.filter(s => s.status === 'upcoming').length,
  }), [stationsList])

  useEffect(() => {
    if (user && user.role !== 'super_admin' && !(user.role === 'comptable' && user.globalAccess)) {
      navigate(defaultPath, { replace: true })
    }
  }, [user, defaultPath, navigate])

  const select = (id: number, status: string) => {
    if (status === 'active') { setStation(id); navigate(defaultPath) }
  }

  const handleLogout = () => { logout(); navigate('/') }

  const openModal = () => {
    setShowModal(true); setModalStep(1); setCreatedStationId(null); setCreatedStationName('')
    setStationForm({ nom: '', adresse: '', town: '', contact: '', status: 'active' })
    setManagerForm({ nom: '', prenom: '', email: '', telephone: '', password: '' })
  }

  const handleCreateStation = async () => {
    if (!stationForm.nom.trim() || !stationForm.adresse.trim() || !stationForm.town.trim()) {
      toast.error('Veuillez remplir tous les champs obligatoires'); return
    }
    try {
      const station = await createStation.mutateAsync(stationForm)
      setCreatedStationId(station.id); setCreatedStationName(station.nom); setModalStep(2)
      toast.success(`Station "${station.nom}" créée avec succès`)
    } catch { /* handled by interceptor */ }
  }

  const handleCreateManager = async () => {
    if (!managerForm.nom.trim() || !managerForm.prenom.trim() || !managerForm.email.trim() || !managerForm.password.trim()) {
      toast.error('Veuillez remplir tous les champs obligatoires'); return
    }
    try {
      const newUser = await createUser.mutateAsync({ ...managerForm, role: 'manager' as const })
      const today = new Date().toISOString().split('T')[0]
      await assignStation.mutateAsync({ id: newUser.id, data: { stationId: createdStationId!, dateDebut: today } })
      toast.success(`Manager ${newUser.prenom} ${newUser.nom} créé et affecté`)
      setShowModal(false)
    } catch { /* handled by interceptor */ }
  }

  const roleLabel: Record<string, string> = {
    super_admin: 'Super Administrateur',
    manager: 'Manager', controleur: 'Contrôleur', caissiere: 'Caissière',
    laveur: 'Laveur', commercial: 'Commercial', comptable: 'Comptable',
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--c-surface)' }}>

      {/* ── Decorative teal arc ─────────────────────── */}
      <div
        className="pointer-events-none fixed top-0 right-0 -translate-y-1/3 translate-x-1/3 rounded-full opacity-[0.07]"
        style={{ width: 700, height: 700, background: TEAL }}
      />

      {/* ── Top bar ─────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-panel border-b border-edge">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3.5">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: WASH }}
            >
              <img src={Logo} alt="LIS" className="w-6 h-6 object-contain" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-sm leading-tight" style={{ color: NAVY }}>
                LIS Car Wash
              </h1>
              <p className="text-[9px] tracking-widest uppercase font-body" style={{ color: TEAL, fontFamily: 'var(--font-body)' }}>
                Système de gestion
              </p>
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {/* User badge */}
            {user && (
              <div
                className="hidden sm:flex items-center gap-2.5 px-3.5 py-2 rounded-xl border font-body"
                style={{ background: WASH, borderColor: 'rgba(51,203,204,0.25)' }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-[10px]"
                  style={{ background: NAVY, fontFamily: 'var(--font-body)' }}
                >
                  {user.prenom[0]}{user.nom[0]}
                </div>
                <div>
                  <p className="text-xs font-semibold leading-none font-body" style={{ color: NAVY, fontFamily: 'var(--font-body)' }}>
                    {user.prenom} {user.nom}
                  </p>
                  <p className="text-[10px] font-medium leading-none mt-0.5 font-body" style={{ color: TEAL, fontFamily: 'var(--font-body)' }}>
                    {roleLabel[user.role] ?? user.role}
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={toggle}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-edge text-ink-muted hover:text-ink hover:bg-raised transition-colors"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium font-body text-ink-muted hover:text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────── */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10 flex flex-col gap-6 sm:gap-8">

        {/* Page heading */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-6"
        >
          <div>
            <p
              className="text-[10px] font-medium tracking-[0.2em] uppercase mb-1 font-body"
              style={{ color: TEAL, fontFamily: 'var(--font-body)' }}
            >
              Sélection de station
            </p>
            <h2
              className="font-heading font-bold"
              style={{ fontSize: 'clamp(26px, 3vw, 36px)', color: NAVY, letterSpacing: '-0.02em', lineHeight: 1.1 }}
            >
              Votre espace de travail
            </h2>
            <p
              className="mt-2 text-sm font-body"
              style={{ color: 'var(--c-ink-faded)', fontFamily: 'var(--font-body)' }}
            >
              Sélectionnez la station sur laquelle vous opérez aujourd'hui.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
            <button
              onClick={() => navigate('/global-dashboard')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold font-body border transition-all"
              style={{
                background: WASH,
                color: NAVY,
                borderColor: 'rgba(51,203,204,0.3)',
                fontFamily: 'var(--font-body)',
              }}
            >
              <BarChart3 className="w-4 h-4" style={{ color: TEAL }} />
              Dashboard global
            </button>

            {user?.role === 'super_admin' && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={openModal}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold font-body text-white transition-all"
                style={{
                  background: TEAL,
                  fontFamily: 'var(--font-body)',
                  boxShadow: `0 4px 14px rgba(51,203,204,0.35)`,
                }}
              >
                <Plus className="w-4 h-4" />
                Créer une station
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* Search + Filters */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="bg-panel border border-edge rounded-2xl p-3 flex flex-col lg:flex-row items-center gap-3"
        >
          {/* Search */}
          <div className="relative w-full lg:w-80 flex-shrink-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une station…"
              className="w-full pl-10 pr-4 py-2.5 bg-inset border border-edge rounded-xl text-sm text-ink outline-none font-body placeholder:text-ink-muted transition-all"
              style={{ fontFamily: 'var(--font-body)' }}
              onFocus={(e) => { e.target.style.borderColor = TEAL }}
              onBlur={(e)  => { e.target.style.borderColor = '' }}
            />
          </div>

          {/* Town selector */}
          {towns.length > 1 && (
            <div className="relative flex-shrink-0">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted pointer-events-none" />
              <select
                value={townFilter}
                onChange={(e) => setTownFilter(e.target.value)}
                className="appearance-none pl-9 pr-8 py-2.5 bg-inset border border-edge rounded-xl text-sm text-ink outline-none cursor-pointer font-body transition-all"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <option value="all">Toutes les villes</option>
                {towns.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}

          {/* Separator */}
          <div className="hidden lg:block h-8 w-px bg-edge flex-shrink-0" />

          {/* Status tabs */}
          <div
            className="flex p-1 rounded-xl flex-shrink-0 w-full lg:w-auto overflow-x-auto"
            style={{ background: 'var(--c-inset)' }}
          >
            {statusTabs.map((tab) => {
              const active = statusFilter === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium font-body transition-all whitespace-nowrap"
                  style={{
                    background: active ? '#ffffff' : undefined,
                    color: active ? NAVY : 'var(--c-ink-muted)',
                    fontWeight: active ? 600 : 400,
                    boxShadow: active ? '0 1px 4px rgba(40,56,82,0.1)' : undefined,
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {tab.label}
                  {statusCounts[tab.key] > 0 && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{
                        background: active ? WASH : 'rgba(0,0,0,0.06)',
                        color: active ? NAVY : 'var(--c-ink-muted)',
                      }}
                    >
                      {statusCounts[tab.key]}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Incident tabs */}
          <div
            className="flex p-1 rounded-xl flex-shrink-0 w-full lg:w-auto overflow-x-auto"
            style={{ background: 'var(--c-inset)' }}
          >
            {incidentTabs.map((tab) => {
              const active = incidentFilter === tab.key
              const activeColor =
                tab.key === 'stopped'     ? '#cc2030' :
                tab.key === 'incident'    ? '#a06000' :
                NAVY
              return (
                <button
                  key={tab.key}
                  onClick={() => setIncidentFilter(tab.key)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium font-body transition-all whitespace-nowrap"
                  style={{
                    background: active ? '#ffffff' : undefined,
                    color: active ? activeColor : 'var(--c-ink-muted)',
                    fontWeight: active ? 600 : 400,
                    boxShadow: active ? '0 1px 4px rgba(40,56,82,0.1)' : undefined,
                  }}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* View toggle */}
          <div className="hidden lg:flex items-center gap-1 p-1 rounded-xl flex-shrink-0 ml-auto" style={{ background: 'var(--c-inset)' }}>
            {([['table', LayoutList], ['grid', LayoutGrid]] as const).map(([v, Icon]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="p-2 rounded-lg transition-all"
                style={{
                  background: view === v ? '#ffffff' : undefined,
                  color: view === v ? NAVY : 'var(--c-ink-muted)',
                  boxShadow: view === v ? '0 1px 4px rgba(40,56,82,0.1)' : undefined,
                }}
                title={v === 'table' ? 'Vue tableau' : 'Vue grille'}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </motion.div>

        {/* Station grid / states */}
        {isLoading ? (
          <div className="flex-1 flex justify-center items-center py-24">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: TEAL }} />
              <p className="text-sm text-ink-muted font-body" style={{ fontFamily: 'var(--font-body)' }}>
                Chargement des stations…
              </p>
            </div>
          </div>

        ) : isError ? (
          <div className="flex-1 flex justify-center items-center py-24">
            <div className="p-8 bg-red-500/10 border border-red-500/20 rounded-2xl max-w-sm text-center">
              <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
              <h3 className="font-heading font-bold text-lg text-ink mb-1">Erreur de chargement</h3>
              <p className="text-sm text-ink-faded font-body" style={{ fontFamily: 'var(--font-body)' }}>
                Impossible de charger les stations. Veuillez réessayer.
              </p>
            </div>
          </div>

        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex justify-center items-center py-24"
          >
            <div className="text-center p-12 bg-panel border border-edge rounded-2xl max-w-sm w-full">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{ background: WASH }}
              >
                <Building2 className="w-8 h-8" style={{ color: TEAL }} />
              </div>
              <h3 className="font-heading font-bold text-xl text-ink mb-2">Aucune station trouvée</h3>
              <p className="text-sm text-ink-faded mb-6 font-body" style={{ fontFamily: 'var(--font-body)' }}>
                {search || statusFilter !== 'all'
                  ? 'Aucun résultat pour vos filtres actuels.'
                  : 'Votre réseau ne compte encore aucune station.'}
              </p>
              {!search && statusFilter === 'all' && user?.role === 'super_admin' && (
                <button
                  onClick={openModal}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white font-body transition-all"
                  style={{ background: TEAL, fontFamily: 'var(--font-body)', boxShadow: `0 4px 14px rgba(51,203,204,0.3)` }}
                >
                  <Plus className="w-4 h-4" />
                  Créer la première station
                </button>
              )}
            </div>
          </motion.div>

        ) : view === 'table' ? (
          /* ── Table view ──────────────────────────────── */
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="bg-panel border border-edge rounded-2xl overflow-hidden"
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-edge" style={{ background: 'var(--c-inset)' }}>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-ink-muted uppercase tracking-wide font-body">Station</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-ink-muted uppercase tracking-wide font-body hidden md:table-cell">Ville</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-ink-muted uppercase tracking-wide font-body">Statut</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-ink-muted uppercase tracking-wide font-body hidden lg:table-cell">Employés</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-ink-muted uppercase tracking-wide font-body hidden lg:table-cell">Manager</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-ink-muted uppercase tracking-wide font-body hidden xl:table-cell">Incidents</th>
                  <th className="w-16 px-4 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, index) => {
                  const isActive    = s.status === 'active'
                  const iStatus     = incidentStatusMap?.[s.id]
                  const hasStopping = isActive && iStatus?.hasStoppingIncident
                  const hasWarning  = isActive && !hasStopping && iStatus?.hasNonStoppingIncident
                  const empCount    = (s as any).employeeCount ?? s.activeEmployeesCount ?? 0

                  const badge = hasStopping
                    ? { bg: 'rgba(204,32,48,0.1)', color: '#cc2030', text: "À l'arrêt",    dot: '#cc2030' }
                    : hasWarning
                    ? { bg: 'rgba(160,96,0,0.1)',  color: '#a06000', text: 'Incident',      dot: '#f59e0b' }
                    : isActive
                    ? { bg: WASH,                  color: '#0f7a4a', text: 'Opérationnelle', dot: '#22c55e', ping: true }
                    : { bg: 'var(--c-inset)',       color: 'var(--c-ink-muted)', text: s.status === 'upcoming' ? 'À venir' : 'Inactive', dot: undefined }

                  const incidentBadge = hasStopping
                    ? { bg: 'rgba(204,32,48,0.08)', color: '#cc2030', text: 'Arrêt activité' }
                    : hasWarning
                    ? { bg: 'rgba(160,96,0,0.08)',  color: '#a06000', text: 'En cours'       }
                    : { bg: 'var(--c-ok-wash)',       color: 'var(--c-ok)', text: 'Aucun'    }

                  return (
                    <motion.tr
                      key={s.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => select(s.id, s.status)}
                      className={`border-b border-edge last:border-b-0 group transition-colors ${
                        isActive
                          ? 'cursor-pointer hover:bg-raised'
                          : 'opacity-50 cursor-not-allowed'
                      }`}
                    >
                      {/* Station name + address */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: isActive ? WASH : 'var(--c-inset)' }}
                          >
                            <Building2 className="w-4 h-4" style={{ color: isActive ? TEAL : 'var(--c-ink-muted)' }} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-heading font-semibold text-ink truncate" style={{ letterSpacing: '-0.01em' }}>
                              {s.nom}
                            </p>
                            <p className="text-xs text-ink-muted truncate font-body mt-0.5 flex items-center gap-1">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              {s.adresse}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Ville */}
                      <td className="px-4 py-4 hidden md:table-cell">
                        <span className="text-sm text-ink-faded font-body">{s.town}</span>
                      </td>

                      {/* Status badge */}
                      <td className="px-4 py-4">
                        <div
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold font-body whitespace-nowrap"
                          style={{ background: badge.bg, color: badge.color }}
                        >
                          {badge.dot ? (
                            (badge as any).ping ? (
                              <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: badge.dot }} />
                                <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: badge.dot }} />
                              </span>
                            ) : (
                              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: badge.dot }} />
                            )
                          ) : (
                            !isActive && <Clock className="w-3 h-3" />
                          )}
                          {badge.text}
                        </div>
                      </td>

                      {/* Employees */}
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <div className="flex items-center gap-1.5 text-ink-faded font-body">
                          <Users className="w-3.5 h-3.5 text-ink-muted flex-shrink-0" />
                          <span className="text-sm">{empCount}</span>
                        </div>
                      </td>

                      {/* Manager */}
                      <td className="px-4 py-4 hidden lg:table-cell">
                        {s.managerName ? (
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                              style={{ background: NAVY }}
                            >
                              {s.managerName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-sm text-ink font-body truncate max-w-[130px]">{s.managerName}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-ink-muted font-body italic">Sans manager</span>
                        )}
                      </td>

                      {/* Incidents */}
                      <td className="px-4 py-4 hidden xl:table-cell">
                        <span
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-semibold font-body whitespace-nowrap"
                          style={{ background: incidentBadge.bg, color: incidentBadge.color }}
                        >
                          {(hasStopping || hasWarning) && <AlertTriangle className="w-3 h-3" />}
                          {incidentBadge.text}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-4">
                        {isActive && (
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                            style={{ background: hasStopping ? '#cc2030' : hasWarning ? '#a06000' : TEAL }}
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </motion.div>

        ) : (
          /* ── Grid view ───────────────────────────────── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((s, index) => {
              const isActive     = s.status === 'active'
              const iStatus      = incidentStatusMap?.[s.id]
              const hasStopping  = isActive && iStatus?.hasStoppingIncident
              const hasWarning   = isActive && !hasStopping && iStatus?.hasNonStoppingIncident
              const empCount     = (s as any).employeeCount ?? s.activeEmployeesCount ?? 0

              const cardBorder = hasStopping  ? 'rgba(204,32,48,0.25)'
                               : hasWarning   ? 'rgba(160,96,0,0.25)'
                               : 'var(--c-edge)'

              const badge = hasStopping
                ? { bg: 'rgba(204,32,48,0.1)', color: '#cc2030', text: 'À l\'arrêt',     dot: '#cc2030' }
                : hasWarning
                ? { bg: 'rgba(160,96,0,0.1)',  color: '#a06000', text: 'Incident',        dot: '#f59e0b' }
                : isActive
                ? { bg: WASH,                  color: '#0f7a4a', text: 'Opérationnelle',  dot: '#22c55e', ping: true }
                : { bg: 'var(--c-inset)',       color: 'var(--c-ink-muted)', text: s.status === 'upcoming' ? 'À venir' : 'Inactive', dot: undefined }

              return (
                <motion.button
                  key={s.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  onClick={() => select(s.id, s.status)}
                  disabled={!isActive}
                  className={`group relative text-left p-5 rounded-2xl border bg-panel shadow-sm flex flex-col gap-4 transition-all duration-200 ${
                    isActive
                      ? 'hover:shadow-lg hover:-translate-y-0.5 cursor-pointer'
                      : 'opacity-60 cursor-not-allowed'
                  }`}
                  style={{ borderColor: cardBorder }}
                >
                  {/* Top row: icon + badge */}
                  <div className="flex items-start justify-between">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: isActive ? WASH : 'var(--c-inset)' }}
                    >
                      <Building2 className="w-6 h-6" style={{ color: isActive ? TEAL : 'var(--c-ink-muted)' }} />
                    </div>
                    <div
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold font-body flex-shrink-0"
                      style={{ background: badge.bg, color: badge.color }}
                    >
                      {badge.dot && (
                        (badge as any).ping ? (
                          <span className="relative flex h-2 w-2 flex-shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: badge.dot }} />
                            <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: badge.dot }} />
                          </span>
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: badge.dot }} />
                        )
                      )}
                      {!badge.dot && !isActive && <Clock className="w-3 h-3" />}
                      {!badge.dot && (hasStopping || hasWarning) && <AlertTriangle className="w-3 h-3" />}
                      {badge.text}
                    </div>
                  </div>

                  {/* Name + address */}
                  <div className="flex-1">
                    <h3 className="font-heading font-bold text-ink text-lg leading-tight mb-1.5 line-clamp-1" style={{ letterSpacing: '-0.01em' }}>
                      {s.nom}
                    </h3>
                    <p className="text-xs flex items-start gap-1.5 font-body" style={{ color: 'var(--c-ink-faded)' }}>
                      <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: 'var(--c-ink-muted)' }} />
                      <span className="line-clamp-2">{s.adresse}, {s.town}</span>
                    </p>
                  </div>

                  {/* Bottom row */}
                  <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--c-edge)' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--c-inset)' }}>
                        <Users className="w-3.5 h-3.5" style={{ color: 'var(--c-ink-muted)' }} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-ink leading-none font-body">{empCount}</p>
                        <p className="text-[10px] uppercase tracking-wider font-body" style={{ color: 'var(--c-ink-muted)' }}>Employés</p>
                      </div>
                    </div>
                    {s.managerName ? (
                      <div className="flex items-center gap-2 text-right">
                        <div>
                          <p className="text-sm font-bold text-ink leading-none truncate max-w-[90px] font-body">{s.managerName}</p>
                          <p className="text-[10px] uppercase tracking-wider font-body" style={{ color: 'var(--c-ink-muted)' }}>Manager</p>
                        </div>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--c-inset)' }}>
                          <UserCog className="w-3.5 h-3.5" style={{ color: 'var(--c-ink-muted)' }} />
                        </div>
                      </div>
                    ) : (
                      isActive && (
                        <div className="flex items-center gap-1 text-xs font-body" style={{ color: 'var(--c-ink-muted)' }}>
                          <UserCog className="w-3.5 h-3.5" />
                          <span>Sans manager</span>
                        </div>
                      )
                    )}
                  </div>

                  {/* Hover CTA */}
                  {isActive && (
                    <div
                      className="absolute bottom-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-white opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200"
                      style={{ background: hasStopping ? '#cc2030' : hasWarning ? '#a06000' : TEAL }}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                </motion.button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Create station modal ──────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(40,56,82,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              className="bg-panel border border-edge rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              {/* Modal header */}
              <div className="px-6 pt-6 pb-5 border-b border-edge">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: WASH }}
                    >
                      {modalStep === 1
                        ? <Building2 className="w-5 h-5" style={{ color: TEAL }} />
                        : <Shield     className="w-5 h-5" style={{ color: TEAL }} />
                      }
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-ink text-lg">
                        {modalStep === 1 ? 'Nouvelle station' : 'Affecter un manager'}
                      </h3>
                      <p className="text-xs text-ink-muted font-body" style={{ fontFamily: 'var(--font-body)' }}>
                        Étape {modalStep} sur 2
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl text-ink-muted hover:text-ink hover:bg-raised border border-edge transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-inset rounded-full overflow-hidden">
                  <motion.div
                    animate={{ width: modalStep === 1 ? '50%' : '100%' }}
                    transition={{ duration: 0.3 }}
                    className="h-full rounded-full"
                    style={{ background: TEAL }}
                  />
                </div>
              </div>

              {/* Modal body */}
              <div className="px-6 py-5 space-y-4 max-h-[55vh] overflow-y-auto">
                {modalStep === 1 ? (
                  <>
                    <Field
                      label="Nom de la station" required
                      value={stationForm.nom}
                      onChange={(v) => setStationForm(f => ({ ...f, nom: v }))}
                      placeholder="Ex : LIS Douala Akwa"
                    />
                    <Field
                      label="Adresse" required
                      value={stationForm.adresse}
                      onChange={(v) => setStationForm(f => ({ ...f, adresse: v }))}
                      placeholder="Ex : Rue de la Joie, Akwa"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <Field
                        label="Ville" required
                        value={stationForm.town}
                        onChange={(v) => setStationForm(f => ({ ...f, town: v }))}
                        placeholder="Ex : Douala"
                      />
                      <Field
                        label="Contact"
                        value={stationForm.contact}
                        onChange={(v) => setStationForm(f => ({ ...f, contact: v }))}
                        placeholder="6 99 00 00 00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5 font-body" style={{ color: NAVY, fontFamily: 'var(--font-body)' }}>
                        Statut
                      </label>
                      <select
                        value={stationForm.status}
                        onChange={(e) => setStationForm(f => ({ ...f, status: e.target.value as any }))}
                        className="w-full px-4 py-2.5 bg-inset border border-edge rounded-xl text-ink text-sm outline-none font-body cursor-pointer appearance-none transition-all"
                        style={{ fontFamily: 'var(--font-body)' }}
                        onFocus={(e) => { e.target.style.borderColor = TEAL }}
                        onBlur={(e)  => { e.target.style.borderColor = '' }}
                      >
                        <option value="active">Active (Opérationnelle)</option>
                        <option value="upcoming">À venir (En préparation)</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Success notice */}
                    <div
                      className="p-3.5 rounded-xl flex items-center gap-3"
                      style={{ background: 'var(--c-ok-wash)', border: '1px solid var(--c-ok-line)' }}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--c-ok-wash)' }}>
                        <Check className="w-4 h-4" style={{ color: 'var(--c-ok)' }} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold font-body" style={{ color: 'var(--c-ok)', fontFamily: 'var(--font-body)' }}>
                          Station créée avec succès
                        </p>
                        <p className="text-xs font-body" style={{ color: 'var(--c-ok)', opacity: 0.8, fontFamily: 'var(--font-body)' }}>
                          {createdStationName}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Nom" required value={managerForm.nom}    onChange={(v) => setManagerForm(f => ({ ...f, nom: v }))}    placeholder="Ex : Ndi" />
                      <Field label="Prénom" required value={managerForm.prenom} onChange={(v) => setManagerForm(f => ({ ...f, prenom: v }))} placeholder="Ex : Paul" />
                    </div>
                    <Field label="Email" required type="email" value={managerForm.email} onChange={(v) => setManagerForm(f => ({ ...f, email: v }))} placeholder="paul.ndi@lis-carwash.cm" />
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Téléphone" value={managerForm.telephone} onChange={(v) => setManagerForm(f => ({ ...f, telephone: v }))} placeholder="6 99 00 00 00" />
                      <Field label="Mot de passe" required type="password" value={managerForm.password} onChange={(v) => setManagerForm(f => ({ ...f, password: v }))} placeholder="••••••••" />
                    </div>
                  </>
                )}
              </div>

              {/* Modal footer */}
              <div className="px-6 py-4 border-t border-edge flex items-center justify-between gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium font-body text-ink-muted hover:text-ink hover:bg-raised border border-edge transition-colors"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {modalStep === 1 ? 'Annuler' : 'Passer'}
                </button>
                <button
                  onClick={modalStep === 1 ? handleCreateStation : handleCreateManager}
                  disabled={modalStep === 1 ? createStation.isPending : (createUser.isPending || assignStation.isPending)}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white font-body transition-all disabled:opacity-50"
                  style={{
                    background: TEAL,
                    fontFamily: 'var(--font-body)',
                    boxShadow: `0 4px 14px rgba(51,203,204,0.3)`,
                  }}
                >
                  {(modalStep === 1 ? createStation.isPending : (createUser.isPending || assignStation.isPending)) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    modalStep === 1 ? <ArrowRight className="w-4 h-4" /> : <Shield className="w-4 h-4" />
                  )}
                  {modalStep === 1 ? 'Créer la station' : 'Finaliser'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
