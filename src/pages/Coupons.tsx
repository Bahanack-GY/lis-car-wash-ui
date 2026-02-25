import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Ticket, Search, Plus, User, Car, CheckCircle2, Clock, Loader2, Droplets } from 'lucide-react'
import { useCoupons, useUpdateCouponStatus } from '@/api/coupons'
import type { Coupon } from '@/api/coupons/types'

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const rise = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

// Mapping API Statuses to UI Config
const statusCfg: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
  pending: { label: 'En attente', cls: 'bg-warn-wash text-warn border-warn-line', icon: Clock },
  washing: { label: 'Lavage en cours', cls: 'bg-info-wash text-info border-info-line', icon: Loader2 },
  done: { label: 'Terminé', cls: 'bg-ok-wash text-ok border-ok-line', icon: CheckCircle2 },
}

const TAB_STATUS_MAP: Record<string, string | null> = {
  'Tous': null,
  'En attente': 'pending',
  'En cours': 'washing',
  'Terminés': 'done',
}

const tabs = Object.keys(TAB_STATUS_MAP)

const emptyMessages: Record<string, string> = {
  'Tous': 'Aucun coupon trouvé.',
  'En attente': 'Aucun coupon en attente.',
  'En cours': 'Aucun lavage en cours.',
  'Terminés': 'Aucun coupon terminé.',
}

export default function Coupons() {
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('Tous')
  const navigate = useNavigate()

  // Queries & Mutations
  const { data: couponsData, isLoading, isError } = useCoupons()
  const updateStatus = useUpdateCouponStatus()

  const couponsList: Coupon[] = couponsData?.data || []

  // Counts per tab
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { 'Tous': couponsList.length }
    for (const [tab, status] of Object.entries(TAB_STATUS_MAP)) {
      if (status) counts[tab] = couponsList.filter(c => c.statut === status).length
    }
    return counts
  }, [couponsList])

  // Filtering
  const filtered = couponsList.filter((c) => {
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      (c.numero || '').toLowerCase().includes(q) ||
      (c.fichePiste?.client?.nom || '').toLowerCase().includes(q) ||
      (c.fichePiste?.vehicle?.immatriculation || '').toLowerCase().includes(q)
    const tabStatus = TAB_STATUS_MAP[activeTab]
    const matchTab = tabStatus === null || c.statut === tabStatus
    return matchSearch && matchTab
  })

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 relative">
      <motion.div variants={rise} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink flex items-center gap-2"><Ticket className="w-6 h-6 text-accent" /> Coupons</h1>
          <p className="text-ink-faded mt-1">Suivi des coupons de lavage et affectation des laveurs</p>
        </div>
        <button
          onClick={() => navigate('/nouveau-lavage')}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/25 hover:shadow-teal-500/35 transition-shadow text-sm"
        >
          <Plus className="w-4 h-4" /> Nouveau Lavage
        </button>
      </motion.div>

      <motion.div variants={rise} className="flex flex-col md:flex-row gap-3">
        <div className="flex items-center gap-2 bg-panel border border-edge rounded-xl px-4 py-2.5 flex-1 shadow-sm focus-within:border-teal-500/40 transition-colors">
          <Search className="w-4 h-4 text-ink-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par numéro, client ou immatriculation..."
            className="bg-transparent text-sm text-ink placeholder-ink-muted outline-none flex-1"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          <div className="flex bg-raised border border-edge rounded-xl p-1 shrink-0">
            {tabs.map((t) => {
              const count = tabCounts[t] ?? 0
              return (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                    activeTab === t ? 'bg-panel text-accent shadow-sm' : 'text-ink-faded hover:text-ink-light'
                  }`}
                >
                  {t}
                  <span className={`text-[10px] min-w-[18px] text-center px-1 py-0.5 rounded-md ${
                    activeTab === t ? 'bg-accent-wash text-accent' : 'bg-dim text-ink-muted'
                  }`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
        </div>
      ) : isError ? (
        <div className="p-4 bg-red-500/10 text-red-500 rounded-xl">
          Erreur lors du chargement des coupons.
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-ink-muted p-12 border border-dashed border-divider rounded-xl">
          {emptyMessages[activeTab] || 'Aucun coupon trouvé.'}
        </div>
      ) : (
        <motion.div
          key={activeTab}
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          {filtered.map((c) => {
            const st = statusCfg[c.statut] || { label: c.statut, cls: 'bg-raised text-ink-muted border-edge', icon: Clock }
            const StIcon = st.icon
            const displayTime = new Date(c.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
            const displayDate = new Date(c.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })

            const clientName = c.fichePiste?.client?.nom || 'Client inconnu'
            const vehiclePlate = c.fichePiste?.vehicle?.immatriculation || '—'
            const vehicleModel = c.fichePiste?.vehicle?.modele || ''
            const washType = c.fichePiste?.typeLavage?.nom || 'Lavage'
            const montant = Number(c.montantTotal) || 0

            return (
              <motion.div key={c.id} variants={rise} onClick={() => navigate(`/coupons/${c.id}`)} className="bg-panel border border-edge rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 cursor-pointer">
                <div className="px-5 pt-5 pb-3 border-b border-dashed border-edge">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-lg font-bold text-accent">{c.numero}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        const nextStatus = c.statut === 'pending' ? 'washing' : c.statut === 'washing' ? 'done' : 'pending';
                        updateStatus.mutate({ id: c.id, data: { statut: nextStatus } })
                      }}
                      disabled={updateStatus.isPending}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border cursor-pointer hover:opacity-80 disabled:opacity-50 ${st.cls}`}
                      title="Cliquez pour changer le statut"
                    >
                      <StIcon className={`w-3 h-3 ${c.statut === 'washing' ? 'animate-spin' : ''}`} />
                      {st.label}
                    </button>
                  </div>
                  <p className="text-xs text-ink-muted mt-1">{displayDate} — {displayTime}</p>
                </div>
                <div className="px-5 py-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-3.5 h-3.5 text-ink-muted" />
                    <span className="text-ink font-medium">{clientName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Car className="w-3.5 h-3.5 text-ink-muted" />
                    <span className="text-ink-light">{vehiclePlate}{vehicleModel ? ` — ${vehicleModel}` : ''}</span>
                  </div>
                  <div className="bg-inset rounded-xl px-3 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Droplets className="w-3.5 h-3.5 text-accent" />
                      <span className="text-sm text-ink font-medium">{washType}</span>
                    </div>
                    <span className="text-sm font-semibold text-accent">{montant.toLocaleString()} F</span>
                  </div>
                  <div>
                    <p className="text-xs text-ink-faded mb-1.5">Laveurs assignés</p>
                    <div className="flex flex-wrap gap-2">
                      {c.washers && c.washers.length > 0 ? c.washers.map((w) => (
                        <div key={w.id} className="flex items-center gap-1.5 bg-accent-wash text-accent-bold px-2.5 py-1 rounded-lg text-xs font-medium border border-accent-line">
                          <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center text-[10px] font-bold text-accent-bold">
                            {w.prenom?.[0] || w.nom[0]}
                          </div>
                          {w.prenom} {w.nom}
                        </div>
                      )) : (
                        <span className="text-xs text-ink-muted">Aucun laveur assigné</span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </motion.div>
  )
}
