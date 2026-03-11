import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2, MapPin, Users, ArrowRight, LogOut, Sun, Moon, Clock, Search,
  AlertTriangle, UserCog, BarChart3, Plus, X, Shield, ChevronRight, Check
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'
import Logo from '@/assets/Logo.png'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { useStations, useCreateStation } from '@/api/stations'
import { useActiveIncidentsByStation } from '@/api/incidents'
import { useCreateUser, useAssignStation } from '@/api/users'

type StatusFilter = 'all' | 'active' | 'inactive' | 'upcoming'
type IncidentFilter = 'all' | 'no_incident' | 'incident' | 'stopped'

const statusTabs: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  { key: 'active', label: 'Actives' },
  { key: 'inactive', label: 'Inactives' },
  { key: 'upcoming', label: 'À venir' },
]

const incidentTabs: { key: IncidentFilter; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'no_incident', label: 'Sans incident' },
  { key: 'incident', label: 'Avec incident' },
  { key: 'stopped', label: 'Activité arrêtée' },
]

export default function SelectStation() {
  const navigate = useNavigate()
  const { isDark, toggle } = useTheme()
  const { user, logout, setStation, defaultPath } = useAuth()
  const { data: stationsData, isLoading, isError } = useStations()
  const { data: incidentStatusMap } = useActiveIncidentsByStation()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [incidentFilter, setIncidentFilter] = useState<IncidentFilter>('all')
  const [townFilter, setTownFilter] = useState<string>('all')

  // Create station + manager modal state
  const [showModal, setShowModal] = useState(false)
  const [modalStep, setModalStep] = useState<1 | 2>(1)
  const [createdStationId, setCreatedStationId] = useState<number | null>(null)
  const [createdStationName, setCreatedStationName] = useState('')

  // Station form
  const [stationForm, setStationForm] = useState({
    nom: '', adresse: '', town: '', contact: '', status: 'active' as const,
  })

  // Manager form
  const [managerForm, setManagerForm] = useState({
    nom: '', prenom: '', email: '', telephone: '', password: '',
  })

  const createStation = useCreateStation()
  const createUser = useCreateUser()
  const assignStation = useAssignStation()

  const stationsList = stationsData || []

  const towns = useMemo(() => {
    const set = new Set(stationsList.map(s => s.town))
    return Array.from(set).sort()
  }, [stationsList])

  const filtered = useMemo(() => {
    let list = stationsList

    if (statusFilter !== 'all') {
      list = list.filter((s) => s.status === statusFilter)
    }

    if (townFilter !== 'all') {
      list = list.filter((s) => s.town === townFilter)
    }

    if (incidentFilter !== 'all' && incidentStatusMap) {
      list = list.filter((s) => {
        const iStatus = incidentStatusMap[s.id]
        if (incidentFilter === 'no_incident') return !iStatus
        if (incidentFilter === 'incident') return !!iStatus
        if (incidentFilter === 'stopped') return iStatus?.hasStoppingIncident
        return true
      })
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (s) =>
          s.nom.toLowerCase().includes(q) ||
          s.adresse.toLowerCase().includes(q) ||
          s.town.toLowerCase().includes(q) ||
          (s.managerName && s.managerName.toLowerCase().includes(q)),
      )
    }

    return list
  }, [stationsList, search, statusFilter, townFilter, incidentFilter, incidentStatusMap])

  const statusCounts = useMemo(() => ({
    all: stationsList.length,
    active: stationsList.filter(s => s.status === 'active').length,
    inactive: stationsList.filter(s => s.status === 'inactive').length,
    upcoming: stationsList.filter(s => s.status === 'upcoming').length,
  }), [stationsList])

  useEffect(() => {
    if (user && user.role !== 'super_admin' && !(user.role === 'comptable' && user.globalAccess)) {
      navigate(defaultPath, { replace: true })
    }
  }, [user, defaultPath, navigate])

  const select = (id: number, status: string) => {
    if (status === 'active') {
      setStation(id)
      navigate(defaultPath)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const openModal = () => {
    setShowModal(true)
    setModalStep(1)
    setCreatedStationId(null)
    setCreatedStationName('')
    setStationForm({ nom: '', adresse: '', town: '', contact: '', status: 'active' })
    setManagerForm({ nom: '', prenom: '', email: '', telephone: '', password: '' })
  }

  const closeModal = () => {
    setShowModal(false)
  }

  const handleCreateStation = async () => {
    if (!stationForm.nom.trim() || !stationForm.adresse.trim() || !stationForm.town.trim()) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }
    try {
      const station = await createStation.mutateAsync(stationForm)
      setCreatedStationId(station.id)
      setCreatedStationName(station.nom)
      setModalStep(2)
      toast.success(`Station "${station.nom}" créée avec succès`)
    } catch {
      // error displayed by axios interceptor
    }
  }

  const handleCreateManager = async () => {
    if (!managerForm.nom.trim() || !managerForm.prenom.trim() || !managerForm.email.trim() || !managerForm.password.trim()) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }
    try {
      const newUser = await createUser.mutateAsync({ ...managerForm, role: 'manager' as const })
      const today = new Date().toISOString().split('T')[0]
      await assignStation.mutateAsync({
        id: newUser.id,
        data: { stationId: createdStationId!, dateDebut: today },
      })
      toast.success(`Manager ${newUser.prenom} ${newUser.nom} créé et affecté à "${createdStationName}"`)
      closeModal()
    } catch {
      // error displayed by axios interceptor
    }
  }

  const roleLabel: Record<string, string> = {
    super_admin: 'Super Administrateur',
    manager: 'Manager',
    controleur: 'Contrôleur',
    caissiere: 'Caissière',
    laveur: 'Laveur',
    commercial: 'Commercial',
    comptable: 'Comptable',
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-surface flex flex-col font-sans">
      {/* Dynamic blurred background bubbles */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-teal-500/20 blur-[120px] mix-blend-screen animate-blob" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-blue-500/10 blur-[130px] mix-blend-screen animate-blob animation-delay-2000" />
        <div className="absolute top-[20%] right-[30%] w-[40vw] h-[40vw] rounded-full bg-purple-500/10 blur-[100px] mix-blend-screen animate-blob animation-delay-4000" />
      </div>

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-5 backdrop-blur-md bg-panel/60 border-b border-edge/50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <img src={Logo} alt="LIS" className="w-6 h-6 object-contain brightness-0 invert" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-base text-ink tracking-tight">LIS Car Wash</h1>
            <p className="text-[11px] text-ink-muted font-medium uppercase tracking-wider">Système de gestion</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-2xl bg-inset/50 backdrop-blur-sm border border-edge/50">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center text-white font-bold text-[10px] shadow-sm">
                {user.prenom[0]}{user.nom[0]}
              </div>
              <div className="flex flex-col">
                 <span className="font-heading font-semibold text-sm text-ink leading-none">{user.prenom} {user.nom}</span>
                 <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold uppercase tracking-wider mt-0.5">
                   {roleLabel[user.role] ?? user.role}
                 </span>
              </div>
            </div>
          )}
          <button
            onClick={toggle}
            className="w-10 h-10 flex items-center justify-center text-ink-muted hover:text-ink rounded-2xl hover:bg-raised transition-colors border border-transparent hover:border-edge/50"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button
            onClick={handleLogout}
            className="w-10 h-10 sm:w-auto sm:px-4 flex items-center justify-center gap-2 text-sm font-medium text-ink-muted hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all border border-transparent hover:border-red-500/20"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="relative z-10 flex-1 px-6 sm:px-10 pb-16 pt-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto flex flex-col h-full">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-gradient-to-br from-teal-500/20 to-blue-500/20 border border-teal-500/30 backdrop-blur-xl shadow-2xl shadow-teal-500/20 mb-6">
              <Building2 className="w-10 h-10 text-teal-500" />
            </div>
            <h2 className="font-heading text-4xl sm:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-blue-600 dark:from-teal-400 dark:to-blue-400 tracking-tight mb-4">
              Votre Espace de Travail
            </h2>
            <p className="text-ink-faded text-lg max-w-2xl mx-auto font-medium">
              Sélectionnez la station sur laquelle vous opérez aujourd'hui pour accéder à vos outils dédiés.
            </p>
            
            <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
              <button
                onClick={() => navigate('/global-dashboard')}
                className="group relative inline-flex items-center gap-2 px-6 py-3 bg-panel/50 backdrop-blur-xl border border-edge/80 rounded-2xl text-sm font-bold text-ink hover:border-teal-500/50 hover:shadow-xl hover:shadow-teal-500/10 transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-teal-500/0 via-teal-500/5 to-teal-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                <BarChart3 className="w-4 h-4 text-teal-500 group-hover:scale-110 transition-transform" />
                Tableau de bord global
              </button>
              {user?.role === 'super_admin' && (
                <button
                  onClick={openModal}
                  className="group relative inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-teal-500/30 hover:shadow-teal-500/50 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  <Plus className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">Créer une station</span>
                </button>
              )}
            </div>
          </motion.div>

          {/* Search + Filters (Glassmorphic Bar) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="w-full mx-auto mb-10 p-2 sm:p-3 rounded-[2rem] backdrop-blur-2xl bg-panel/40 border border-white/10 dark:border-white/5 shadow-xl flex flex-col lg:flex-row items-center gap-3 lg:gap-4"
          >
            {/* Search */}
            <div className="relative w-full lg:w-96 flex-shrink-0">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher une station..."
                className="w-full pl-12 pr-6 py-3.5 bg-inset/50 hover:bg-inset/80 focus:bg-inset backdrop-blur-md border border-transparent focus:border-teal-500/50 rounded-2xl text-ink font-medium outline-none transition-all placeholder:text-ink-muted shadow-inner"
              />
            </div>

            {/* Filters Row */}
            <div className="flex-1 w-full overflow-x-auto no-scrollbar flex items-center gap-3 lg:justify-end">
              {/* Town Selector */}
              {towns.length > 1 && (
                <div className="relative shrink-0">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" />
                  <select
                    value={townFilter}
                    onChange={(e) => setTownFilter(e.target.value)}
                    className="appearance-none pl-10 pr-10 py-3 bg-inset/50 hover:bg-inset/80 border border-transparent focus:border-teal-500/50 rounded-2xl font-medium text-sm text-ink outline-none cursor-pointer transition-all"
                  >
                    <option value="all">Toutes villes</option>
                    {towns.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Status Tabs */}
              <div className="flex bg-inset/50 backdrop-blur-md p-1.5 rounded-2xl shrink-0">
                {statusTabs.map((tab) => {
                  const count = statusCounts[tab.key]
                  const isActive = statusFilter === tab.key
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setStatusFilter(tab.key)}
                      className={`relative px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                        isActive
                          ? 'text-teal-700 dark:text-teal-300 bg-white dark:bg-panel shadow-sm'
                          : 'text-ink-muted hover:text-ink hover:bg-white/50 dark:hover:bg-panel/50'
                      }`}
                    >
                      {tab.label}
                      {count > 0 && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-400'
                            : 'bg-black/5 dark:bg-white/5'
                        }`}>
                          {count}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              
              {/* Incident Tabs */}
              <div className="flex bg-inset/50 backdrop-blur-md p-1.5 rounded-2xl shrink-0">
                {incidentTabs.map((tab) => {
                  const isActive = incidentFilter === tab.key
                  let activeColors = 'text-teal-700 dark:text-teal-300 bg-white dark:bg-panel shadow-sm'
                  if (tab.key === 'stopped') activeColors = 'text-red-700 dark:text-red-400 bg-white dark:bg-panel shadow-sm'
                  else if (tab.key === 'incident') activeColors = 'text-amber-700 dark:text-amber-400 bg-white dark:bg-panel shadow-sm'

                  return (
                    <button
                      key={tab.key}
                      onClick={() => setIncidentFilter(tab.key)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                        isActive ? activeColors : 'text-ink-muted hover:text-ink hover:bg-white/50 dark:hover:bg-panel/50'
                      }`}
                    >
                      {tab.label}
                    </button>
                  )
                })}
              </div>

            </div>
          </motion.div>

          {/* Content Grid */}
          {isLoading ? (
            <div className="flex-1 flex justify-center items-center">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-teal-500/20" />
                <div className="absolute inset-0 rounded-full border-4 border-teal-500 border-t-transparent animate-spin" />
              </div>
            </div>
          ) : isError ? (
            <div className="flex-1 flex justify-center items-center">
              <div className="p-6 bg-red-500/10 border border-red-500/20 text-red-600 rounded-3xl max-w-md text-center flex flex-col items-center">
                <AlertTriangle className="w-10 h-10 mb-3 text-red-500" />
                <h3 className="font-bold text-lg mb-1">Erreur de chargement</h3>
                <p className="text-sm font-medium">Nous n'avons pas pu charger les stations. Veuillez réessayer.</p>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               className="flex-1 flex justify-center items-center"
            >
              <div className="text-center p-12 bg-panel/30 backdrop-blur-xl border border-white/5 rounded-[3rem] max-w-lg w-full shadow-2xl">
                <div className="w-24 h-24 rounded-full bg-inset/50 flex items-center justify-center mx-auto mb-6">
                  <Building2 className="w-10 h-10 text-ink-muted/50" />
                </div>
                <h3 className="text-2xl font-heading font-bold text-ink mb-2">Aucune station trouvée</h3>
                <p className="text-ink-faded font-medium mb-8">
                  {search || statusFilter !== 'all'
                    ? "Aucun résultat pour vos filtres actuels."
                    : "Votre réseau ne compte encore aucune station."}
                </p>
                {(!search && statusFilter === 'all') && (
                  <button
                    onClick={openModal}
                    className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-2xl font-bold shadow-xl shadow-teal-500/20 hover:scale-105 transition-transform"
                  >
                    <Plus className="w-5 h-5" />
                    Créer la première station
                  </button>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map((s, index) => {
                const isOpen = s.status === 'active'
                const iStatus = incidentStatusMap?.[s.id]
                const hasStopping = isOpen && iStatus?.hasStoppingIncident
                const hasNonStopping = isOpen && !hasStopping && iStatus?.hasNonStoppingIncident
                
                let cardStyle = "bg-panel/60 border-edge/50 hover:border-teal-500/40 hover:shadow-teal-500/10"
                let badgeStyle = ""
                let badgeIcon = null
                let badgeText = ""

                if (isOpen) {
                  if (hasStopping) {
                    cardStyle = "bg-panel/60 border-red-500/30 hover:border-red-500/60 hover:shadow-red-500/10"
                    badgeStyle = "bg-red-500/10 text-red-600 border border-red-500/20"
                    badgeIcon = <AlertTriangle className="w-3.5 h-3.5" />
                    badgeText = "À l'arrêt"
                  } else if (hasNonStopping) {
                    cardStyle = "bg-panel/60 border-amber-500/30 hover:border-amber-500/60 hover:shadow-amber-500/10"
                    badgeStyle = "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                    badgeIcon = <AlertTriangle className="w-3.5 h-3.5" />
                    badgeText = "Incident"
                  } else {
                    badgeStyle = "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                    badgeIcon = (
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                      </span>
                    )
                    badgeText = "Opérationnelle"
                  }
                } else {
                  cardStyle = "bg-inset/40 border-edge/30 opacity-70 grayscale-[30%] cursor-not-allowed"
                  badgeStyle = "bg-surface/80 text-ink-muted border border-edge/50"
                  badgeIcon = <Clock className="w-3.5 h-3.5" />
                  badgeText = s.status === 'upcoming' ? 'À venir' : 'Inactive'
                }

                const empCount = (s as any).employeeCount ?? s.activeEmployeesCount ?? 0

                return (
                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={s.id}
                    onClick={() => select(s.id, s.status)}
                    disabled={!isOpen}
                    className={`group relative text-left p-6 rounded-[2rem] border backdrop-blur-xl transition-all duration-300 flex flex-col h-[280px] shadow-lg overflow-hidden ${cardStyle} ${isOpen ? 'hover:-translate-y-1 hover:shadow-2xl' : ''}`}
                  >
                    {/* Hover Glow Effect */}
                    {isOpen && (
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    )}

                    {/* Top Row: Icon + Badge */}
                    <div className="flex justify-between items-start mb-6 relative z-10">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${isOpen ? 'bg-gradient-to-br from-teal-500/20 to-blue-500/10 text-teal-600 dark:text-teal-400' : 'bg-surface text-ink-muted'}`}>
                        <Building2 className="w-7 h-7" />
                      </div>
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm backdrop-blur-md ${badgeStyle}`}>
                        {badgeIcon}
                        {badgeText}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 relative z-10">
                      <h3 className="font-heading font-extrabold text-xl text-ink mb-2 line-clamp-1">{s.nom}</h3>
                      <p className="text-sm font-medium text-ink-faded flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-ink-muted shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{s.adresse}, {s.town}</span>
                      </p>
                    </div>

                    {/* Bottom Row / Insights */}
                    <div className="flex items-center justify-between pt-5 border-t border-white/10 dark:border-white/5 mt-auto relative z-10">
                      <div className="flex items-center gap-2 text-sm text-ink-faded group-hover:text-ink transition-colors">
                        <div className="w-8 h-8 rounded-full bg-inset flex items-center justify-center shrink-0">
                          <Users className="w-4 h-4 text-ink-muted" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-ink leading-tight">{empCount}</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Employés</span>
                        </div>
                      </div>

                      {s.managerName && (
                        <div className="flex items-center gap-2 text-sm text-right text-ink-faded group-hover:text-ink transition-colors">
                           <div className="flex flex-col">
                            <span className="font-bold text-ink leading-tight truncate max-w-[90px]">{s.managerName}</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Manager</span>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-inset flex items-center justify-center shrink-0">
                            <UserCog className="w-4 h-4 text-ink-muted" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Arrow (Visible on hover for active) */}
                    {isOpen && (
                       <div className={`absolute bottom-[22px] left-1/2 -translate-x-1/2 translate-y-8 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 w-12 h-12 rounded-full flex items-center justify-center text-white shadow-xl z-20 ${hasStopping ? 'bg-red-500' : hasNonStopping ? 'bg-amber-500' : 'bg-teal-500'}`}>
                         <ArrowRight className="w-5 h-5" />
                       </div>
                    )}
                  </motion.button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modern Creation Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface/80 backdrop-blur-md"
            onClick={(e) => e.target === e.currentTarget && closeModal()}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-panel/90 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-[2rem] shadow-2xl w-full max-w-xl overflow-hidden shadow-teal-500/10"
            >
              <div className="px-8 pt-8 pb-6 border-b border-white/10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500/20 to-blue-500/20 flex items-center justify-center border border-teal-500/30">
                        {modalStep === 1 ? <Building2 className="w-6 h-6 text-teal-500" /> : <Shield className="w-6 h-6 text-teal-500" />}
                     </div>
                     <div>
                        <h3 className="font-heading font-extrabold text-2xl text-ink">
                          {modalStep === 1 ? 'Nouvelle station' : 'Affecter un manager'}
                        </h3>
                        <p className="text-sm font-medium text-ink-muted mt-1">Étape {modalStep} sur 2</p>
                     </div>
                  </div>
                  <button onClick={closeModal} className="w-10 h-10 flex items-center justify-center text-ink-muted hover:text-ink rounded-full hover:bg-white/10 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {/* Modern Stepper */}
                <div className="relative h-1.5 bg-inset rounded-full overflow-hidden">
                   <motion.div
                     initial={{ width: modalStep === 1 ? '0%' : '50%' }}
                     animate={{ width: modalStep === 1 ? '50%' : '100%' }}
                     className="absolute top-0 left-0 h-full bg-gradient-to-r from-teal-500 to-blue-500"
                   />
                </div>
              </div>

              <div className="px-8 py-6 space-y-5 max-h-[60vh] overflow-y-auto">
                {modalStep === 1 ? (
                  <>
                    <div>
                      <label className="block text-sm font-bold text-ink mb-2">Nom de la station *</label>
                      <input
                        type="text"
                        value={stationForm.nom}
                        onChange={(e) => setStationForm(f => ({ ...f, nom: e.target.value }))}
                        placeholder="Ex: LIS Douala Akwa"
                        className="w-full px-4 py-3 bg-inset/50 backdrop-blur-sm border border-edge rounded-2xl text-ink font-medium outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 placeholder:text-ink-muted transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-ink mb-2">Adresse détaillée *</label>
                      <input
                        type="text"
                        value={stationForm.adresse}
                        onChange={(e) => setStationForm(f => ({ ...f, adresse: e.target.value }))}
                        placeholder="Ex: Rue de la Joie, Akwa"
                        className="w-full px-4 py-3 bg-inset/50 backdrop-blur-sm border border-edge rounded-2xl text-ink font-medium outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 placeholder:text-ink-muted transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-ink mb-2">Ville *</label>
                        <input
                          type="text"
                          value={stationForm.town}
                          onChange={(e) => setStationForm(f => ({ ...f, town: e.target.value }))}
                          placeholder="Ex: Douala"
                          className="w-full px-4 py-3 bg-inset/50 backdrop-blur-sm border border-edge rounded-2xl text-ink font-medium outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 placeholder:text-ink-muted transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-ink mb-2">Contact</label>
                        <input
                          type="text"
                          value={stationForm.contact}
                          onChange={(e) => setStationForm(f => ({ ...f, contact: e.target.value }))}
                          placeholder="Ex: 6 99 00 00 00"
                          className="w-full px-4 py-3 bg-inset/50 backdrop-blur-sm border border-edge rounded-2xl text-ink font-medium outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 placeholder:text-ink-muted transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-ink mb-2">Statut opérationnel</label>
                      <select
                        value={stationForm.status}
                        onChange={(e) => setStationForm(f => ({ ...f, status: e.target.value as any }))}
                        className="w-full px-4 py-3 bg-inset/50 backdrop-blur-sm border border-edge rounded-2xl text-ink font-medium outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all cursor-pointer appearance-none"
                      >
                        <option value="active">Active (Opérationnelle)</option>
                        <option value="upcoming">À venir (En préparation)</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-4 mb-2">
                       <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                          <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                       </div>
                       <div>
                          <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Station créée avec succès</p>
                          <p className="text-sm font-medium text-emerald-600/80 dark:text-emerald-400/80">{createdStationName}</p>
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-ink mb-2">Nom *</label>
                        <input
                          type="text"
                          value={managerForm.nom}
                          onChange={(e) => setManagerForm(f => ({ ...f, nom: e.target.value }))}
                          placeholder="Ex: Ndi"
                          className="w-full px-4 py-3 bg-inset/50 backdrop-blur-sm border border-edge rounded-2xl text-ink font-medium outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 placeholder:text-ink-muted transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-ink mb-2">Prénom *</label>
                        <input
                          type="text"
                          value={managerForm.prenom}
                          onChange={(e) => setManagerForm(f => ({ ...f, prenom: e.target.value }))}
                          placeholder="Ex: Paul"
                          className="w-full px-4 py-3 bg-inset/50 backdrop-blur-sm border border-edge rounded-2xl text-ink font-medium outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 placeholder:text-ink-muted transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-ink mb-2">Email *</label>
                      <input
                        type="email"
                        value={managerForm.email}
                        onChange={(e) => setManagerForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="paul.ndi@lis-carwash.cm"
                        className="w-full px-4 py-3 bg-inset/50 backdrop-blur-sm border border-edge rounded-2xl text-ink font-medium outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 placeholder:text-ink-muted transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-ink mb-2">Téléphone</label>
                        <input
                          type="text"
                          value={managerForm.telephone}
                          onChange={(e) => setManagerForm(f => ({ ...f, telephone: e.target.value }))}
                          placeholder="6 99 00 00 00"
                          className="w-full px-4 py-3 bg-inset/50 backdrop-blur-sm border border-edge rounded-2xl text-ink font-medium outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 placeholder:text-ink-muted transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-ink mb-2">Mot de passe *</label>
                        <input
                          type="password"
                          value={managerForm.password}
                          onChange={(e) => setManagerForm(f => ({ ...f, password: e.target.value }))}
                          placeholder="••••••••"
                          className="w-full px-4 py-3 bg-inset/50 backdrop-blur-sm border border-edge rounded-2xl text-ink font-medium outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 placeholder:text-ink-muted transition-all"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="px-8 py-5 border-t border-white/10 bg-panel/50 flex items-center justify-between gap-4">
                 <button
                    onClick={modalStep === 1 ? closeModal : closeModal}
                    className="px-6 py-3 text-sm font-bold text-ink hover:bg-white/10 rounded-2xl transition-all"
                 >
                    {modalStep === 1 ? 'Annuler' : 'Passer cette étape'}
                 </button>
                 <button
                    onClick={modalStep === 1 ? handleCreateStation : handleCreateManager}
                    disabled={modalStep === 1 ? createStation.isPending : (createUser.isPending || assignStation.isPending)}
                    className="group relative flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 overflow-hidden"
                 >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    <span className="relative z-10 flex items-center gap-2">
                      {((modalStep === 1 ? createStation.isPending : (createUser.isPending || assignStation.isPending))) ? (
                         <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                      ) : (
                         modalStep === 1 ? <ArrowRight className="w-4 h-4" /> : <Shield className="w-4 h-4" />
                      )}
                      {modalStep === 1 ? 'Suivant' : 'Terminer'}
                    </span>
                 </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
