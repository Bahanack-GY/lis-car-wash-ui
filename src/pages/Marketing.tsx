import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Megaphone,
  Users,
  Activity,
  Banknote,
  TrendingUp,
  Star,
  Target,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowUpDown,
  Car,
  Phone,
  Clock,
  Crown,
  Heart,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  UserPlus,
  CheckCircle2,
  Loader2,
  Database,
  MessageSquare,
  Send,
  Plus,
  Pencil,
  Trash2,
  FileText,
  Eye,
  ChevronDown,
  Hash,
  Filter,
  MailCheck,
  MailX,
  CircleDot,
  Zap,
} from 'lucide-react'
import {
  useMarketingInsights,
  useMarketingSegments,
  useMarketingClients,
  useMarketingProspects,
  exportMarketingClients,
  useTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useCampaigns,
  useCampaignDetail,
  useCreateCampaign,
  useSendCampaign,
} from '@/api/marketing/queries'
import type {
  MarketingClientFilters,
  SmsTemplate,
  CreateTemplateDto,
  CreateCampaignDto,
  Campaign,
  CampaignStatus,
} from '@/api/marketing/types'

/* ─── Animations ──────────────────────────────────────────────────── */

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}
const rise = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
}

/* ─── Helpers ─────────────────────────────────────────────────────── */

const fcfa = (n: number) => n.toLocaleString('fr-FR') + ' FCFA'

const segmentDescriptions: Record<string, string> = {
  vip: 'Top dépenses, 5+ visites',
  fideles: 'Abonnement actif',
  reguliers: '3+ visites en 60 jours',
  a_risque: 'Absent depuis 30 jours',
  nouveaux: 'Inscrits ces 30 derniers jours',
  prospects: 'Enregistrements non confirmés',
}

const segmentIcons: Record<string, React.ElementType> = {
  vip: Crown,
  fideles: Heart,
  reguliers: RefreshCw,
  a_risque: AlertTriangle,
  nouveaux: Sparkles,
  prospects: UserPlus,
}

const sortOptions = [
  { value: 'lastVisit', label: 'Dernière visite' },
  { value: 'revenue', label: 'Dépenses' },
  { value: 'visits', label: 'Visites' },
  { value: 'nom', label: 'Nom' },
] as const

type TabKey = 'clients' | 'campaigns' | 'templates'

const statusConfig: Record<CampaignStatus, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  draft: { label: 'Brouillon', bg: 'bg-raised', text: 'text-ink-muted', icon: FileText },
  sending: { label: 'En cours…', bg: 'bg-blue-500/10', text: 'text-blue-600', icon: Loader2 },
  sent: { label: 'Envoyée', bg: 'bg-emerald-500/10', text: 'text-emerald-600', icon: MailCheck },
  failed: { label: 'Échouée', bg: 'bg-red-500/10', text: 'text-red-600', icon: MailX },
}

const VARIABLES = [
  { key: '{nom}', desc: 'Nom du client' },
  { key: '{points}', desc: 'Points de fidélité' },
  { key: '{station}', desc: 'Nom de la station' },
]

/* ─── Component ───────────────────────────────────────────────────── */

