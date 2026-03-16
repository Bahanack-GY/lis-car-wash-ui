import { useMemo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wallet,
  Car,
  Droplets,
  CalendarCheck,
  TrendingDown,
  Loader2,
} from '@/lib/icons'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

import {
  useDashboardStats,
  useDashboardRevenue,
  useDashboardActivity,
  useDashboardTopPerformers,
  useDashboardWashTypeDistribution,
} from '@/api/dashboard'
import type { DatePeriod, GlobalDateParams } from '@/api/dashboard'
import { useAuth } from '@/contexts/AuthContext'

// ── Brand palette ──────────────────────────────────────────────────────
const NAVY   = '#283852'
const TEAL   = '#33cbcc'
const WASH   = '#e3f6f6'
const WASH_TYPE_COLORS = ['#33cbcc', '#283852', '#5dd8d8', '#1a9a9b', '#34496a', '#0e6b6c']

// ── Loading messages ───────────────────────────────────────────────────
const LOADING_MESSAGES = [
  'Récupération de vos données…',
  'Calcul des revenus du jour…',
  'Synchronisation de la station…',
  'Mise à jour des statistiques…',
  'Préparation de votre espace…',
]

// ── Animation variants ─────────────────────────────────────────────────
const stagger = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { staggerChildren: 0.07 } },
}
const rise = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

// ── Period config ──────────────────────────────────────────────────────
const periodTabs: { key: DatePeriod; label: string }[] = [
  { key: 'today',  label: "Aujourd'hui" },
  { key: 'week',   label: 'Cette semaine' },
  { key: 'month',  label: 'Ce mois' },
  { key: 'year',   label: 'Année' },
  { key: 'custom', label: 'Personnalisé' },
]

const periodLabels: Record<DatePeriod, string> = {
  today:  "aujourd'hui",
  week:   'cette semaine',
  month:  'ce mois',
  year:   'cette année',
  custom: 'la période',
}

