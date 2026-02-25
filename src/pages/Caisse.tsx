import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  CreditCard, Banknote, Smartphone, Wallet, Receipt, TrendingUp,
  ArrowDownLeft, ArrowUpRight, Search, Filter, Plus, X,
  Ticket, Car, User, CheckCircle2, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { usePaiements, useCaisseSummary, useCreatePaiement } from '@/api/paiements'
import { useCoupons, useUpdateCouponStatus } from '@/api/coupons'
import { useAuth } from '@/contexts/AuthContext'
import type { CreatePaiementDto, Paiement } from '@/api/paiements/types'
import type { Coupon } from '@/api/coupons/types'

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const rise = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

// Helpers for mappings
const METHOD_LABELS: Record<string, string> = {
  cash: 'Espèces',
  card: 'Carte bancaire',
  wave: 'Wave',
  orange_money: 'Orange Money',
  transfer: 'Virement',
}


const PAYMENT_METHODS: { value: CreatePaiementDto['methode']; label: string; icon: typeof Banknote }[] = [
  { value: 'cash', label: 'Espèces', icon: Banknote },
  { value: 'wave', label: 'Wave', icon: Smartphone },
  { value: 'orange_money', label: 'Orange Money', icon: Smartphone },
  { value: 'card', label: 'Carte', icon: CreditCard },
  { value: 'transfer', label: 'Virement', icon: Wallet },
]

