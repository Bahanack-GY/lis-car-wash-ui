import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Users, CreditCard, Car, Award,
  Search, X, ChevronLeft, ChevronRight, ChevronRight as ChevronNav,
} from 'lucide-react'
import { useClients } from '@/api/clients/queries'
import type { ClientFilters } from '@/api/clients/types'

/* ─── Animations ──────────────────────────────────────────────────── */
const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const rise = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

export default function AdminClients() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [search])

  const filters: ClientFilters = useMemo(() => ({
    search: debouncedSearch || undefined,
    page,
    limit: 12,
  }), [debouncedSearch, page])

  const { data, isLoading } = useClients(filters)

  const clients = data?.data ?? (Array.isArray(data) ? data : [])
  const totalPages = (data as any)?.totalPages ?? 1
  const total = (data as any)?.total ?? clients.length

  // Calculate stats from current data
  const subscriberCount = clients.filter((c: any) => (c.activeSubscriptionCount ?? 0) > 0).length
  const vehicleCount = clients.reduce((sum: number, c: any) => sum + (c.vehicleCount ?? 0), 0)
  const loyaltyTotal = clients.reduce((sum: number, c: any) => sum + (c.pointsFidelite ?? 0), 0)

  const stats = [
    { label: 'Total clients', value: total, icon: Users, accent: 'bg-teal-500/10 text-accent' },
    { label: 'Abonnés actifs', value: subscriberCount, icon: CreditCard, accent: 'bg-purple-500/10 text-grape' },
    { label: 'Véhicules', value: vehicleCount, icon: Car, accent: 'bg-amber-500/10 text-warn' },
    { label: 'Points fidélité', value: loyaltyTotal.toLocaleString('fr-FR'), icon: Award, accent: 'bg-emerald-500/10 text-ok' },
  ]

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

      {/* Search */}
      <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 bg-inset border border-edge rounded-xl px-3 py-2 focus-within:border-teal-500/40 transition-colors">
          <Search className="w-4 h-4 text-ink-muted shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, téléphone ou email..."
            className="bg-transparent text-sm text-ink placeholder-ink-muted outline-none flex-1"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-ink-muted hover:text-ink-light">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </motion.div>

      {/* Client cards */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
        </div>
      ) : clients.length === 0 ? (
        <motion.div variants={rise} className="text-center py-12">
          <Users className="w-10 h-10 mx-auto text-ink-muted opacity-30 mb-3" />
          <p className="text-sm text-ink-muted">Aucun client trouvé</p>
        </motion.div>
      ) : (
        <>
          <motion.div variants={stagger} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {clients.map((c: any) => {
              const initials = c.nom?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || '?'
              const hasSubscription = (c.activeSubscriptionCount ?? 0) > 0

              return (
                <motion.div
                  key={c.id}
                  variants={rise}
                  onClick={() => navigate(`/clients/${c.id}`)}
                  className="bg-panel border border-edge rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-teal-500 to-teal-800 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {initials}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-ink">{c.nom}</p>
                        {c.contact && (
                          <p className="text-xs text-ink-muted">{c.contact}</p>
                        )}
                      </div>
                    </div>
                    <ChevronNav className="w-4 h-4 text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  {c.email && (
                    <p className="text-xs text-ink-light mb-3 truncate">{c.email}</p>
                  )}

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-inset rounded-lg p-2 text-center">
                      <p className="text-sm font-bold text-ink">{c.vehicleCount ?? 0}</p>
                      <p className="text-[10px] text-ink-muted">Véhicules</p>
                    </div>
                    <div className="bg-inset rounded-lg p-2 text-center">
                      <p className="text-sm font-bold text-ink">{c.pointsFidelite ?? 0}</p>
                      <p className="text-[10px] text-ink-muted">Points</p>
                    </div>
                  </div>

                  <div className={`text-center py-1.5 rounded-lg text-xs font-medium ${
                    hasSubscription
                      ? 'bg-accent-wash text-accent border border-accent-line'
                      : 'bg-raised text-ink-muted'
                  }`}>
                    {hasSubscription ? 'Abonné' : 'Sans abonnement'}
                  </div>
                </motion.div>
              )
            })}
          </motion.div>

          {/* Pagination */}
          {totalPages > 1 && (
            <motion.div variants={rise} className="flex items-center justify-center gap-4 pt-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-xl border border-edge bg-panel text-ink-muted hover:text-ink hover:bg-raised transition-colors disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-ink-muted">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-xl border border-edge bg-panel text-ink-muted hover:text-ink hover:bg-raised transition-colors disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  )
}
