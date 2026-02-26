import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Ticket, ArrowLeft, User, Car, Droplets, MapPin, ShieldCheck,
  Clock, Loader2, CheckCircle2, CreditCard, Banknote, Smartphone,
  Play, Square, Wallet, Users, Phone, Mail, Sparkles, Printer, Zap,
} from 'lucide-react'
import Logo from '@/assets/Logo.png'
import { useCoupon, useUpdateCouponStatus } from '@/api/coupons'
import { useCreatePaiement } from '@/api/paiements'
import type { CreatePaiementDto } from '@/api/paiements/types'
import { useAuth } from '@/contexts/AuthContext'

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const rise = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

const statusCfg: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
  pending: { label: 'En attente', cls: 'bg-warn-wash text-warn border-warn-line', icon: Clock },
  washing: { label: 'Lavage en cours', cls: 'bg-info-wash text-info border-info-line', icon: Loader2 },
  done: { label: 'Terminé', cls: 'bg-ok-wash text-ok border-ok-line', icon: CheckCircle2 },
  paid: { label: 'Payé', cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: Wallet },
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'Espèces',
  card: 'Carte bancaire',
  wave: 'Wave',
  orange_money: 'Orange Money',
  transfer: 'Virement',
  bond: 'Bon de lavage',
}

function buildMethodLabel(paiements: { methode: string; montant: number; description?: string }[]): string {
  if (!paiements || paiements.length === 0) return 'Espèces'
  if (paiements.length === 1) return METHOD_LABELS[paiements[0].methode] || paiements[0].methode
  const bondPaiement = paiements.find(p => p.methode === 'bond')
  const otherPaiement = paiements.find(p => p.methode !== 'bond')
  if (bondPaiement && otherPaiement) {
    const bondDesc = bondPaiement.description?.match(/Bon (BON-\d+) \((\d+)%\)/);
    const bondInfo = bondDesc ? `Bon ${bondDesc[1]} (${bondDesc[2]}%)` : 'Bon de lavage'
    return `${bondInfo} + ${METHOD_LABELS[otherPaiement.methode] || otherPaiement.methode}`
  }
  return paiements.map(p => METHOD_LABELS[p.methode] || p.methode).join(' + ')
}

const METHOD_OPTIONS: { value: CreatePaiementDto['methode']; label: string; icon: typeof Banknote }[] = [
  { value: 'cash', label: 'Espèces', icon: Banknote },
  { value: 'wave', label: 'Wave', icon: Smartphone },
  { value: 'orange_money', label: 'Orange Money', icon: Smartphone },
  { value: 'card', label: 'Carte', icon: CreditCard },
  { value: 'transfer', label: 'Virement', icon: Wallet },
]

