import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle, AlertCircle, CheckCircle2, Ban,
  Search, X, Info, ShieldAlert, Zap, MapPin,
  Clock, UserCheck,
} from 'lucide-react'
import { useIncidents, useUpdateIncident } from '@/api/incidents/queries'
import type { Incident, IncidentFilters, IncidentSeverity } from '@/api/incidents/types'
import toast from 'react-hot-toast'

/* ─── Animations ──────────────────────────────────────────────────── */
const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const rise = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

/* ─── Severity & Status configs ───────────────────────────────────── */
const severityConfig: Record<IncidentSeverity, { label: string; color: string; bg: string; icon: React.ElementType; gradient: string }> = {
  low:      { label: 'Faible',   color: 'text-blue-600',   bg: 'bg-blue-500/10',   icon: Info,        gradient: 'from-blue-500 to-sky-500' },
  medium:   { label: 'Moyen',    color: 'text-amber-600',  bg: 'bg-amber-500/10',  icon: AlertCircle, gradient: 'from-amber-500 to-yellow-500' },
  high:     { label: 'Élevé',    color: 'text-orange-600', bg: 'bg-orange-500/10', icon: ShieldAlert, gradient: 'from-orange-500 to-red-400' },
  critical: { label: 'Critique', color: 'text-red-600',    bg: 'bg-red-500/10',    icon: Zap,         gradient: 'from-red-600 to-red-500' },
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  open:        { label: 'Ouvert',   color: 'text-red-600',     bg: 'bg-red-500/10' },
  in_progress: { label: 'En cours', color: 'text-amber-600',   bg: 'bg-amber-500/10' },
  resolved:    { label: 'Résolu',   color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
}

const statusTabs = [
  { key: 'all', label: 'Tous' },
  { key: 'open', label: 'Ouverts' },
  { key: 'in_progress', label: 'En cours' },
  { key: 'resolved', label: 'Résolus' },
]

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))