export default function Caisse() {
  const navigate = useNavigate()
  const { selectedStationId } = useAuth()

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modalType, setModalType] = useState<'income' | 'expense' | null>(null)
  const [payingCouponId, setPayingCouponId] = useState<number | null>(null)
  const [couponPayMethod, setCouponPayMethod] = useState<CreatePaiementDto['methode']>('cash')
  const [couponPayRef, setCouponPayRef] = useState('')

  // Form
  const [formData, setFormData] = useState<Partial<CreatePaiementDto>>({
    methode: 'cash',
    montant: 0,
    description: '',
    referenceExterne: '',
  })

  // Queries & Mutations
  const stationId = selectedStationId || 0
  const { data: summaryData } = useCaisseSummary(stationId)
  const { data: paiementsData, isLoading, isError } = usePaiements({ stationId, page, limit: 10 })
  const createPaiement = useCreatePaiement()
  const updateCouponStatus = useUpdateCouponStatus()
  const { data: couponsData } = useCoupons({ statut: 'done', stationId: selectedStationId || undefined })

  const doneCoupons: Coupon[] = (couponsData?.data || []).filter(c => c.statut === 'done')

  const paiementsList: Paiement[] = paiementsData?.data || []
  const totalPages = paiementsData?.totalPages || 1
  const totalTransactions = paiementsData?.total || 0

  const totalRecettes = Number(summaryData?.totalRecettes) || 0
  const totalDepenses = Number(summaryData?.totalDepenses) || 0

  // Break down by method from the transactions list
  let totalCash = 0, totalMobile = 0, totalCard = 0
  paiementsList.forEach(p => {
    const amount = Number(p.montant) || 0
    if (p.type === 'income') {
      if (p.methode === 'cash') totalCash += amount
      if (p.methode === 'wave' || p.methode === 'orange_money') totalMobile += amount
      if (p.methode === 'card') totalCard += amount
    }
  })

  const summaryCards = [
    { label: 'Total encaissé', value: totalRecettes.toLocaleString(), unit: 'FCFA', icon: Wallet, accent: 'bg-teal-500/10 text-accent', trend: '' },
    { label: 'Espèces', value: totalCash.toLocaleString(), unit: 'FCFA', icon: Banknote, accent: 'bg-emerald-500/10 text-ok', trend: '' },
    { label: 'Mobile Money', value: totalMobile.toLocaleString(), unit: 'FCFA', icon: Smartphone, accent: 'bg-purple-500/10 text-grape', trend: '' },
    { label: 'Carte bancaire', value: totalCard.toLocaleString(), unit: 'FCFA', icon: CreditCard, accent: 'bg-blue-500/10 text-info', trend: '' },
  ]

  const filtered = paiementsList.filter((t) => 
    t.description?.toLowerCase().includes(search.toLowerCase()) || 
    t.referenceExterne?.toLowerCase().includes(search.toLowerCase()) || 
    t.id.toString().includes(search)
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!modalType) return

    try {
      const payload: CreatePaiementDto = {
        type: modalType,
        montant: Number(formData.montant),
        methode: formData.methode as CreatePaiementDto['methode'],
        description: formData.description || '',
        referenceExterne: formData.referenceExterne || undefined,
        stationId: selectedStationId || 1,
      }
      await createPaiement.mutateAsync(payload)
      setModalType(null)
      // Reset form
      setFormData({ methode: 'cash', montant: 0, description: '', referenceExterne: '' })
    } catch (err) {
      console.error('Failed to create Paiement', err)
    }
  }

  const handleCouponPayment = async (coupon: Coupon) => {
    const montant = Number(coupon.montantTotal) || 0
    try {
      await createPaiement.mutateAsync({
        type: 'income',
        montant,
        methode: couponPayMethod,
        description: `Paiement coupon ${coupon.numero} — ${coupon.fichePiste?.client?.nom || 'Client'}`,
        referenceExterne: couponPayRef || coupon.numero,
        stationId: selectedStationId || coupon.fichePiste?.stationId || 1,
      })
      await updateCouponStatus.mutateAsync({ id: coupon.id, data: { statut: 'paid' } })
      toast.success(`Coupon ${coupon.numero} encaissé !`)
      setPayingCouponId(null)
      setCouponPayMethod('cash')
      setCouponPayRef('')
    } catch {
      toast.error("Erreur lors de l'encaissement")
    }
  }

  return (
    <>
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 relative">
        <motion.div variants={rise} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-ink flex items-center gap-2">
              <Receipt className="w-6 h-6 text-accent" /> Caisse
            </h1>
            <p className="text-ink-faded mt-1">Gestion des paiements et flux de trésorerie</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setModalType('expense')}
              className="flex items-center gap-2 px-4 py-2.5 bg-panel border border-edge text-ink-light font-medium rounded-xl shadow-sm hover:bg-inset transition-colors text-sm"
            >
              <ArrowDownLeft className="w-4 h-4 text-red-500" /> Dépense
            </button>
            <button 
              onClick={() => setModalType('income')}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/25 hover:shadow-teal-500/35 transition-shadow text-sm"
            >
              <Plus className="w-4 h-4" /> Encaisser
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {summaryCards.map((c) => {
            const Icon = c.icon
            return (
              <motion.div key={c.label} variants={rise} className="bg-panel border border-edge rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2.5 rounded-xl ${c.accent}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  {c.trend && <span className="text-xs font-medium text-ok flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {c.trend}</span>}
                </div>
                <p className="font-heading text-2xl font-bold text-ink">{c.value}</p>
                <p className="text-sm text-ink-faded mt-1">{c.label}</p>
              </motion.div>
            )
          })}
        </div>

        {/* ── Done coupons awaiting payment ─────────────── */}
        {doneCoupons.length > 0 && (
          <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-divider bg-inset/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-ok-wash">
                  <CheckCircle2 className="w-4 h-4 text-ok" />
                </div>
                <h3 className="font-heading font-semibold text-ink text-sm">Coupons à encaisser</h3>
                <span className="text-xs bg-accent-wash text-accent px-2 py-0.5 rounded-full font-medium">{doneCoupons.length}</span>
              </div>
            </div>

            <div className="divide-y divide-divider">
              {doneCoupons.map(c => {
                const montant = Number(c.montantTotal) || 0
                const isExpanded = payingCouponId === c.id

                return (
                  <div key={c.id} className="px-5 py-4">
                    <div className="flex items-center gap-4">
                      {/* Coupon info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Ticket className="w-4 h-4 text-accent shrink-0" />
                          <span className="text-sm font-mono font-medium text-accent">{c.numero}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-ink-muted">
                          {c.fichePiste?.client && (
                            <span className="flex items-center gap-1"><User className="w-3 h-3" /> {c.fichePiste.client.nom}</span>
                          )}
                          {c.fichePiste?.vehicle && (
                            <span className="flex items-center gap-1"><Car className="w-3 h-3" /> {c.fichePiste.vehicle.immatriculation}</span>
                          )}
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="text-right shrink-0">
                        <p className="font-heading font-bold text-ink">{montant.toLocaleString()} FCFA</p>
                      </div>

                      {/* Pay / expand button */}
                      {!isExpanded ? (
                        <button
                          onClick={() => setPayingCouponId(c.id)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-teal-600 to-teal-500 text-white text-xs font-semibold rounded-xl shadow-sm shadow-teal-500/20 hover:shadow-teal-500/30 transition-all shrink-0"
                        >
                          <Banknote className="w-3.5 h-3.5" /> Encaisser
                        </button>
                      ) : (
                        <button
                          onClick={() => { setPayingCouponId(null); setCouponPayRef('') }}
                          className="p-1.5 text-ink-muted hover:text-ink rounded-lg hover:bg-raised transition-colors shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Expanded payment form */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 pt-4 border-t border-dashed border-divider space-y-3">
                            <div>
                              <p className="text-xs font-medium text-ink-light mb-2">Méthode de paiement</p>
                              <div className="flex flex-wrap gap-2">
                                {PAYMENT_METHODS.map(m => {
                                  const sel = couponPayMethod === m.value
                                  const MIcon = m.icon
                                  return (
                                    <button
                                      key={m.value}
                                      onClick={() => setCouponPayMethod(m.value)}
                                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                        sel ? 'bg-accent-wash text-accent border-accent-line' : 'bg-inset text-ink-muted border-divider hover:border-outline'
                                      }`}
                                    >
                                      <MIcon className="w-3 h-3" /> {m.label}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                            <div className="flex items-end gap-2">
                              <div className="flex-1">
                                <p className="text-xs font-medium text-ink-light mb-1.5">Référence (optionnel)</p>
                                <input
                                  type="text"
                                  value={couponPayRef}
                                  onChange={(e) => setCouponPayRef(e.target.value)}
                                  placeholder="N° reçu ou ID transaction"
                                  className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-sm text-ink placeholder-ink-muted outline-none focus:border-teal-500 transition-colors"
                                />
                              </div>
                              <button
                                onClick={() => handleCouponPayment(c)}
                                disabled={createPaiement.isPending}
                                className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-teal-600 to-teal-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30 transition-all disabled:opacity-50 shrink-0"
                              >
                                {createPaiement.isPending ? 'Encaissement...' : 'Confirmer'}
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        <motion.div variants={rise} className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 bg-panel border border-edge rounded-xl px-4 py-2.5 flex-1 shadow-sm focus-within:border-teal-500/40 transition-colors">
            <Search className="w-4 h-4 text-ink-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une transaction..."
              className="bg-transparent text-sm text-ink placeholder-ink-muted outline-none flex-1"
            />
          </div>
          <button className="p-2.5 bg-panel border border-edge rounded-xl text-ink-muted hover:text-ink-light shadow-sm transition-colors">
            <Filter className="w-4 h-4" />
          </button>
        </motion.div>

        <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
            </div>
          ) : isError ? (
            <div className="p-4 bg-red-500/10 text-red-500 rounded-xl m-4">
              Erreur lors du chargement des transactions.
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-ink-muted p-12 border-t border-divider">
              Aucune transaction trouvée.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-edge bg-inset/50">
                      <th className="px-5 py-4 text-xs font-semibold text-ink-faded uppercase tracking-wider">Réf.</th>
                      <th className="px-5 py-4 text-xs font-semibold text-ink-faded uppercase tracking-wider">Description</th>
                      <th className="px-5 py-4 text-xs font-semibold text-ink-faded uppercase tracking-wider hidden lg:table-cell">Méthode</th>
                      <th className="px-5 py-4 text-xs font-semibold text-ink-faded uppercase tracking-wider hidden lg:table-cell">Encaissé par</th>
                      <th className="px-5 py-4 text-xs font-semibold text-ink-faded uppercase tracking-wider text-right">Montant</th>
                      <th className="px-5 py-4 text-xs font-semibold text-ink-faded uppercase tracking-wider text-right">Date & Heure</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((t) => {
                      const methodLabel = METHOD_LABELS[t.methode] || t.methode
                      const displayTime = t.createdAt ? new Date(t.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'N/A'
                      
                      return (
                        <tr key={t.id} className="border-b border-divider hover:bg-inset transition-colors">
                          <td className="px-5 py-4 text-sm font-mono text-accent">TX-{t.id.toString().padStart(4, '0')}</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              {t.type === 'income' ? <ArrowDownLeft className="w-4 h-4 text-emerald-500" /> : <ArrowUpRight className="w-4 h-4 text-red-500" />}
                              <span className="text-sm text-ink">{t.description || 'Transaction sans descr.'}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 hidden lg:table-cell">
                            <span className="text-xs px-2 py-1 rounded-lg bg-raised text-ink-light">{methodLabel}</span>
                          </td>
                          <td className="px-5 py-4 hidden lg:table-cell">
                            {t.user ? (
                              <span className="text-xs text-ink-light">{t.user.prenom} {t.user.nom}</span>
                            ) : (
                              <span className="text-xs text-ink-muted">—</span>
                            )}
                          </td>
                          <td className={`px-5 py-4 text-sm font-semibold text-right ${t.type === 'income' ? 'text-ok' : 'text-bad'}`}>
                            {t.type === 'income' ? '+' : '-'}{Number(t.montant).toLocaleString()} FCFA
                          </td>
                          <td className="px-5 py-4 text-sm text-ink-muted text-right">{displayTime}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-divider flex items-center justify-between">
                <span className="text-sm text-ink-muted">{totalTransactions} transaction(s)</span>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-1.5 rounded-lg hover:bg-raised transition-colors disabled:opacity-30"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-2 text-xs font-medium text-ink">{page} / {totalPages}</span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="p-1.5 rounded-lg hover:bg-raised transition-colors disabled:opacity-30"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </motion.div>
      </motion.div>

      {/* ── Transaction Modal ──────────────────────── */}
      <AnimatePresence>
        {modalType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalType(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-panel border border-edge rounded-2xl shadow-xl overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-divider bg-inset shrink-0">
                <h3 className="font-heading font-bold text-lg text-ink flex items-center gap-2">
                  {modalType === 'income' ? (
                    <><ArrowDownLeft className="w-5 h-5 text-emerald-500" /> Nouvel Encaissement</>
                  ) : (
                    <><ArrowUpRight className="w-5 h-5 text-red-500" /> Nouvelle Dépense</>
                  )}
                </h3>
                <button onClick={() => setModalType(null)} className="p-1 text-ink-muted hover:text-ink transition-colors rounded-lg hover:bg-raised">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                <form id="tx-form" onSubmit={handleSubmit} className="space-y-4">
                  {createPaiement.isError && (
                    <div className="p-3 bg-red-500/10 text-red-500 rounded-xl text-sm border border-red-500/20">
                      Erreur lors de l'enregistrement de la transaction.
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-ink-light mb-1.5">Montant (FCFA) *</label>
                    <input 
                      required 
                      type="number" 
                      min="0"
                      value={formData.montant || ''} 
                      onChange={(e) => setFormData({ ...formData, montant: Number(e.target.value) })} 
                      className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500 font-semibold text-lg" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink-light mb-1.5">Méthode de paiement *</label>
                    <select 
                      required
                      value={formData.methode} 
                      onChange={(e) => setFormData({ ...formData, methode: e.target.value as any })} 
                      className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500"
                    >
                      <option value="cash">Espèces</option>
                      <option value="wave">Wave</option>
                      <option value="orange_money">Orange Money</option>
                      <option value="card">Carte Bancaire</option>
                      <option value="transfer">Virement</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink-light mb-1.5">Description *</label>
                    <input 
                      required 
                      type="text" 
                      value={formData.description || ''} 
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                      placeholder={modalType === 'income' ? 'Lavage express client XYZ...' : 'Achat de produits...'}
                      className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500" 
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-ink-light mb-1.5">Référence Externe (Optionnel)</label>
                    <input 
                      type="text" 
                      value={formData.referenceExterne || ''} 
                      onChange={(e) => setFormData({ ...formData, referenceExterne: e.target.value })} 
                      placeholder="Numéro de reçu ou ID Wave"
                      className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500" 
                    />
                  </div>
                </form>
              </div>

              <div className="p-6 pt-4 border-t border-divider shrink-0 flex justify-end gap-3 bg-panel">
                <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 font-medium text-ink-light hover:text-ink transition-colors">Annuler</button>
                <button type="submit" form="tx-form" disabled={createPaiement.isPending} className="px-5 py-2 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-xl transition-colors disabled:opacity-70 flex items-center gap-2">
                  {createPaiement.isPending ? 'Enregistrement...' : 'Valider'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
