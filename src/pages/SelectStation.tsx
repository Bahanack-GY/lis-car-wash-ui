import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2, MapPin, Users, ArrowRight, LogOut, Sun, Moon, Clock, Search, AlertTriangle, UserCog, BarChart3,
} from 'lucide-react'
import Logo from '@/assets/Logo.png'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { useStations } from '@/api/stations'
import { useActiveIncidentsByStation } from '@/api/incidents'

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

  const stationsList = stationsData || []

  // Extract unique towns for the dropdown
  const towns = useMemo(() => {
    const set = new Set(stationsList.map(s => s.town))
    return Array.from(set).sort()
  }, [stationsList])

  const filtered = useMemo(() => {
    let list = stationsList

    // Status filter
    if (statusFilter !== 'all') {
      list = list.filter((s) => s.status === statusFilter)
    }

    // Town filter
    if (townFilter !== 'all') {
      list = list.filter((s) => s.town === townFilter)
    }

    // Incident filter
    if (incidentFilter !== 'all' && incidentStatusMap) {
      list = list.filter((s) => {
        const iStatus = incidentStatusMap[s.id]
        if (incidentFilter === 'no_incident') return !iStatus
        if (incidentFilter === 'incident') return !!iStatus
        if (incidentFilter === 'stopped') return iStatus?.hasStoppingIncident
        return true
      })
    }

    // Search filter
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

  // Counts per status for filter badges
  const statusCounts = useMemo(() => ({
    all: stationsList.length,
    active: stationsList.filter(s => s.status === 'active').length,
    inactive: stationsList.filter(s => s.status === 'inactive').length,
    upcoming: stationsList.filter(s => s.status === 'upcoming').length,
  }), [stationsList])

  // Non-super_admin should never reach this page — redirect immediately
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
            <button
              onClick={() => navigate('/global-dashboard')}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-panel border border-edge rounded-xl text-sm font-medium text-ink hover:border-teal-500 hover:shadow-md transition-all duration-200"
            >
              <BarChart3 className="w-4 h-4 text-accent" />
              Tableau de bord global
            </button>
          </div>

          {/* Search + Filters */}
          <div className="max-w-2xl mx-auto mb-6 space-y-3">
            {/* Search bar */}
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

            {/* Filters row */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {/* Status filter tabs */}
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

              {/* Town filter */}
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

              {/* Incident filter */}
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
            <div className="text-center text-ink-muted p-8 border border-dashed border-divider rounded-xl">
              {search || statusFilter !== 'all'
                ? 'Aucune station ne correspond à vos critères.'
                : 'Aucune station disponible.'}
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

                    {/* Manager + employees */}
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
    </div>
  )
}