export default function Marketing() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabKey>('clients')

  /* ─── Client tab state ─── */
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [activeSegment, setActiveSegment] = useState<string | undefined>()
  const [sortBy, setSortBy] = useState<MarketingClientFilters['sortBy']>('lastVisit')
  const [sortOrder, setSortOrder] = useState<MarketingClientFilters['sortOrder']>('DESC')
  const [page, setPage] = useState(1)
  const [isExporting, setIsExporting] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportSegment, setExportSegment] = useState<string | undefined>()
  const [exportSearch, setExportSearch] = useState('')
  const [exportSortBy, setExportSortBy] = useState<MarketingClientFilters['sortBy']>('lastVisit')
  const [exportSortOrder, setExportSortOrder] = useState<MarketingClientFilters['sortOrder']>('DESC')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(debounceRef.current)
  }, [search])

  useEffect(() => setPage(1), [debouncedSearch, activeSegment, sortBy, sortOrder])

  const filters: MarketingClientFilters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      segment: activeSegment,
      sortBy,
      sortOrder,
      page,
      limit: 15,
    }),
    [debouncedSearch, activeSegment, sortBy, sortOrder, page],
  )

  /* ─── Campaign tab state ─── */
  const [campaignPage, setCampaignPage] = useState(1)
  const [expandedCampaignId, setExpandedCampaignId] = useState<number | null>(null)
  const [showNewCampaign, setShowNewCampaign] = useState(false)
  const [campaignStep, setCampaignStep] = useState(1)
  const [newCampaign, setNewCampaign] = useState<CreateCampaignDto>({ nom: '' })
  const [campaignMessageMode, setCampaignMessageMode] = useState<'template' | 'custom'>('template')

  /* ─── Template tab state ─── */
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<SmsTemplate | null>(null)
  const [templateForm, setTemplateForm] = useState<CreateTemplateDto>({ nom: '', contenu: '' })
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

  /* ─── Queries ─── */
  const { data: insights, isLoading: insightsLoading } = useMarketingInsights()
  const { data: segments, isLoading: segmentsLoading } = useMarketingSegments()
  const { data: clientsData, isLoading: clientsLoading } = useMarketingClients(filters)
  const { data: prospects } = useMarketingProspects()
  const { data: templates, isLoading: templatesLoading } = useTemplates()
  const { data: campaignsData, isLoading: campaignsLoading } = useCampaigns(campaignPage)
  const { data: expandedDetail } = useCampaignDetail(expandedCampaignId ?? 0)

  /* ─── Mutations ─── */
  const createTemplate = useCreateTemplate()
  const updateTemplate = useUpdateTemplate()
  const deleteTemplate = useDeleteTemplate()
  const createCampaign = useCreateCampaign()
  const sendCampaign = useSendCampaign()

  const clients = clientsData?.data ?? []
  const totalPages = clientsData?.totalPages ?? 1
  const campaignTotalPages = campaignsData?.totalPages ?? 1

  /* ─── Handlers ─── */

  const openExportModal = () => {
    setExportSegment(activeSegment)
    setExportSearch(debouncedSearch)
    setExportSortBy(sortBy)
    setExportSortOrder(sortOrder)
    setShowExportModal(true)
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      await exportMarketingClients({
        search: exportSearch || undefined,
        segment: exportSegment,
        sortBy: exportSortBy,
        sortOrder: exportSortOrder,
      })
      toast.success('Export CSV téléchargé')
      setShowExportModal(false)
    } catch {
      toast.error("Erreur lors de l'export")
    } finally {
      setIsExporting(false)
    }
  }

  const handleSaveTemplate = async () => {
    if (!templateForm.nom.trim() || !templateForm.contenu.trim()) {
      toast.error('Veuillez remplir tous les champs')
      return
    }
    try {
      if (editingTemplate) {
        await updateTemplate.mutateAsync({ id: editingTemplate.id, data: templateForm })
        toast.success('Template mis à jour')
      } else {
        await createTemplate.mutateAsync(templateForm)
        toast.success('Template créé')
      }
      closeTemplateModal()
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  const handleDeleteTemplate = async (id: number) => {
    try {
      await deleteTemplate.mutateAsync(id)
      toast.success('Template supprimé')
      setDeleteConfirmId(null)
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }

  const openEditTemplate = (tpl: SmsTemplate) => {
    setEditingTemplate(tpl)
    setTemplateForm({ nom: tpl.nom, contenu: tpl.contenu })
    setShowTemplateModal(true)
  }

  const closeTemplateModal = () => {
    setShowTemplateModal(false)
    setEditingTemplate(null)
    setTemplateForm({ nom: '', contenu: '' })
  }

  const openNewCampaign = () => {
    setNewCampaign({ nom: '' })
    setCampaignStep(1)
    setCampaignMessageMode('template')
    setShowNewCampaign(true)
  }

  const closeNewCampaign = () => {
    setShowNewCampaign(false)
    setNewCampaign({ nom: '' })
    setCampaignStep(1)
  }

  const handleCreateCampaign = async (sendImmediately: boolean) => {
    if (!newCampaign.nom.trim()) {
      toast.error('Veuillez nommer la campagne')
      return
    }
    if (!newCampaign.templateId && !newCampaign.customMessage?.trim()) {
      toast.error('Veuillez choisir un template ou écrire un message')
      return
    }
    try {
      const created = await createCampaign.mutateAsync(newCampaign)
      if (sendImmediately) {
        await sendCampaign.mutateAsync(created.id)
        toast.success('Campagne envoyée !')
      } else {
        toast.success('Brouillon créé')
      }
      closeNewCampaign()
    } catch {
      toast.error('Erreur lors de la création')
    }
  }

  const handleSendCampaign = async (id: number) => {
    try {
      await sendCampaign.mutateAsync(id)
      toast.success('Campagne envoyée !')
    } catch {
      toast.error("Erreur lors de l'envoi")
    }
  }

  const insertVariable = useCallback((variable: string) => {
    setTemplateForm((prev) => ({
      ...prev,
      contenu: prev.contenu + variable,
    }))
  }, [])

  const insertCampaignVariable = useCallback((variable: string) => {
    setNewCampaign((prev) => ({
      ...prev,
      customMessage: (prev.customMessage || '') + variable,
    }))
  }, [])

  const resolvedMessage = useMemo(() => {
    if (campaignMessageMode === 'template' && newCampaign.templateId) {
      return templates?.find((t) => t.id === newCampaign.templateId)?.contenu ?? ''
    }
    return newCampaign.customMessage ?? ''
  }, [campaignMessageMode, newCampaign.templateId, newCampaign.customMessage, templates])

  /* ─── KPI config ───── */
  const kpis = insights
    ? [
        { label: 'Total Clients', value: insights.totalClients.toLocaleString('fr-FR'), icon: Users, accent: 'bg-teal-500/10 text-teal-600' },
        { label: 'Clients Actifs (30j)', value: insights.activeClients.toLocaleString('fr-FR'), icon: Activity, accent: 'bg-emerald-500/10 text-emerald-600' },
        { label: 'Revenu 30j', value: fcfa(insights.totalRevenue), icon: Banknote, accent: 'bg-purple-500/10 text-purple-600' },
        { label: 'Revenu Moyen / Client', value: fcfa(insights.avgRevenuePerClient), icon: TrendingUp, accent: 'bg-blue-500/10 text-blue-600' },
        { label: 'Abonnements Actifs', value: insights.subscriptionCount.toLocaleString('fr-FR'), icon: Star, accent: 'bg-amber-500/10 text-amber-600' },
        { label: 'Taux de Conversion', value: insights.conversionRate + ' %', icon: Target, accent: 'bg-teal-500/10 text-teal-600' },
      ]
    : []

  /* ─── Tabs config ─── */
  const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: 'clients', label: 'Clients', icon: Users },
    { key: 'campaigns', label: 'Campagnes SMS', icon: MessageSquare },
    { key: 'templates', label: 'Templates', icon: FileText },
  ]

  /* ─── Render ───── */

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      {/* ─ Header ─────────────────────────────────────────────────── */}
      <motion.div variants={rise} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-teal-500/20 to-teal-600/10">
              <Megaphone className="w-5 h-5 text-accent" />
            </div>
            Marketing & Intelligence Client
          </h1>
          <p className="text-ink-faded mt-1 text-sm">
            Exploitez vos donn&eacute;es clients pour des d&eacute;cisions strat&eacute;giques
          </p>
        </div>
      </motion.div>

      {/* ─ Tab bar ────────────────────────────────────────────────── */}
      <motion.div variants={rise} className="flex gap-1 bg-inset border border-edge rounded-xl p-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-panel text-ink shadow-sm'
                  : 'text-ink-muted hover:text-ink-light'
                }
              `}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute inset-0 bg-panel rounded-lg shadow-sm -z-10"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          )
        })}
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* TAB 1 — CLIENTS (existing content)                            */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'clients' && (
        <motion.div key="clients" variants={stagger} initial="hidden" animate="show" className="space-y-6">
          {/* ─ Section 1 · KPIs ─────────────────────────────────────── */}
          {insightsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-panel border border-edge rounded-2xl p-4 animate-pulse">
                  <div className="w-9 h-9 rounded-xl bg-raised mb-3" />
                  <div className="h-5 w-16 bg-raised rounded mb-1.5" />
                  <div className="h-3 w-20 bg-raised rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
              {kpis.map((kpi) => (
                <motion.div
                  key={kpi.label}
                  variants={rise}
                  className="bg-panel border border-edge rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className={`p-2 rounded-xl w-fit ${kpi.accent} mb-3`}>
                    <kpi.icon className="w-4 h-4" />
                  </div>
                  <p className="font-heading text-lg font-bold text-ink leading-tight">{kpi.value}</p>
                  <p className="text-[11px] text-ink-faded mt-1 leading-snug">{kpi.label}</p>
                </motion.div>
              ))}
            </div>
          )}

          {/* ─ Section 2 · Segments ─────────────────────────────────── */}
          <motion.div variants={rise}>
            <h2 className="font-heading font-semibold text-ink text-base mb-3 flex items-center gap-2">
              <Database className="w-4 h-4 text-accent" />
              Segments Clients
            </h2>

            {segmentsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-panel border border-edge rounded-xl p-4 animate-pulse">
                    <div className="h-4 w-16 bg-raised rounded mb-2" />
                    <div className="h-6 w-10 bg-raised rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                {(segments ?? []).map((seg) => {
                  const isActive = activeSegment === seg.key
                  const Icon = segmentIcons[seg.key] ?? Users

                  return (
                    <motion.button
                      key={seg.key}
                      variants={rise}
                      onClick={() => setActiveSegment(isActive ? undefined : seg.key)}
                      className={`
                        relative text-left rounded-xl p-4 border-l-[3px] transition-all duration-200
                        ${
                          isActive
                            ? 'bg-panel shadow-md border-edge ring-1 ring-teal-500/30'
                            : 'bg-panel border-edge hover:shadow-sm'
                        }
                        border-t border-r border-b border-edge
                      `}
                      style={{ borderLeftColor: seg.color }}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <Icon className="w-3.5 h-3.5" style={{ color: seg.color }} />
                        <span className="text-xs font-semibold text-ink">{seg.label}</span>
                      </div>
                      <p className="font-heading text-xl font-bold text-ink">{seg.count}</p>
                      <p className="text-[10px] text-ink-muted mt-0.5 leading-tight">
                        {segmentDescriptions[seg.key] ?? ''}
                      </p>
                      {isActive && (
                        <motion.div
                          layoutId="segment-active"
                          className="absolute top-2 right-2 w-2 h-2 rounded-full bg-teal-500"
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      )}
                    </motion.button>
                  )
                })}
              </div>
            )}
          </motion.div>

          {/* ─ Section 3 · Client Table ─────────────────────────────── */}
          <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="px-5 py-4 border-b border-edge flex flex-col md:flex-row gap-3 md:items-center">
              <div className="flex items-center gap-2 bg-inset border border-edge rounded-xl px-3 py-2 flex-1 focus-within:border-teal-500/40 transition-colors">
                <Search className="w-4 h-4 text-ink-muted flex-shrink-0" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un client (nom, contact, email)..."
                  className="bg-transparent text-sm text-ink placeholder-ink-muted outline-none flex-1 min-w-0"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="text-ink-muted hover:text-ink-light">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <AnimatePresence>
                  {activeSegment && (
                    <motion.button
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      onClick={() => setActiveSegment(undefined)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-teal-500/30 bg-teal-500/10 text-teal-600 hover:bg-teal-500/20 transition-colors"
                    >
                      {segments?.find((s) => s.key === activeSegment)?.label}
                      <X className="w-3 h-3" />
                    </motion.button>
                  )}
                </AnimatePresence>

                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as MarketingClientFilters['sortBy'])}
                    className="appearance-none bg-inset border border-edge rounded-xl pl-3 pr-8 py-2 text-xs text-ink outline-none focus:border-teal-500/40 cursor-pointer"
                  >
                    {sortOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ArrowUpDown className="w-3 h-3 text-ink-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <button
                  onClick={() => setSortOrder((o) => (o === 'ASC' ? 'DESC' : 'ASC'))}
                  className="p-2 bg-inset border border-edge rounded-xl text-ink-muted hover:text-ink-light transition-colors"
                  title={sortOrder === 'ASC' ? 'Ascendant' : 'Descendant'}
                >
                  <ArrowUpDown className={`w-3.5 h-3.5 transition-transform ${sortOrder === 'ASC' ? 'rotate-180' : ''}`} />
                </button>

                <button
                  onClick={openExportModal}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/25 hover:shadow-teal-500/35 transition-shadow text-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </button>
              </div>
            </div>

            {/* Table */}
            {clientsLoading ? (
              <div className="flex justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
              </div>
            ) : clients.length === 0 ? (
              <div className="text-center text-ink-muted p-12">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Aucun client trouv&eacute;</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-edge text-left">
                        <th className="px-5 py-3 text-[11px] font-semibold text-ink-muted uppercase tracking-wider">Nom</th>
                        <th className="px-5 py-3 text-[11px] font-semibold text-ink-muted uppercase tracking-wider">Contact</th>
                        <th className="px-5 py-3 text-[11px] font-semibold text-ink-muted uppercase tracking-wider text-center">V&eacute;hicules</th>
                        <th className="px-5 py-3 text-[11px] font-semibold text-ink-muted uppercase tracking-wider text-center">Visites</th>
                        <th className="px-5 py-3 text-[11px] font-semibold text-ink-muted uppercase tracking-wider text-right">D&eacute;penses</th>
                        <th className="px-5 py-3 text-[11px] font-semibold text-ink-muted uppercase tracking-wider">Derni&egrave;re Visite</th>
                        <th className="px-5 py-3 text-[11px] font-semibold text-ink-muted uppercase tracking-wider text-center">Fid&eacute;lit&eacute;</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-edge">
                      {clients.map((client) => (
                        <tr
                          key={client.id}
                          onClick={() => navigate(`/clients/${client.id}`)}
                          className="hover:bg-raised/50 transition-colors cursor-pointer group"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white text-[11px] font-bold uppercase flex-shrink-0">
                                {client.nom?.charAt(0) || '?'}
                              </div>
                              <div>
                                <p className="font-semibold text-ink group-hover:text-accent transition-colors">{client.nom}</p>
                                {client.email && <p className="text-[11px] text-ink-muted truncate max-w-[180px]">{client.email}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-ink-light text-xs">{client.contact || '—'}</td>
                          <td className="px-5 py-3.5 text-center">
                            <span className="inline-flex items-center gap-1 text-xs text-ink-light">
                              <Car className="w-3 h-3" /> {client.vehicleCount}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-center font-medium text-ink">{client.totalVisits}</td>
                          <td className="px-5 py-3.5 text-right font-medium text-ink text-xs">
                            {Number(client.totalSpent).toLocaleString('fr-FR')} <span className="text-ink-muted">F</span>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-ink-light">
                            {client.lastVisitDate
                              ? new Date(client.lastVisitDate).toLocaleDateString('fr-FR')
                              : <span className="text-ink-muted">Jamais</span>}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium border bg-amber-500/10 text-amber-600 border-amber-200">
                              <Star className="w-3 h-3" /> {client.pointsFidelite}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-edge">
                  {clients.map((client) => (
                    <div
                      key={client.id}
                      onClick={() => navigate(`/clients/${client.id}`)}
                      className="px-4 py-3.5 hover:bg-raised/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white text-[11px] font-bold uppercase flex-shrink-0">
                            {client.nom?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="font-semibold text-ink text-sm">{client.nom}</p>
                            <p className="text-[11px] text-ink-muted">{client.contact || client.email || '—'}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-ink-muted" />
                      </div>
                      <div className="flex items-center gap-4 text-[11px] text-ink-light pl-10">
                        <span>{client.totalVisits} visites</span>
                        <span>{Number(client.totalSpent).toLocaleString('fr-FR')} F</span>
                        <span className="inline-flex items-center gap-0.5 text-amber-600">
                          <Star className="w-3 h-3" /> {client.pointsFidelite}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-5 py-3 border-t border-edge flex items-center justify-between">
                    <p className="text-xs text-ink-muted">
                      Page {page} sur {totalPages} &middot; {clientsData?.total ?? 0} clients
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

          {/* ─ Section 4 · Prospects Pipeline ───────────────────────── */}
          {prospects && (
            <motion.div variants={rise}>
              <h2 className="font-heading font-semibold text-ink text-base mb-3 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-accent" />
                Pipeline Prospects
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-panel border border-edge rounded-2xl p-4 shadow-sm">
                  <div className="p-2 rounded-xl w-fit bg-orange-500/10 text-orange-600 mb-2">
                    <Clock className="w-4 h-4" />
                  </div>
                  <p className="font-heading text-xl font-bold text-ink">{prospects.totalPending}</p>
                  <p className="text-[11px] text-ink-faded mt-0.5">En attente</p>
                </div>
                <div className="bg-panel border border-edge rounded-2xl p-4 shadow-sm">
                  <div className="p-2 rounded-xl w-fit bg-emerald-500/10 text-emerald-600 mb-2">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <p className="font-heading text-xl font-bold text-ink">{prospects.confirmedToday}</p>
                  <p className="text-[11px] text-ink-faded mt-0.5">Confirm&eacute;s aujourd'hui</p>
                </div>
                <div className="bg-panel border border-edge rounded-2xl p-4 shadow-sm">
                  <div className="p-2 rounded-xl w-fit bg-teal-500/10 text-teal-600 mb-2">
                    <Target className="w-4 h-4" />
                  </div>
                  <p className="font-heading text-xl font-bold text-ink">{prospects.conversionRate} %</p>
                  <p className="text-[11px] text-ink-faded mt-0.5">Taux de conversion</p>
                </div>
              </div>

              {prospects.recent.length > 0 && (
                <div className="bg-panel border border-edge rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-5 py-3 border-b border-edge">
                    <h3 className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
                      Prospects r&eacute;cents
                    </h3>
                  </div>
                  <div className="divide-y divide-edge max-h-[340px] overflow-y-auto">
                    {prospects.recent.slice(0, 10).map((p) => (
                      <div key={p.id} className="px-5 py-3 flex items-center gap-4 hover:bg-raised/50 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                          <UserPlus className="w-3.5 h-3.5 text-orange-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink truncate">{p.prospectNom}</p>
                          <div className="flex items-center gap-3 text-[11px] text-ink-muted mt-0.5">
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {p.prospectTelephone}
                            </span>
                            <span className="font-mono">{p.immatriculation}</span>
                          </div>
                        </div>
                        <p className="text-[11px] text-ink-muted flex-shrink-0">
                          {new Date(p.date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* TAB 2 — CAMPAGNES SMS                                         */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'campaigns' && (
        <motion.div key="campaigns" variants={stagger} initial="hidden" animate="show" className="space-y-5">
          {/* Header */}
          <motion.div variants={rise} className="flex items-center justify-between">
            <h2 className="font-heading font-semibold text-ink text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-accent" />
              Campagnes SMS
            </h2>
            <button
              onClick={openNewCampaign}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/25 hover:shadow-teal-500/35 transition-shadow text-sm"
            >
              <Plus className="w-4 h-4" />
              Nouvelle Campagne
            </button>
          </motion.div>

          {/* Campaign list */}
          {campaignsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-panel border border-edge rounded-2xl p-5 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-raised" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-40 bg-raised rounded" />
                      <div className="h-3 w-24 bg-raised rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : !campaignsData?.data?.length ? (
            <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl p-12 text-center">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-20 text-ink-muted" />
              <p className="text-sm text-ink-muted">Aucune campagne cr&eacute;&eacute;e</p>
              <p className="text-xs text-ink-muted mt-1">Cr&eacute;ez votre premi&egrave;re campagne SMS pour communiquer avec vos clients</p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {campaignsData.data.map((campaign: Campaign) => {
                const st = statusConfig[campaign.status]
                const isExpanded = expandedCampaignId === campaign.id

                return (
                  <motion.div key={campaign.id} variants={rise} layout>
                    <div
                      className={`bg-panel border rounded-2xl shadow-sm overflow-hidden transition-all ${
                        isExpanded ? 'border-teal-500/30 ring-1 ring-teal-500/10' : 'border-edge'
                      }`}
                    >
                      {/* Campaign row */}
                      <button
                        onClick={() => setExpandedCampaignId(isExpanded ? null : campaign.id)}
                        className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-raised/30 transition-colors"
                      >
                        <div className={`p-2.5 rounded-xl ${st.bg}`}>
                          {campaign.status === 'sending' ? (
                            <st.icon className={`w-4 h-4 ${st.text} animate-spin`} />
                          ) : (
                            <st.icon className={`w-4 h-4 ${st.text}`} />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-semibold text-ink text-sm truncate">{campaign.nom}</p>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold ${st.bg} ${st.text}`}>
                              {st.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-[11px] text-ink-muted">
                            {campaign.segment && (
                              <span className="flex items-center gap-1">
                                <CircleDot className="w-3 h-3" />
                                {segments?.find((s) => s.key === campaign.segment)?.label ?? campaign.segment}
                              </span>
                            )}
                            <span>{campaign.totalRecipients} destinataires</span>
                            <span>{new Date(campaign.createdAt).toLocaleDateString('fr-FR')}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          {campaign.status === 'sent' && (
                            <div className="flex items-center gap-3 text-xs">
                              <span className="flex items-center gap-1 text-emerald-600">
                                <MailCheck className="w-3.5 h-3.5" /> {campaign.sentCount}
                              </span>
                              {campaign.failedCount > 0 && (
                                <span className="flex items-center gap-1 text-red-500">
                                  <MailX className="w-3.5 h-3.5" /> {campaign.failedCount}
                                </span>
                              )}
                            </div>
                          )}
                          {campaign.status === 'draft' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSendCampaign(campaign.id)
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold rounded-lg shadow-sm text-xs hover:shadow-md transition-shadow"
                            >
                              <Send className="w-3 h-3" /> Envoyer
                            </button>
                          )}
                          <ChevronDown className={`w-4 h-4 text-ink-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </button>

                      {/* Expanded detail */}
                      <AnimatePresence>
                        {isExpanded && expandedDetail && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                          >
                            <div className="px-5 pb-4 border-t border-edge pt-4 space-y-3">
                              {/* Message preview */}
                              <div className="bg-inset border border-edge rounded-xl p-3">
                                <p className="text-[10px] text-ink-muted uppercase tracking-wider mb-1 font-semibold">Message</p>
                                <p className="text-sm text-ink-light whitespace-pre-wrap">{expandedDetail.message}</p>
                              </div>

                              {/* Recipients table */}
                              {expandedDetail.recipients?.length > 0 && (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="border-b border-edge">
                                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-ink-muted uppercase tracking-wider">Client</th>
                                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-ink-muted uppercase tracking-wider">T&eacute;l&eacute;phone</th>
                                        <th className="px-3 py-2 text-center text-[10px] font-semibold text-ink-muted uppercase tracking-wider">Statut</th>
                                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-ink-muted uppercase tracking-wider">Envoy&eacute; &agrave;</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-edge">
                                      {expandedDetail.recipients.map((r) => (
                                        <tr key={r.id} className="hover:bg-raised/30">
                                          <td className="px-3 py-2 text-ink">{r.client?.nom ?? `Client #${r.clientId}`}</td>
                                          <td className="px-3 py-2 text-ink-light font-mono">{r.telephone}</td>
                                          <td className="px-3 py-2 text-center">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold ${
                                              r.status === 'sent'
                                                ? 'bg-emerald-500/10 text-emerald-600'
                                                : r.status === 'failed'
                                                ? 'bg-red-500/10 text-red-500'
                                                : 'bg-raised text-ink-muted'
                                            }`}>
                                              {r.status === 'sent' ? 'Envoyé' : r.status === 'failed' ? 'Échoué' : 'En attente'}
                                            </span>
                                          </td>
                                          <td className="px-3 py-2 text-ink-muted">
                                            {r.sentAt ? new Date(r.sentAt).toLocaleString('fr-FR') : '—'}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )
              })}

              {/* Campaign pagination */}
              {campaignTotalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-ink-muted">
                    Page {campaignPage} sur {campaignTotalPages}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCampaignPage((p) => Math.max(1, p - 1))}
                      disabled={campaignPage === 1}
                      className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-raised transition-colors disabled:opacity-30"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCampaignPage((p) => Math.min(campaignTotalPages, p + 1))}
                      disabled={campaignPage === campaignTotalPages}
                      className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-raised transition-colors disabled:opacity-30"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* TAB 3 — TEMPLATES                                             */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'templates' && (
        <motion.div key="templates" variants={stagger} initial="hidden" animate="show" className="space-y-5">
          {/* Header */}
          <motion.div variants={rise} className="flex items-center justify-between">
            <h2 className="font-heading font-semibold text-ink text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-accent" />
              Templates SMS
            </h2>
            <button
              onClick={() => {
                setEditingTemplate(null)
                setTemplateForm({ nom: '', contenu: '' })
                setShowTemplateModal(true)
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/25 hover:shadow-teal-500/35 transition-shadow text-sm"
            >
              <Plus className="w-4 h-4" />
              Nouveau Template
            </button>
          </motion.div>

          {/* Template grid */}
          {templatesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-panel border border-edge rounded-2xl p-5 animate-pulse">
                  <div className="h-4 w-32 bg-raised rounded mb-3" />
                  <div className="space-y-2">
                    <div className="h-3 w-full bg-raised rounded" />
                    <div className="h-3 w-3/4 bg-raised rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : !templates?.length ? (
            <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl p-12 text-center">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-20 text-ink-muted" />
              <p className="text-sm text-ink-muted">Aucun template cr&eacute;&eacute;</p>
              <p className="text-xs text-ink-muted mt-1">Les templates permettent de r&eacute;utiliser des messages avec des variables</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {templates.map((tpl) => (
                <motion.div
                  key={tpl.id}
                  variants={rise}
                  className="bg-panel border border-edge rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-teal-500/10">
                        <FileText className="w-3.5 h-3.5 text-teal-600" />
                      </div>
                      <h3 className="font-semibold text-ink text-sm">{tpl.nom}</h3>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditTemplate(tpl)}
                        className="p-1.5 rounded-lg hover:bg-raised text-ink-muted hover:text-ink transition-colors"
                        title="Modifier"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(tpl.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-ink-muted hover:text-red-500 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-ink-light leading-relaxed whitespace-pre-wrap line-clamp-4">
                    {tpl.contenu}
                  </p>

                  {/* Variable pills */}
                  {VARIABLES.some((v) => tpl.contenu.includes(v.key)) && (
                    <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-edge">
                      {VARIABLES.filter((v) => tpl.contenu.includes(v.key)).map((v) => (
                        <span key={v.key} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-teal-500/10 text-teal-600">
                          <Hash className="w-2.5 h-2.5" /> {v.key}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-[10px] text-ink-muted mt-3">
                    {new Date(tpl.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL — Export CSV                                            */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showExportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowExportModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="bg-panel border border-edge rounded-2xl shadow-2xl w-full max-w-md"
            >
              <div className="px-6 py-4 border-b border-edge flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-teal-500/10">
                    <Download className="w-4 h-4 text-teal-600" />
                  </div>
                  <h3 className="font-heading font-semibold text-ink text-base">Export CSV</h3>
                </div>
                <button onClick={() => setShowExportModal(false)} className="p-1.5 rounded-lg hover:bg-raised text-ink-muted hover:text-ink transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                {/* Segment filter */}
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5 flex items-center gap-1.5">
                    <Filter className="w-3 h-3 text-ink-muted" />
                    Segment
                  </label>
                  <div className="relative">
                    <select
                      value={exportSegment || ''}
                      onChange={(e) => setExportSegment(e.target.value || undefined)}
                      className="w-full appearance-none px-3 py-2.5 bg-inset border border-edge rounded-xl text-sm text-ink outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 cursor-pointer"
                    >
                      <option value="">Tous les clients</option>
                      {(segments ?? []).map((seg) => (
                        <option key={seg.key} value={seg.key}>
                          {seg.label} ({seg.count})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-ink-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Search filter */}
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5 flex items-center gap-1.5">
                    <Search className="w-3 h-3 text-ink-muted" />
                    Recherche
                  </label>
                  <input
                    value={exportSearch}
                    onChange={(e) => setExportSearch(e.target.value)}
                    placeholder="Nom, contact, email (optionnel)"
                    className="w-full px-3 py-2.5 bg-inset border border-edge rounded-xl text-sm text-ink placeholder-ink-muted outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
                  />
                </div>

                {/* Sort */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1.5 flex items-center gap-1.5">
                      <ArrowUpDown className="w-3 h-3 text-ink-muted" />
                      Trier par
                    </label>
                    <div className="relative">
                      <select
                        value={exportSortBy}
                        onChange={(e) => setExportSortBy(e.target.value as MarketingClientFilters['sortBy'])}
                        className="w-full appearance-none px-3 py-2.5 bg-inset border border-edge rounded-xl text-sm text-ink outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 cursor-pointer"
                      >
                        {sortOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-ink-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1.5">&nbsp;</label>
                    <button
                      onClick={() => setExportSortOrder((o) => (o === 'ASC' ? 'DESC' : 'ASC'))}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-inset border border-edge rounded-xl text-sm text-ink hover:bg-raised transition-colors"
                    >
                      <ArrowUpDown className={`w-3.5 h-3.5 text-ink-muted transition-transform ${exportSortOrder === 'ASC' ? 'rotate-180' : ''}`} />
                      {exportSortOrder === 'ASC' ? 'Ascendant' : 'Descendant'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-edge flex justify-end gap-2">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2.5 text-sm font-medium text-ink-muted hover:text-ink transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/25 text-sm disabled:opacity-50 hover:shadow-teal-500/35 transition-shadow"
                >
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Télécharger
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL — New Campaign (multi-step)                             */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showNewCampaign && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={closeNewCampaign}
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
              <div className="px-6 py-4 border-b border-edge flex items-center justify-between">
                <div>
                  <h3 className="font-heading font-semibold text-ink text-base">Nouvelle Campagne</h3>
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    &Eacute;tape {campaignStep} sur 3
                  </p>
                </div>
                <button onClick={closeNewCampaign} className="p-1.5 rounded-lg hover:bg-raised text-ink-muted hover:text-ink transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Step indicators */}
              <div className="px-6 py-3 flex items-center gap-2">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center gap-2 flex-1">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                      campaignStep >= step
                        ? 'bg-teal-500 text-white'
                        : 'bg-raised text-ink-muted'
                    }`}>
                      {step}
                    </div>
                    <span className={`text-[10px] font-medium hidden sm:block ${
                      campaignStep >= step ? 'text-ink' : 'text-ink-muted'
                    }`}>
                      {step === 1 ? 'Audience' : step === 2 ? 'Message' : 'Confirmation'}
                    </span>
                    {step < 3 && <div className={`flex-1 h-px ${campaignStep > step ? 'bg-teal-500' : 'bg-edge'}`} />}
                  </div>
                ))}
              </div>

              <div className="px-6 py-4 space-y-4">
                {/* ─── Step 1: Audience ─── */}
                {campaignStep === 1 && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1.5">Nom de la campagne</label>
                      <input
                        value={newCampaign.nom}
                        onChange={(e) => setNewCampaign((c) => ({ ...c, nom: e.target.value }))}
                        placeholder="Ex: Promo fidélité janvier"
                        className="w-full px-3 py-2.5 bg-inset border border-edge rounded-xl text-sm text-ink placeholder-ink-muted outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1.5">Segment cible</label>
                      <div className="relative">
                        <select
                          value={newCampaign.segment || ''}
                          onChange={(e) => setNewCampaign((c) => ({ ...c, segment: e.target.value || undefined }))}
                          className="w-full appearance-none px-3 py-2.5 bg-inset border border-edge rounded-xl text-sm text-ink outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 cursor-pointer"
                        >
                          <option value="">Tous les clients</option>
                          {(segments ?? []).map((seg) => (
                            <option key={seg.key} value={seg.key}>
                              {seg.label} ({seg.count} clients)
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-ink-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                      <p className="text-[10px] text-ink-muted mt-1.5">
                        Seuls les clients avec un num&eacute;ro de t&eacute;l&eacute;phone recevront le SMS
                      </p>
                    </div>
                  </>
                )}

                {/* ─── Step 2: Message ─── */}
                {campaignStep === 2 && (
                  <>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setCampaignMessageMode('template')
                          setNewCampaign((c) => ({ ...c, customMessage: undefined }))
                        }}
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                          campaignMessageMode === 'template'
                            ? 'bg-teal-500/10 text-teal-600 border border-teal-500/30'
                            : 'bg-inset border border-edge text-ink-muted hover:text-ink'
                        }`}
                      >
                        Utiliser un template
                      </button>
                      <button
                        onClick={() => {
                          setCampaignMessageMode('custom')
                          setNewCampaign((c) => ({ ...c, templateId: undefined }))
                        }}
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                          campaignMessageMode === 'custom'
                            ? 'bg-teal-500/10 text-teal-600 border border-teal-500/30'
                            : 'bg-inset border border-edge text-ink-muted hover:text-ink'
                        }`}
                      >
                        Message personnalis&eacute;
                      </button>
                    </div>

                    {campaignMessageMode === 'template' ? (
                      <div>
                        <label className="block text-xs font-semibold text-ink mb-1.5">Choisir un template</label>
                        {!templates?.length ? (
                          <div className="bg-inset border border-edge rounded-xl p-4 text-center">
                            <p className="text-xs text-ink-muted">Aucun template disponible</p>
                            <button
                              onClick={() => {
                                closeNewCampaign()
                                setActiveTab('templates')
                                setShowTemplateModal(true)
                              }}
                              className="text-xs text-teal-600 font-semibold mt-1 hover:underline"
                            >
                              Cr&eacute;er un template
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {templates.map((tpl) => (
                              <button
                                key={tpl.id}
                                onClick={() => setNewCampaign((c) => ({ ...c, templateId: tpl.id }))}
                                className={`w-full text-left p-3 rounded-xl border transition-all ${
                                  newCampaign.templateId === tpl.id
                                    ? 'border-teal-500/40 bg-teal-500/5 ring-1 ring-teal-500/20'
                                    : 'border-edge bg-inset hover:bg-raised/50'
                                }`}
                              >
                                <p className="text-sm font-semibold text-ink">{tpl.nom}</p>
                                <p className="text-[11px] text-ink-muted mt-0.5 line-clamp-2">{tpl.contenu}</p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-semibold text-ink mb-1.5">Votre message</label>
                        <textarea
                          value={newCampaign.customMessage || ''}
                          onChange={(e) => setNewCampaign((c) => ({ ...c, customMessage: e.target.value }))}
                          rows={4}
                          placeholder="Bonjour {nom}, ..."
                          className="w-full px-3 py-2.5 bg-inset border border-edge rounded-xl text-sm text-ink placeholder-ink-muted outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 resize-none"
                        />
                        <div className="flex items-center justify-between mt-1.5">
                          <div className="flex gap-1">
                            {VARIABLES.map((v) => (
                              <button
                                key={v.key}
                                onClick={() => insertCampaignVariable(v.key)}
                                className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-teal-500/10 text-teal-600 hover:bg-teal-500/20 transition-colors"
                                title={v.desc}
                              >
                                {v.key}
                              </button>
                            ))}
                          </div>
                          <span className="text-[10px] text-ink-muted">
                            {(newCampaign.customMessage || '').length} caract&egrave;res
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ─── Step 3: Confirmation ─── */}
                {campaignStep === 3 && (
                  <div className="space-y-4">
                    <div className="bg-inset border border-edge rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-ink-muted font-semibold uppercase tracking-wider">R&eacute;sum&eacute;</span>
                        <Zap className="w-4 h-4 text-teal-500" />
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-ink-muted">Campagne</span>
                          <span className="font-medium text-ink">{newCampaign.nom}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-ink-muted">Audience</span>
                          <span className="font-medium text-ink">
                            {newCampaign.segment
                              ? segments?.find((s) => s.key === newCampaign.segment)?.label ?? newCampaign.segment
                              : 'Tous les clients'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-ink-muted">Source</span>
                          <span className="font-medium text-ink">
                            {campaignMessageMode === 'template'
                              ? templates?.find((t) => t.id === newCampaign.templateId)?.nom ?? 'Template'
                              : 'Message personnalisé'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Message preview */}
                    <div className="bg-inset border border-edge rounded-xl p-4">
                      <p className="text-[10px] text-ink-muted uppercase tracking-wider mb-2 font-semibold flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Aper&ccedil;u du message
                      </p>
                      <div className="bg-panel border border-edge rounded-lg p-3 text-sm text-ink-light whitespace-pre-wrap">
                        {resolvedMessage || <span className="text-ink-muted italic">Aucun message</span>}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal footer */}
              <div className="px-6 py-4 border-t border-edge flex items-center justify-between gap-3">
                {campaignStep > 1 ? (
                  <button
                    onClick={() => setCampaignStep((s) => s - 1)}
                    className="px-4 py-2 text-sm font-medium text-ink-muted hover:text-ink transition-colors"
                  >
                    Retour
                  </button>
                ) : (
                  <div />
                )}

                {campaignStep < 3 ? (
                  <button
                    onClick={() => setCampaignStep((s) => s + 1)}
                    disabled={
                      (campaignStep === 1 && !newCampaign.nom.trim()) ||
                      (campaignStep === 2 && !newCampaign.templateId && !newCampaign.customMessage?.trim())
                    }
                    className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/25 text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-teal-500/35 transition-shadow"
                  >
                    Suivant
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCreateCampaign(false)}
                      disabled={createCampaign.isPending}
                      className="px-4 py-2.5 bg-inset border border-edge text-ink font-semibold rounded-xl text-sm hover:bg-raised transition-colors disabled:opacity-50"
                    >
                      Cr&eacute;er brouillon
                    </button>
                    <button
                      onClick={() => handleCreateCampaign(true)}
                      disabled={createCampaign.isPending || sendCampaign.isPending}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/25 text-sm disabled:opacity-50 hover:shadow-teal-500/35 transition-shadow"
                    >
                      {(createCampaign.isPending || sendCampaign.isPending) ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Cr&eacute;er & Envoyer
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL — Template (Create / Edit)                              */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showTemplateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={closeTemplateModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="bg-panel border border-edge rounded-2xl shadow-2xl w-full max-w-md"
            >
              <div className="px-6 py-4 border-b border-edge flex items-center justify-between">
                <h3 className="font-heading font-semibold text-ink text-base">
                  {editingTemplate ? 'Modifier le template' : 'Nouveau template'}
                </h3>
                <button onClick={closeTemplateModal} className="p-1.5 rounded-lg hover:bg-raised text-ink-muted hover:text-ink transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Nom du template</label>
                  <input
                    value={templateForm.nom}
                    onChange={(e) => setTemplateForm((f) => ({ ...f, nom: e.target.value }))}
                    placeholder="Ex: Promotion fidélité"
                    className="w-full px-3 py-2.5 bg-inset border border-edge rounded-xl text-sm text-ink placeholder-ink-muted outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Contenu du message</label>
                  <textarea
                    value={templateForm.contenu}
                    onChange={(e) => setTemplateForm((f) => ({ ...f, contenu: e.target.value }))}
                    rows={5}
                    placeholder="Bonjour {nom}, vous avez {points} points de fidélité..."
                    className="w-full px-3 py-2.5 bg-inset border border-edge rounded-xl text-sm text-ink placeholder-ink-muted outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 resize-none"
                  />
                  <div className="flex items-center justify-between mt-1.5">
                    <div className="flex gap-1">
                      {VARIABLES.map((v) => (
                        <button
                          key={v.key}
                          onClick={() => insertVariable(v.key)}
                          className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-teal-500/10 text-teal-600 hover:bg-teal-500/20 transition-colors"
                          title={v.desc}
                        >
                          {v.key}
                        </button>
                      ))}
                    </div>
                    <span className="text-[10px] text-ink-muted">{templateForm.contenu.length} car.</span>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-edge flex justify-end gap-2">
                <button
                  onClick={closeTemplateModal}
                  className="px-4 py-2.5 text-sm font-medium text-ink-muted hover:text-ink transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveTemplate}
                  disabled={createTemplate.isPending || updateTemplate.isPending}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/25 text-sm disabled:opacity-50 hover:shadow-teal-500/35 transition-shadow"
                >
                  {(createTemplate.isPending || updateTemplate.isPending) && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {editingTemplate ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL — Delete Confirmation                                   */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {deleteConfirmId !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setDeleteConfirmId(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-panel border border-edge rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="font-heading font-semibold text-ink text-base mb-1">Supprimer ce template ?</h3>
              <p className="text-xs text-ink-muted mb-5">Cette action est irr&eacute;versible.</p>
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 text-sm font-medium text-ink-muted hover:text-ink transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleDeleteTemplate(deleteConfirmId)}
                  disabled={deleteTemplate.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white font-semibold rounded-xl text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {deleteTemplate.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Supprimer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