const periodUnitLabels: Record<DatePeriod, string> = {
  today:  "aujourd'hui",
  week:   'cette semaine',
  month:  'ce mois',
  year:   'cette année',
  custom: 'période',
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function computeDateParams(period: DatePeriod, customStart: string, customEnd: string): GlobalDateParams {
  const now = new Date()
  const todayStr = toDateStr(now)
  switch (period) {
    case 'today':  return { startDate: todayStr, endDate: todayStr }
    case 'week': {
      const day = now.getDay()
      const monday = new Date(now)
      monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
      return { startDate: toDateStr(monday), endDate: todayStr }
    }
    case 'month': {
      const first = new Date(now.getFullYear(), now.getMonth(), 1)
      return { startDate: toDateStr(first), endDate: todayStr }
    }
    case 'year': {
      const jan1 = new Date(now.getFullYear(), 0, 1)
      return { startDate: toDateStr(jan1), endDate: todayStr }
    }
    case 'custom':
      return { startDate: customStart || todayStr, endDate: customEnd || todayStr }
  }
}

export default function Dashboard() {
  const { selectedStationId, user } = useAuth()
  const stationId = selectedStationId ?? 0

  const [period, setPeriod]       = useState<DatePeriod>('today')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd]     = useState('')

  const dateParams = useMemo(
    () => computeDateParams(period, customStart, customEnd),
    [period, customStart, customEnd],
  )

  const { data: statsRes, isLoading: statsLoading, isFetching: statsFetching } = useDashboardStats(stationId, dateParams)
  const { data: revRes,   isLoading: revLoading,   isFetching: revFetching   } = useDashboardRevenue(stationId, dateParams)
  const { data: activityRes, isLoading: actLoading  } = useDashboardActivity(stationId, dateParams)
  const { data: topRes,      isLoading: topLoading  } = useDashboardTopPerformers(stationId, dateParams)
  const { data: distRes,     isLoading: distLoading } = useDashboardWashTypeDistribution(stationId, dateParams)

  const isFirstLoad = statsLoading || revLoading || actLoading || topLoading || distLoading
  const isFetching  = statsFetching || revFetching

  const stats        = statsRes
  const revData      = revRes       || []
  const activities   = activityRes  || []
  const topPerformers = topRes      || []
  const distribution  = distRes    || []
  const unitLabel     = periodUnitLabels[period]
  const firstName     = user?.prenom ?? 'Admin'

  // Chart data
  const revenueChartData = useMemo(() => {
    const count = revData.length
    return revData.map((d) => {
      const date = new Date(d.date)
      const name = count <= 7
        ? date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })
        : date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
      return { name, rev: d.amount }
    })
  }, [revData])

  const pieData = useMemo(() =>
    distribution.map((d, i) => ({
      name: d.type, value: d.percentage, count: d.count,
      color: WASH_TYPE_COLORS[i % WASH_TYPE_COLORS.length],
    })),
    [distribution],
  )

  const statCards = [
    { label: 'Revenu',          value: stats?.revenue?.toLocaleString()      || '0', unit: 'FCFA',    icon: Wallet,       accent: { bg: 'var(--c-accent-wash)', color: 'var(--c-accent)' } },
    { label: 'Dépenses',        value: stats?.expenses?.toLocaleString()     || '0', unit: 'FCFA',    icon: TrendingDown, accent: { bg: 'var(--c-bad-wash)',    color: 'var(--c-bad)' } },
    { label: 'Véhicules lavés', value: stats?.vehicules?.toString()          || '0', unit: unitLabel, icon: Car,          accent: { bg: 'var(--c-info-wash)',   color: 'var(--c-info)' } },
    { label: 'Lavages actifs',  value: stats?.lavagesActifs?.toString()      || '0', unit: 'actifs',  icon: Droplets,     accent: { bg: 'var(--c-grape-wash)',  color: 'var(--c-grape)' } },
    { label: 'Réservations',    value: stats?.reservations?.toString()       || '0', unit: unitLabel, icon: CalendarCheck, accent: { bg: 'var(--c-warn-wash)',  color: 'var(--c-warn)' } },
  ]

  // ── Loading ────────────────────────────────────────
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0)
  useEffect(() => {
    if (!isFirstLoad) return
    const id = setInterval(() => setLoadingMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length), 2000)
    return () => clearInterval(id)
  }, [isFirstLoad])

  if (isFirstLoad) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-5">
        {/* Animated dots */}
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-2 h-2 rounded-full"
              style={{ background: TEAL }}
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
              transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
        </div>
        {/* Rotating message */}
        <div className="h-5 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={loadingMsgIdx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="text-sm text-ink-muted font-body text-center"
            >
              {LOADING_MESSAGES[loadingMsgIdx]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    )
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">

      {/* ── En-tête + période ─────────────────────────── */}
      <motion.div variants={rise} className="space-y-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink" style={{ letterSpacing: '-0.01em' }}>
            Bonjour, {firstName}
          </h1>
          <p className="text-ink-faded mt-1 flex items-center gap-2 font-body">
            Voici un aperçu de votre station {periodLabels[period]}
            {isFetching && <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: TEAL }} />}
          </p>
        </div>

        {/* Period tabs */}
        <div className="flex flex-wrap items-start gap-2">
          <div className="flex bg-panel border border-edge rounded-xl p-1 shadow-sm overflow-x-auto max-w-full shrink-0">
            {periodTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setPeriod(tab.key)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all font-body whitespace-nowrap"
                style={{
                  background: period === tab.key ? WASH : undefined,
                  color: period === tab.key ? NAVY : 'var(--c-ink-muted)',
                  
                  fontWeight: period === tab.key ? 600 : 400,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {period === 'custom' && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-panel border border-edge rounded-xl px-3 py-1.5 text-sm text-ink outline-none shadow-sm font-body"
               
                onFocus={(e) => (e.target.style.borderColor = TEAL)}
                onBlur={(e) => (e.target.style.borderColor = '')}
              />
              <span className="text-ink-muted text-sm">—</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-panel border border-edge rounded-xl px-3 py-1.5 text-sm text-ink outline-none shadow-sm font-body"
               
                onFocus={(e) => (e.target.style.borderColor = TEAL)}
                onBlur={(e) => (e.target.style.borderColor = '')}
              />
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Stat cards ────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {statCards.map((s) => {
          const Icon = s.icon
          return (
            <motion.div
              key={s.label}
              variants={rise}
              className="bg-panel border border-edge rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-ink-muted uppercase tracking-wide font-body">
                  {s.label}
                </p>
                <div
                  className="p-2 rounded-xl"
                  style={{ background: s.accent.bg }}
                >
                  <Icon className="w-4 h-4" style={{ color: s.accent.color }} />
                </div>
              </div>
              <p className="font-heading text-2xl font-bold text-ink" style={{ letterSpacing: '-0.02em' }}>
                {s.value}
              </p>
              <p className="text-xs text-ink-muted mt-1 font-body">
                {s.unit}
              </p>
            </motion.div>
          )
        })}
      </div>

      {/* ── Charts ────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Revenue area chart */}
        <motion.div variants={rise} className="xl:col-span-2 bg-panel border border-edge rounded-2xl p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="font-heading font-semibold text-ink">Tendance des revenus</h3>
            <p className="text-sm text-ink-faded mt-0.5 font-body">
              Évolution sur la période
            </p>
          </div>

          {revenueChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220} className="sm:!h-[260px]">
              <AreaChart data={revenueChartData}>
                <defs>
                  <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={TEAL} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={TEAL} stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--c-edge)" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="var(--c-ink-muted)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--c-ink-muted)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `${v / 1000}k`}
                />
                <RechartsTooltip
                  contentStyle={{
                    background: 'var(--c-panel)',
                    border: '1px solid var(--c-edge)',
                    borderRadius: 12,
                    color: 'var(--c-ink)',
                    fontSize: 13,
                    
                    boxShadow: '0 4px 20px rgba(40,56,82,0.1)',
                  }}
                  formatter={(v: number | undefined) => [`${(v ?? 0).toLocaleString()} FCFA`, 'Revenu']}
                />
                <Area type="monotone" dataKey="rev" stroke={TEAL} strokeWidth={2.5} fill="url(#gRev)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex flex-col items-center justify-center gap-2 border border-dashed border-edge rounded-xl px-6 text-center">
              <p className="text-sm font-medium text-ink-faded font-body">Aucune opération enregistrée</p>
              <p className="text-xs text-ink-muted font-body">Les revenus s'afficheront dès le premier lavage de la période.</p>
            </div>
          )}
        </motion.div>

        {/* Wash type pie */}
        <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl p-6 shadow-sm flex flex-col">
          <h3 className="font-heading font-semibold text-ink mb-4">Types de lavage</h3>
          {pieData.length > 0 ? (
            <>
              <div className="flex-1 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((w) => <Cell key={w.name} fill={w.color} />)}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        background: 'var(--c-panel)',
                        border: '1px solid var(--c-edge)',
                        borderRadius: 12,
                        color: 'var(--c-ink)',
                        fontSize: 13,
                        
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-4 max-h-[140px] overflow-y-auto pr-2">
                {pieData.map((w) => (
                  <div key={w.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: w.color }} />
                      <span className="text-ink-light truncate font-body" style={{ maxWidth: 120 }} title={w.name}>
                        {w.name}
                      </span>
                    </div>
                    <span className="text-ink-faded font-medium font-body">
                      {Math.round(w.value)}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 border border-dashed border-edge rounded-xl min-h-[200px] px-6 text-center">
              <p className="text-sm font-medium text-ink-faded font-body">Aucun lavage effectué</p>
              <p className="text-xs text-ink-muted font-body">La répartition par type apparaîtra ici.</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Activity + Top performers ─────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Activity */}
        <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl p-6 shadow-sm">
          <div className="mb-5">
            <h3 className="font-heading font-semibold text-ink">Activité récente</h3>
          </div>

          {activities.length > 0 ? (
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {activities.map((a) => {
                return (
                  <div key={a.id} className="flex items-start gap-4">
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2 bg-accent"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-ink font-medium font-body">
                        {a.type}
                      </p>
                      <p className="text-xs text-ink-faded truncate font-body">
                        {a.description}
                      </p>
                    </div>
                    <span className="text-xs text-ink-muted whitespace-nowrap font-body">
                      {new Date(a.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center p-6 border border-dashed border-edge rounded-xl space-y-1">
              <p className="text-sm font-medium text-ink-faded font-body">Aucune activité pour l'instant</p>
              <p className="text-xs text-ink-muted font-body">Les nouvelles opérations apparaissent ici en temps réel.</p>
            </div>
          )}
        </motion.div>

        {/* Top performers */}
        <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-heading font-semibold text-ink">Meilleurs laveurs</h3>
            <span
              className="text-xs px-2.5 py-1 rounded-full capitalize font-body"
              style={{ background: WASH, color: NAVY }}
            >
              {periodLabels[period]}
            </span>
          </div>

          {topPerformers.length > 0 ? (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {topPerformers.map((w, i) => {
                const initials = w.nom[0] + (w.prenom?.[0] || '')
                const isFirst = i === 0
                return (
                  <div
                    key={w.id}
                    className="flex items-center gap-4 p-3 rounded-xl transition-colors"
                    style={{ background: isFirst ? WASH : 'var(--c-inset)' }}
                  >
                    <div
                      className="flex items-center justify-center w-8 h-8 rounded-lg font-heading font-bold text-xs shrink-0"
                      style={{ background: 'var(--c-dim)', color: 'var(--c-ink-light)' }}
                    >
                      #{i + 1}
                    </div>
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 uppercase"
                      style={{ background: isFirst ? TEAL : NAVY }}
                    >
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate font-body">
                        {w.prenom} {w.nom}
                      </p>
                      <p className="text-xs text-ink-faded font-body">
                        {w.lavages} véhicules lavés
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold font-body" style={{ color: TEAL }}>
                        {w.score.toLocaleString()} pts
                      </p>
                      <p className="text-[10px] text-ink-muted uppercase tracking-wider font-body">
                        Score
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center p-6 border border-dashed border-edge rounded-xl space-y-1">
              <p className="text-sm font-medium text-ink-faded font-body">Aucun lavage assigné</p>
              <p className="text-xs text-ink-muted font-body">Attribuez des laveurs lors du prochain lavage pour voir le classement.</p>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  )
}
