import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  CreditCard, Banknote, Smartphone, Wallet, Receipt, TrendingUp,
  ArrowDownLeft, ArrowUpRight, Search, Filter, Plus, X,
  Ticket, Car, User, CheckCircle2, ChevronLeft, ChevronRight, Printer, Phone, Droplets, Gift,
} from 'lucide-react'
import Logo from '@/assets/Logo.png'
import { usePaiements, useCaisseSummary, useCreatePaiement } from '@/api/paiements'
import { useCoupons, useUpdateCouponStatus } from '@/api/coupons'
import { bondsApi } from '@/api/bonds/api'
import { useMarkBondAsUsed } from '@/api/bonds/queries'
import type { BonLavage } from '@/api/bonds/types'
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
  bond: 'Bon de lavage',
}


const PAYMENT_METHODS: { value: CreatePaiementDto['methode']; label: string; icon: typeof Banknote }[] = [
  { value: 'cash', label: 'Espèces', icon: Banknote },
  { value: 'wave', label: 'Wave', icon: Smartphone },
  { value: 'orange_money', label: 'Orange Money', icon: Smartphone },
  { value: 'card', label: 'Carte', icon: CreditCard },
  { value: 'transfer', label: 'Virement', icon: Wallet },
]

function buildMethodLabel(paiements: { methode: string; montant: number; description?: string }[]): string {
  if (!paiements || paiements.length === 0) return 'Espèces'
  if (paiements.length === 1) return METHOD_LABELS[paiements[0].methode] || paiements[0].methode
  const bondPaiement = paiements.find(p => p.methode === 'bond')
  const otherPaiement = paiements.find(p => p.methode !== 'bond')
  if (bondPaiement && otherPaiement) {
    const bondDesc = bondPaiement.description?.match(/Bon (BON-\d+) \((\d+)%\)/)
    const bondInfo = bondDesc ? `Bon ${bondDesc[1]} (${bondDesc[2]}%)` : 'Bon de lavage'
    return `${bondInfo} + ${METHOD_LABELS[otherPaiement.methode] || otherPaiement.methode}`
  }
  return paiements.map(p => METHOD_LABELS[p.methode] || p.methode).join(' + ')
}

