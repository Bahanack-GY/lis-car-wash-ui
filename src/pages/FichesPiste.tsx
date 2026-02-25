import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ClipboardList,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Car,
  User,
  Phone,
  Droplets,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  FileText,
  Ticket,
} from 'lucide-react'
import { useFichesPiste } from '@/api/fiches-piste'
import { useAuth } from '@/contexts/AuthContext'
import type { FichePiste } from '@/api/fiches-piste/types'

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const rise = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

const statusCfg: Record<string, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  open:        { label: 'Ouverte',  cls: 'bg-info-wash text-info border-info-line', icon: FileText },
  in_progress: { label: 'En cours', cls: 'bg-warn-wash text-warn border-warn-line', icon: Clock },
  completed:   { label: 'Terminée', cls: 'bg-ok-wash text-ok border-ok-line', icon: CheckCircle2 },
}

const statusTabs = [
  { key: 'all', label: 'Toutes' },
  { key: 'open', label: 'Ouvertes' },
  { key: 'in_progress', label: 'En cours' },
  { key: 'completed', label: 'Terminées' },
]

export default function FichesPiste() {
  const navigate = useNavigate()
  const { selectedStationId } = useAuth()

  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [page, setPage] = useState(1)

  /* ── Build filters for API ─────────────────────────── */
  const filters = useMemo(() => {
    const f: { stationId?: number; statut?: 'open' | 'in_progress' | 'completed'; page: number; limit: number } = { page, limit: 20 }
    if (selectedStationId) f.stationId = selectedStationId
    if (activeTab !== 'all') f.statut = activeTab as 'open' | 'in_progress' | 'completed'
    return f
  }, [selectedStationId, activeTab, page])

  const { data: fichesData, isLoading, isError } = useFichesPiste(filters)

  const fichesList: FichePiste[] = fichesData?.data || []
  const totalPages = fichesData?.totalPages || 1

  /* ── Client-side search ────────────────────────────── */
  const filtered = useMemo(() => {
    if (!search.trim()) return fichesList
    const q = search.toLowerCase()
    return fichesList.filter(f =>
      (f.numero || '').toLowerCase().includes(q) ||
      (f.client?.nom || '').toLowerCase().includes(q) ||
      (f.client?.contact || '').includes(q) ||
      (f.vehicle?.immatriculation || '').toLowerCase().includes(q) ||
      (f.vehicle?.modele || '').toLowerCase().includes(q)
    )
  }, [fichesList, search])

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      {/* ── Header ─────────────────────────────────────── */}
      <motion.div variants={rise} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-accent" /> Fiches de Piste
          </h1>
          <p className="text-ink-faded text-sm mt-1">Inspection pré-lavage et état des lieux des véhicules</p>
        </div>
        <button
          onClick={() => navigate('/nouveau-lavage')}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/25 hover:shadow-teal-500/35 transition-shadow text-sm"
        >
          <Plus className="w-4 h-4" /> Nouveau Lavage
        </button>
      </motion.div>

      {/* ── Search + Tabs ──────────────────────────────── */}
      <motion.div variants={rise} className="flex flex-col md:flex-row gap-3">
        <div className="flex items-center gap-2 bg-panel border border-edge rounded-xl px-4 py-2.5 flex-1 shadow-sm focus-within:border-teal-500/40 transition-colors">
          <Search className="w-4 h-4 text-ink-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, plaque, numéro de fiche..."
            className="bg-transparent text-sm text-ink placeholder-ink-muted outline-none flex-1"
          />
        </div>
        <div className="flex bg-raised border border-edge rounded-xl p-1 shrink-0">
          {statusTabs.map(t => (
            <button
              key={t.key}
              onClick={() => { setActiveTab(t.key); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === t.key ? 'bg-panel text-accent shadow-sm' : 'text-ink-faded hover:text-ink-light'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Content ────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
        </div>
      ) : isError ? (
        <div className="p-4 bg-red-500/10 text-red-500 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> Erreur lors du chargement des fiches de piste.
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center p-12 border border-dashed border-divider rounded-xl">
          <ClipboardList className="w-8 h-8 text-ink-muted mx-auto mb-2" />
          <p className="text-ink-muted">Aucune fiche ne correspond à la recherche.</p>
        </div>
      ) : (
        <>
          <motion.div
            key={activeTab}
            variants={stagger}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 lg:grid-cols-2 gap-4"
          >
            {filtered.map((f) => {
              const st = statusCfg[f.statut] || { label: f.statut, cls: 'bg-raised text-ink-muted border-edge', icon: AlertTriangle }
              const StIcon = st.icon
              const displayDate = new Date(f.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
              const clientName = f.client?.nom || `Client #${f.clientId}`
              const vehiclePlate = f.vehicle?.immatriculation || `#${f.vehicleId}`
              const vehicleModel = f.vehicle?.modele || ''
              const washName = f.typeLavage?.nom || `Type #${f.typeLavageId}`
              const washPrice = f.typeLavage?.prixBase
              const controleurName = f.controleur ? `${f.controleur.prenom} ${f.controleur.nom}` : null
              const extras = f.extras || []
              const couponStatut = f.coupon?.statut

              return (
                <motion.div
                  key={f.id}
                  variants={rise}
                  onClick={() => f.coupon ? navigate(`/coupons/${f.coupon.id}`) : undefined}
                  className={`bg-panel border border-edge rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow duration-300 group ${f.coupon ? 'cursor-pointer' : ''}`}
                >
                  {/* ── Card header ─────────────────────────── */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="text-xs font-mono text-accent">{f.numero || `FP-${f.id.toString().padStart(4, '0')}`}</span>
                      <h3 className="font-heading font-semibold text-ink mt-0.5 flex items-center gap-2">
                        <Car className="w-4 h-4 text-ink-muted" />
                        {vehiclePlate}
                        {vehicleModel && <span className="text-ink-faded font-normal text-sm">— {vehicleModel}</span>}
                      </h3>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${st.cls}`}>
                      <StIcon className="w-3 h-3" /> {st.label}
                    </span>
                  </div>

                  {/* ── Info rows ───────────────────────────── */}
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center gap-2 text-ink-light">
                      <User className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                      <span className="font-medium text-ink">{clientName}</span>
                      {f.client?.contact && (
                        <span className="text-ink-muted flex items-center gap-1 text-xs">
                          <Phone className="w-3 h-3" /> {f.client.contact}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-ink-light">
                      <Droplets className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                      <span>{washName}</span>
                      {washPrice != null && (
                        <span className="text-xs font-semibold text-accent">{washPrice.toLocaleString()} FCFA</span>
                      )}
                    </div>
                    {controleurName && (
                      <div className="flex items-center gap-2 text-ink-light">
                        <User className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                        <span className="text-ink-faded text-xs">Contrôleur:</span>
                        <span>{controleurName}</span>
                      </div>
                    )}
                  </div>

                  {/* ── Extras ──────────────────────────────── */}
                  {extras.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {extras.map(e => (
                        <span key={e.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-wash text-accent-bold rounded-md text-xs">
                          <Sparkles className="w-3 h-3" /> {e.nom}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* ── Etat des lieux ──────────────────────── */}
                  {f.etatLieu && (
                    <div className="mt-3 p-3 bg-inset rounded-xl">
                      <p className="text-xs text-ink-faded mb-0.5 font-medium">État des lieux</p>
                      <p className="text-sm text-ink-light">{f.etatLieu}</p>
                    </div>
                  )}

                  {/* ── Footer ─────────────────────────────── */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-divider">
                    <span className="text-xs text-ink-muted">{displayDate}</span>
                    {f.coupon && (
                      <span className="flex items-center gap-1.5 text-xs text-accent font-medium">
                        <Ticket className="w-3.5 h-3.5" />
                        {f.coupon.numero}
                        {couponStatut && (
                          <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                            couponStatut === 'done' ? 'bg-ok-wash text-ok border-ok-line' :
                            couponStatut === 'washing' ? 'bg-warn-wash text-warn border-warn-line' :
                            'bg-inset text-ink-faded border-edge'
                          }`}>
                            {couponStatut === 'done' ? 'Terminé' : couponStatut === 'washing' ? 'En cours' : 'En attente'}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </motion.div>

          {/* ── Pagination ──────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 text-sm text-ink-muted pt-2">
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
        </>
      )}
    </motion.div>
  )
}