export default function AdminIncidents() {
  const [search, setSearch] = useState('')
  const [statusTab, setStatusTab] = useState('all')

  const filters: IncidentFilters = useMemo(() => ({
    statut: statusTab === 'all' ? undefined : statusTab as IncidentFilters['statut'],
    limit: 200,
  }), [statusTab])

  const { data, isLoading } = useIncidents(filters)
  const updateIncident = useUpdateIncident()

  const allIncidents: Incident[] = useMemo(() => {
    if (!data) return []
    return Array.isArray(data) ? data : (data as any).data ?? []
  }, [data])

  // Client-side search filter
  const incidents = useMemo(() => {
    if (!search.trim()) return allIncidents
    const q = search.toLowerCase()
    return allIncidents.filter(i =>
      i.description.toLowerCase().includes(q) ||
      i.station?.nom?.toLowerCase().includes(q) ||
      i.declarant?.prenom?.toLowerCase().includes(q) ||
      i.declarant?.nom?.toLowerCase().includes(q)
    )
  }, [allIncidents, search])

  const openCount = allIncidents.filter(i => i.statut === 'open').length
  const stoppedCount = allIncidents.filter(i => i.stopsActivity && i.statut !== 'resolved').length
  const resolvedCount = allIncidents.filter(i => i.statut === 'resolved').length

  const stats = [
    { label: 'Total incidents', value: allIncidents.length, icon: AlertTriangle, accent: 'bg-teal-500/10 text-accent' },
    { label: 'Ouverts', value: openCount, icon: AlertCircle, accent: 'bg-red-500/10 text-bad' },
    { label: 'Activité arrêtée', value: stoppedCount, icon: Ban, accent: 'bg-orange-500/10 text-orange-600' },
    { label: 'Résolus', value: resolvedCount, icon: CheckCircle2, accent: 'bg-emerald-500/10 text-ok' },
  ]

  const handleChangeStatus = (id: number, statut: 'in_progress' | 'resolved') => {
    const payload: any = { statut }
    if (statut === 'resolved') payload.resolvedAt = new Date().toISOString()
    updateIncident.mutate(
      { id, data: payload },
      {
        onSuccess: () => toast.success(statut === 'resolved' ? 'Incident résolu' : 'Incident pris en charge'),
        onError: () => toast.error('Erreur lors de la mise à jour'),
      },
    )
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <motion.div key={s.label} variants={rise} className="bg-panel border border-edge rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-xl ${s.accent}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <p className="font-heading text-2xl font-bold text-ink">{s.value}</p>
              <p className="text-sm text-ink-faded mt-0.5">{s.label}</p>
            </motion.div>
          )
        })}
      </div>

      {/* Search + Status tabs */}
      <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2 bg-inset border border-edge rounded-xl px-3 py-2 focus-within:border-teal-500/40 transition-colors">
          <Search className="w-4 h-4 text-ink-muted shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par description ou station..."
            className="bg-transparent text-sm text-ink placeholder-ink-muted outline-none flex-1"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-ink-muted hover:text-ink-light">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusTab(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                statusTab === tab.key
                  ? 'bg-accent-wash text-accent'
                  : 'text-ink-muted hover:text-ink hover:bg-raised'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Incident cards */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
        </div>
      ) : incidents.length === 0 ? (
        <motion.div variants={rise} className="text-center py-12">
          <AlertTriangle className="w-10 h-10 mx-auto text-ink-muted opacity-30 mb-3" />
          <p className="text-sm text-ink-muted">Aucun incident trouvé</p>
        </motion.div>
      ) : (
        <motion.div variants={stagger} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {incidents.map((incident) => {
            const sev = severityConfig[incident.severity]
            const st = statusConfig[incident.statut] ?? statusConfig.open
            const SevIcon = sev.icon

            return (
              <motion.div
                key={incident.id}
                variants={rise}
                className="bg-panel border border-edge rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Gradient header strip */}
                <div className={`h-1.5 bg-gradient-to-r ${sev.gradient}`} />

                <div className="p-5">
                  {/* Top: severity + status badges */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg bg-gradient-to-br ${sev.gradient}`}>
                        <SevIcon className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-semibold ${sev.bg} ${sev.color}`}>
                        {sev.label}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-semibold ${st.bg} ${st.color}`}>
                        {st.label}
                      </span>
                    </div>
                    <span className="text-[10px] text-ink-muted">{formatDate(incident.dateDeclaration)}</span>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-ink mb-3 line-clamp-3">{incident.description}</p>

                  {/* Stops activity warning */}
                  {incident.stopsActivity && incident.statut !== 'resolved' && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 mb-3">
                      <Ban className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span className="text-[11px] font-medium text-red-600">Activité arrêtée</span>
                    </div>
                  )}

                  {/* Station */}
                  {incident.station && (
                    <div className="flex items-center gap-1.5 text-xs text-ink-light mb-3">
                      <MapPin className="w-3 h-3 text-ink-muted" />
                      {incident.station.nom}
                    </div>
                  )}

                  {/* Declarant + resolution */}
                  <div className="flex items-center justify-between text-[11px] text-ink-muted mb-3">
                    {incident.declarant && (
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3 h-3" />
                        {incident.declarant.prenom} {incident.declarant.nom}
                      </span>
                    )}
                    {incident.resolvedAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Résolu le {formatDate(incident.resolvedAt)}
                      </span>
                    )}
                  </div>

                  {/* Action buttons */}
                  {incident.statut !== 'resolved' && (
                    <div className="flex gap-2">
                      {incident.statut === 'open' && (
                        <button
                          onClick={() => handleChangeStatus(incident.id, 'in_progress')}
                          className="flex-1 text-xs font-medium py-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                        >
                          Prendre en charge
                        </button>
                      )}
                      <button
                        onClick={() => handleChangeStatus(incident.id, 'resolved')}
                        className="flex-1 text-xs font-medium py-2 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                      >
                        Résoudre
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </motion.div>
  )
}
