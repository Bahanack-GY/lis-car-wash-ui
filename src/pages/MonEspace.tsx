import { motion } from 'framer-motion'
import {
  Car, TrendingUp, Award, Clock, CheckCircle2, Loader2,
  Phone, Mail, Droplets, Calendar,
} from '@/lib/icons'
import { useAuth } from '@/contexts/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/axios'

// ── Brand palette ─────────────────────────────────────────────────────────
const NAVY = '#283852'
const TEAL = '#33cbcc'
const WASH = '#e3f6f6'

// ── Types ─────────────────────────────────────────────────────────────────
interface MyCoupon {
  id: number
  numero: string
  statut: 'pending' | 'washing' | 'done'
  montantTotal: number
  createdAt: string
  fichePiste?: {
    vehicle?: { immatriculation: string; modele?: string; brand?: string }
    typeLavage?: { nom: string }
    client?: { nom: string }
  }
}

interface MyPerformance {
  vehiculesLaves: number
  bonusEstime: number
  date: string
}

// ── Status config ─────────────────────────────────────────────────────────
const STATUS = {
  pending: { label: 'En attente', bg: 'rgba(160,96,0,0.1)',     color: '#a06000', dot: '#f59e0b', ping: false },
  washing: { label: 'En cours',   bg: 'rgba(51,203,204,0.12)',  color: TEAL,      dot: TEAL,      ping: true  },
  done:    { label: 'Terminé',    bg: 'rgba(15,122,74,0.1)',    color: '#0f7a4a', dot: '#22c55e', ping: false },
} as const

// ── Animation variants ────────────────────────────────────────────────────
const stagger = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { staggerChildren: 0.07 } },
}
const rise = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