export default function Caisse() {
  const navigate = useNavigate()
  const { selectedStationId, user: authUser } = useAuth()
  const isComptable = authUser?.role === 'comptable'

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modalType, setModalType] = useState<'income' | null>(null)
  const [payingCouponId, setPayingCouponId] = useState<number | null>(null)
  const [couponPayMethod, setCouponPayMethod] = useState<CreatePaiementDto['methode']>('cash')
  const [couponPayRef, setCouponPayRef] = useState('')
  const [receiptCoupon, setReceiptCoupon] = useState<{ coupon: Coupon; method: string } | null>(null)

  // Bond state
  const [useBonLavage, setUseBonLavage] = useState(false)
  const [bondCode, setBondCode] = useState('')
  const [validatedBond, setValidatedBond] = useState<BonLavage | null>(null)
  const [bondValidating, setBondValidating] = useState(false)
  const [bondError, setBondError] = useState('')

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
  const markBondAsUsed = useMarkBondAsUsed()
  const { data: couponsData } = useCoupons({ statut: 'done', stationId: selectedStationId || undefined })
  const { data: paidCouponsData } = useCoupons({ statut: 'paid', stationId: selectedStationId || undefined, limit: 20 })

  const doneCoupons: Coupon[] = (couponsData?.data || []).filter(c => c.statut === 'done')
  const paidCoupons: Coupon[] = (paidCouponsData?.data || []).filter(c => c.statut === 'paid')

  const paiementsList: Paiement[] = paiementsData?.data || []
  const totalPages = paiementsData?.totalPages || 1
  const totalTransactions = paiementsData?.total || 0

  const totalRecettes = Number(summaryData?.totalRecettes) || 0
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
        type: 'income',
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

  const handleValidateBond = async () => {
    if (!bondCode.trim()) return
    setBondValidating(true)
    setBondError('')
    try {
      const bond = await bondsApi.validate(bondCode.trim())
      setValidatedBond(bond)
    } catch (err: any) {
      setBondError(err.response?.data?.message || 'Bon invalide ou introuvable')
      setValidatedBond(null)
    } finally {
      setBondValidating(false)
    }
  }

  const resetBondState = () => {
    setUseBonLavage(false)
    setBondCode('')
    setValidatedBond(null)
    setBondError('')
  }

  const handleCouponPayment = async (coupon: Coupon) => {
    const montantTotal = Number(coupon.montantTotal) || 0
    const sid = selectedStationId || coupon.fichePiste?.stationId || 1
    try {
      if (useBonLavage && validatedBond) {
        const bondAmount = Math.round(montantTotal * validatedBond.pourcentage / 100)
        const remainingAmount = montantTotal - bondAmount

        // Create bond paiement record
        await createPaiement.mutateAsync({
          type: 'income',
          montant: bondAmount,
          methode: 'bond',
          description: `Bon ${validatedBond.code} (${validatedBond.pourcentage}%) — Coupon ${coupon.numero}`,
          referenceExterne: validatedBond.code,
          stationId: sid,
          couponId: coupon.id,
        })

        // If partial bond, create second paiement for the remainder
        if (remainingAmount > 0) {
          await createPaiement.mutateAsync({
            type: 'income',
            montant: remainingAmount,
            methode: couponPayMethod,
            description: `Complément coupon ${coupon.numero} — ${coupon.fichePiste?.client?.nom || 'Client'}`,
            referenceExterne: couponPayRef || coupon.numero,
            stationId: sid,
            couponId: coupon.id,
          })
        }

        // Mark bond as used
        await markBondAsUsed.mutateAsync({
          id: validatedBond.id,
          data: { couponId: coupon.id },
        })

        const methodDisplay = validatedBond.pourcentage === 100
          ? `Bon ${validatedBond.code} (100%)`
          : `Bon ${validatedBond.code} (${validatedBond.pourcentage}%) + ${METHOD_LABELS[couponPayMethod] || couponPayMethod}`

        await updateCouponStatus.mutateAsync({ id: coupon.id, data: { statut: 'paid' } })
        toast.success(`Coupon ${coupon.numero} encaissé !`)
        setReceiptCoupon({ coupon, method: methodDisplay })
      } else {
        // Original flow — full payment
        await createPaiement.mutateAsync({
          type: 'income',
          montant: montantTotal,
          methode: couponPayMethod,
          description: `Paiement coupon ${coupon.numero} — ${coupon.fichePiste?.client?.nom || 'Client'}`,
          referenceExterne: couponPayRef || coupon.numero,
          stationId: sid,
          couponId: coupon.id,
        })
        await updateCouponStatus.mutateAsync({ id: coupon.id, data: { statut: 'paid' } })
        toast.success(`Coupon ${coupon.numero} encaissé !`)
        setReceiptCoupon({ coupon, method: couponPayMethod })
      }

      setPayingCouponId(null)
      setCouponPayMethod('cash')
      setCouponPayRef('')
      resetBondState()
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
              onClick={() => navigate('/depenses')}
              className="flex items-center gap-2 px-4 py-2.5 bg-panel border border-edge text-ink-light font-medium rounded-xl shadow-sm hover:bg-inset transition-colors text-sm"
            >
              <ArrowUpRight className="w-4 h-4 text-red-500" /> Dépenses
            </button>
            {!isComptable && (
              <button
                onClick={() => setModalType('income')}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/25 hover:shadow-teal-500/35 transition-shadow text-sm"
              >
                <Plus className="w-4 h-4" /> Encaisser
              </button>
            )}
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
                        !isComptable && (
                          <button
                            onClick={() => setPayingCouponId(c.id)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-teal-600 to-teal-500 text-white text-xs font-semibold rounded-xl shadow-sm shadow-teal-500/20 hover:shadow-teal-500/30 transition-all shrink-0"
                          >
                            <Banknote className="w-3.5 h-3.5" /> Encaisser
                          </button>
                        )
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
                            {/* Bond toggle */}
                            <div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (useBonLavage) resetBondState()
                                  else setUseBonLavage(true)
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                  useBonLavage ? 'bg-amber-500/10 text-amber-700 border-amber-500/30' : 'bg-inset text-ink-muted border-divider hover:border-outline'
                                }`}
                              >
                                <Gift className="w-3 h-3" /> Utiliser un Bon de Lavage
                              </button>
                            </div>

                            {/* Bond code input */}
                            {useBonLavage && (
                              <div className="space-y-2">
                                <div className="flex items-end gap-2">
                                  <div className="flex-1">
                                    <p className="text-xs font-medium text-ink-light mb-1.5">Code du bon</p>
                                    <input
                                      type="text"
                                      value={bondCode}
                                      onChange={(e) => { setBondCode(e.target.value.toUpperCase()); setValidatedBond(null); setBondError('') }}
                                      placeholder="BON-0001"
                                      className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-sm text-ink placeholder-ink-muted outline-none focus:border-teal-500 font-mono uppercase transition-colors"
                                    />
                                  </div>
                                  <button
                                    onClick={handleValidateBond}
                                    disabled={bondValidating || !bondCode.trim()}
                                    className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-xl disabled:opacity-50 hover:bg-amber-600 transition-colors"
                                  >
                                    {bondValidating ? '...' : 'Valider'}
                                  </button>
                                </div>
                                {bondError && <p className="text-xs text-red-500">{bondError}</p>}
                                {validatedBond && (
                                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                    <p className="text-sm font-medium text-emerald-700">
                                      Bon valide — {validatedBond.pourcentage}% de réduction
                                    </p>
                                    <p className="text-xs text-emerald-600 mt-1">
                                      Montant couvert : {Math.round(montant * validatedBond.pourcentage / 100).toLocaleString('fr-FR')} FCFA
                                      {validatedBond.pourcentage < 100 && (
                                        <> — Reste à payer : {Math.round(montant * (100 - validatedBond.pourcentage) / 100).toLocaleString('fr-FR')} FCFA</>
                                      )}
                                    </p>
                                    {validatedBond.pourcentage === 100 && (
                                      <p className="text-xs text-emerald-500 mt-1 font-medium">Aucun paiement supplémentaire requis</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Payment method (hidden if 100% bond) */}
                            {!(useBonLavage && validatedBond?.pourcentage === 100) && (
                              <div>
                                <p className="text-xs font-medium text-ink-light mb-2">
                                  {useBonLavage && validatedBond ? 'Méthode pour le complément' : 'Méthode de paiement'}
                                </p>
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
                            )}

                            <div className="flex items-end gap-2">
                              {!(useBonLavage && validatedBond?.pourcentage === 100) && (
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
                              )}
                              <button
                                onClick={() => handleCouponPayment(c)}
                                disabled={createPaiement.isPending || (useBonLavage && !validatedBond)}
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

        {/* ── Paid coupons — recent receipts ─────────── */}
        {paidCoupons.length > 0 && (
          <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-divider bg-inset/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="font-heading font-semibold text-ink text-sm">Reçus récents</h3>
                <span className="text-xs bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full font-medium">{paidCoupons.length}</span>
              </div>
            </div>

            <div className="divide-y divide-divider">
              {paidCoupons.map(c => {
                const montant = Number(c.montantTotal) || 0
                const paidDate = new Date(c.updatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

                return (
                  <div key={c.id} className="px-5 py-3 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Ticket className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="text-sm font-mono font-medium text-emerald-600">{c.numero}</span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600">Payé</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-ink-muted">
                        {c.fichePiste?.client && (
                          <span className="flex items-center gap-1"><User className="w-3 h-3" /> {c.fichePiste.client.nom}</span>
                        )}
                        {c.fichePiste?.vehicle && (
                          <span className="flex items-center gap-1"><Car className="w-3 h-3" /> {c.fichePiste.vehicle.immatriculation}</span>
                        )}
                        <span>{paidDate}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-heading font-bold text-ink text-sm">{montant.toLocaleString()} FCFA</p>
                    </div>

                    <button
                      onClick={() => {
                        const fp = c.fichePiste
                        const client = fp?.client
                        const vehicle = fp?.vehicle
                        const washType = fp?.typeLavage
                        const extras = fp?.extras || []
                        const station = fp?.station
                        const washers = c.washers || []
                        const amt = Number(c.montantTotal) || 0
                        const dateStr = new Date(c.updatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
                        const timeStr = new Date(c.updatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                        const extrasHtml = extras.map(e =>
                          `<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:2px;padding-left:12px;color:#4b5563">
                            <span>+ ${e.nom}</span><span style="color:#6b7280">${Number(e.prix).toLocaleString()} F</span>
                          </div>`
                        ).join('')
                        const washersHtml = washers.map(w => `<p style="font-size:13px;color:#374151;margin-bottom:2px">• ${w.prenom} ${w.nom}</p>`).join('')
                        const paidMethodLabel = buildMethodLabel(c.paiements || [])

                        const printWindow = window.open('', '_blank')
                        if (!printWindow) return
                        printWindow.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Reçu ${c.numero}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Inter',system-ui,sans-serif; background:#f8f9fa; display:flex; justify-content:center; padding:24px 0; }
  .receipt { background:#fff; border-radius:16px; padding:32px; max-width:380px; width:100%; box-shadow:0 4px 24px rgba(0,0,0,0.08); }
  .header { text-align:center; border-bottom:2px dashed #d1d5db; padding-bottom:16px; margin-bottom:16px; }
  .header img { width:56px; height:56px; margin:0 auto 8px; display:block; }
  .header h2 { font-size:16px; font-weight:700; color:#111827; }
  .header .sub { font-size:11px; color:#6b7280; margin-top:2px; }
  .paid-badge { text-align:center; background:#d1fae5; border-radius:12px; padding:10px; margin-bottom:16px; }
  .paid-badge .label { font-size:10px; color:#065f46; text-transform:uppercase; letter-spacing:0.08em; font-weight:700; }
  .paid-badge .num { font-size:20px; font-weight:700; color:#065f46; margin:2px 0; }
  .paid-badge .date { font-size:11px; color:#047857; }
  .section { margin-bottom:16px; }
  .section-label { font-size:9px; font-weight:700; color:#9ca3af; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:4px; }
  .section .name { font-size:13px; font-weight:600; color:#111827; }
  .section .detail { font-size:11px; color:#6b7280; margin-top:1px; }
  .services { border-top:1px dashed #d1d5db; padding-top:12px; margin-bottom:12px; }
  .services .section-label { margin-bottom:8px; }
  .svc-row { display:flex; justify-content:space-between; font-size:13px; margin-bottom:4px; }
  .svc-row .svc-name { font-weight:500; color:#111827; }
  .svc-row .svc-price { color:#374151; }
  .total-row { border-top:2px solid #111827; padding-top:8px; margin-bottom:12px; display:flex; justify-content:space-between; }
  .total-row span { font-size:16px; font-weight:700; color:#111827; }
  .method-row { display:flex; justify-content:space-between; font-size:12px; margin-bottom:16px; padding:8px 12px; background:#f3f4f6; border-radius:8px; }
  .method-row .method-label { color:#6b7280; }
  .method-row .method-value { font-weight:600; color:#111827; }
  .washers { margin-bottom:16px; }
  .footer { border-top:1px dashed #d1d5db; padding-top:16px; text-align:center; }
  .footer .thanks { font-size:13px; font-weight:600; color:#111827; margin-bottom:4px; }
  .footer .visit { font-size:11px; color:#6b7280; margin-bottom:2px; }
  .footer .url { font-size:12px; font-weight:600; color:#0d9488; }
  @media print { body { background:#fff; padding:0; } .receipt { box-shadow:none; padding:20px; } }
</style>
</head><body>
<div class="receipt">
  <div class="header">
    <img src="${window.location.origin}${Logo}" alt="LIS" />
    <h2>LIS CAR WASH</h2>
    <p class="sub">${station?.nom || 'Station'}</p>
  </div>
  <div class="paid-badge">
    <p class="label">Reçu de paiement — ${c.numero}</p>
    <p class="num">${amt.toLocaleString()} FCFA</p>
    <p class="date">${dateStr} — ${timeStr}</p>
  </div>
  <div class="section">
    <p class="section-label">Client</p>
    <p class="name">${client?.nom || 'Client'}</p>
    ${client?.contact ? `<p class="detail">${client.contact}</p>` : ''}
  </div>
  <div class="section">
    <p class="section-label">Véhicule</p>
    <p class="name">${vehicle?.immatriculation || '—'}</p>
    <p class="detail">${[vehicle?.brand, vehicle?.modele].filter(Boolean).join(' ')}${vehicle?.color ? ` — ${vehicle.color}` : ''}</p>
  </div>
  <div class="services">
    <p class="section-label">Services</p>
    ${washType ? `<div class="svc-row"><span class="svc-name">${washType.nom}</span><span class="svc-price">${Number(washType.prixBase).toLocaleString()} F</span></div>` : ''}
    ${extrasHtml}
  </div>
  <div class="total-row">
    <span>TOTAL</span>
    <span>${amt.toLocaleString()} FCFA</span>
  </div>
  <div class="method-row">
    <span class="method-label">Payé par</span>
    <span class="method-value">${paidMethodLabel}</span>
  </div>
  ${washersHtml ? `<div class="section washers"><p class="section-label">Laveurs</p>${washersHtml}</div>` : ''}
  <div class="footer">
    <p class="thanks">Merci pour votre visite !</p>
    <p class="visit">Retrouvez-nous sur</p>
    <p class="url">carwash.lis.cm</p>
  </div>
</div>
</body></html>`)
                        printWindow.document.close()
                        printWindow.focus()
                        printWindow.print()
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-ink-light border border-edge rounded-xl hover:bg-inset hover:text-ink transition-colors shrink-0"
                      title="Imprimer le reçu"
                    >
                      <Printer className="w-3.5 h-3.5" /> Reçu
                    </button>
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
                  <ArrowDownLeft className="w-5 h-5 text-emerald-500" /> Nouvel Encaissement
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
                      placeholder="Lavage express client XYZ..."
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

      {/* ── Receipt Modal ───────────────────────────── */}
      <AnimatePresence>
        {receiptCoupon && (() => {
          const c = receiptCoupon.coupon
          const fp = c.fichePiste
          const client = fp?.client
          const vehicle = fp?.vehicle
          const washType = fp?.typeLavage
          const extras = fp?.extras || []
          const station = fp?.station
          const washers = c.washers || []
          const montant = Number(c.montantTotal) || 0
          const methodLabel = METHOD_LABELS[receiptCoupon.method] || receiptCoupon.method
          const now = new Date()
          const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
          const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

          const handlePrintReceipt = () => {
            const logoImg = document.querySelector('#receipt-print img') as HTMLImageElement | null
            const logoSrc = logoImg?.src || ''
            const extrasHtml = extras.map(e =>
              `<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:2px;padding-left:12px;color:#4b5563">
                <span>+ ${e.nom}</span><span style="color:#6b7280">${Number(e.prix).toLocaleString()} F</span>
              </div>`
            ).join('')

            const printWindow = window.open('', '_blank')
            if (!printWindow) return
            printWindow.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Reçu ${c.numero}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Inter',system-ui,sans-serif; background:#f8f9fa; display:flex; justify-content:center; padding:24px 0; }
  .receipt { background:#fff; border-radius:16px; padding:32px; max-width:380px; width:100%; box-shadow:0 4px 24px rgba(0,0,0,0.08); }
  .header { text-align:center; border-bottom:2px dashed #d1d5db; padding-bottom:16px; margin-bottom:16px; }
  .header img { width:56px; height:56px; margin:0 auto 8px; display:block; }
  .header h2 { font-size:16px; font-weight:700; color:#111827; }
  .header .sub { font-size:11px; color:#6b7280; margin-top:2px; }
  .paid-badge { text-align:center; background:#d1fae5; border-radius:12px; padding:10px; margin-bottom:16px; }
  .paid-badge .label { font-size:10px; color:#065f46; text-transform:uppercase; letter-spacing:0.08em; font-weight:700; }
  .paid-badge .num { font-size:20px; font-weight:700; color:#065f46; margin:2px 0; }
  .paid-badge .date { font-size:11px; color:#047857; }
  .section { margin-bottom:16px; }
  .section-label { font-size:9px; font-weight:700; color:#9ca3af; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:4px; }
  .section .name { font-size:13px; font-weight:600; color:#111827; }
  .section .detail { font-size:11px; color:#6b7280; margin-top:1px; }
  .services { border-top:1px dashed #d1d5db; padding-top:12px; margin-bottom:12px; }
  .services .section-label { margin-bottom:8px; }
  .svc-row { display:flex; justify-content:space-between; font-size:13px; margin-bottom:4px; }
  .svc-row .svc-name { font-weight:500; color:#111827; }
  .svc-row .svc-price { color:#374151; }
  .total-row { border-top:2px solid #111827; padding-top:8px; margin-bottom:12px; display:flex; justify-content:space-between; }
  .total-row span { font-size:16px; font-weight:700; color:#111827; }
  .method-row { display:flex; justify-content:space-between; font-size:12px; margin-bottom:16px; padding:8px 12px; background:#f3f4f6; border-radius:8px; }
  .method-row .method-label { color:#6b7280; }
  .method-row .method-value { font-weight:600; color:#111827; }
  .footer { border-top:1px dashed #d1d5db; padding-top:16px; text-align:center; }
  .footer .thanks { font-size:13px; font-weight:600; color:#111827; margin-bottom:4px; }
  .footer .visit { font-size:11px; color:#6b7280; margin-bottom:2px; }
  .footer .url { font-size:12px; font-weight:600; color:#0d9488; }
  @media print { body { background:#fff; padding:0; } .receipt { box-shadow:none; padding:20px; } }
</style>
</head><body>
<div class="receipt">
  <div class="header">
    <img src="${logoSrc}" alt="LIS" />
    <h2>LIS CAR WASH</h2>
    <p class="sub">${station?.nom || 'Station'}</p>
  </div>
  <div class="paid-badge">
    <p class="label">Reçu de paiement — ${c.numero}</p>
    <p class="num">${montant.toLocaleString()} FCFA</p>
    <p class="date">${dateStr} — ${timeStr}</p>
  </div>
  <div class="section">
    <p class="section-label">Client</p>
    <p class="name">${client?.nom || 'Client'}</p>
    ${client?.contact ? `<p class="detail">${client.contact}</p>` : ''}
  </div>
  <div class="section">
    <p class="section-label">Véhicule</p>
    <p class="name">${vehicle?.immatriculation || '—'}</p>
    <p class="detail">${[vehicle?.brand, vehicle?.modele].filter(Boolean).join(' ') || ''}${vehicle?.color ? ` — ${vehicle.color}` : ''}</p>
  </div>
  <div class="services">
    <p class="section-label">Services</p>
    ${washType ? `<div class="svc-row"><span class="svc-name">${washType.nom}</span><span class="svc-price">${Number(washType.prixBase).toLocaleString()} F</span></div>` : ''}
    ${extrasHtml}
  </div>
  <div class="total-row">
    <span>TOTAL</span>
    <span>${montant.toLocaleString()} FCFA</span>
  </div>
  <div class="method-row">
    <span class="method-label">Payé par</span>
    <span class="method-value">${methodLabel}</span>
  </div>
  <div class="footer">
    <p class="thanks">Merci pour votre visite !</p>
    <p class="visit">Retrouvez-nous sur</p>
    <p class="url">carwash.lis.cm</p>
  </div>
</div>
</body></html>`)
            printWindow.document.close()
            printWindow.focus()
            printWindow.print()
          }

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setReceiptCoupon(null)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative w-full max-w-md max-h-[90vh] flex flex-col"
              >
                {/* Receipt card */}
                <div className="flex-1 overflow-y-auto">
                  <div id="receipt-print" className="bg-white text-gray-900 rounded-2xl p-8 max-w-md mx-auto shadow-2xl shadow-black/30">
                    {/* Header */}
                    <div className="text-center border-b-2 border-dashed border-gray-300 pb-4 mb-4">
                      <img src={Logo} alt="LIS" className="w-14 h-14 mx-auto mb-2" />
                      <h2 className="font-heading font-bold text-lg text-gray-900">LIS CAR WASH</h2>
                      <p className="text-xs text-gray-500">{station?.nom || 'Station'}</p>
                    </div>

                    {/* Paid badge */}
                    <div className="text-center bg-emerald-50 rounded-xl py-3 mb-4">
                      <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Reçu de paiement — {c.numero}</p>
                      <p className="font-heading font-bold text-2xl text-emerald-700">{montant.toLocaleString()} FCFA</p>
                      <p className="text-xs text-emerald-600 mt-0.5">{dateStr} — {timeStr}</p>
                    </div>

                    {/* Client */}
                    <div className="mb-4">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Client</p>
                      <p className="text-sm font-semibold text-gray-900">{client?.nom || 'Client'}</p>
                      {client?.contact && (
                        <p className="text-xs text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3" /> {client.contact}</p>
                      )}
                    </div>

                    {/* Vehicle */}
                    <div className="mb-4">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Véhicule</p>
                      <p className="text-sm font-semibold text-gray-900">{vehicle?.immatriculation || '—'}</p>
                      <p className="text-xs text-gray-500">
                        {[vehicle?.brand, vehicle?.modele].filter(Boolean).join(' ')}{vehicle?.color ? ` — ${vehicle.color}` : ''}
                      </p>
                    </div>

                    {/* Services */}
                    <div className="border-t border-dashed border-gray-300 pt-3 mb-3">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Services</p>
                      {washType && (
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-900 flex items-center gap-1"><Droplets className="w-3 h-3 text-teal-500" /> {washType.nom}</span>
                          <span className="text-gray-700">{Number(washType.prixBase).toLocaleString()} F</span>
                        </div>
                      )}
                      {extras.map((e) => (
                        <div key={e.id} className="flex justify-between text-sm mb-0.5 pl-5">
                          <span className="text-gray-600">+ {e.nom}</span>
                          <span className="text-gray-500">{Number(e.prix).toLocaleString()} F</span>
                        </div>
                      ))}
                    </div>

                    {/* Total */}
                    <div className="border-t-2 border-gray-900 pt-2 mb-3">
                      <div className="flex justify-between">
                        <span className="font-heading font-bold text-lg text-gray-900">TOTAL</span>
                        <span className="font-heading font-bold text-lg text-gray-900">{montant.toLocaleString()} FCFA</span>
                      </div>
                    </div>

                    {/* Payment method */}
                    <div className="flex justify-between items-center bg-gray-100 rounded-lg px-3 py-2 mb-4 text-sm">
                      <span className="text-gray-500">Payé par</span>
                      <span className="font-semibold text-gray-900">{methodLabel}</span>
                    </div>

                    {/* Washers */}
                    {washers.length > 0 && (
                      <div className="mb-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Laveurs</p>
                        <div className="space-y-1">
                          {washers.map((w) => (
                            <p key={w.id} className="text-sm text-gray-700">• {w.prenom} {w.nom}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="border-t border-dashed border-gray-300 pt-4 text-center">
                      <p className="text-sm font-semibold text-gray-900">Merci pour votre visite !</p>
                      <p className="text-xs text-gray-400 mt-1">Retrouvez-nous sur</p>
                      <p className="text-sm font-semibold text-teal-600 mt-0.5">carwash.lis.cm</p>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={() => setReceiptCoupon(null)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white/80 hover:text-white bg-white/10 border border-white/20 hover:bg-white/20 transition-colors"
                  >
                    Fermer
                  </button>
                  <button
                    onClick={handlePrintReceipt}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white text-gray-900 font-semibold rounded-xl shadow-lg hover:bg-gray-50 transition-colors text-sm"
                  >
                    <Printer className="w-4 h-4" /> Imprimer le reçu
                  </button>
                </div>
              </motion.div>
            </div>
          )
        })()}
      </AnimatePresence>
    </>
  )
}
