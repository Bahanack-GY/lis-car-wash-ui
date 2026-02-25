import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Wallet,
  Car,
  Droplets,
  CalendarCheck,
  TrendingUp,
  MoreHorizontal,
  ArrowUpRight,
  Loader2,
} from 'lucide-react'
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

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
}
const rise = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' as const } },
}

const WASH_TYPE_COLORS = ['#33cbcc', '#283852', '#5dd8d8', '#94a3b8', '#a78bfa', '#f472b6']
const DOT_COLORS = ['bg-emerald-500', 'bg-teal-500', 'bg-amber-500', 'bg-blue-500', 'bg-red-500', 'bg-purple-500']

const periodTabs: { key: DatePeriod; label: string }[] = [
  { key: 'today', label: "Aujourd'hui" },
  { key: 'week', label: 'Cette semaine' },
  { key: 'month', label: 'Ce mois' },
  { key: 'year', label: 'Année' },
  { key: 'custom', label: 'Personnalisé' },
]

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function computeDateParams(period: DatePeriod, customStart: string, customEnd: string): GlobalDateParams {
  const now = new Date()
  const todayStr = toDateStr(now)

  switch (period) {
    case 'today':
      return { startDate: todayStr, endDate: todayStr }
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
      return {
        startDate: customStart || todayStr,
        endDate: customEnd || todayStr,
      }
  }
}

const periodLabels: Record<DatePeriod, string> = {
  today: "aujourd'hui",
  week: 'cette semaine',
  month: 'ce mois',
  year: 'cette année',
  custom: 'la période sélectionnée',
}

const periodUnitLabels: Record<DatePeriod, string> = {
  today: "aujourd'hui",
  week: 'cette semaine',
  month: 'ce mois',
  year: 'cette année',
  custom: 'période',
}