export default function CouponDetail() {
  const { id } = useParams<{ id: string }>()
  const couponId = Number(id)
  const navigate = useNavigate()
  const { selectedStationId, hasRole } = useAuth()
  const canPay = hasRole('super_admin') || hasRole('manager') || hasRole('caissiere')

  const { data: coupon, isLoading, isError } = useCoupon(couponId)
  const updateStatus = useUpdateCouponStatus()
  const createPaiement = useCreatePaiement()

  const [isPaid, setIsPaid] = useState(false)
  const [paidMethod, setPaidMethod] = useState<string>('cash')
  const [paymentMethod, setPaymentMethod] = useState<CreatePaiementDto['methode']>('cash')
  const [referenceExterne, setReferenceExterne] = useState('')

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
      </div>
    )
  }

  if (isError || !coupon) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/coupons')} className="flex items-center gap-1.5 text-sm text-ink-faded hover:text-ink transition-colors">
          <ArrowLeft className="w-4 h-4" /> Retour aux coupons
        </button>
        <div className="p-4 bg-red-500/10 text-red-500 rounded-xl">
          Coupon introuvable ou erreur de chargement.
        </div>
      </div>
    )
  }

  const displayStatus = isPaid ? 'paid' : coupon.statut
  const st = statusCfg[displayStatus] || statusCfg.pending
  const StIcon = st.icon

  const fp = coupon.fichePiste
  const client = fp?.client
  const vehicle = fp?.vehicle
  const washType = fp?.typeLavage
  const extras = fp?.extras || []
  const station = fp?.station
  const controleur = fp?.controleur
  const washers = coupon.washers || []
  const montant = Number(coupon.montantTotal) || 0
  const remise = Number(coupon.remise) || 0
  const originalTotal = remise > 0 ? montant + remise : montant

  const displayDate = new Date(coupon.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  const displayTime = new Date(coupon.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  const handleStatusUpdate = (newStatus: 'washing' | 'done') => {
    updateStatus.mutate(
      { id: coupon.id, data: { statut: newStatus } },
      {
        onSuccess: () => {
          toast.success(newStatus === 'washing' ? 'Lavage démarré !' : 'Lavage terminé !')
        },
        onError: () => toast.error('Erreur lors de la mise à jour du statut'),
      }
    )
  }

  const handlePayment = async () => {
    try {
      await createPaiement.mutateAsync({
        type: 'income',
        montant,
        methode: paymentMethod,
        description: `Paiement coupon ${coupon.numero} — ${client?.nom || 'Client'}`,
        referenceExterne: referenceExterne || coupon.numero,
        stationId: selectedStationId || fp?.stationId || 1,
        couponId: coupon.id,
      })
      await updateStatus.mutateAsync({ id: coupon.id, data: { statut: 'paid' } })
      setIsPaid(true)
      setPaidMethod(paymentMethod)
      toast.success('Paiement enregistré avec succès !')
    } catch {
      toast.error("Erreur lors de l'enregistrement du paiement")
    }
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={rise} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/coupons')} className="p-2 rounded-xl bg-panel border border-edge text-ink-muted hover:text-ink hover:bg-inset transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-heading text-2xl font-bold text-ink flex items-center gap-2">
                <Ticket className="w-6 h-6 text-accent" />
                <span className="font-mono">{coupon.numero}</span>
              </h1>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${st.cls}`}>
                <StIcon className={`w-3.5 h-3.5 ${displayStatus === 'washing' ? 'animate-spin' : ''}`} />
                {st.label}
              </span>
            </div>
            <p className="text-sm text-ink-faded mt-1">{displayDate} — {displayTime}</p>
          </div>
        </div>
      </motion.div>

      {/* Content grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left — Info cards */}
        <div className="xl:col-span-2 space-y-4">
          {/* Client & Vehicle */}
          <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl p-5 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-bold text-ink-faded uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Client
                </p>
                <p className="text-base font-semibold text-ink">{client?.nom || 'Client inconnu'}</p>
                {client?.contact && (
                  <p className="text-sm text-ink-light flex items-center gap-1.5 mt-1.5">
                    <Phone className="w-3.5 h-3.5 text-ink-muted" /> {client.contact}
                  </p>
                )}
                {client?.email && (
                  <p className="text-sm text-ink-light flex items-center gap-1.5 mt-1">
                    <Mail className="w-3.5 h-3.5 text-ink-muted" /> {client.email}
                  </p>
                )}
              </div>
              <div>
                <p className="text-[10px] font-bold text-ink-faded uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5" /> Véhicule
                </p>
                <p className="text-base font-semibold text-ink">
                  {vehicle?.immatriculation || '—'}
                </p>
                <p className="text-sm text-ink-light mt-1.5">
                  {[vehicle?.brand, vehicle?.modele].filter(Boolean).join(' ') || 'Aucun détail'}
                </p>
                {(vehicle?.color || vehicle?.type) && (
                  <p className="text-sm text-ink-muted mt-1">
                    {[vehicle?.color, vehicle?.type].filter(Boolean).join(' — ')}
                  </p>
                )}
              </div>
            </div>
          </motion.div>

          {/* Services */}
          <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl p-5 shadow-sm">
            <p className="text-[10px] font-bold text-ink-faded uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5" /> Services
            </p>
            <div className="space-y-2">
              {washType && (
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-accent" />
                    <span className="text-sm font-medium text-ink">{washType.nom}</span>
                  </div>
                  <span className="text-sm text-ink-light">{Number(washType.prixBase).toLocaleString()} F</span>
                </div>
              )}
              {washType?.particularites && (
                <p className="text-xs text-ink-muted pl-6 -mt-1 mb-1">{washType.particularites}</p>
              )}
              {extras.map((ex) => {
                const isOffered = coupon.promotion?.type === 'service_offert' && coupon.promotion?.serviceSpecialId === ex.id
                return (
                  <div key={ex.id} className="flex items-center justify-between py-2 border-t border-dashed border-divider">
                    <span className="text-sm text-ink-light pl-6">+ {ex.nom}</span>
                    {isOffered ? (
                      <span className="text-sm font-medium text-emerald-600 flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Offert
                      </span>
                    ) : (
                      <span className="text-sm text-ink-light">{Number(ex.prix).toLocaleString()} F</span>
                    )}
                  </div>
                )
              })}
              {remise > 0 && coupon.promotion && (
                <div className="flex items-center justify-between py-2 border-t border-dashed border-divider">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-sm font-medium text-emerald-600">{coupon.promotion.nom}</span>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600">-{remise.toLocaleString()} F</span>
                </div>
              )}
              {coupon.promotion?.type === 'service_offert' && (
                <div className="flex items-center justify-between py-2 border-t border-dashed border-divider">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-sm font-medium text-emerald-600">{coupon.promotion.nom}</span>
                  </div>
                  <span className="text-xs font-medium text-emerald-600">Service offert</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-3 mt-2 border-t-2 border-edge">
                <span className="text-sm font-bold text-ink">TOTAL</span>
                <div className="flex items-center gap-2">
                  {remise > 0 && (
                    <span className="text-sm text-ink-muted line-through">{originalTotal.toLocaleString()} F</span>
                  )}
                  <span className="text-lg font-bold text-accent">{montant.toLocaleString()} FCFA</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Station & Controleur */}
          {(station || controleur) && (
            <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl p-5 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {station && (
                  <div>
                    <p className="text-[10px] font-bold text-ink-faded uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" /> Station
                    </p>
                    <p className="text-sm font-medium text-ink">{station.nom}</p>
                    {station.adresse && <p className="text-sm text-ink-muted mt-1">{station.adresse}</p>}
                  </div>
                )}
                {controleur && (
                  <div>
                    <p className="text-[10px] font-bold text-ink-faded uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" /> Contrôleur
                    </p>
                    <p className="text-sm font-medium text-ink">{controleur.prenom} {controleur.nom}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Washers */}
          <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl p-5 shadow-sm">
            <p className="text-[10px] font-bold text-ink-faded uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Laveurs assignés
            </p>
            {washers.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {washers.map((w) => (
                  <div key={w.id} className="flex items-center gap-2.5 bg-accent-wash border border-accent-line rounded-xl px-3 py-2">
                    <div className="w-8 h-8 rounded-full bg-teal-500 text-white flex items-center justify-center text-xs font-bold">
                      {w.prenom?.[0] || w.nom[0]}{w.nom.split(' ')[1]?.[0] || ''}
                    </div>
                    <span className="text-sm font-medium text-accent-bold">{w.prenom} {w.nom}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-muted">Aucun laveur assigné</p>
            )}
          </motion.div>

          {/* Etat des lieux */}
          {fp?.etatLieu && (
            <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl p-5 shadow-sm">
              <p className="text-[10px] font-bold text-ink-faded uppercase tracking-widest mb-3">État des lieux</p>
              <p className="text-sm text-ink-light">{fp.etatLieu}</p>
            </motion.div>
          )}
        </div>

        {/* Right — Action sidebar */}
        <motion.div variants={rise} className="xl:col-span-1">
          <div className="bg-panel border border-edge rounded-2xl p-5 shadow-sm sticky top-6 space-y-5">
            {/* Pending */}
            {displayStatus === 'pending' && (
              <>
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-warn-wash mx-auto flex items-center justify-center mb-3">
                    <Clock className="w-7 h-7 text-warn" />
                  </div>
                  <p className="text-sm font-semibold text-ink">En attente de lavage</p>
                  <p className="text-xs text-ink-muted mt-1">Le lavage n'a pas encore commencé.</p>
                </div>
                <button
                  onClick={() => handleStatusUpdate('washing')}
                  disabled={updateStatus.isPending}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/25 hover:shadow-teal-500/35 transition-all disabled:opacity-50 text-sm"
                >
                  <Play className="w-4 h-4" />
                  {updateStatus.isPending ? 'Démarrage...' : 'Démarrer le lavage'}
                </button>
              </>
            )}

            {/* Washing */}
            {displayStatus === 'washing' && (
              <>
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-info-wash mx-auto flex items-center justify-center mb-3">
                    <Loader2 className="w-7 h-7 text-info animate-spin" />
                  </div>
                  <p className="text-sm font-semibold text-ink">Lavage en cours</p>
                  <p className="text-xs text-ink-muted mt-1">Le véhicule est en cours de lavage.</p>
                </div>
                <button
                  onClick={() => handleStatusUpdate('done')}
                  disabled={updateStatus.isPending}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/25 hover:shadow-teal-500/35 transition-all disabled:opacity-50 text-sm"
                >
                  <Square className="w-4 h-4" />
                  {updateStatus.isPending ? 'Finalisation...' : 'Terminer le lavage'}
                </button>
              </>
            )}

            {/* Done — Payment form (authorized roles only) */}
            {displayStatus === 'done' && (
              <>
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-ok-wash mx-auto flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-7 h-7 text-ok" />
                  </div>
                  <p className="text-sm font-semibold text-ink">Lavage terminé</p>
                  <p className="text-xs text-ink-muted mt-1">
                    {canPay ? 'Enregistrez le paiement pour ce coupon.' : 'En attente de paiement par la caisse.'}
                  </p>
                </div>

                <div className="bg-inset rounded-xl p-4 text-center">
                  <p className="text-xs text-ink-faded uppercase tracking-wider mb-1">Montant à encaisser</p>
                  <p className="font-heading text-2xl font-bold text-accent">{montant.toLocaleString()} FCFA</p>
                </div>

                {canPay ? (
                  <>
                    <div>
                      <p className="text-xs font-medium text-ink-light mb-2">Méthode de paiement</p>
                      <div className="grid grid-cols-2 gap-2">
                        {METHOD_OPTIONS.map((m) => {
                          const selected = paymentMethod === m.value
                          const MIcon = m.icon
                          return (
                            <button
                              key={m.value}
                              onClick={() => setPaymentMethod(m.value)}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                                selected
                                  ? 'bg-accent-wash text-accent border-accent-line'
                                  : 'bg-inset text-ink-muted border-divider hover:border-outline'
                              }`}
                            >
                              <MIcon className="w-3.5 h-3.5" />
                              {m.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-ink-light mb-1.5">Référence (optionnel)</p>
                      <input
                        type="text"
                        value={referenceExterne}
                        onChange={(e) => setReferenceExterne(e.target.value)}
                        placeholder="N° reçu ou ID transaction"
                        className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-sm text-ink placeholder-ink-muted outline-none focus:border-teal-500 transition-colors"
                      />
                    </div>

                    <button
                      onClick={handlePayment}
                      disabled={createPaiement.isPending}
                      className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/25 hover:shadow-teal-500/35 transition-all disabled:opacity-50 text-sm"
                    >
                      <Banknote className="w-4 h-4" />
                      {createPaiement.isPending ? 'Enregistrement...' : 'Encaisser'}
                    </button>
                  </>
                ) : (
                  <div className="bg-warn-wash border border-warn-line rounded-xl p-4 text-center">
                    <Clock className="w-5 h-5 text-warn mx-auto mb-2" />
                    <p className="text-sm font-medium text-warn">En attente d'encaissement</p>
                    <p className="text-xs text-ink-muted mt-1">Seul le gérant ou la caissière peut enregistrer le paiement.</p>
                  </div>
                )}
              </>
            )}

            {/* Paid */}
            {displayStatus === 'paid' && (() => {
              const methodLabel = isPaid
                ? (METHOD_LABELS[paidMethod] || paidMethod)
                : buildMethodLabel(coupon.paiements || [])
              const paidDateStr = new Date(coupon.updatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
              const paidTimeStr = new Date(coupon.updatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

              const handlePrintReceipt = () => {
                const logoImg = document.querySelector('#receipt-detail-print img') as HTMLImageElement | null
                const logoSrc = logoImg?.src || ''
                const extrasHtml = extras.map(e => {
                  const isOffered = coupon.promotion?.type === 'service_offert' && coupon.promotion?.serviceSpecialId === e.id
                  return `<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:2px;padding-left:12px;color:#4b5563">
                    <span>+ ${e.nom}</span><span style="color:${isOffered ? '#059669' : '#6b7280'};${isOffered ? 'font-weight:600' : ''}">${isOffered ? '⚡ Offert' : `${Number(e.prix).toLocaleString()} F`}</span>
                  </div>`
                }).join('')

                const printWindow = window.open('', '_blank')
                if (!printWindow) return
                printWindow.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Reçu ${coupon.numero}</title>
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
    <p class="label">Reçu de paiement — ${coupon.numero}</p>
    <p class="num">${montant.toLocaleString()} FCFA</p>
    <p class="date">${paidDateStr} — ${paidTimeStr}</p>
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
    ${remise > 0 && coupon.promotion ? `<div style="display:flex;justify-content:space-between;font-size:13px;margin-top:4px;padding-top:4px;border-top:1px dashed #d1d5db">
      <span style="color:#059669;font-weight:500">⚡ ${coupon.promotion.nom}</span>
      <span style="color:#059669;font-weight:600">-${remise.toLocaleString()} F</span>
    </div>` : ''}
  </div>
  <div class="total-row">
    <span>TOTAL</span>
    <span>${remise > 0 ? `<span style="text-decoration:line-through;color:#9ca3af;font-size:13px;margin-right:6px">${originalTotal.toLocaleString()} F</span>` : ''}${montant.toLocaleString()} FCFA</span>
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
                <>
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/10 mx-auto flex items-center justify-center mb-3">
                      <Wallet className="w-7 h-7 text-emerald-600" />
                    </div>
                    <p className="text-sm font-semibold text-ink">Coupon payé</p>
                    <p className="text-xs text-ink-muted mt-1">Le paiement a été enregistré dans la caisse.</p>
                  </div>

                  {/* Mini receipt preview */}
                  <div id="receipt-detail-print" className="bg-white text-gray-900 rounded-xl p-4 shadow-sm border border-gray-200">
                    <div className="text-center border-b border-dashed border-gray-200 pb-3 mb-3">
                      <img src={Logo} alt="LIS" className="w-10 h-10 mx-auto mb-1" />
                      <p className="font-heading font-bold text-sm text-gray-900">LIS CAR WASH</p>
                      <p className="text-[10px] text-gray-400">{station?.nom || 'Station'}</p>
                    </div>

                    <div className="text-center bg-emerald-50 rounded-lg py-2 mb-3">
                      <p className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider">Reçu — {coupon.numero}</p>
                      {remise > 0 && (
                        <p className="text-xs text-gray-400 line-through">{originalTotal.toLocaleString()} F</p>
                      )}
                      <p className="font-heading font-bold text-lg text-emerald-700">{montant.toLocaleString()} FCFA</p>
                      {remise > 0 && coupon.promotion && (
                        <p className="text-[9px] text-emerald-600 font-medium mt-0.5">⚡ {coupon.promotion.nom} (-{remise.toLocaleString()} F)</p>
                      )}
                    </div>

                    <div className="space-y-1.5 text-xs mb-3">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Client</span>
                        <span className="font-medium text-gray-900">{client?.nom || 'Client'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Véhicule</span>
                        <span className="font-medium text-gray-900">{vehicle?.immatriculation || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Service</span>
                        <span className="font-medium text-gray-900">{washType?.nom || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Payé par</span>
                        <span className="font-medium text-gray-900">{methodLabel}</span>
                      </div>
                    </div>

                    <div className="border-t border-dashed border-gray-200 pt-2 text-center">
                      <p className="text-[10px] font-semibold text-gray-700">Merci pour votre visite !</p>
                      <p className="text-[9px] text-teal-600 font-semibold mt-0.5">carwash.lis.cm</p>
                    </div>
                  </div>

                  <button
                    onClick={handlePrintReceipt}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/25 hover:shadow-teal-500/35 transition-all text-sm"
                  >
                    <Printer className="w-4 h-4" /> Imprimer le reçu
                  </button>

                  <button
                    onClick={() => navigate('/caisse')}
                    className="w-full flex items-center justify-center gap-2 px-5 py-2.5 border-2 border-teal-500 text-accent font-semibold rounded-xl hover:bg-accent-wash transition-all text-sm"
                  >
                    Voir la caisse
                  </button>
                </>
              )
            })()}
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
