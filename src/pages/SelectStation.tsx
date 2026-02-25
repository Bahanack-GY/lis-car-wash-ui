import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2, MapPin, Users, ArrowRight, LogOut, Sun, Moon, Clock, Search,
  AlertTriangle, UserCog, BarChart3, Plus, X, Shield, ChevronRight,
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
    if (user && user.role !== 'super_admin') {
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
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 sm:px-10 py-5">
        <div className="flex items-center gap-3">
          <img src={Logo} alt="LIS" className="w-9 h-9 rounded-lg object-contain" />
          <div>
            <h1 className="font-heading font-bold text-sm text-ink leading-tight">LIS Car Wash</h1>
            <p className="text-[11px] text-ink-muted leading-tight">Système de gestion</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <div className="hidden sm:flex items-center gap-2 text-sm text-ink-muted">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white font-bold text-[10px]">
                {user.prenom[0]}{user.nom[0]}
              </div>
              <span className="font-medium text-ink">{user.prenom} {user.nom}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent-wash text-accent font-medium">
                {roleLabel[user.role] ?? user.role}
              </span>
            </div>
          )}
          <button
            onClick={toggle}
            className="text-ink-muted hover:text-ink p-2 rounded-xl hover:bg-raised transition-colors"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-ink-muted hover:text-bad transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 px-6 sm:px-10 pb-16">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8 pt-6">
            <div className="w-14 h-14 rounded-2xl bg-accent-wash border border-accent-line flex items-center justify-center mx-auto mb-5">
              <Building2 className="w-7 h-7 text-accent" />
            </div>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-ink tracking-tight">
              Choisir une station
            </h2>
            <p className="text-ink-faded mt-3 max-w-md mx-auto">
              Sélectionnez la station sur laquelle vous travaillez aujourd'hui.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3 flex-wrap">
              <button
                onClick={() => navigate('/global-dashboard')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-panel border border-edge rounded-xl text-sm font-medium text-ink hover:border-teal-500 hover:shadow-md transition-all duration-200"
              >
                <BarChart3 className="w-4 h-4 text-accent" />
                Tableau de bord global
              </button>
              <button
                onClick={openModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90 hover:shadow-md transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                Nouvelle station
              </button>
            </div>
          </div>

          {/* Search + Filters */}
          <div className="max-w-2xl mx-auto mb-6 space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par nom, ville, adresse ou manager..."
                className="w-full pl-10 pr-4 py-2.5 bg-panel border border-edge rounded-xl text-ink text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 placeholder:text-ink-muted"
              />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <div className="flex bg-panel border border-edge rounded-xl p-1 shadow-sm">
                {statusTabs.map((tab) => {
                  const count = statusCounts[tab.key]
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setStatusFilter(tab.key)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                        statusFilter === tab.key
                          ? 'bg-accent-wash text-accent'
                          : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      {tab.label}
                      {count > 0 && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          statusFilter === tab.key
                            ? 'bg-accent/10 text-accent'
                            : 'bg-raised text-ink-muted'
                        }`}>
                          {count}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {towns.length > 1 && (
                <select
                  value={townFilter}
                  onChange={(e) => setTownFilter(e.target.value)}
                  className="bg-panel border border-edge rounded-xl px-3 py-2 text-sm font-medium text-ink outline-none focus:border-teal-500 shadow-sm cursor-pointer"
                >
                  <option value="all">Toutes les villes</option>
                  {towns.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              )}

              <div className="flex bg-panel border border-edge rounded-xl p-1 shadow-sm">
                {incidentTabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setIncidentFilter(tab.key)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      incidentFilter === tab.key
                        ? tab.key === 'stopped'
                          ? 'bg-red-500/10 text-red-600'
                          : tab.key === 'incident'
                            ? 'bg-amber-500/10 text-amber-600'
                            : 'bg-accent-wash text-accent'
                        : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
            </div>
          ) : isError ? (
            <div className="p-4 bg-red-500/10 text-red-500 rounded-xl text-center">
              Erreur lors du chargement des stations.
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-ink-muted p-12 border border-dashed border-divider rounded-xl">
              {search || statusFilter !== 'all'
                ? 'Aucune station ne correspond à vos critères.'
                : (
                  <div className="space-y-4">
                    <Building2 className="w-12 h-12 text-ink-muted/40 mx-auto" />
                    <p className="text-lg font-medium text-ink-faded">Aucune station disponible</p>
                    <p className="text-sm">Commencez par créer votre première station.</p>
                    <button
                      onClick={openModal}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      Créer votre première station
                    </button>
                  </div>
                )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((s) => {
                const isOpen = s.status === 'active'
                const iStatus = incidentStatusMap?.[s.id]
                const hasStopping = isOpen && iStatus?.hasStoppingIncident
                const hasNonStopping = isOpen && !hasStopping && iStatus?.hasNonStoppingIncident
                const hoverBorder = hasStopping
                  ? 'hover:border-red-500 hover:shadow-red-500/10'
                  : hasNonStopping
                    ? 'hover:border-amber-500 hover:shadow-amber-500/10'
                    : 'hover:border-teal-500 hover:shadow-teal-500/10'
                const empCount = (s as any).employeeCount ?? s.activeEmployeesCount ?? 0
                return (
                  <button
                    key={s.id}
                    onClick={() => select(s.id, s.status)}
                    disabled={!isOpen}
                    className={`relative text-left p-6 rounded-2xl border-2 transition-all duration-200 group flex flex-col ${
                      isOpen
                        ? `bg-panel border-edge ${hoverBorder} hover:shadow-lg hover:-translate-y-0.5 cursor-pointer`
                        : 'bg-inset border-edge opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="absolute top-5 right-5">
                      {isOpen ? (
                        hasStopping ? (
                          <span className="flex items-center gap-1.5 text-xs font-medium text-red-600">
                            <AlertTriangle className="w-3 h-3" />
                            Activité arrêtée
                          </span>
                        ) : hasNonStopping ? (
                          <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
                            <AlertTriangle className="w-3 h-3" />
                            Incident en cours
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs font-medium text-ok">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                            </span>
                            Active
                          </span>
                        )
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
                          <Clock className="w-3 h-3" />
                          {s.status === 'upcoming' ? 'À venir' : 'Inactive'}
                        </span>
                      )}
                    </div>

                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${isOpen ? 'bg-accent-wash' : 'bg-raised'}`}>
                      <Building2 className={`w-5 h-5 ${isOpen ? 'text-accent' : 'text-ink-muted'}`} />
                    </div>

                    <h3 className="font-heading font-bold text-lg text-ink mb-1">{s.nom}</h3>
                    <p className="text-sm text-ink-faded flex items-center gap-1.5 mb-4 flex-1">
                      <MapPin className="w-3.5 h-3.5 text-ink-muted flex-shrink-0" />
                      {s.adresse}, {s.town}
                    </p>

                    <div className="flex items-center gap-4 pt-4 border-t border-divider mt-auto w-full">
                      <div className="flex items-center gap-1.5 text-sm text-ink-faded">
                        <Users className="w-3.5 h-3.5 text-ink-muted" />
                        <span className="font-semibold text-ink">{empCount}</span> employé{Number(empCount) !== 1 ? 's' : ''}
                      </div>
                      {s.managerName && (
                        <div className="flex items-center gap-1.5 text-sm text-ink-faded ml-auto">
                          <UserCog className="w-3.5 h-3.5 text-ink-muted" />
                          <span className="font-medium text-ink truncate max-w-[120px]">{s.managerName}</span>
                        </div>
                      )}
                    </div>

                    {isOpen && (
                      <div className={`absolute bottom-5 right-5 w-8 h-8 rounded-full bg-raised flex items-center justify-center transition-all duration-200 ${
                        hasStopping ? 'group-hover:bg-red-500' : hasNonStopping ? 'group-hover:bg-amber-500' : 'group-hover:bg-teal-500'
                      }`}>
                        <ArrowRight className="w-4 h-4 text-ink-muted group-hover:text-white transition-colors" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          <p className="text-center text-xs text-ink-muted mt-8">
            Vous pouvez changer de station à tout moment depuis le menu
          </p>
        </div>
      </div>

      {/* Create Station + Manager Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && closeModal()}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-panel border border-edge rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
            >
              {/* Modal header with step indicator */}
              <div className="px-6 pt-6 pb-4 border-b border-divider">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-heading font-bold text-lg text-ink">
                    {modalStep === 1 ? 'Nouvelle station' : 'Créer le manager'}
                  </h3>
                  <button onClick={closeModal} className="text-ink-muted hover:text-ink p-1 rounded-lg hover:bg-raised transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {/* Steps */}
                <div className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${
                    modalStep === 1 ? 'bg-accent-wash text-accent' : 'bg-emerald-500/10 text-emerald-600'
                  }`}>
                    {modalStep > 1 ? '✓' : '1.'}
                    <span>Station</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-ink-muted" />
                  <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${
                    modalStep === 2 ? 'bg-accent-wash text-accent' : 'bg-raised text-ink-muted'
                  }`}>
                    2. <span>Manager</span>
                  </div>
                </div>
              </div>

              <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
                {modalStep === 1 ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-ink mb-1.5">Nom de la station *</label>
                      <input
                        type="text"
                        value={stationForm.nom}
                        onChange={(e) => setStationForm(f => ({ ...f, nom: e.target.value }))}
                        placeholder="Ex: LIS Douala Akwa"
                        className="w-full px-3.5 py-2.5 bg-inset border border-edge rounded-xl text-ink text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 placeholder:text-ink-muted"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ink mb-1.5">Adresse *</label>
                      <input
                        type="text"
                        value={stationForm.adresse}
                        onChange={(e) => setStationForm(f => ({ ...f, adresse: e.target.value }))}
                        placeholder="Ex: Rue de la Joie, Akwa"
                        className="w-full px-3.5 py-2.5 bg-inset border border-edge rounded-xl text-ink text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 placeholder:text-ink-muted"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-ink mb-1.5">Ville *</label>
                        <input
                          type="text"
                          value={stationForm.town}
                          onChange={(e) => setStationForm(f => ({ ...f, town: e.target.value }))}
                          placeholder="Ex: Douala"
                          className="w-full px-3.5 py-2.5 bg-inset border border-edge rounded-xl text-ink text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 placeholder:text-ink-muted"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-ink mb-1.5">Contact</label>
                        <input
                          type="text"
                          value={stationForm.contact}
                          onChange={(e) => setStationForm(f => ({ ...f, contact: e.target.value }))}
                          placeholder="Ex: 6 99 00 00 00"
                          className="w-full px-3.5 py-2.5 bg-inset border border-edge rounded-xl text-ink text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 placeholder:text-ink-muted"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ink mb-1.5">Statut</label>
                      <select
                        value={stationForm.status}
                        onChange={(e) => setStationForm(f => ({ ...f, status: e.target.value as any }))}
                        className="w-full px-3.5 py-2.5 bg-inset border border-edge rounded-xl text-ink text-sm outline-none focus:border-teal-500 cursor-pointer"
                      >
                        <option value="active">Active</option>
                        <option value="upcoming">À venir</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Success banner */}
                    <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Station créée</p>
                        <p className="text-xs text-emerald-600/80 dark:text-emerald-400/70">{createdStationName}</p>
                      </div>
                    </div>

                    <p className="text-sm text-ink-faded flex items-center gap-2">
                      <Shield className="w-4 h-4 text-accent" />
                      Créez un manager pour gérer cette station
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-ink mb-1.5">Nom *</label>
                        <input
                          type="text"
                          value={managerForm.nom}
                          onChange={(e) => setManagerForm(f => ({ ...f, nom: e.target.value }))}
                          placeholder="Nom de famille"
                          className="w-full px-3.5 py-2.5 bg-inset border border-edge rounded-xl text-ink text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 placeholder:text-ink-muted"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-ink mb-1.5">Prénom *</label>
                        <input
                          type="text"
                          value={managerForm.prenom}
                          onChange={(e) => setManagerForm(f => ({ ...f, prenom: e.target.value }))}
                          placeholder="Prénom"
                          className="w-full px-3.5 py-2.5 bg-inset border border-edge rounded-xl text-ink text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 placeholder:text-ink-muted"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ink mb-1.5">Email *</label>
                      <input
                        type="email"
                        value={managerForm.email}
                        onChange={(e) => setManagerForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="manager@lis-carwash.cm"
                        className="w-full px-3.5 py-2.5 bg-inset border border-edge rounded-xl text-ink text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 placeholder:text-ink-muted"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ink mb-1.5">Téléphone</label>
                      <input
                        type="text"
                        value={managerForm.telephone}
                        onChange={(e) => setManagerForm(f => ({ ...f, telephone: e.target.value }))}
                        placeholder="6 99 00 00 00"
                        className="w-full px-3.5 py-2.5 bg-inset border border-edge rounded-xl text-ink text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 placeholder:text-ink-muted"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ink mb-1.5">Mot de passe *</label>
                      <input
                        type="password"
                        value={managerForm.password}
                        onChange={(e) => setManagerForm(f => ({ ...f, password: e.target.value }))}
                        placeholder="Mot de passe initial"
                        className="w-full px-3.5 py-2.5 bg-inset border border-edge rounded-xl text-ink text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 placeholder:text-ink-muted"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Modal footer */}
              <div className="px-6 py-4 border-t border-divider flex items-center justify-between gap-3">
                {modalStep === 1 ? (
                  <>
                    <button
                      onClick={closeModal}
                      className="px-4 py-2.5 text-sm font-medium text-ink-muted hover:text-ink rounded-xl hover:bg-raised transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleCreateStation}
                      disabled={createStation.isPending}
                      className="px-5 py-2.5 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {createStation.isPending ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      Créer la station
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={closeModal}
                      className="px-4 py-2.5 text-sm font-medium text-ink-muted hover:text-ink rounded-xl hover:bg-raised transition-colors"
                    >
                      Passer cette étape
                    </button>
                    <button
                      onClick={handleCreateManager}
                      disabled={createUser.isPending || assignStation.isPending}
                      className="px-5 py-2.5 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {(createUser.isPending || assignStation.isPending) ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                      ) : (
                        <Shield className="w-4 h-4" />
                      )}
                      Créer le manager
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
