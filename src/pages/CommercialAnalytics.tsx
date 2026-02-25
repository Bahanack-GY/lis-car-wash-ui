import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Car, CheckCircle2, Clock, Target, TrendingUp,
  Search, Filter, X, ChevronDown, BarChart3, User, Phone,
} from 'lucide-react'
import { useCommercialStats, useCommercialHistory } from '@/api/commercial/queries'
import type { HistoryFilters } from '@/api/commercial/queries'

const rise = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}

export default function CommercialAnalytics() {
  const { data: stats } = useCommercialStats()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const filters: HistoryFilters = useMemo(() => {
    const f: HistoryFilters = {}
    if (search.trim()) f.search = search.trim()
    if (statusFilter) f.status = statusFilter
    if (dateFrom) f.from = dateFrom
    if (dateTo) f.to = dateTo
    return f
  }, [search, statusFilter, dateFrom, dateTo])

  const { data: history = [], isLoading } = useCommercialHistory(filters)

  const goalPercent = stats ? Math.min((stats.todayConfirmed / stats.dailyGoal) * 100, 100) : 0
  const goalReached = goalPercent >= 100

  const hasActiveFilters = !!search || !!statusFilter || !!dateFrom || !!dateTo

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('')
    setDateFrom('')
    setDateTo('')
  }

  return (
    <motion.div
      variants={{ show: { transition: { staggerChildren: 0.08 } } }}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-5xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={rise} className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-blue-500" />
        </div>
        <div>
          <h2 className="font-heading font-bold text-xl text-ink">Statistiques & Historique</h2>
          <p className="text-sm text-ink-muted">Suivez vos performances et votre historique d'enregistrements</p>
        </div>
      </motion.div>

      {/* Daily goal progress */}
      {stats && (
        <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading font-semibold text-ink flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-500" />
              Objectif du jour
            </h3>
            <span className="text-sm font-medium text-ink-muted">
              {stats.todayConfirmed} / {stats.dailyGoal}
            </span>
          </div>
          <div className="relative h-4 bg-inset rounded-full overflow-hidden border border-edge">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${goalPercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`absolute inset-y-0 left-0 rounded-full ${
                goalReached
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                  : 'bg-gradient-to-r from-blue-600 to-blue-400'
              }`}
            />
          </div>
          {goalReached && (
            <p className="text-xs text-emerald-500 font-medium mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Objectif atteint !
            </p>
          )}
        </motion.div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Enregistrés aujourd'hui",
            value: stats?.todayTotal ?? 0,
            icon: Car,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
          },
          {
            label: "Confirmés aujourd'hui",
            value: stats?.todayConfirmed ?? 0,
            icon: CheckCircle2,
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10',
          },
          {
            label: 'Total enregistrés',
            value: stats?.allTimeTotal ?? 0,
            icon: TrendingUp,
            color: 'text-teal-500',
            bg: 'bg-teal-500/10',
          },
          {
            label: 'Total confirmés',
            value: stats?.allTimeConfirmed ?? 0,
            icon: Target,
            color: 'text-purple-500',
            bg: 'bg-purple-500/10',
          },
        ].map((stat) => (
          <motion.div key={stat.label} variants={rise} className="bg-panel border border-edge rounded-2xl p-4">
            <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-2xl font-bold text-ink font-heading">{stat.value}</p>
            <p className="text-xs text-ink-muted mt-0.5">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* History table */}
      <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl">
        {/* Header with search and filters */}
        <div className="px-6 py-4 border-b border-edge space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-semibold text-ink">Historique des enregistrements</h3>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-ink-muted hover:text-ink flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-raised transition-colors"
                >
                  <X className="w-3 h-3" />
                  Effacer filtres
                </button>
              )}
              <span className="text-xs text-ink-muted bg-raised px-2.5 py-1 rounded-full">
                {history.length} résultat{history.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-inset border border-edge rounded-xl focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/50 transition-all">
              <Search className="w-4 h-4 text-ink-muted flex-shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value.toUpperCase())}
                placeholder="Rechercher par matricule, nom ou téléphone..."
                className="bg-transparent text-sm text-ink placeholder-ink-muted outline-none w-full font-mono"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-ink-muted hover:text-ink">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all text-sm font-medium ${
                showFilters || hasActiveFilters
                  ? 'border-blue-500/40 bg-blue-500/5 text-blue-600'
                  : 'border-edge bg-inset text-ink-muted hover:text-ink hover:border-outline'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filtres
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Filter panel */}
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1"
            >
              <div>
                <label className="text-xs font-medium text-ink-muted mb-1 block">Statut</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-inset border border-edge rounded-xl text-sm text-ink outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="">Tous</option>
                  <option value="confirmed">Confirmé</option>
                  <option value="pending">En attente</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-ink-muted mb-1 block">Date début</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 bg-inset border border-edge rounded-xl text-sm text-ink outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-ink-muted mb-1 block">Date fin</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 bg-inset border border-edge rounded-xl text-sm text-ink outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </motion.div>
          )}
        </div>

        {/* Table content */}
        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 text-ink-muted">
            <Car className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {hasActiveFilters ? 'Aucun résultat pour ces filtres' : 'Aucun enregistrement'}
            </p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="hidden sm:grid grid-cols-[1fr_1.2fr_0.8fr_0.6fr_auto] gap-4 px-6 py-3 border-b border-edge bg-raised/50 text-xs font-medium text-ink-muted uppercase tracking-wider">
              <span>Matricule</span>
              <span>Prospect</span>
              <span>Date</span>
              <span>Heure</span>
              <span className="text-right">Statut</span>
            </div>

            <div className="divide-y divide-edge">
              {history.map((reg) => (
                <div
                  key={reg.id}
                  className="px-6 py-4 flex items-center gap-4 sm:grid sm:grid-cols-[1fr_1.2fr_0.8fr_0.6fr_auto] hover:bg-raised/50 transition-colors"
                >
                  {/* Plate */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-raised flex items-center justify-center flex-shrink-0 sm:hidden">
                      <Car className="w-4 h-4 text-ink-muted" />
                    </div>
                    <span className="text-sm font-semibold text-ink font-mono tracking-wider truncate">
                      {reg.immatriculation}
                    </span>
                  </div>

                  {/* Prospect info */}
                  <div className="hidden sm:block min-w-0">
                    <p className="text-sm text-ink truncate flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-ink-muted flex-shrink-0" />
                      {reg.prospectNom}
                    </p>
                    <p className="text-xs text-ink-muted truncate flex items-center gap-1.5 mt-0.5">
                      <Phone className="w-3 h-3 text-ink-muted flex-shrink-0" />
                      {reg.prospectTelephone}
                    </p>
                  </div>

                  {/* Date */}
                  <span className="hidden sm:block text-sm text-ink-muted">
                    {new Date(reg.date).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>

                  {/* Time */}
                  <div className="hidden sm:block">
                    <span className="text-sm text-ink-muted">
                      {new Date(reg.createdAt).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Mobile: prospect + date/time */}
                  <div className="flex-1 sm:hidden text-right">
                    <p className="text-xs text-ink truncate">{reg.prospectNom}</p>
                    <p className="text-xs text-ink-muted">
                      {new Date(reg.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                      {' '}
                      {new Date(reg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="flex-shrink-0 text-right">
                    {reg.confirmed ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500">
                        <CheckCircle2 className="w-3 h-3" />
                        Confirmé
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500">
                        <Clock className="w-3 h-3" />
                        En attente
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}
