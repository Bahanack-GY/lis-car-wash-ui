import { motion } from 'framer-motion'
import { Car, TrendingUp, Award, Clock, CheckCircle2, Loader2, User, Phone, Mail, Star } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/axios'

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

const statusConfig = {
  pending: { label: 'En attente', cls: 'bg-amber-500/10 text-amber-500', icon: Clock },
  washing: { label: 'En cours', cls: 'bg-blue-500/10 text-blue-500', icon: Loader2 },
  done: { label: 'Terminé', cls: 'bg-emerald-500/10 text-emerald-500', icon: CheckCircle2 },
}

const rise = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}

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

  const today = new Date().toISOString().slice(0, 10)
  const todayPerf = performances.find((p) => p.date === today)
  const totalDone = coupons.filter((c) => c.statut === 'done').length
  const totalBonus = performances.reduce((sum, p) => sum + Number(p.bonusEstime ?? 0), 0)
  const initials = user ? `${user.prenom[0]}${user.nom[0]}` : '?'

  return (
    <motion.div variants={{ show: { transition: { staggerChildren: 0.08 } } }} initial="hidden" animate="show" className="space-y-6 max-w-4xl mx-auto">

      {/* Profile card */}
      <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-teal-600 to-teal-400 relative">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        </div>
        <div className="px-6 pb-6">
          <div className="flex items-end gap-4 -mt-10 mb-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white font-bold text-2xl border-4 border-panel shadow-lg flex-shrink-0">
              {initials}
            </div>
            <div className="pb-1">
              <h2 className="font-heading font-bold text-xl text-ink">{user?.prenom} {user?.nom}</h2>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-600">
                <Star className="w-3 h-3" /> Laveur
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            {user?.email && (
              <div className="flex items-center gap-2 text-ink-muted">
                <Mail className="w-4 h-4 text-ink-faded flex-shrink-0" />
                <span className="truncate">{user.email}</span>
              </div>
            )}
            {user?.telephone && (
              <div className="flex items-center gap-2 text-ink-muted">
                <Phone className="w-4 h-4 text-ink-faded flex-shrink-0" />
                <span>{user.telephone}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-ink-muted">
              <User className="w-4 h-4 text-ink-faded flex-shrink-0" />
              <span>ID #{user?.id}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Lavages aujourd'hui",
            value: todayPerf?.vehiculesLaves ?? 0,
            icon: Car,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
          },
          {
            label: 'Total lavages',
            value: totalDone,
            icon: CheckCircle2,
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10',
          },
          {
            label: "Bonus aujourd'hui",
            value: `${(todayPerf?.bonusEstime ?? 0).toLocaleString()} F`,
            icon: TrendingUp,
            color: 'text-teal-500',
            bg: 'bg-teal-500/10',
          },
          {
            label: 'Bonus cumulé',
            value: `${totalBonus.toLocaleString()} F`,
            icon: Award,
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

      {/* Coupons list */}
      <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl">
        <div className="px-6 py-4 border-b border-edge flex items-center justify-between">
          <h3 className="font-heading font-semibold text-ink">Mes lavages assignés</h3>
          <span className="text-xs text-ink-muted bg-raised px-2.5 py-1 rounded-full">{coupons.length} total</span>
        </div>

        {couponsLoading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
          </div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-12 text-ink-muted">
            <Car className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucun lavage assigné pour le moment</p>
          </div>
        ) : (
          <div className="divide-y divide-edge">
            {coupons.map((coupon) => {
              const cfg = statusConfig[coupon.statut] ?? statusConfig.pending
              const StatusIcon = cfg.icon
              const vehicle = coupon.fichePiste?.vehicle
              const client = coupon.fichePiste?.client
              const washType = coupon.fichePiste?.typeLavage
              return (
                <div key={coupon.id} className="px-6 py-4 flex items-center gap-4 hover:bg-raised/50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-raised flex items-center justify-center flex-shrink-0">
                    <Car className="w-5 h-5 text-ink-muted" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-ink">
                        {vehicle ? `${vehicle.brand ?? ''} ${vehicle.modele ?? ''} — ${vehicle.immatriculation}`.trim() : coupon.numero}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-ink-muted">
                      {client && <span>{client.nom}</span>}
                      {washType && <span className="text-ink-faded">• {washType.nom}</span>}
                      <span className="text-ink-faded">• {new Date(coupon.createdAt).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="font-semibold text-sm text-ink">
                      {Number(coupon.montantTotal).toLocaleString()} F
                    </span>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.cls}`}>
                      <StatusIcon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </motion.div>

      {/* Performance history */}
      {performances.length > 0 && (
        <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl">
          <div className="px-6 py-4 border-b border-edge">
            <h3 className="font-heading font-semibold text-ink">Historique de performances</h3>
          </div>
          <div className="divide-y divide-edge">
            {[...performances].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10).map((p) => (
              <div key={p.date} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-ink">
                    {new Date(p.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  <p className="text-xs text-ink-muted">{p.vehiculesLaves} véhicule{p.vehiculesLaves !== 1 ? 's' : ''} lavé{p.vehiculesLaves !== 1 ? 's' : ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-teal-600">+{Number(p.bonusEstime).toLocaleString()} F</p>
                  <p className="text-xs text-ink-muted">bonus</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
