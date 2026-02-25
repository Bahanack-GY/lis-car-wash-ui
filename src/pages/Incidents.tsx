import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle, Plus, Search, X, Pencil, CheckCircle2,
  AlertCircle, Clock, Ban, ShieldAlert, Info, Zap,
} from 'lucide-react'
import { useIncidents, useCreateIncident, useUpdateIncident } from '@/api/incidents'
import type { Incident, CreateIncidentDto, UpdateIncidentDto, IncidentSeverity } from '@/api/incidents/types'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const rise = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

type StatusFilter = 'all' | 'open' | 'in_progress' | 'resolved'

const severityConfig: Record<IncidentSeverity, { label: string; color: string; bg: string; icon: React.ElementType; gradient: string }> = {
  low: { label: 'Faible', color: 'text-blue-600', bg: 'bg-blue-500/10', icon: Info, gradient: 'from-blue-500 to-sky-500' },
  medium: { label: 'Moyen', color: 'text-amber-600', bg: 'bg-amber-500/10', icon: AlertCircle, gradient: 'from-amber-500 to-yellow-500' },
  high: { label: 'Élevé', color: 'text-orange-600', bg: 'bg-orange-500/10', icon: ShieldAlert, gradient: 'from-orange-500 to-red-400' },
  critical: { label: 'Critique', color: 'text-red-600', bg: 'bg-red-500/10', icon: Zap, gradient: 'from-red-600 to-red-500' },
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: 'Ouvert', color: 'text-red-600', bg: 'bg-red-500/10' },
  in_progress: { label: 'En cours', color: 'text-amber-600', bg: 'bg-amber-500/10' },
  resolved: { label: 'Résolu', color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
}

const statusTabs: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'open', label: 'Ouverts' },
  { key: 'in_progress', label: 'En cours' },
  { key: 'resolved', label: 'Résolus' },
]

const emptyForm: CreateIncidentDto = {
  stationId: 0,
  description: '',
  severity: 'medium',
  stopsActivity: false,
  dateDeclaration: new Date().toISOString().split('T')[0],
}

