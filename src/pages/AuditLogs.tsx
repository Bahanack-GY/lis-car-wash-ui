import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ScrollText,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  Filter,
  RotateCcw,
  Eye,
  Clock,
  MapPin,
  FileText,
  Plus,
  Pencil,
  Trash2,
  Phone,
  Zap,
} from 'lucide-react'
import { useAuditLogs, useAuditFilterOptions } from '@/api/audit/queries'
import type { AuditLog, AuditFilters } from '@/api/audit/types'

/* ─── Animations ──────────────────────────────────────────────────── */

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
}
const rise = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
}

/* ─── Helpers ─────────────────────────────────────────────────────── */

const actionConfig: Record<string, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  POST:   { label: 'Création',     bg: 'bg-emerald-500/10', text: 'text-emerald-600', icon: Plus },
  PATCH:  { label: 'Modification', bg: 'bg-amber-500/10',   text: 'text-amber-600',   icon: Pencil },
  PUT:    { label: 'Modification', bg: 'bg-amber-500/10',   text: 'text-amber-600',   icon: Pencil },
  DELETE: { label: 'Suppression',  bg: 'bg-red-500/10',     text: 'text-red-500',     icon: Trash2 },
}

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))

const formatDateLong = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(iso))

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  manager: 'Manager',
  controleur: 'Contrôleur',
  caissiere: 'Caissière',
  laveur: 'Laveur',
  commercial: 'Commercial',
}

/* ─── Business Description Builder ───────────────────────────────── */

const FIELD_LABELS: Record<string, string> = {
  nom: 'Nom',
  prenom: 'Prénom',
  email: 'Email',
  role: 'Rôle',
  telephone: 'Téléphone',
  contact: 'Contact',
  adresse: 'Adresse',
  town: 'Ville',
  immatriculation: 'Immatriculation',
  marque: 'Marque',
  modele: 'Modèle',
  couleur: 'Couleur',
  statut: 'Statut',
  status: 'Statut',
  montant: 'Montant',
  montantTotal: 'Montant total',
  quantite: 'Quantité',
  quantity: 'Quantité',
  typeLavage: 'Type de lavage',
  washTypeId: 'Type de lavage',
  description: 'Description',
  motif: 'Motif',
  raison: 'Raison',
  reason: 'Raison',
  type: 'Type',
  titre: 'Titre',
  title: 'Titre',
  name: 'Nom',
  content: 'Contenu',
  body: 'Message',
  subject: 'Sujet',
  prix: 'Prix',
  price: 'Prix',
  prixUnitaire: 'Prix unitaire',
  actif: 'Actif',
  active: 'Actif',
  duree: 'Durée',
  dateDebut: 'Date début',
  dateFin: 'Date fin',
  startDate: 'Date début',
  endDate: 'Date fin',
  pointsFidelite: 'Points fidélité',
  modePaiement: 'Mode de paiement',
  paymentMethod: 'Mode de paiement',
  numeroCoupon: 'Numéro de coupon',
  couponNumber: 'Numéro de coupon',
  segmentKey: 'Segment',
  observations: 'Observations',
  categorie: 'Catégorie',
  category: 'Catégorie',
  seuilAlerte: "Seuil d'alerte",
  unite: 'Unité',
  unit: 'Unité',
  gravite: 'Gravité',
  severity: 'Gravité',
  objectifCommercialJournalier: 'Objectif commercial journalier',
}

const SKIP_FIELDS = new Set([
  'password', 'token', 'access_token', 'refresh_token', 'secret',
  '_truncated', '_size', 'keys',
])

function formatFieldValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (value === '[REDACTED]') return '***'
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non'
  if (Array.isArray(value)) {
    if (value.length === 0) return 'Aucun'
    if (typeof value[0] === 'object' && value[0] !== null) {
      const names = value.map((v: Record<string, unknown>) =>
        String(v.nom || v.name || v.prenom || JSON.stringify(v)),
      ).join(', ')
      return names
    }
    return value.join(', ')
  }
  if (typeof value === 'object') return JSON.stringify(value)
  if (
    key.toLowerCase().includes('montant') ||
    key.toLowerCase().includes('prix') ||
    key.toLowerCase().includes('price') ||
    key === 'totalSpent'
  ) {
    const n = Number(value)
    if (!isNaN(n)) return `${n.toLocaleString('fr-FR')} FCFA`
  }
  if (key === 'role' && typeof value === 'string') {
    return roleLabels[value] ?? value
  }
  return String(value)
}

interface DetailLine {
  label: string
  value: string
}

function buildBusinessDetails(log: AuditLog): DetailLine[] {
  const body = log.requestBody
  if (!body || typeof body !== 'object') return []

  const lines: DetailLine[] = []

  // Special handling for wash operations with washers
  if (body.washerIds && Array.isArray(body.washerIds)) {
    lines.push({ label: 'Laveurs assignés', value: body.washerIds.length + ' laveur(s)' })
  }
  if (body.washers && Array.isArray(body.washers)) {
    const names = (body.washers as Record<string, unknown>[]).map((w) => {
      if (typeof w === 'string') return w
      return String(w.nom || w.name || `${w.prenom || ''} ${w.nom || ''}`.trim() || w)
    })
    lines.push({ label: 'Laveurs', value: names.join(', ') })
  }

  // Special: user creation/modification — show name + role together
  if (log.entity === 'User' && (body.nom || body.prenom)) {
    const fullName = `${body.prenom || ''} ${body.nom || ''}`.trim()
    if (fullName) lines.push({ label: 'Employé', value: fullName })
  }

  // Iterate remaining fields
  for (const [key, value] of Object.entries(body)) {
    if (SKIP_FIELDS.has(key)) continue
    if (key === 'washers' || key === 'washerIds') continue
    if (log.entity === 'User' && (key === 'nom' || key === 'prenom')) continue

    const label = FIELD_LABELS[key]
    if (!label) continue

    lines.push({ label, value: formatFieldValue(key, value) })
  }

  return lines
}

/* ─── Component ───────────────────────────────────────────────────── */