export default function Dashboard() {
  const { selectedStationId } = useAuth()
  const stationId = selectedStationId ?? 0

  // Period state
  const [period, setPeriod] = useState<DatePeriod>('today')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const dateParams = useMemo(
    () => computeDateParams(period, customStart, customEnd),
    [period, customStart, customEnd],
  )

  const { data: statsRes, isLoading: statsLoading, isFetching: statsFetching } = useDashboardStats(stationId, dateParams)
  const { data: revRes, isLoading: revLoading, isFetching: revFetching } = useDashboardRevenue(stationId, dateParams)
  const { data: activityRes, isLoading: actLoading } = useDashboardActivity(stationId, dateParams)
  const { data: topRes, isLoading: topLoading } = useDashboardTopPerformers(stationId, dateParams)
  const { data: distRes, isLoading: distLoading } = useDashboardWashTypeDistribution(stationId, dateParams)

  // Only show full-page spinner on very first load (no data yet at all)
  const isFirstLoad = statsLoading || revLoading || actLoading || topLoading || distLoading
  const isFetching = statsFetching || revFetching

  const stats = statsRes
  const revData = revRes || []
  const activities = activityRes || []
  const topPerformers = topRes || []
  const distribution = distRes || []

  const unitLabel = periodUnitLabels[period]

  // Formatting Revenue Data for Recharts
  const revenueChartData = useMemo(() => {
    const count = revData.length
    return revData.map((d) => {
      const date = new Date(d.date)
      let name: string
      if (count <= 7) {
        name = date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })
      } else if (count <= 31) {
        name = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
      } else {
        name = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
      }
      return { name, rev: d.amount }
    })
  }, [revData])

  // Formatting Distribution Data
  const pieData = useMemo(() => {
    return distribution.map((d, i) => ({
      name: d.type,
      value: d.percentage,
      count: d.count,
      color: WASH_TYPE_COLORS[i % WASH_TYPE_COLORS.length]
    }))
  }, [distribution])

  const statCards = [
    { label: 'Revenu', value: stats?.revenue?.toLocaleString() || '0', unit: 'FCFA', change: '', icon: Wallet, accent: 'bg-teal-500/10 text-accent' },
    { label: 'Véhicules lavés', value: stats?.vehicules?.toString() || '0', unit: unitLabel, change: '', icon: Car, accent: 'bg-blue-500/10 text-info' },
    { label: 'Lavages en cours', value: stats?.lavagesActifs?.toString() || '0', unit: 'actifs', change: '', icon: Droplets, accent: 'bg-purple-500/10 text-grape' },
    { label: 'Réservations', value: stats?.reservations?.toString() || '0', unit: unitLabel, change: '', icon: CalendarCheck, accent: 'bg-amber-500/10 text-warn' },
  ]

  if (isFirstLoad) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
         <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
         <p className="text-sm text-ink-muted">Chargement du tableau de bord...</p>
      </div>
    )
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 relative">
      <motion.div variants={rise} className="space-y-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink">Bonjour, Admin</h1>
          <p className="text-ink-faded mt-1 flex items-center gap-2">
            Voici un aperçu de votre station {periodLabels[period]}
            {isFetching && <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-500" />}
          </p>
        </div>

        {/* Period filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-panel border border-edge rounded-xl p-1 shadow-sm">
            {periodTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setPeriod(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  period === tab.key
                    ? 'bg-accent-wash text-accent'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {period === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-panel border border-edge rounded-xl px-3 py-1.5 text-sm text-ink outline-none focus:border-teal-500 shadow-sm"
              />
              <span className="text-ink-muted text-sm">—</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-panel border border-edge rounded-xl px-3 py-1.5 text-sm text-ink outline-none focus:border-teal-500 shadow-sm"
              />
            </div>
          )}
        </div>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((s) => {
           const Icon = s.icon
           return (
             <motion.div
               key={s.label}
               variants={rise}
               className="bg-panel border border-edge rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow duration-300"
             >
               <div className="flex items-start justify-between mb-4">
                 <div className={`p-2.5 rounded-xl ${s.accent}`}>
                   <Icon className="w-5 h-5" />
                 </div>
                 {s.change && (
                   <span className="flex items-center gap-1 text-xs font-medium text-ok">
                     <TrendingUp className="w-3 h-3" />
                     {s.change}
                   </span>
                 )}
               </div>
               <p className="font-heading text-2xl font-bold text-ink">{s.value}</p>
               <p className="text-sm text-ink-faded mt-1">{s.unit}</p>
             </motion.div>
           )
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <motion.div variants={rise} className="xl:col-span-2 bg-panel border border-edge rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-heading font-semibold text-ink">Tendance des revenus</h3>
              <p className="text-sm text-ink-faded mt-0.5">Évolution sur la période</p>
            </div>
            <button className="text-ink-muted hover:text-ink-light transition-colors">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
          {revenueChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={270}>
              <AreaChart data={revenueChartData}>
                <defs>
                  <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#33cbcc" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#33cbcc" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--c-edge)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--c-ink-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--c-ink-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v / 1000}k`} />
                <RechartsTooltip
                  contentStyle={{ background: 'var(--c-panel)', border: '1px solid var(--c-edge)', borderRadius: 12, color: 'var(--c-ink)', fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
                  formatter={(v: number | undefined) => [`${(v ?? 0).toLocaleString()} FCFA`, 'Revenu']}
                />
                <Area type="monotone" dataKey="rev" stroke="#33cbcc" strokeWidth={2.5} fill="url(#gRev)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[270px] flex items-center justify-center border border-dashed border-edge rounded-xl inset-0">
               <p className="text-sm text-ink-muted">Aucune donnée de revenu récente</p>
            </div>
          )}
        </motion.div>

        <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl p-6 shadow-sm flex flex-col">
          <h3 className="font-heading font-semibold text-ink mb-4">Types de lavage</h3>
          {pieData.length > 0 ? (
            <>
              <div className="flex-1 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                      {pieData.map((w) => (
                        <Cell key={w.name} fill={w.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ background: 'var(--c-panel)', border: '1px solid var(--c-edge)', borderRadius: 12, color: 'var(--c-ink)', fontSize: 13 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-4 max-h-[140px] overflow-y-auto pr-2">
                {pieData.map((w) => (
                  <div key={w.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: w.color }} />
                      <span className="text-ink-light truncate max-w-[120px]" title={w.name}>{w.name}</span>
                    </div>
                    <span className="text-ink-faded font-medium">{Math.round(w.value)}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
             <div className="flex-1 flex items-center justify-center border border-dashed border-edge rounded-xl min-h-[200px]">
                 <p className="text-sm text-ink-muted">Aucune répartition disponible</p>
             </div>
          )}
        </motion.div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-heading font-semibold text-ink">Activité récente</h3>
            <button className="text-accent text-sm hover:text-accent-bold transition-colors flex items-center gap-1">
              Voir tout <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
          {activities.length > 0 ? (
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {activities.map((a, i) => (
                <div key={a.id} className="flex items-center gap-4">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${DOT_COLORS[i % DOT_COLORS.length]}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ink font-medium">{a.type}</p>
                    <p className="text-xs text-ink-faded truncate">{a.description} {a.userId ? `(User ${a.userId})` : ''}</p>
                  </div>
                  <span className="text-xs text-ink-muted whitespace-nowrap">
                    {new Date(a.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-6 border border-dashed border-edge rounded-xl">
               <p className="text-sm text-ink-muted">Aucune activité récente</p>
            </div>
          )}
        </motion.div>

        <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-heading font-semibold text-ink">Meilleurs laveurs</h3>
            <span className="text-xs text-ink-faded bg-raised px-2.5 py-1 rounded-full capitalize">{periodLabels[period]}</span>
          </div>
          {topPerformers.length > 0 ? (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {topPerformers.map((w, i) => {
                const initials = w.nom[0] + (w.prenom?.[0] || '')
                return (
                  <div key={w.id} className="flex items-center gap-4 bg-inset rounded-xl p-3 hover:bg-raised transition-colors">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-dim text-ink-light font-heading font-bold text-xs shrink-0">
                      #{i + 1}
                    </div>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-navy-500 flex items-center justify-center text-white font-bold text-xs shrink-0 uppercase">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{w.prenom} {w.nom}</p>
                      <p className="text-xs text-ink-faded">{w.lavages} véhicules lavés</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-accent">{w.score.toLocaleString()} pts</p>
                      <p className="text-[10px] text-ink-muted uppercase tracking-wider">Score</p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center p-6 border border-dashed border-edge rounded-xl">
               <p className="text-sm text-ink-muted">Aucun leaderboard disponible</p>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  )
}
