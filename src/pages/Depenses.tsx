import { useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowUpRight, Plus, Search, X, Upload, Paperclip,
  CheckCircle2, TrendingDown, Hash, Crown, FileText,
  ChevronLeft, ChevronRight, Loader2,
} from 'lucide-react'
import { usePaiements, useCreatePaiement, useCaisseSummary } from '@/api/paiements'
import { paiementsApi } from '@/api/paiements/api'
import type { Paiement, CreatePaiementDto, TransactionFilters } from '@/api/paiements/types'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const rise = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

/* ─── Category config ──────────────────────── */
type ExpenseCategory = 'fournitures' | 'maintenance' | 'salaires' | 'transport' | 'utilities' | 'divers'

const CATEGORY_CONFIG: Record<ExpenseCategory, { label: string; color: string; bg: string; border: string }> = {
  fournitures: { label: 'Fournitures', color: 'text-blue-600', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  maintenance: { label: 'Maintenance', color: 'text-orange-600', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  salaires:    { label: 'Salaires', color: 'text-purple-600', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  transport:   { label: 'Transport', color: 'text-teal-600', bg: 'bg-teal-500/10', border: 'border-teal-500/20' },
  utilities:   { label: 'Utilities', color: 'text-yellow-600', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  divers:      { label: 'Divers', color: 'text-gray-600', bg: 'bg-gray-500/10', border: 'border-gray-500/20' },
}

const CATEGORY_OPTIONS: { value: ExpenseCategory; label: string }[] = [
  { value: 'fournitures', label: 'Fournitures' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'salaires', label: 'Salaires' },
  { value: 'transport', label: 'Transport' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'divers', label: 'Divers' },
]

const METHOD_LABELS: Record<string, string> = {
  cash: 'Espèces',
  wave: 'Wave',
  orange_money: 'Orange Money',
  card: 'Carte Bancaire',
  transfer: 'Virement',
}

const PAYMENT_METHODS: { value: CreatePaiementDto['methode']; label: string }[] = [
  { value: 'cash', label: 'Espèces' },
  { value: 'wave', label: 'Wave' },
  { value: 'orange_money', label: 'Orange Money' },
  { value: 'card', label: 'Carte Bancaire' },
  { value: 'transfer', label: 'Virement' },
]

type CategoryFilter = 'all' | ExpenseCategory

const categoryTabs: { key: CategoryFilter; label: string }[] = [
  { key: 'all', label: 'Tout' },
  ...CATEGORY_OPTIONS.map(c => ({ key: c.value as CategoryFilter, label: c.label })),
]

/* ─── Helpers ──────────────────────────────── */
const formatDate = (d: string) => {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(d))
  } catch { return d }
}

const formatMontant = (n: number) => Number(n).toLocaleString('fr-FR')

const isImageFile = (path: string) => /\.(jpg|jpeg|png|webp)$/i.test(path)

/* ─── Component ────────────────────────────── */
export default function Depenses() {
  const { selectedStationId, user: authUser } = useAuth()
  const isComptable = authUser?.role === 'comptable'
  const fileInputRef = useRef<HTMLInputElement>(null)

  /* State */
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)

  /* Form state */
  const [formMontant, setFormMontant] = useState('')
  const [formCategorie, setFormCategorie] = useState<ExpenseCategory>('divers')
  const [formMethode, setFormMethode] = useState<CreatePaiementDto['methode']>('cash')
  const [formDescription, setFormDescription] = useState('')
  const [formReference, setFormReference] = useState('')
  const [uploadedPath, setUploadedPath] = useState<string | null>(null)
  const [uploadedFileName, setUploadedFileName] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  /* Queries */
  const stationId = selectedStationId || 0
  const filters: TransactionFilters = {
    stationId,
    type: 'expense',
    page,
    limit: 15,
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
  }
  const { data: paiementsData, isLoading, isError } = usePaiements(filters)
  const { data: summaryData } = useCaisseSummary(stationId)
  const createPaiement = useCreatePaiement()

  /* All expenses for stats (current page data) */
  const { data: allExpensesData } = usePaiements({ stationId, type: 'expense', limit: 1000, page: 1 })
  const allExpenses: Paiement[] = allExpensesData?.data ?? []

  const expenses: Paiement[] = paiementsData?.data ?? []
  const totalPages = paiementsData?.totalPages ?? 1
  const totalCount = paiementsData?.total ?? 0

  /* Filter by search + category */
  const filtered = expenses.filter((p) => {
    const matchesSearch = !search ||
      p.description?.toLowerCase().includes(search.toLowerCase()) ||
      p.referenceExterne?.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || p.categorie === categoryFilter
    return matchesSearch && matchesCategory
  })

  /* Computed stats */
  const stats = useMemo(() => {
    const totalDepenses = Number(summaryData?.totalDepenses) || 0
    const count = allExpenses.length

    // Most common category
    const categoryCounts: Record<string, number> = {}
    allExpenses.forEach(p => {
      const cat = p.categorie || 'divers'
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
    })
    const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]
    const topCatLabel = topCategory
      ? CATEGORY_CONFIG[topCategory[0] as ExpenseCategory]?.label || topCategory[0]
      : '—'

    // Highest single expense
    const highest = allExpenses.reduce((max, p) => Math.max(max, Number(p.montant) || 0), 0)

    return { totalDepenses, count, topCatLabel, highest }
  }, [summaryData, allExpenses])

  const summaryCards = [
    { label: 'Total dépenses', value: `${formatMontant(stats.totalDepenses)} F`, icon: TrendingDown, accent: 'bg-red-500/10 text-red-600' },
    { label: 'Nombre de dépenses', value: stats.count.toString(), icon: Hash, accent: 'bg-blue-500/10 text-blue-600' },
    { label: 'Catégorie principale', value: stats.topCatLabel, icon: Crown, accent: 'bg-purple-500/10 text-purple-600' },
    { label: 'Plus élevée', value: `${formatMontant(stats.highest)} F`, icon: ArrowUpRight, accent: 'bg-amber-500/10 text-amber-600' },
  ]

  /* ─── Handlers ───────────────────────────── */
  const openCreate = () => {
    setFormMontant('')
    setFormCategorie('divers')
    setFormMethode('cash')
    setFormDescription('')
    setFormReference('')
    setUploadedPath(null)
    setUploadedFileName('')
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setUploadedPath(null)
    setUploadedFileName('')
    setIsUploading(false)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Le fichier ne doit pas dépasser 5 Mo')
      return
    }

    // Validate type
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(ext || '')) {
      toast.error('Format non supporté. Utilisez JPG, PNG, WEBP ou PDF')
      return
    }

    setIsUploading(true)
    try {
      const result = await paiementsApi.uploadJustificatif(file)
      setUploadedPath(result.path)
      setUploadedFileName(file.name)
      toast.success('Justificatif uploadé')
    } catch {
      toast.error("Erreur lors de l'upload du justificatif")
    } finally {
      setIsUploading(false)
      // Reset file input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removeFile = () => {
    setUploadedPath(null)
    setUploadedFileName('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const montant = Number(formMontant)
    if (!montant || montant <= 0) {
      toast.error('Montant invalide')
      return
    }
    if (!formDescription.trim()) {
      toast.error('Description requise')
      return
    }

    try {
      await createPaiement.mutateAsync({
        type: 'expense',
        montant,
        methode: formMethode,
        description: formDescription.trim(),
        referenceExterne: formReference.trim() || undefined,
        stationId: selectedStationId || 1,
        categorie: formCategorie,
        justificatif: uploadedPath || undefined,
      })
      toast.success('Dépense enregistrée')
      closeModal()
    } catch {
      toast.error("Erreur lors de l'enregistrement")
    }
  }

  return (
    <>
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 relative">
        {/* ── Header ──────────────────────────────── */}
        <motion.div variants={rise} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-ink flex items-center gap-2">
              <ArrowUpRight className="w-6 h-6 text-red-500" /> Dépenses
            </h1>
            <p className="text-ink-faded mt-1">Gérez et suivez toutes les dépenses de la station</p>
          </div>
          {!isComptable && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white font-semibold rounded-xl shadow-lg shadow-red-500/25 hover:shadow-red-500/35 transition-shadow text-sm"
            >
              <Plus className="w-4 h-4" /> Nouvelle dépense
            </button>
          )}
        </motion.div>

        {/* ── Summary Cards ───────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {summaryCards.map((s) => (
            <motion.div key={s.label} variants={rise} className="bg-panel border border-edge rounded-2xl p-4 shadow-sm">
              <div className={`p-2 rounded-xl w-fit ${s.accent} mb-3`}><s.icon className="w-4 h-4" /></div>
              <p className="font-heading text-xl font-bold text-ink">{s.value}</p>
              <p className="text-xs text-ink-faded mt-0.5">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* ── Filters ─────────────────────────────── */}
        <motion.div variants={rise} className="flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className="flex items-center gap-2 bg-panel border border-edge rounded-xl px-4 py-2.5 flex-1 shadow-sm focus-within:border-red-500/40 transition-colors">
            <Search className="w-4 h-4 text-ink-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par description ou référence..."
              className="bg-transparent text-sm text-ink placeholder-ink-muted outline-none flex-1"
            />
          </div>

          {/* Date range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1) }}
              className="px-3 py-2 bg-panel border border-edge rounded-xl text-sm text-ink outline-none focus:border-red-500/40 transition-colors shadow-sm"
            />
            <span className="text-ink-muted text-xs">à</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1) }}
              className="px-3 py-2 bg-panel border border-edge rounded-xl text-sm text-ink outline-none focus:border-red-500/40 transition-colors shadow-sm"
            />
          </div>
        </motion.div>

        {/* Category tabs */}
        <motion.div variants={rise}>
          <div className="flex flex-wrap bg-panel border border-edge rounded-xl p-1 shadow-sm gap-0.5">
            {categoryTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setCategoryFilter(tab.key); setPage(1) }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  categoryFilter === tab.key
                    ? 'bg-red-500/10 text-red-600'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── Table ───────────────────────────────── */}
        <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-inset/50 border-b border-edge">
                  <th className="text-left px-4 py-3 font-medium text-ink-muted text-xs uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-ink-muted text-xs uppercase tracking-wider">Description</th>
                  <th className="text-left px-4 py-3 font-medium text-ink-muted text-xs uppercase tracking-wider">Catégorie</th>
                  <th className="text-right px-4 py-3 font-medium text-ink-muted text-xs uppercase tracking-wider">Montant</th>
                  <th className="text-left px-4 py-3 font-medium text-ink-muted text-xs uppercase tracking-wider">Méthode</th>
                  <th className="text-left px-4 py-3 font-medium text-ink-muted text-xs uppercase tracking-wider">Créé par</th>
                  <th className="text-center px-4 py-3 font-medium text-ink-muted text-xs uppercase tracking-wider">Justif.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-inset rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : isError ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <p className="text-red-500 text-sm">Erreur lors du chargement des dépenses.</p>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <TrendingDown className="w-10 h-10 text-ink-muted mx-auto mb-3 opacity-40" />
                      <p className="text-ink-muted text-sm">
                        {search || categoryFilter !== 'all' ? 'Aucune dépense ne correspond aux filtres.' : 'Aucune dépense enregistrée.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((expense) => {
                    const cat = CATEGORY_CONFIG[expense.categorie as ExpenseCategory] || CATEGORY_CONFIG.divers
                    return (
                      <tr key={expense.id} className="hover:bg-inset/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className="text-xs text-ink-light whitespace-nowrap">{formatDate(expense.createdAt)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm text-ink font-medium truncate max-w-[200px]">{expense.description || '—'}</p>
                            {expense.referenceExterne && (
                              <p className="text-[11px] text-ink-muted mt-0.5">Réf: {expense.referenceExterne}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium ${cat.bg} ${cat.color} border ${cat.border}`}>
                            {cat.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-semibold text-red-600 whitespace-nowrap">
                            -{formatMontant(Number(expense.montant))} F
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-ink-light bg-inset px-2 py-0.5 rounded-md">
                            {METHOD_LABELS[expense.methode] || expense.methode}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-ink-faded">
                            {expense.user ? `${expense.user.prenom} ${expense.user.nom}` : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {expense.justificatif ? (
                            <a
                              href={`${API_BASE}${expense.justificatif}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                              title="Voir le justificatif"
                            >
                              <Paperclip className="w-4 h-4" />
                            </a>
                          ) : (
                            <span className="text-ink-muted text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-edge">
              <p className="text-xs text-ink-muted">
                Page {page} sur {totalPages} — {totalCount} dépenses
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
                          ? 'bg-red-500 text-white shadow-sm'
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
      </motion.div>

      {/* ── Create Modal ──────────────────────────── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-panel border border-edge rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-divider bg-inset">
                <h3 className="font-heading font-bold text-lg text-ink flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 text-red-500" />
                  Nouvelle dépense
                </h3>
                <button
                  onClick={closeModal}
                  className="p-1 text-ink-muted hover:text-ink transition-colors rounded-lg hover:bg-raised"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                {/* Montant */}
                <div>
                  <label className="block text-sm font-medium text-ink-light mb-1.5">Montant (FCFA) *</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={formMontant}
                    onChange={(e) => setFormMontant(e.target.value)}
                    className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50"
                    placeholder="0"
                  />
                </div>

                {/* Catégorie + Méthode */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-light mb-1.5">Catégorie *</label>
                    <select
                      required
                      value={formCategorie}
                      onChange={(e) => setFormCategorie(e.target.value as ExpenseCategory)}
                      className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50"
                    >
                      {CATEGORY_OPTIONS.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-light mb-1.5">Méthode de paiement *</label>
                    <select
                      required
                      value={formMethode}
                      onChange={(e) => setFormMethode(e.target.value as CreatePaiementDto['methode'])}
                      className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50"
                    >
                      {PAYMENT_METHODS.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-ink-light mb-1.5">Description *</label>
                  <input
                    required
                    type="text"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50"
                    placeholder="Achat de produits de nettoyage..."
                  />
                </div>

                {/* Référence externe */}
                <div>
                  <label className="block text-sm font-medium text-ink-light mb-1.5">Référence externe</label>
                  <input
                    type="text"
                    value={formReference}
                    onChange={(e) => setFormReference(e.target.value)}
                    className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50"
                    placeholder="N° facture, reçu..."
                  />
                </div>

                {/* Justificatif upload */}
                <div>
                  <label className="block text-sm font-medium text-ink-light mb-1.5">Justificatif</label>
                  {!uploadedPath ? (
                    <div
                      onClick={() => !isUploading && fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                        isUploading
                          ? 'border-red-300 bg-red-500/5'
                          : 'border-edge hover:border-red-400 hover:bg-red-500/5'
                      }`}
                    >
                      {isUploading ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-8 h-8 text-red-400 animate-spin" />
                          <p className="text-sm text-ink-faded">Upload en cours...</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="w-8 h-8 text-ink-muted" />
                          <p className="text-sm text-ink-light">Glissez un fichier ou cliquez pour parcourir</p>
                          <p className="text-xs text-ink-muted">JPG, PNG, WEBP, PDF — max 5 Mo</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-inset border border-outline rounded-xl">
                      {isImageFile(uploadedPath) ? (
                        <img
                          src={`${API_BASE}${uploadedPath}`}
                          alt="Justificatif"
                          className="w-12 h-12 rounded-lg object-cover border border-edge"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20">
                          <FileText className="w-6 h-6 text-red-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-ink font-medium truncate">{uploadedFileName}</p>
                        <p className="text-xs text-ink-muted flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Uploadé
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={removeFile}
                        className="p-1.5 rounded-lg text-ink-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                {/* Actions */}
                <div className="pt-4 flex justify-end gap-3 border-t border-divider mt-6">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 font-medium text-ink-light hover:text-ink transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={createPaiement.isPending}
                    className="px-5 py-2 bg-gradient-to-r from-red-600 to-red-500 text-white font-medium rounded-xl transition-colors disabled:opacity-70 flex items-center gap-2 shadow-lg shadow-red-500/25 hover:shadow-red-500/35"
                  >
                    {createPaiement.isPending ? 'Enregistrement...' : 'Enregistrer la dépense'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