export default function AuditLogs() {
  /* ── Filter state ── */
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [action, setAction] = useState<string | undefined>()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(debounceRef.current)
  }, [search])

  useEffect(() => setPage(1), [debouncedSearch, action, startDate, endDate])

  const filters: AuditFilters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      action,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      page,
      limit: 25,
    }),
    [debouncedSearch, action, startDate, endDate, page],
  )

  /* ── Queries ── */
  const { data: logsData, isLoading } = useAuditLogs(filters)
  const { data: filterOptions } = useAuditFilterOptions()

  const logs = logsData?.data ?? []
  const totalPages = logsData?.totalPages ?? 1

  const hasFilters = !!debouncedSearch || !!action || !!startDate || !!endDate

  const resetFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setAction(undefined)
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  /* ── Render ── */

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      {/* ─ Header ─────────────────────────────────────────────────── */}
      <motion.div variants={rise}>
        <h1 className="font-heading text-2xl font-bold text-ink flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-teal-500/20 to-teal-600/10">
            <ScrollText className="w-5 h-5 text-accent" />
          </div>
          Journal d'audit
        </h1>
        <p className="text-ink-faded mt-1 text-sm">
          Historique complet des actions effectuées sur l'application
        </p>
      </motion.div>

      {/* ─ Filters ────────────────────────────────────────────────── */}
      <motion.div
        variants={rise}
        className="bg-panel border border-edge rounded-2xl p-4 shadow-sm"
      >
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className="flex items-center gap-2 bg-inset border border-edge rounded-xl px-3 py-2 flex-1 focus-within:border-teal-500/40 transition-colors">
            <Search className="w-4 h-4 text-ink-muted shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher (utilisateur, action)..."
              className="bg-transparent text-sm text-ink placeholder-ink-muted outline-none flex-1 min-w-0"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-ink-muted hover:text-ink-light">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Date range */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-inset border border-edge rounded-xl px-3 py-2">
              <Calendar className="w-3.5 h-3.5 text-ink-muted" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-xs text-ink outline-none"
              />
            </div>
            <span className="text-ink-muted text-xs">&rarr;</span>
            <div className="flex items-center gap-1.5 bg-inset border border-edge rounded-xl px-3 py-2">
              <Calendar className="w-3.5 h-3.5 text-ink-muted" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-xs text-ink outline-none"
              />
            </div>
          </div>

          {/* Action filter */}
          <div className="relative">
            <select
              value={action || ''}
              onChange={(e) => setAction(e.target.value || undefined)}
              className="appearance-none bg-inset border border-edge rounded-xl pl-3 pr-8 py-2 text-xs text-ink outline-none focus:border-teal-500/40 cursor-pointer"
            >
              <option value="">Toutes les actions</option>
              {(filterOptions?.actions ?? []).map((a) => (
                <option key={a} value={a}>
                  {actionConfig[a]?.label ?? a}
                </option>
              ))}
            </select>
            <Filter className="w-3 h-3 text-ink-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Reset */}
          {hasFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-ink-muted hover:text-ink font-medium transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Réinitialiser
            </button>
          )}
        </div>
      </motion.div>

      {/* ─ Table ──────────────────────────────────────────────────── */}
      <motion.div
        variants={rise}
        className="bg-panel border border-edge rounded-2xl shadow-sm overflow-hidden"
      >
        {isLoading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center text-ink-muted p-12">
            <ScrollText className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Aucun log trouvé</p>
            {hasFilters && (
              <button onClick={resetFilters} className="text-xs text-teal-600 font-semibold mt-2 hover:underline">
                Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-edge text-left">
                    <th className="px-5 py-3 text-[11px] font-semibold text-ink-muted uppercase tracking-wider">Date / Heure</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-ink-muted uppercase tracking-wider">Utilisateur</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-ink-muted uppercase tracking-wider">Action</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-ink-muted uppercase tracking-wider">Station</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-ink-muted uppercase tracking-wider text-center">Détails</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge">
                  {logs.map((log) => {
                    const ac = actionConfig[log.action] ?? actionConfig.POST

                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-raised/50 transition-colors cursor-pointer group"
                        onClick={() => setSelectedLog(log)}
                      >
                        <td className="px-5 py-3.5 text-xs text-ink-light whitespace-nowrap">
                          {formatDate(log.timestamp)}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white text-[10px] font-bold uppercase shrink-0">
                              {log.userName?.charAt(0) || '?'}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-ink">{log.userName || 'Système'}</p>
                              {log.userRole && (
                                <p className="text-[10px] text-ink-muted">
                                  {roleLabels[log.userRole] ?? log.userRole}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold ${ac.bg} ${ac.text}`}>
                              <ac.icon className="w-3 h-3" />
                              {ac.label}
                            </span>
                            <span className="text-xs text-ink-light">{log.actionLabel}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs text-ink-light">
                            {log.stationName || (log.stationId ? `Station #${log.stationId}` : '—')}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <button className="p-1.5 rounded-lg hover:bg-raised text-ink-muted hover:text-accent transition-colors opacity-0 group-hover:opacity-100">
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden divide-y divide-edge">
              {logs.map((log) => {
                const ac = actionConfig[log.action] ?? actionConfig.POST

                return (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="px-4 py-3.5 hover:bg-raised/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold ${ac.bg} ${ac.text}`}>
                          <ac.icon className="w-3 h-3" />
                          {ac.label}
                        </span>
                        <span className="text-xs font-medium text-ink">{log.actionLabel}</span>
                      </div>
                      <Eye className="w-3.5 h-3.5 text-ink-muted" />
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-ink-muted">
                      <span>{log.userName || 'Système'}</span>
                      {log.stationName && <span>{log.stationName}</span>}
                      <span>{formatDate(log.timestamp)}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-edge flex items-center justify-between">
                <p className="text-xs text-ink-muted">
                  Page {page} sur {totalPages} &middot; {logsData?.total ?? 0} entrées
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-raised transition-colors disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let p: number
                    if (totalPages <= 5) {
                      p = i + 1
                    } else if (page <= 3) {
                      p = i + 1
                    } else if (page >= totalPages - 2) {
                      p = totalPages - 4 + i
                    } else {
                      p = page - 2 + i
                    }
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`min-w-[28px] h-7 rounded-lg text-xs font-medium transition-colors ${
                          page === p
                            ? 'bg-teal-500 text-white shadow-sm'
                            : 'text-ink-muted hover:text-ink hover:bg-raised'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-raised transition-colors disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL — Business-Friendly Detail                              */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {selectedLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedLog(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="bg-panel border border-edge rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
            >
              {/* Modal header */}
              <div className="px-6 py-4 border-b border-edge flex items-center justify-between sticky top-0 bg-panel z-10">
                <div className="flex items-center gap-3">
                  {(() => {
                    const ac = actionConfig[selectedLog.action] ?? actionConfig.POST
                    return (
                      <div className={`p-2 rounded-xl ${ac.bg}`}>
                        <ac.icon className={`w-4 h-4 ${ac.text}`} />
                      </div>
                    )
                  })()}
                  <div>
                    <h3 className="font-heading font-semibold text-ink text-base">
                      {selectedLog.actionLabel}
                    </h3>
                    <p className="text-[10px] text-ink-muted">
                      {(actionConfig[selectedLog.action] ?? actionConfig.POST).label}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-1.5 rounded-lg hover:bg-raised text-ink-muted hover:text-ink transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-5">
                {/* ── Qui ── */}
                <div>
                  <h4 className="text-[10px] text-ink-muted uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5">
                    <User className="w-3 h-3" /> Qui
                  </h4>
                  <div className="bg-inset border border-edge rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white text-sm font-bold uppercase shrink-0">
                        {selectedLog.userName?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-ink">{selectedLog.userName || 'Système'}</p>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          {selectedLog.userRole && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-ink-muted">
                              <Zap className="w-3 h-3" />
                              {roleLabels[selectedLog.userRole] ?? selectedLog.userRole}
                            </span>
                          )}
                          {selectedLog.userPhone && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-ink-muted">
                              <Phone className="w-3 h-3" />
                              {selectedLog.userPhone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Quoi ── */}
                <div>
                  <h4 className="text-[10px] text-ink-muted uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5">
                    <FileText className="w-3 h-3" /> Quoi
                  </h4>
                  <div className="bg-inset border border-edge rounded-xl p-4 space-y-2.5">
                    <p className="text-sm font-semibold text-ink">{selectedLog.actionLabel}</p>

                    {/* Business details from requestBody */}
                    {(() => {
                      const details = buildBusinessDetails(selectedLog)
                      if (details.length === 0) return null
                      return (
                        <div className="space-y-1.5 pt-2 border-t border-edge">
                          {details.map((d, i) => (
                            <div key={i} className="flex justify-between text-sm gap-3">
                              <span className="text-ink-muted shrink-0">{d.label}</span>
                              <span className="font-medium text-ink text-right truncate">{d.value}</span>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                </div>

                {/* ── Quand & Où ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <h4 className="text-[10px] text-ink-muted uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> Quand
                    </h4>
                    <div className="bg-inset border border-edge rounded-xl p-4">
                      <p className="text-sm font-medium text-ink capitalize">
                        {formatDateLong(selectedLog.timestamp)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[10px] text-ink-muted uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5">
                      <MapPin className="w-3 h-3" /> Où
                    </h4>
                    <div className="bg-inset border border-edge rounded-xl p-4">
                      <p className="text-sm font-medium text-ink">
                        {selectedLog.stationName || (selectedLog.stationId ? `Station #${selectedLog.stationId}` : 'Toutes les stations')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