export default function Incidents() {
  const { selectedStationId } = useAuth()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null)
  const [formData, setFormData] = useState<CreateIncidentDto>(emptyForm)

  const { data: incidentsData, isLoading, isError } = useIncidents(
    selectedStationId ? {
      stationId: selectedStationId,
      statut: statusFilter !== 'all' ? statusFilter : undefined,
    } : undefined,
  )
  const createIncident = useCreateIncident()
  const updateIncident = useUpdateIncident()

  const incidents: Incident[] = incidentsData?.data || []

  const filtered = incidents.filter((inc) =>
    inc.description.toLowerCase().includes(search.toLowerCase()),
  )

  const allStationIncidents: Incident[] = (useIncidents(
    selectedStationId ? { stationId: selectedStationId, limit: 1000 } : undefined,
  ).data?.data || [])

  const totalCount = allStationIncidents.length
  const openCount = allStationIncidents.filter(i => i.statut === 'open').length
  const stoppedCount = allStationIncidents.filter(i => i.stopsActivity && i.statut !== 'resolved').length
  const resolvedCount = allStationIncidents.filter(i => i.statut === 'resolved').length

  const summaryStats = [
    { label: 'Total incidents', value: totalCount.toString(), icon: AlertTriangle, accent: 'bg-teal-500/10 text-accent' },
    { label: 'Ouverts', value: openCount.toString(), icon: AlertCircle, accent: 'bg-red-500/10 text-red-600' },
    { label: 'Activité arrêtée', value: stoppedCount.toString(), icon: Ban, accent: 'bg-orange-500/10 text-orange-600' },
    { label: 'Résolus', value: resolvedCount.toString(), icon: CheckCircle2, accent: 'bg-emerald-500/10 text-ok' },
  ]

  const openCreate = () => {
    setEditingIncident(null)
    setFormData({
      ...emptyForm,
      stationId: selectedStationId || 0,
      dateDeclaration: new Date().toISOString().split('T')[0],
    })
    setIsModalOpen(true)
  }

  const openEdit = (inc: Incident) => {
    setEditingIncident(inc)
    setFormData({
      stationId: inc.stationId,
      description: inc.description,
      severity: inc.severity,
      stopsActivity: inc.stopsActivity,
      dateDeclaration: inc.dateDeclaration,
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingIncident(null)
    setFormData(emptyForm)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingIncident) {
        const changes: UpdateIncidentDto = {}
        if (formData.description !== editingIncident.description) changes.description = formData.description
        if (formData.severity !== editingIncident.severity) changes.severity = formData.severity
        if (formData.stopsActivity !== editingIncident.stopsActivity) changes.stopsActivity = formData.stopsActivity
        if (formData.dateDeclaration !== editingIncident.dateDeclaration) changes.dateDeclaration = formData.dateDeclaration
        await updateIncident.mutateAsync({ id: editingIncident.id, data: changes })
        toast.success('Incident mis à jour')
      } else {
        await createIncident.mutateAsync({ ...formData, stationId: selectedStationId || formData.stationId })
        toast.success('Incident déclaré')
      }
      closeModal()
    } catch {
      toast.error('Erreur lors de l\'enregistrement')
    }
  }

  const handleResolve = async (inc: Incident) => {
    try {
      await updateIncident.mutateAsync({
        id: inc.id,
        data: { statut: 'resolved' },
      })
      toast.success('Incident marqué comme résolu')
    } catch {
      toast.error('Erreur lors de la résolution')
    }
  }

  const handleChangeStatus = async (inc: Incident, statut: 'open' | 'in_progress' | 'resolved') => {
    try {
      await updateIncident.mutateAsync({
        id: inc.id,
        data: { statut },
      })
      toast.success('Statut mis à jour')
    } catch {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const isPending = createIncident.isPending || updateIncident.isPending
  const isSubmitError = createIncident.isError || updateIncident.isError

  const formatDate = (d: string) => {
    try {
      return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d))
    } catch { return d }
  }

  return (
    <>
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 relative">
        {/* Header */}
        <motion.div variants={rise} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-ink flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-accent" /> Incidents
            </h1>
            <p className="text-ink-faded mt-1">Déclarez et suivez les incidents de la station</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/25 hover:shadow-teal-500/35 transition-shadow text-sm"
          >
            <Plus className="w-4 h-4" /> Déclarer un incident
          </button>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {summaryStats.map((s) => (
            <motion.div key={s.label} variants={rise} className="bg-panel border border-edge rounded-2xl p-4 shadow-sm">
              <div className={`p-2 rounded-xl w-fit ${s.accent} mb-3`}><s.icon className="w-4 h-4" /></div>
              <p className="font-heading text-xl font-bold text-ink">{s.value}</p>
              <p className="text-xs text-ink-faded mt-0.5">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Search + Status Tabs */}
        <motion.div variants={rise} className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 bg-panel border border-edge rounded-xl px-4 py-2.5 flex-1 shadow-sm focus-within:border-teal-500/40 transition-colors">
            <Search className="w-4 h-4 text-ink-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par description..."
              className="bg-transparent text-sm text-ink placeholder-ink-muted outline-none flex-1"
            />
          </div>
          <div className="flex bg-panel border border-edge rounded-xl p-1 shadow-sm">
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  statusFilter === tab.key
                    ? 'bg-accent-wash text-accent'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
          </div>
        ) : isError ? (
          <div className="p-4 bg-red-500/10 text-red-500 rounded-xl">
            Erreur lors du chargement des incidents.
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-ink-muted p-12 border border-dashed border-divider rounded-xl">
            {search ? 'Aucun incident ne correspond à la recherche.' : 'Aucun incident déclaré. La station fonctionne normalement.'}
          </div>
        ) : (
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          >
            {filtered.map((inc) => {
              const sev = severityConfig[inc.severity] || severityConfig.medium
              const stat = statusConfig[inc.statut] || statusConfig.open
              const SevIcon = sev.icon

              return (
                <motion.div
                  key={inc.id}
                  variants={rise}
                  className="bg-panel border border-edge rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 group"
                >
                  {/* Gradient header strip */}
                  <div className={`h-1.5 bg-gradient-to-r ${sev.gradient}`} />

                  <div className="p-5">
                    {/* Top row: severity icon + status + edit */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${sev.gradient} flex items-center justify-center text-white shadow-sm`}>
                          <SevIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sev.bg} ${sev.color}`}>
                              {sev.label}
                            </span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${stat.bg} ${stat.color}`}>
                              {stat.label}
                            </span>
                          </div>
                          <p className="text-xs text-ink-faded mt-1">{formatDate(inc.dateDeclaration)}</p>
                        </div>
                      </div>
                      {inc.statut !== 'resolved' && (
                        <button
                          onClick={() => openEdit(inc)}
                          className="p-1.5 rounded-lg text-ink-muted hover:text-accent hover:bg-accent-wash transition-colors opacity-0 group-hover:opacity-100"
                          title="Modifier"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-sm text-ink-light leading-relaxed mb-3 line-clamp-3">{inc.description}</p>

                    {/* Stops activity badge */}
                    {inc.stopsActivity && inc.statut !== 'resolved' && (
                      <div className="flex items-center gap-1.5 mb-3 px-2.5 py-1.5 bg-red-500/10 rounded-lg border border-red-500/20">
                        <Ban className="w-3.5 h-3.5 text-red-500" />
                        <span className="text-xs font-medium text-red-600">Activité arrêtée</span>
                      </div>
                    )}

                    {/* Declarant + resolution info */}
                    <div className="pt-3 border-t border-divider space-y-2">
                      {inc.declarant && (
                        <p className="text-xs text-ink-muted">
                          Déclaré par <span className="font-medium text-ink-faded">{inc.declarant.prenom} {inc.declarant.nom}</span>
                        </p>
                      )}
                      {inc.resolvedAt && (
                        <p className="text-xs text-emerald-600">
                          Résolu le {formatDate(inc.resolvedAt)}
                        </p>
                      )}

                      {/* Action buttons */}
                      {inc.statut !== 'resolved' && (
                        <div className="flex gap-2 pt-1">
                          {inc.statut === 'open' && (
                            <button
                              onClick={() => handleChangeStatus(inc, 'in_progress')}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-500/10 text-amber-700 rounded-lg hover:bg-amber-500/20 transition-colors"
                            >
                              <Clock className="w-3 h-3" /> Prendre en charge
                            </button>
                          )}
                          <button
                            onClick={() => handleResolve(inc)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-500/10 text-emerald-700 rounded-lg hover:bg-emerald-500/20 transition-colors"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Résoudre
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </motion.div>

      {/* ── Create / Edit Modal ──────────────────────── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-panel border border-edge rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-divider bg-inset">
                <h3 className="font-heading font-bold text-lg text-ink flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-accent" />
                  {editingIncident ? 'Modifier l\'incident' : 'Déclarer un incident'}
                </h3>
                <button
                  onClick={closeModal}
                  className="p-1 text-ink-muted hover:text-ink transition-colors rounded-lg hover:bg-raised"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {isSubmitError && (
                  <div className="p-3 bg-red-500/10 text-red-500 rounded-xl text-sm border border-red-500/20">
                    Erreur lors de {editingIncident ? 'la modification' : 'la déclaration'} de l'incident.
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-ink-light mb-1.5">Description *</label>
                  <textarea
                    required
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 resize-none"
                    placeholder="Décrivez l'incident en détail..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-light mb-1.5">Sévérité *</label>
                    <select
                      required
                      value={formData.severity}
                      onChange={(e) => setFormData({ ...formData, severity: e.target.value as IncidentSeverity })}
                      className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
                    >
                      <option value="low">Faible</option>
                      <option value="medium">Moyen</option>
                      <option value="high">Élevé</option>
                      <option value="critical">Critique</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-light mb-1.5">Date *</label>
                    <input
                      required
                      type="date"
                      value={formData.dateDeclaration}
                      onChange={(e) => setFormData({ ...formData, dateDeclaration: e.target.value })}
                      className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-inset border border-outline rounded-xl">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, stopsActivity: !formData.stopsActivity })}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                      formData.stopsActivity ? 'bg-red-500' : 'bg-raised border border-edge'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                        formData.stopsActivity ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <div>
                    <p className="text-sm font-medium text-ink">Arrête l'activité</p>
                    <p className="text-xs text-ink-muted">La station ne peut plus fonctionner</p>
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-divider mt-6">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 font-medium text-ink-light hover:text-ink transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-5 py-2 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-xl transition-colors disabled:opacity-70 flex items-center gap-2"
                  >
                    {isPending ? 'Enregistrement...' : editingIncident ? 'Mettre à jour' : 'Déclarer'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