// ── Reusable status badge ─────────────────────────────────────────────────
function StatusBadge({ statut }: { statut: 'pending' | 'washing' | 'done' }) {
  const cfg = STATUS[statut] ?? STATUS.pending
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold font-body whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.ping ? (
        <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: cfg.dot }} />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: cfg.dot }} />
        </span>
      ) : (
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
      )}
      {cfg.label}
    </span>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function MonEspace() {
  const { user } = useAuth()

  const { data: coupons = [], isLoading: couponsLoading } = useQuery<MyCoupon[]>({
    queryKey: ['my-coupons'],
    queryFn: async () => {
      const res = await apiClient.get('/coupons/my-assigned')
      return res.data?.data ?? res.data ?? []
    },
    enabled: !!user,
  })

  const { data: performances = [] } = useQuery<MyPerformance[]>({
    queryKey: ['my-performance', user?.id],
    queryFn: async () => {
      const res = await apiClient.get(`/users/${user!.id}/performance`)
      return res.data ?? []
    },
    enabled: !!user,
  })

  const today     = new Date().toISOString().slice(0, 10)
  const todayPerf = performances.find((p) => p.date === today)
  const totalDone = coupons.filter((c) => c.statut === 'done').length
  const inProgress = coupons.filter((c) => c.statut === 'washing').length
  const totalBonus = performances.reduce((sum, p) => sum + Number(p.bonusEstime ?? 0), 0)
  const initials   = user ? `${user.prenom[0]}${user.nom[0]}`.toUpperCase() : '?'

  const activeCoupons    = coupons.filter((c) => c.statut !== 'done')
  const completedCoupons = coupons.filter((c) => c.statut === 'done')

  // Chart data: last 7 days, oldest → newest
  const chartPerfs = [...performances]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-7)
  const maxVehicles = Math.max(...chartPerfs.map((p) => p.vehiculesLaves), 1)
  const chartBonus  = chartPerfs.reduce((s, p) => s + Number(p.bonusEstime), 0)

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5 max-w-4xl mx-auto">

      {/* ── Hero ─────────────────────────────────────── */}
      <motion.div
        variants={rise}
        className="relative overflow-hidden rounded-2xl"
        style={{ background: NAVY }}
      >
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-[0.06]" style={{ background: TEAL }} />
        <div className="pointer-events-none absolute -bottom-12 -left-12 w-48 h-48 rounded-full opacity-[0.04]" style={{ background: TEAL }} />

        <div className="relative z-10 p-6 sm:p-8 flex flex-col sm:flex-row gap-6 sm:items-center justify-between">
          {/* Identity */}
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-xl flex-shrink-0 font-heading"
              style={{
                background: 'rgba(51,203,204,0.15)',
                border: '2px solid rgba(51,203,204,0.3)',
                color: TEAL,
              }}
            >
              {initials}
            </div>
            <div>
              <p
                className="text-[10px] font-medium tracking-[0.15em] uppercase font-body mb-1"
                style={{ color: TEAL }}
              >
                Mon espace
              </p>
              <h2
                className="font-heading font-bold text-white text-xl leading-tight"
                style={{ letterSpacing: '-0.01em' }}
              >
                {user?.prenom} {user?.nom}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-body"
                  style={{ background: 'rgba(51,203,204,0.18)', color: TEAL }}
                >
                  Laveur
                </span>
                {user?.email && (
                  <span className="flex items-center gap-1 text-[11px] font-body" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    <Mail className="w-3 h-3" />
                    {user.email}
                  </span>
                )}
                {user?.telephone && (
                  <span className="flex items-center gap-1 text-[11px] font-body" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    <Phone className="w-3 h-3" />
                    {user.telephone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Today's highlight */}
          <div
            className="flex items-center gap-5 rounded-xl px-5 py-4 flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
          >
            <div className="text-center">
              <p
                className="font-heading font-bold text-white leading-none"
                style={{ fontSize: 36, letterSpacing: '-0.03em' }}
              >
                {todayPerf?.vehiculesLaves ?? 0}
              </p>
              <p className="text-[10px] font-body uppercase tracking-wider mt-1.5" style={{ color: TEAL }}>
                Lavages<br />aujourd'hui
              </p>
            </div>
            <div className="w-px h-10 opacity-15 bg-white" />
            <div className="text-center">
              <p
                className="font-heading font-bold text-white leading-none"
                style={{ fontSize: 36, letterSpacing: '-0.03em' }}
              >
                {(todayPerf?.bonusEstime ?? 0).toLocaleString()}
              </p>
              <p className="text-[10px] font-body uppercase tracking-wider mt-1.5" style={{ color: TEAL }}>
                Bonus<br />FCFA
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Stats row ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          {
            label: 'Lavages terminés',
            value: totalDone,
            icon: CheckCircle2,
            accent: { bg: WASH, color: TEAL },
          },
          {
            label: 'En cours maintenant',
            value: inProgress,
            icon: Droplets,
            accent: { bg: 'rgba(51,203,204,0.1)', color: TEAL },
          },
          {
            label: "Bonus aujourd'hui",
            value: `${(todayPerf?.bonusEstime ?? 0).toLocaleString()} FCFA`,
            icon: TrendingUp,
            accent: { bg: '#f5ecff', color: '#7020b8' },
          },
          {
            label: 'Bonus cumulé',
            value: `${totalBonus.toLocaleString()} FCFA`,
            icon: Award,
            accent: { bg: '#fef8e8', color: '#a06000' },
          },
        ] as const).map((stat) => (
          <motion.div
            key={stat.label}
            variants={rise}
            className="bg-panel border border-edge rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
          >
            <div
              className="p-2 rounded-xl w-fit mb-3"
              style={{ background: stat.accent.bg }}
            >
              <stat.icon className="w-4 h-4" style={{ color: stat.accent.color }} />
            </div>
            <p
              className="font-heading font-bold text-ink text-xl sm:text-2xl leading-none"
              style={{ letterSpacing: '-0.02em' }}
            >
              {stat.value}
            </p>
            <p className="text-xs text-ink-muted mt-1.5 font-body">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Active & pending washes ─────────────────────── */}
      <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-edge flex items-center justify-between">
          <div>
            <h3 className="font-heading font-semibold text-ink">Lavages actifs</h3>
            <p className="text-xs text-ink-muted font-body mt-0.5">En attente et en cours de lavage</p>
          </div>
          <span
            className="text-xs px-2.5 py-1 rounded-full font-body font-medium"
            style={{ background: WASH, color: NAVY }}
          >
            {activeCoupons.length} actif{activeCoupons.length !== 1 ? 's' : ''}
          </span>
        </div>

        {couponsLoading ? (
          <div className="flex items-center justify-center py-12 gap-3">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: TEAL }} />
            <span className="text-sm text-ink-muted font-body">Chargement…</span>
          </div>

        ) : activeCoupons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-1"
              style={{ background: WASH }}
            >
              <Car className="w-6 h-6" style={{ color: TEAL }} />
            </div>
            <p className="text-sm font-medium text-ink-faded font-body">Aucun lavage actif</p>
            <p className="text-xs text-ink-muted font-body">Les lavages assignés apparaîtront ici.</p>
          </div>

        ) : (
          <div className="divide-y divide-edge">
            {activeCoupons.map((coupon) => {
              const vehicle  = coupon.fichePiste?.vehicle
              const client   = coupon.fichePiste?.client
              const washType = coupon.fichePiste?.typeLavage
              const isWashing = coupon.statut === 'washing'
              return (
                <div key={coupon.id} className="px-5 py-4 flex items-center gap-4 hover:bg-raised/50 transition-colors">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: isWashing ? 'rgba(51,203,204,0.12)' : 'var(--c-inset)' }}
                  >
                    <Car
                      className="w-5 h-5"
                      style={{ color: isWashing ? TEAL : 'var(--c-ink-muted)' }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink font-body truncate">
                      {vehicle
                        ? `${vehicle.brand ?? ''} ${vehicle.modele ?? ''} · ${vehicle.immatriculation}`.trim()
                        : coupon.numero}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      {client && <span className="text-xs text-ink-muted font-body">{client.nom}</span>}
                      {washType && <span className="text-xs text-ink-faded font-body">· {washType.nom}</span>}
                      <span className="text-xs text-ink-faded font-body">
                        · {new Date(coupon.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-semibold font-body" style={{ color: NAVY }}>
                      {Number(coupon.montantTotal).toLocaleString()} FCFA
                    </span>
                    <StatusBadge statut={coupon.statut} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </motion.div>

      {/* ── Bottom row: chart + completed ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Performance mini-chart */}
        {chartPerfs.length > 0 && (
          <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-heading font-semibold text-ink">7 derniers jours</h3>
                <p className="text-xs text-ink-muted font-body mt-0.5">Véhicules lavés par jour</p>
              </div>
              <div className="p-2 rounded-xl" style={{ background: WASH }}>
                <Calendar className="w-4 h-4" style={{ color: TEAL }} />
              </div>
            </div>

            {/* Bar chart */}
            <div className="flex items-end gap-2" style={{ height: 80 }}>
              {chartPerfs.map((p) => {
                const pct     = (p.vehiculesLaves / maxVehicles) * 100
                const isToday = p.date === today
                return (
                  <div key={p.date} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full relative" style={{ height: 68 }}>
                      <motion.div
                        className="absolute bottom-0 w-full rounded-t-lg"
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(pct, 5)}%` }}
                        transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
                        style={{ background: isToday ? TEAL : 'rgba(51,203,204,0.22)' }}
                      />
                    </div>
                    <span
                      className="text-[9px] font-body capitalize"
                      style={{ color: isToday ? TEAL : 'var(--c-ink-faded)' }}
                    >
                      {new Date(p.date + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 2)}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* 7-day bonus summary */}
            <div
              className="mt-4 flex items-center justify-between px-3 py-2.5 rounded-xl"
              style={{ background: WASH }}
            >
              <span className="text-xs font-body font-medium" style={{ color: NAVY }}>
                Bonus total (7 jours)
              </span>
              <span className="text-sm font-bold font-heading" style={{ color: TEAL }}>
                {chartBonus.toLocaleString()} FCFA
              </span>
            </div>
          </motion.div>
        )}

        {/* Completed washes */}
        {completedCoupons.length > 0 && (
          <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-edge flex items-center justify-between">
              <h3 className="font-heading font-semibold text-ink">Lavages terminés</h3>
              <span
                className="text-xs px-2.5 py-1 rounded-full font-body"
                style={{ background: 'var(--c-inset)', color: 'var(--c-ink-muted)' }}
              >
                {completedCoupons.length}
              </span>
            </div>
            <div className="divide-y divide-edge" style={{ maxHeight: 276, overflowY: 'auto' }}>
              {completedCoupons.map((coupon) => {
                const vehicle  = coupon.fichePiste?.vehicle
                const washType = coupon.fichePiste?.typeLavage
                return (
                  <div key={coupon.id} className="px-5 py-3 flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(15,122,74,0.1)' }}
                    >
                      <CheckCircle2 className="w-4 h-4" style={{ color: '#0f7a4a' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink font-body truncate">
                        {vehicle
                          ? `${vehicle.brand ?? ''} ${vehicle.modele ?? ''} · ${vehicle.immatriculation}`.trim()
                          : coupon.numero}
                      </p>
                      {washType && (
                        <p className="text-xs text-ink-muted font-body">{washType.nom}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                      <span className="text-sm font-semibold font-body" style={{ color: NAVY }}>
                        {Number(coupon.montantTotal).toLocaleString()} FCFA
                      </span>
                      <span className="text-[10px] text-ink-muted font-body">
                        {new Date(coupon.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

      </div>

      {/* ── Empty state: no completed, show prompt ─────── */}
      {!couponsLoading && completedCoupons.length === 0 && activeCoupons.length === 0 && (
        <motion.div
          variants={rise}
          className="flex flex-col items-center justify-center py-14 bg-panel border border-edge rounded-2xl gap-3"
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-1"
            style={{ background: WASH }}
          >
            <Clock className="w-7 h-7" style={{ color: TEAL }} />
          </div>
          <p className="font-heading font-semibold text-ink text-base">Aucun lavage pour l'instant</p>
          <p className="text-sm text-ink-muted font-body max-w-xs text-center">
            Vos lavages assignés apparaîtront ici dès qu'une tâche vous sera confiée.
          </p>
        </motion.div>
      )}

    </motion.div>
  )
}
