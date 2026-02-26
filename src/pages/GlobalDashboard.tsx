import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Wallet,
  Car,
  Droplets,
  CalendarCheck,
  Building2,
  AlertTriangle,
  Trophy,
  Loader2,
  MoreHorizontal,
  Crown,
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
  BarChart,
  Bar,
  Legend,
} from 'recharts'

import {
  useGlobalStats,
  useGlobalRevenueByStation,
  useGlobalStationRanking,
  useGlobalTopPerformers,
  useGlobalWashTypeDistribution,
} from '@/api/dashboard'
import type { DatePeriod, GlobalDateParams } from '@/api/dashboard'

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
}
const rise = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' as const } },
}

const STATION_COLORS = ['#33cbcc', '#f59e0b', '#8b5cf6', '#ef4444', '#3b82f6', '#ec4899', '#10b981', '#f97316']
const WASH_TYPE_COLORS = ['#33cbcc', '#283852', '#5dd8d8', '#94a3b8', '#a78bfa', '#f472b6']

const tooltipStyle = {
  background: 'var(--c-panel)',
  border: '1px solid var(--c-edge)',
  borderRadius: 12,
  color: 'var(--c-ink)',
  fontSize: 13,
  boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
}

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

export default function GlobalDashboard() {
  // Period state
  const [period, setPeriod] = useState<DatePeriod>('today')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const dateParams = useMemo(
    () => computeDateParams(period, customStart, customEnd),
    [period, customStart, customEnd],
  )

  const { data: stats, isLoading: statsLoading, isFetching: statsFetching } = useGlobalStats(dateParams)
  const { data: revenueByStation, isLoading: revLoading, isFetching: revFetching } = useGlobalRevenueByStation(dateParams)
  const { data: ranking, isLoading: rankLoading } = useGlobalStationRanking(dateParams)
  const { data: topPerformers, isLoading: topLoading } = useGlobalTopPerformers(dateParams)
  const { data: distribution, isLoading: distLoading } = useGlobalWashTypeDistribution(dateParams)

  const isFirstLoad = statsLoading || revLoading || rankLoading || topLoading || distLoading
  const isFetching = statsFetching || revFetching

  // Bar chart data: station revenue comparison
  const barData = useMemo(() => {
    if (!ranking) return []
    return ranking.map((s, i) => ({
      name: s.stationName,
      revenue: s.revenue,
      fill: STATION_COLORS[i % STATION_COLORS.length],
    }))
  }, [ranking])

  // Multi-line area chart: revenue per station over the period
  const multiLineData = useMemo(() => {
    if (!revenueByStation || revenueByStation.length === 0) return []
    const dates = revenueByStation[0]?.data.map((d) => d.date) ?? []

    // Determine date format based on number of data points
    const count = dates.length
    const formatDate = (dateStr: string) => {
      const d = new Date(dateStr)
      if (count <= 7) return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })
      if (count <= 31) return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
      return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    }

    return dates.map((date) => {
      const row: Record<string, unknown> = {
        name: formatDate(date),
      }
      revenueByStation.forEach((station) => {
        const match = station.data.find((d) => d.date === date)
        row[station.stationName] = match?.amount ?? 0
      })
      return row
    })
  }, [revenueByStation])

  // Pie chart data
  const pieData = useMemo(() => {
    if (!distribution) return []
    return distribution.map((d, i) => ({
      name: d.type,
      value: d.percentage,
      count: d.count,
      color: WASH_TYPE_COLORS[i % WASH_TYPE_COLORS.length],
    }))
  }, [distribution])

  const unitLabel = periodUnitLabels[period]

  const statCards = [
    { label: 'Revenu total', value: stats?.totalRevenue?.toLocaleString() || '0', unit: 'FCFA', icon: Wallet, accent: 'bg-teal-500/10 text-accent' },
    { label: 'Véhicules lavés', value: stats?.totalVehicules?.toString() || '0', unit: unitLabel, icon: Car, accent: 'bg-blue-500/10 text-info' },
    { label: 'Lavages en cours', value: stats?.totalLavagesActifs?.toString() || '0', unit: 'actifs', icon: Droplets, accent: 'bg-purple-500/10 text-grape' },
    { label: 'Réservations', value: stats?.totalReservations?.toString() || '0', unit: unitLabel, icon: CalendarCheck, accent: 'bg-amber-500/10 text-warn' },
    { label: 'Stations actives', value: stats?.stationCount?.toString() || '0', unit: 'stations', icon: Building2, accent: 'bg-emerald-500/10 text-ok' },
    { label: 'Incidents actifs', value: stats?.incidentCount?.toString() || '0', unit: 'non résolus', icon: AlertTriangle, accent: 'bg-red-500/10 text-bad' },
  ]

  if (isFirstLoad) {
    return (
      <div className="flex items-center justify-center py-24 space-x-3">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
        <p className="text-sm text-ink-muted">Chargement du tableau de bord global...</p>
      </div>
    )
  }

  return (
    <div>
          <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
            {/* Title + Period selector */}
            <motion.div variants={rise} className="pt-2 space-y-4">
              <div>
                <h2 className="font-heading text-2xl sm:text-3xl font-bold text-ink tracking-tight">
                  Vue d'ensemble
                </h2>
                <p className="text-ink-faded mt-1 flex items-center gap-2">
                  Performance de toutes vos stations {periodLabels[period]}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
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
                    </div>
                    <p className="font-heading text-2xl font-bold text-ink">{s.value}</p>
                    <p className="text-sm text-ink-faded mt-1">{s.unit}</p>
                  </motion.div>
                )
              })}
            </div>

            {/* Station revenue ranking (bar chart) + Wash type pie */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <motion.div variants={rise} className="xl:col-span-2 bg-panel border border-edge rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-heading font-semibold text-ink">Revenu par station</h3>
                    <p className="text-sm text-ink-faded mt-0.5">Comparaison sur la période</p>
                  </div>
                  <button className="text-ink-muted hover:text-ink-light transition-colors">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>
                {barData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--c-edge)" vertical={false} />
                      <XAxis dataKey="name" stroke="var(--c-ink-muted)" fontSize={11} tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={60} />
                      <YAxis stroke="var(--c-ink-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v: number) => v >= 1000 ? `${v / 1000}k` : `${v}`} />
                      <RechartsTooltip
                        contentStyle={tooltipStyle}
                        formatter={(v: number | undefined) => [`${(v ?? 0).toLocaleString()} FCFA`, 'Revenu']}
                      />
                      <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                        {barData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center border border-dashed border-edge rounded-xl">
                    <p className="text-sm text-ink-muted">Aucune donnée de revenu</p>
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
                          <RechartsTooltip contentStyle={tooltipStyle} />
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

            {/* Revenue trends (multi-line) */}
            <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-heading font-semibold text-ink">Tendance des revenus</h3>
                  <p className="text-sm text-ink-faded mt-0.5">Évolution par station sur la période</p>
                </div>
              </div>
              {multiLineData.length > 0 && revenueByStation ? (
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={multiLineData}>
                    <defs>
                      {revenueByStation.map((station, i) => (
                        <linearGradient key={station.stationId} id={`gStation${station.stationId}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={STATION_COLORS[i % STATION_COLORS.length]} stopOpacity={0.15} />
                          <stop offset="95%" stopColor={STATION_COLORS[i % STATION_COLORS.length]} stopOpacity={0} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--c-edge)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--c-ink-muted)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--c-ink-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v: number) => v >= 1000 ? `${v / 1000}k` : `${v}`} />
                    <RechartsTooltip
                      contentStyle={tooltipStyle}
                      formatter={(v: number | undefined, name: string) => [`${(v ?? 0).toLocaleString()} FCFA`, name]}
                    />
                    <Legend />
                    {revenueByStation.map((station, i) => (
                      <Area
                        key={station.stationId}
                        type="monotone"
                        dataKey={station.stationName}
                        stroke={STATION_COLORS[i % STATION_COLORS.length]}
                        strokeWidth={2}
                        fill={`url(#gStation${station.stationId})`}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[320px] flex items-center justify-center border border-dashed border-edge rounded-xl">
                  <p className="text-sm text-ink-muted">Aucune donnée de tendance</p>
                </div>
              )}
            </motion.div>

            {/* Bottom row: Ranking + Top performers */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {/* Station ranking */}
              <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-heading font-semibold text-ink">Classement des stations</h3>
                  <span className="text-xs text-ink-faded bg-raised px-2.5 py-1 rounded-full capitalize">{periodLabels[period]}</span>
                </div>
                {ranking && ranking.length > 0 ? (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {ranking.map((s, i) => (
                      <div
                        key={s.stationId}
                        className={`flex items-center gap-4 rounded-xl p-3 transition-colors ${
                          i === 0 ? 'bg-accent-wash border border-accent-line' : 'bg-inset hover:bg-raised'
                        }`}
                      >
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-heading font-bold text-xs shrink-0 ${
                          i === 0 ? 'bg-accent/10 text-accent' : 'bg-dim text-ink-light'
                        }`}>
                          {i === 0 ? <Crown className="w-4 h-4" /> : `#${i + 1}`}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-ink truncate">{s.stationName}</p>
                            {s.hasIncident && (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-ink-faded">
                            {s.vehicules} véhicule{s.vehicules !== 1 ? 's' : ''} · {s.reservations} réservation{s.reservations !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-sm font-semibold ${i === 0 ? 'text-accent' : 'text-ink'}`}>
                            {s.revenue.toLocaleString()}
                          </p>
                          <p className="text-[10px] text-ink-muted uppercase tracking-wider">FCFA</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-6 border border-dashed border-edge rounded-xl">
                    <p className="text-sm text-ink-muted">Aucune donnée de classement</p>
                  </div>
                )}
              </motion.div>

              {/* Global top performers */}
              <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-heading font-semibold text-ink">Meilleurs laveurs</h3>
                  <span className="flex items-center gap-1.5 text-xs text-ink-faded bg-raised px-2.5 py-1 rounded-full">
                    <Trophy className="w-3 h-3" />
                    Toutes stations
                  </span>
                </div>
                {topPerformers && topPerformers.length > 0 ? (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {topPerformers.map((w, i) => {
                      const initials = w.nom[0] + (w.prenom?.[0] || '')
                      return (
                        <div key={w.id} className="flex items-center gap-4 bg-inset rounded-xl p-3 hover:bg-raised transition-colors">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-dim text-ink-light font-heading font-bold text-xs shrink-0">
                            #{i + 1}
                          </div>
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white font-bold text-xs shrink-0 uppercase">
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-ink truncate">{w.prenom} {w.nom}</p>
                            <p className="text-xs text-ink-faded">{w.lavages} véhicules · {w.stationName}</p>
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
    </div>
  )
}
