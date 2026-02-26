import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Gift, Plus, Search, X, CheckCircle2, Clock, Copy,
  Ticket, Users, Percent, ChevronLeft, ChevronRight, Printer,
} from 'lucide-react'
import { useBonds, useCreateBond } from '@/api/bonds'
import type { BonLavage, BondFilters } from '@/api/bonds/types'
import { useStations } from '@/api/stations'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/assets/Logo.png'
import toast from 'react-hot-toast'

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const rise = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

type StatusFilter = 'all' | 'available' | 'used'

export default function BonsLavage() {
  const { hasRole, selectedStationId } = useAuth()
  const isSuperAdmin = hasRole('super_admin')

  /* ─── Filters ──────────────────────────────── */
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  /* ─── Create modal ─────────────────────────── */
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formPourcentage, setFormPourcentage] = useState(50)
  const [formDescription, setFormDescription] = useState('')
  const [createdBond, setCreatedBond] = useState<BonLavage | null>(null)

  /* ─── Data ─────────────────────────────────── */
  const filters: BondFilters = {
    isUsed: statusFilter === 'available' ? false : statusFilter === 'used' ? true : undefined,
    page,
    limit: 20,
  }
  const { data: bondsData, isLoading } = useBonds(filters)
  const { data: allBondsData } = useBonds({ limit: 1000 })
  const { data: stationsData } = useStations()
  const createBond = useCreateBond()

  const bonds = bondsData?.data ?? []
  const totalPages = bondsData?.totalPages ?? 1

  const allBonds = allBondsData?.data ?? []

  /* ─── Computed stats ───────────────────────── */
  const stats = useMemo(() => {
    const total = allBonds.length
    const available = allBonds.filter(b => !b.isUsed).length
    const used = allBonds.filter(b => b.isUsed).length
    return { total, available, used }
  }, [allBonds])

  /* ─── Filtered bonds (search) ──────────────── */
  const filteredBonds = bonds.filter(b => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      b.code.toLowerCase().includes(q) ||
      b.createdBy?.nom?.toLowerCase().includes(q) ||
      b.createdBy?.prenom?.toLowerCase().includes(q) ||
      b.coupon?.numero?.toLowerCase().includes(q) ||
      b.description?.toLowerCase().includes(q)
    )
  })

  /* ─── Stations list ────────────────────────── */
  const stations = Array.isArray(stationsData) ? stationsData : (stationsData as any)?.data ?? []
  const currentStationName = stations.find((s: any) => s.id === selectedStationId)?.nom || '—'

  /* ─── Create handler ───────────────────────── */
  const handleCreate = () => {
    createBond.mutate(
      {
        pourcentage: formPourcentage,
        stationId: selectedStationId || undefined,
        description: formDescription || undefined,
      },
      {
        onSuccess: (bond) => {
          toast.success(`Bon ${bond.code} créé avec succès !`)
          setCreatedBond(bond)
        },
        onError: () => {
          toast.error('Erreur lors de la création du bon')
        },
      },
    )
  }

  const resetForm = () => {
    setFormPourcentage(50)
    setFormDescription('')
    setCreatedBond(null)
    setIsModalOpen(false)
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success('Code copié !')
  }

  const handlePrintBond = (bond: BonLavage) => {
    const dateStr = new Date(bond.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    const createdByName = bond.createdBy ? `${bond.createdBy.prenom} ${bond.createdBy.nom}` : '—'
    const stationName = bond.station?.nom || 'Toutes les stations'

    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Bon ${bond.code}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Inter',system-ui,sans-serif; background:#f0f0f0; display:flex; justify-content:center; padding:32px 0; }
  .voucher { background:#fff; border-radius:20px; max-width:420px; width:100%; box-shadow:0 8px 32px rgba(0,0,0,0.12); overflow:hidden; }
  .header { text-align:center; padding:28px 32px 20px; background:linear-gradient(135deg,#f59e0b,#d97706); color:#fff; }
  .header img { width:52px; height:52px; margin:0 auto 8px; display:block; border-radius:12px; background:#fff; padding:4px; }
  .header h2 { font-size:15px; font-weight:700; letter-spacing:0.03em; }
  .header .sub { font-size:11px; opacity:0.85; margin-top:2px; font-weight:500; }
  .code-section { padding:28px 32px; text-align:center; }
  .code-box { border:3px dashed #d97706; border-radius:16px; padding:24px 16px; background:#fffbeb; }
  .code-label { font-size:10px; font-weight:700; color:#92400e; text-transform:uppercase; letter-spacing:0.12em; margin-bottom:6px; }
  .code-value { font-family:'Courier New',monospace; font-size:36px; font-weight:800; color:#92400e; letter-spacing:0.08em; }
  .pct-badge { display:inline-block; margin-top:12px; padding:8px 20px; background:linear-gradient(135deg,#0d9488,#0f766e); color:#fff; border-radius:24px; font-size:16px; font-weight:700; letter-spacing:0.02em; }
  .details { padding:0 32px 24px; }
  .detail-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .detail-item .label { font-size:9px; font-weight:700; color:#9ca3af; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:2px; }
  .detail-item .value { font-size:13px; font-weight:600; color:#111827; }
  ${bond.description ? `.description { padding:0 32px 20px; }
  .description .label { font-size:9px; font-weight:700; color:#9ca3af; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:4px; }
  .description .value { font-size:12px; color:#374151; line-height:1.5; }` : ''}
  .terms { margin:0 32px; padding:16px; background:#f9fafb; border-radius:12px; border:1px solid #e5e7eb; margin-bottom:24px; }
  .terms p { font-size:11px; color:#6b7280; line-height:1.6; }
  .terms p strong { color:#374151; }
  .footer { text-align:center; padding:20px 32px; border-top:1px dashed #d1d5db; }
  .footer .thanks { font-size:13px; font-weight:600; color:#111827; margin-bottom:4px; }
  .footer .url { font-size:12px; font-weight:700; color:#0d9488; }
  @media print {
    body { background:#fff; padding:0; }
    .voucher { box-shadow:none; border-radius:0; }
  }
</style>
</head><body>
<div class="voucher">
  <div class="header">
    <img src="${window.location.origin}${Logo}" alt="LIS" />
    <h2>LIS CAR WASH</h2>
    <p class="sub">Bon de Lavage</p>
  </div>
  <div class="code-section">
    <div class="code-box">
      <p class="code-label">Code du bon</p>
      <p class="code-value">${bond.code}</p>
      <div class="pct-badge">${bond.pourcentage}% DE RÉDUCTION</div>
    </div>
  </div>
  <div class="details">
    <div class="detail-grid">
      <div class="detail-item">
        <p class="label">Station</p>
        <p class="value">${stationName}</p>
      </div>
      <div class="detail-item">
        <p class="label">Date d'émission</p>
        <p class="value">${dateStr}</p>
      </div>
      <div class="detail-item">
        <p class="label">Émis par</p>
        <p class="value">${createdByName}</p>
      </div>
      <div class="detail-item">
        <p class="label">Utilisation</p>
        <p class="value">Une seule fois</p>
      </div>
    </div>
  </div>
  ${bond.description ? `<div class="description">
    <p class="label">Description</p>
    <p class="value">${bond.description}</p>
  </div>` : ''}
  <div class="terms">
    <p><strong>Conditions d'utilisation :</strong></p>
    <p>Ce bon est valable une seule fois et ne peut être combiné avec d'autres offres. Présentez ce bon lors du paiement à la caisse.${bond.stationId ? ` Valable uniquement à la station ${stationName}.` : ' Valable dans toutes les stations.'}</p>
  </div>
  <div class="footer">
    <p class="thanks">Merci pour votre confiance !</p>
    <p class="url">carwash.lis.cm</p>
  </div>
</div>
</body></html>`)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  /* ─── Summary cards config ─────────────────── */
  const summaryCards = [
    { label: 'Total bons', value: stats.total, icon: Gift, accent: 'bg-teal-500/10 text-teal-600' },
    { label: 'Disponibles', value: stats.available, icon: CheckCircle2, accent: 'bg-emerald-500/10 text-emerald-600' },
    { label: 'Utilisés', value: stats.used, icon: Clock, accent: 'bg-amber-500/10 text-amber-600' },
  ]

  const statusTabs: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'Tous' },
    { key: 'available', label: 'Disponibles' },
    { key: 'used', label: 'Utilisés' },
  ]

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="space-y-6"
    >
      {/* ── Header ──────────────────────────────── */}
      <motion.div variants={rise} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
            <Gift className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-ink text-xl">Bons de Lavage</h1>
            <p className="text-xs text-ink-muted">Créez et gérez les bons de réduction</p>
          </div>
        </div>

        {isSuperAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/30 active:scale-[0.98] transition-all text-sm"
          >
            <Plus className="w-4 h-4" /> Créer un bon
          </button>
        )}
      </motion.div>

      {/* ── Summary Cards ───────────────────────── */}
      <motion.div variants={rise} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="bg-panel border border-edge rounded-2xl p-4 shadow-sm flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl ${card.accent} flex items-center justify-center flex-shrink-0`}>
              <card.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="font-heading font-bold text-ink text-2xl">{card.value}</p>
              <p className="text-xs text-ink-muted">{card.label}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* ── Toolbar ─────────────────────────────── */}
      <motion.div variants={rise} className="flex flex-wrap items-center gap-3">
        {/* Status tabs */}
        <div className="flex items-center gap-1 bg-inset border border-edge rounded-xl p-1">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setStatusFilter(tab.key); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === tab.key
                  ? 'bg-panel text-ink shadow-sm'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
          <input
            type="text"
            placeholder="Rechercher par code, créateur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-inset border border-edge rounded-xl text-sm text-ink placeholder-ink-muted outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
          />
        </div>
      </motion.div>

      {/* ── Table ───────────────────────────────── */}
      <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-inset/50 border-b border-edge">
                <th className="text-left px-4 py-3 font-medium text-ink-muted text-xs uppercase tracking-wider">Code</th>
                <th className="text-left px-4 py-3 font-medium text-ink-muted text-xs uppercase tracking-wider">Pourcentage</th>
                <th className="text-left px-4 py-3 font-medium text-ink-muted text-xs uppercase tracking-wider">Statut</th>
                <th className="text-left px-4 py-3 font-medium text-ink-muted text-xs uppercase tracking-wider">Émetteur</th>
                <th className="text-left px-4 py-3 font-medium text-ink-muted text-xs uppercase tracking-wider">Coupon lié</th>
                <th className="text-left px-4 py-3 font-medium text-ink-muted text-xs uppercase tracking-wider">Station</th>
                <th className="text-left px-4 py-3 font-medium text-ink-muted text-xs uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3 font-medium text-ink-muted text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-inset rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredBonds.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <Gift className="w-10 h-10 text-ink-muted mx-auto mb-3 opacity-40" />
                    <p className="text-ink-muted text-sm">Aucun bon trouvé</p>
                  </td>
                </tr>
              ) : (
                filteredBonds.map((bond) => (
                  <tr key={bond.id} className="hover:bg-inset/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-ink text-sm">{bond.code}</span>
                        <button
                          onClick={() => copyCode(bond.code)}
                          className="p-1 rounded-md hover:bg-inset text-ink-muted hover:text-ink transition-colors"
                          title="Copier le code"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-700 border border-amber-500/20">
                        <Percent className="w-3 h-3" />
                        {bond.pourcentage}%
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {bond.isUsed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-600 border border-red-500/20">
                          <Clock className="w-3 h-3" /> Utilisé
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> Disponible
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {bond.createdBy ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                            {bond.createdBy.prenom?.[0]}{bond.createdBy.nom?.[0]}
                          </div>
                          <span className="text-ink text-xs">{bond.createdBy.prenom} {bond.createdBy.nom}</span>
                        </div>
                      ) : (
                        <span className="text-ink-muted text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {bond.coupon ? (
                        <div className="flex items-center gap-1.5">
                          <Ticket className="w-3.5 h-3.5 text-teal-500" />
                          <span className="text-ink text-xs font-medium">{bond.coupon.numero}</span>
                          <span className="text-ink-muted text-xs">
                            ({Number(bond.coupon.montantTotal).toLocaleString('fr-FR')} FCFA)
                          </span>
                        </div>
                      ) : (
                        <span className="text-ink-muted text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-ink text-xs">{bond.station?.nom || 'Toutes'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-ink-muted">
                        {new Date(bond.createdAt).toLocaleDateString('fr-FR')}
                      </div>
                      {bond.usedAt && (
                        <div className="text-[10px] text-red-500 mt-0.5">
                          Utilisé le {new Date(bond.usedAt).toLocaleDateString('fr-FR')}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {!bond.isUsed && (
                          <button
                            onClick={() => copyCode(bond.code)}
                            className="px-2.5 py-1 text-xs font-medium text-teal-600 bg-teal-500/10 border border-teal-500/20 rounded-lg hover:bg-teal-500/20 transition-colors"
                          >
                            Copier
                          </button>
                        )}
                        <button
                          onClick={() => handlePrintBond(bond)}
                          className="p-1.5 rounded-lg text-ink-muted hover:text-teal-600 hover:bg-teal-500/10 transition-colors"
                          title="Exporter / Imprimer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-edge">
            <p className="text-xs text-ink-muted">
              Page {page} sur {totalPages} — {bondsData?.total ?? 0} bons
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg hover:bg-inset disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-ink-muted" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = i + 1
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                      page === p
                        ? 'bg-teal-500 text-white shadow-sm'
                        : 'text-ink-muted hover:bg-inset'
                    }`}
                  >
                    {p}
                  </button>
                )
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg hover:bg-inset disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-ink-muted" />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* ── Used Bonds Tracking ─────────────────── */}
      {statusFilter === 'used' && filteredBonds.length > 0 && (
        <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl p-5 shadow-sm">
          <h3 className="font-heading font-semibold text-ink text-lg mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-500" />
            Traçabilité des bons utilisés
          </h3>
          <div className="space-y-3">
            {filteredBonds.filter(b => b.isUsed).map((bond) => (
              <div key={bond.id} className="flex items-center justify-between p-3 bg-inset/50 rounded-xl border border-edge">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <span className="font-mono font-semibold text-ink text-sm">{bond.code}</span>
                    <span className="text-[10px] text-ink-muted">{bond.pourcentage}% de réduction</span>
                  </div>
                  {bond.coupon && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-teal-500/10 rounded-lg">
                      <Ticket className="w-3.5 h-3.5 text-teal-600" />
                      <span className="text-xs font-medium text-teal-700">{bond.coupon.numero}</span>
                      <span className="text-xs text-teal-600">
                        — {Number(bond.coupon.montantTotal).toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-ink-muted">
                  {bond.createdBy && (
                    <span>Émis par <span className="font-medium text-ink">{bond.createdBy.prenom} {bond.createdBy.nom}</span></span>
                  )}
                  {bond.usedAt && (
                    <span>le {new Date(bond.usedAt).toLocaleDateString('fr-FR')}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Create Modal ────────────────────────── */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={resetForm} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-panel border border-edge rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between p-5 border-b border-edge">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                    <Gift className="w-4.5 h-4.5 text-white" />
                  </div>
                  <h2 className="font-heading font-semibold text-ink text-lg">
                    {createdBond ? 'Bon créé !' : 'Créer un bon de lavage'}
                  </h2>
                </div>
                <button onClick={resetForm} className="p-2 rounded-lg hover:bg-inset transition-colors text-ink-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {createdBond ? (
                /* ── Success view ── */
                <div className="p-5 space-y-4">
                  <div className="text-center p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                    <p className="font-mono text-3xl font-bold text-ink mb-1">{createdBond.code}</p>
                    <p className="text-sm text-emerald-700">{createdBond.pourcentage}% de réduction</p>
                    {createdBond.description && (
                      <p className="text-xs text-ink-muted mt-2">{createdBond.description}</p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => copyCode(createdBond.code)}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-500/10 text-teal-600 font-medium rounded-xl border border-teal-500/20 hover:bg-teal-500/20 transition-colors text-sm"
                    >
                      <Copy className="w-4 h-4" /> Copier
                    </button>
                    <button
                      onClick={() => handlePrintBond(createdBond)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/30 active:scale-[0.98] transition-all text-sm"
                    >
                      <Printer className="w-4 h-4" /> Exporter
                    </button>
                    <button
                      onClick={resetForm}
                      className="flex items-center justify-center px-4 py-2.5 text-ink-muted font-medium rounded-xl border border-edge hover:bg-inset transition-colors text-sm"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              ) : (
                /* ── Form view ── */
                <div className="p-5 space-y-4">
                  {/* Pourcentage */}
                  <div>
                    <label className="block text-xs font-medium text-ink-light mb-1.5">
                      Pourcentage de réduction
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={5}
                        max={100}
                        step={5}
                        value={formPourcentage}
                        onChange={(e) => setFormPourcentage(Number(e.target.value))}
                        className="flex-1 accent-teal-500"
                      />
                      <div className="w-16 text-center">
                        <input
                          type="number"
                          min={5}
                          max={100}
                          value={formPourcentage}
                          onChange={(e) => {
                            const val = Math.min(100, Math.max(5, Number(e.target.value)))
                            setFormPourcentage(val)
                          }}
                          className="w-full px-2 py-1.5 bg-inset border border-edge rounded-lg text-sm text-ink text-center font-mono font-bold outline-none focus:border-teal-500"
                        />
                      </div>
                      <span className="text-sm font-medium text-ink-muted">%</span>
                    </div>
                    {formPourcentage === 100 && (
                      <p className="text-xs text-amber-600 mt-1">Ce bon couvre 100% du prix — lavage gratuit</p>
                    )}
                  </div>

                  {/* Station (fixed to current) */}
                  <div>
                    <label className="block text-xs font-medium text-ink-light mb-1.5">
                      Station
                    </label>
                    <div className="w-full px-3 py-2 bg-inset border border-edge rounded-xl text-sm text-ink font-medium">
                      {currentStationName}
                    </div>
                    <p className="text-[11px] text-ink-muted mt-1">
                      Ce bon sera rattaché à cette station. Pour créer un bon pour une autre station, connectez-vous à celle-ci.
                    </p>
                  </div>

                  {/* Description (optional) */}
                  <div>
                    <label className="block text-xs font-medium text-ink-light mb-1.5">
                      Description / Raison (optionnel)
                    </label>
                    <textarea
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Ex: Bon offert pour fidélité client"
                      rows={2}
                      className="w-full px-3 py-2 bg-inset border border-edge rounded-xl text-sm text-ink placeholder-ink-muted outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 resize-none"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={resetForm}
                      className="flex-1 px-4 py-2.5 text-sm font-medium text-ink-muted border border-edge rounded-xl hover:bg-inset transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleCreate}
                      disabled={createBond.isPending || formPourcentage < 5 || formPourcentage > 100}
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/25 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {createBond.isPending ? 'Création...' : 'Créer le bon'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
