import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  CalendarDays,
  Plus,
  Search,
  Clock,
  Phone,
  Car,
  X,
  Check,
  MapPin,
  Droplets,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  User,
  UserPlus,
} from 'lucide-react'
import { useReservations, useCreateReservation, useUpdateReservation } from '@/api/reservations'
import { useClients, useClientVehicles, useCreateClient, useCreateVehicle } from '@/api/clients'
import { useWashTypes } from '@/api/wash-types'
import { useStations } from '@/api/stations'
import { useAuth } from '@/contexts/AuthContext'
import type { Reservation } from '@/api/reservations/types'

/* ── Animations ──────────────────────────────────────── */
const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const rise = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

/* ── Status config ───────────────────────────────────── */
const statusCfg: Record<string, { label: string; cls: string }> = {
  confirmed: { label: 'Confirmé', cls: 'bg-ok-wash text-ok border-ok-line' },
  pending:   { label: 'En attente', cls: 'bg-warn-wash text-warn border-warn-line' },
  cancelled: { label: 'Annulé', cls: 'bg-bad-wash text-bad border-bad-line' },
  done:      { label: 'Terminé', cls: 'bg-inset text-ink-faded border-edge' },
}

/* ── Date helpers ────────────────────────────────────── */
function toDateStr(d: Date) {
  return d.toISOString().split('T')[0]
}
function getWeekRange() {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const start = new Date(now)
  start.setDate(diff)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return { start: toDateStr(start), end: toDateStr(end) }
}

const tabs = [
  { key: 'all', label: 'Tous' },
  { key: 'today', label: "Aujourd'hui" },
  { key: 'tomorrow', label: 'Demain' },
  { key: 'week', label: 'Cette semaine' },
]

const inputCls = 'w-full px-4 py-2.5 bg-inset border border-outline rounded-xl text-sm text-ink placeholder-ink-muted outline-none focus:border-accent-ring focus:ring-2 focus:ring-teal-500/15 transition-all'

export default function Reservations() {
  const { selectedStationId, hasRole } = useAuth()

  /* ── Tab & search ──────────────────────────────────── */
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  /* ── Compute filter date from tab ──────────────────── */
  const filters = useMemo(() => {
    const f: { stationId?: number; date?: string; page: number; limit: number } = { page, limit: 20 }
    if (selectedStationId) f.stationId = selectedStationId

    const today = new Date()
    if (activeTab === 'today') f.date = toDateStr(today)
    else if (activeTab === 'tomorrow') {
      const tmr = new Date(today)
      tmr.setDate(tmr.getDate() + 1)
      f.date = toDateStr(tmr)
    }
    return f
  }, [activeTab, selectedStationId, page])

  /* ── Queries ───────────────────────────────────────── */
  const { data: reservationsData, isLoading, isError } = useReservations(filters)
  const createReservation = useCreateReservation()
  const updateReservation = useUpdateReservation()

  const rawList: Reservation[] = reservationsData?.data || []
  const totalPages = reservationsData?.totalPages || 1

  /* ── Client-side filtering (search + week tab) ─────── */
  const filtered = useMemo(() => {
    let list = rawList

    // Week filter (client-side since backend accepts single date only)
    if (activeTab === 'week') {
      const { start, end } = getWeekRange()
      list = list.filter(r => {
        const d = toDateStr(new Date(r.dateHeureApport))
        return d >= start && d <= end
      })
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        (r.numero || '').toLowerCase().includes(q) ||
        (r.client?.nom || '').toLowerCase().includes(q) ||
        (r.client?.contact || '').includes(q) ||
        (r.vehicle?.immatriculation || '').toLowerCase().includes(q)
      )
    }

    return list
  }, [rawList, search, activeTab])

  /* ── Modal state ───────────────────────────────────── */
  const [isModalOpen, setIsModalOpen] = useState(false)

  /* ── Status handler ────────────────────────────────── */
  const handleUpdateStatus = async (id: number, statut: 'confirmed' | 'cancelled') => {
    try {
      await updateReservation.mutateAsync({ id, data: { statut } })
      toast.success(statut === 'confirmed' ? 'Réservation confirmée' : 'Réservation annulée')
    } catch {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  return (
    <>
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
        {/* ── Header ────────────────────────────────────── */}
        <motion.div variants={rise} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-ink">Réservations</h1>
            <p className="text-ink-faded text-sm mt-1">Gérez les créneaux de lavage</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/25 hover:shadow-teal-500/35 transition-shadow text-sm"
          >
            <Plus className="w-4 h-4" /> Nouvelle réservation
          </button>
        </motion.div>

        {/* ── Search + Tabs ─────────────────────────────── */}
        <motion.div variants={rise} className="flex flex-col md:flex-row gap-3">
          <div className="flex items-center gap-2 bg-panel border border-edge rounded-xl px-4 py-2.5 flex-1 shadow-sm focus-within:border-teal-500/40 transition-colors">
            <Search className="w-4 h-4 text-ink-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, téléphone, plaque, numéro..."
              className="bg-transparent text-sm text-ink placeholder-ink-muted outline-none flex-1"
            />
          </div>
          <div className="flex bg-raised border border-edge rounded-xl p-1 shrink-0">
            {tabs.map((t) => (
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

        {/* ── Table ─────────────────────────────────────── */}
        <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
            </div>
          ) : isError ? (
            <div className="p-4 bg-red-500/10 text-red-500 m-4 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Erreur lors du chargement des réservations.
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <CalendarDays className="w-8 h-8 text-ink-muted mx-auto mb-2" />
              <p className="text-ink-muted">Aucune réservation trouvée.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-edge bg-inset/50">
                      <th className="px-5 py-4 text-xs font-semibold text-ink-faded uppercase tracking-wider">Réf.</th>
                      <th className="px-5 py-4 text-xs font-semibold text-ink-faded uppercase tracking-wider">Client</th>
                      <th className="px-5 py-4 text-xs font-semibold text-ink-faded uppercase tracking-wider hidden lg:table-cell">Véhicule</th>
                      <th className="px-5 py-4 text-xs font-semibold text-ink-faded uppercase tracking-wider hidden md:table-cell">Date & Heure</th>
                      <th className="px-5 py-4 text-xs font-semibold text-ink-faded uppercase tracking-wider">Statut</th>
                      <th className="px-5 py-4 text-xs font-semibold text-ink-faded uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => {
                      const st = statusCfg[r.statut] || { label: r.statut, cls: 'bg-raised text-ink-muted border-edge' }
                      const displayDate = new Date(r.dateHeureApport).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                      const displayTime = new Date(r.dateHeureApport).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

                      return (
                        <tr key={r.id} className="border-b border-divider hover:bg-inset/50 transition-colors">
                          <td className="px-5 py-4">
                            <span className="text-sm font-mono font-medium text-accent">{r.numero || `R-${r.id.toString().padStart(4, '0')}`}</span>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-sm font-medium text-ink">{r.client?.nom || `Client #${r.clientId}`}</p>
                            <p className="text-xs text-ink-muted flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3" /> {r.client?.contact || 'N/A'}
                            </p>
                          </td>
                          <td className="px-5 py-4 hidden lg:table-cell">
                            <p className="text-sm text-ink-light flex items-center gap-1.5">
                              <Car className="w-3.5 h-3.5 text-ink-muted" />
                              {r.vehicle?.immatriculation || `#${r.vehicleId}`}
                            </p>
                            {r.vehicle?.modele && (
                              <p className="text-xs text-ink-muted mt-0.5">{r.vehicle.modele}</p>
                            )}
                          </td>
                          <td className="px-5 py-4 hidden md:table-cell">
                            <div className="flex items-center gap-2 text-sm text-ink-light">
                              <CalendarDays className="w-3.5 h-3.5 text-ink-muted shrink-0" /> {displayDate}
                              <Clock className="w-3.5 h-3.5 text-ink-muted ml-1 shrink-0" /> {displayTime}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium border ${st.cls}`}>{st.label}</span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {r.statut === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleUpdateStatus(r.id, 'confirmed')}
                                    disabled={updateReservation.isPending}
                                    className="p-1.5 rounded-lg text-ok hover:bg-ok-wash transition-colors"
                                    title="Confirmer"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleUpdateStatus(r.id, 'cancelled')}
                                    disabled={updateReservation.isPending}
                                    className="p-1.5 rounded-lg text-bad hover:bg-bad-wash transition-colors"
                                    title="Annuler"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              {r.statut === 'confirmed' && (
                                <button
                                  onClick={() => handleUpdateStatus(r.id, 'cancelled')}
                                  disabled={updateReservation.isPending}
                                  className="p-1.5 rounded-lg text-bad hover:bg-bad-wash transition-colors"
                                  title="Annuler"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                              {(r.statut === 'cancelled' || r.statut === 'done') && (
                                <span className="text-xs text-ink-muted">—</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── Pagination ──────────────────────────────── */}
              <div className="px-5 py-3 border-t border-divider flex items-center justify-between text-sm text-ink-muted">
                <span>{filtered.length} réservation(s)</span>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
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

      {/* ── Create Reservation Modal ──────────────────── */}
      <AnimatePresence>
        {isModalOpen && (
          <CreateReservationModal
            stationId={selectedStationId}
            isSuperAdmin={hasRole('super_admin')}
            onClose={() => setIsModalOpen(false)}
            onCreate={createReservation}
          />
        )}
      </AnimatePresence>
    </>
  )
}

/* ================================================================
   CREATE RESERVATION MODAL
   ================================================================ */
function CreateReservationModal({
  stationId,
  isSuperAdmin,
  onClose,
  onCreate,
}: {
  stationId: number | null
  isSuperAdmin: boolean
  onClose: () => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onCreate: any
}) {
  /* ── Data queries ──────────────────────────────────── */
  const { data: clientsData } = useClients()
  const { data: washTypes } = useWashTypes()
  const { data: stationsData } = useStations()
  const createClient = useCreateClient()
  const createVehicle = useCreateVehicle()

  const clientsList = clientsData?.data || []
  const washTypesList = washTypes || []
  const stationsList = (stationsData || []).filter(s => s.status === 'active')

  /* ── Form state ────────────────────────────────────── */
  const [clientSearch, setClientSearch] = useState('')
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null)
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null)
  const [selectedWashTypeId, setSelectedWashTypeId] = useState<number | null>(null)
  const [selectedStationId, setSelectedStationId] = useState<number | null>(stationId)
  const [dateTime, setDateTime] = useState('')

  /* ── Inline client creation ────────────────────────── */
  const [showCreateClient, setShowCreateClient] = useState(false)
  const [newClient, setNewClient] = useState({ nom: '', contact: '', email: '' })
  const [newVehicle, setNewVehicle] = useState({ immatriculation: '', brand: '', modele: '', color: '' })

  /* ── Vehicles for selected client ──────────────────── */
  const { data: clientVehicles, isLoading: vehiclesLoading } = useClientVehicles(selectedClientId ?? 0)
  const vehicles = clientVehicles || []

  /* ── Filtered clients ──────────────────────────────── */
  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clientsList.slice(0, 8)
    const q = clientSearch.toLowerCase()
    return clientsList.filter(c =>
      c.nom.toLowerCase().includes(q) || (c.contact || '').includes(q)
    )
  }, [clientsList, clientSearch])

  const selectedClient = clientsList.find(c => c.id === selectedClientId)
  const selectedWashType = washTypesList.find(w => w.id === selectedWashTypeId)

  /* ── Validation ────────────────────────────────────── */
  const canSubmit = selectedClientId && selectedVehicleId && selectedWashTypeId && dateTime

  const handleSubmit = async () => {
    if (!canSubmit) return
    try {
      await onCreate.mutateAsync({
        clientId: selectedClientId!,
        vehicleId: selectedVehicleId!,
        stationId: selectedStationId || 1,
        typeLavageId: selectedWashTypeId!,
        dateHeureApport: new Date(dateTime).toISOString(),
      })
      toast.success('Réservation créée avec succès')
      onClose()
    } catch {
      toast.error('Erreur lors de la création')
    }
  }

  /* ── Create client + vehicle then auto-select ──────── */
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newClient.nom.trim() || !newVehicle.immatriculation.trim()) return
    try {
      const client = await createClient.mutateAsync({
        nom: newClient.nom,
        contact: newClient.contact || undefined,
        email: newClient.email || undefined,
        stationId: selectedStationId || undefined,
      })
      const vehicle = await createVehicle.mutateAsync({
        id: client.id,
        data: {
          immatriculation: newVehicle.immatriculation,
          brand: newVehicle.brand || undefined,
          modele: newVehicle.modele || undefined,
          color: newVehicle.color || undefined,
        },
      })
      setSelectedClientId(client.id)
      setSelectedVehicleId(vehicle.id)
      setShowCreateClient(false)
      setNewClient({ nom: '', contact: '', email: '' })
      setNewVehicle({ immatriculation: '', brand: '', modele: '', color: '' })
      toast.success(`${client.nom} créé avec le véhicule ${vehicle.immatriculation}`)
    } catch {
      toast.error('Erreur lors de la création du client')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative w-full max-w-2xl bg-panel border border-edge rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-divider bg-inset shrink-0">
          <h3 className="font-heading font-bold text-lg text-ink flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-accent" /> Nouvelle Réservation
          </h3>
          <button onClick={onClose} className="p-1 text-ink-muted hover:text-ink transition-colors rounded-lg hover:bg-raised">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          {onCreate.isError && (
            <div className="p-3 bg-red-500/10 text-red-500 rounded-xl text-sm border border-red-500/20 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> Erreur lors de la création. Vérifiez les informations.
            </div>
          )}

          {/* ── Client selector ─────────────────────────── */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-ink-faded uppercase tracking-wider mb-2">
              <User className="w-3.5 h-3.5" /> Client *
            </label>

            {showCreateClient ? (
              /* ── Inline create client + vehicle form ────── */
              <form onSubmit={handleCreateClient} className="space-y-3 bg-inset rounded-xl p-4 border border-divider">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-ink flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-accent" /> Nouveau client
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowCreateClient(false)}
                    className="text-xs text-ink-muted hover:text-ink transition-colors"
                  >
                    Retour
                  </button>
                </div>

                {createClient.isError && (
                  <div className="p-2.5 bg-red-500/10 text-red-500 rounded-lg text-xs border border-red-500/20">
                    Erreur lors de la création du client. Vérifiez les informations.
                  </div>
                )}

                {/* Client info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-ink-light mb-1">Nom complet *</label>
                    <input
                      required
                      type="text"
                      value={newClient.nom}
                      onChange={(e) => setNewClient({ ...newClient, nom: e.target.value })}
                      className={inputCls}
                      placeholder="Moussa Diallo"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-light mb-1">Téléphone</label>
                    <input
                      type="text"
                      value={newClient.contact}
                      onChange={(e) => setNewClient({ ...newClient, contact: e.target.value })}
                      className={inputCls}
                      placeholder="+221 77 123 45 67"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-light mb-1">Email</label>
                  <input
                    type="email"
                    value={newClient.email}
                    onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                    className={inputCls}
                    placeholder="client@email.com"
                  />
                </div>

                {/* Vehicle info */}
                <div className="pt-3 border-t border-divider">
                  <p className="text-xs font-semibold text-ink-faded uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5" /> Véhicule *
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-ink-light mb-1">Immatriculation *</label>
                      <input
                        required
                        type="text"
                        value={newVehicle.immatriculation}
                        onChange={(e) => setNewVehicle({ ...newVehicle, immatriculation: e.target.value })}
                        className={inputCls}
                        placeholder="DK-1234-AB"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-ink-light mb-1">Marque</label>
                      <input
                        type="text"
                        value={newVehicle.brand}
                        onChange={(e) => setNewVehicle({ ...newVehicle, brand: e.target.value })}
                        className={inputCls}
                        placeholder="Toyota"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-ink-light mb-1">Modèle</label>
                      <input
                        type="text"
                        value={newVehicle.modele}
                        onChange={(e) => setNewVehicle({ ...newVehicle, modele: e.target.value })}
                        className={inputCls}
                        placeholder="Corolla"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-ink-light mb-1">Couleur</label>
                      <input
                        type="text"
                        value={newVehicle.color}
                        onChange={(e) => setNewVehicle({ ...newVehicle, color: e.target.value })}
                        className={inputCls}
                        placeholder="Blanc"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateClient(false)}
                    className="px-3 py-2 text-sm font-medium text-ink-light hover:text-ink transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={createClient.isPending || createVehicle.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-70"
                  >
                    {createClient.isPending || createVehicle.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                        Création...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" /> Créer le client
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : !selectedClient ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 bg-inset border border-outline rounded-xl px-4 py-2.5 focus-within:border-teal-500/40 transition-colors">
                  <Search className="w-4 h-4 text-ink-muted" />
                  <input
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    placeholder="Rechercher par nom ou téléphone..."
                    className="bg-transparent text-sm text-ink placeholder-ink-muted outline-none flex-1"
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {filteredClients.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedClientId(c.id); setSelectedVehicleId(null) }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl text-left bg-inset border border-divider hover:border-outline transition-all"
                    >
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500/80 to-navy-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                        {c.nom.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink truncate">{c.nom}</p>
                        <p className="text-xs text-ink-muted">{c.contact || 'Pas de téléphone'}</p>
                      </div>
                    </button>
                  ))}
                  {filteredClients.length === 0 && clientSearch.trim() && (
                    <div className="text-center py-3 space-y-2">
                      <p className="text-sm text-ink-muted">Aucun client trouvé pour « {clientSearch} »</p>
                    </div>
                  )}
                </div>
                {/* Always show create button */}
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateClient(true)
                    if (clientSearch.trim()) setNewClient({ ...newClient, nom: clientSearch.trim() })
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-accent hover:bg-accent-wash rounded-xl transition-colors border border-dashed border-accent-line"
                >
                  <UserPlus className="w-4 h-4" /> Créer un nouveau client
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-accent-wash border border-accent-line">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500/80 to-navy-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                  {selectedClient.nom.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink">{selectedClient.nom}</p>
                  <p className="text-xs text-ink-muted">{selectedClient.contact || 'Pas de téléphone'}</p>
                </div>
                <button
                  onClick={() => { setSelectedClientId(null); setSelectedVehicleId(null); setClientSearch('') }}
                  className="p-1 text-ink-muted hover:text-ink transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* ── Vehicle selector (shown when client selected) ── */}
          {selectedClientId && !showCreateClient && (
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-ink-faded uppercase tracking-wider mb-2">
                <Car className="w-3.5 h-3.5" /> Véhicule *
              </label>
              {vehiclesLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-teal-500" />
                </div>
              ) : vehicles.length === 0 ? (
                <p className="text-sm text-ink-muted text-center py-4 bg-inset rounded-xl">
                  Aucun véhicule enregistré pour ce client
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {vehicles.map(v => {
                    const sel = selectedVehicleId === v.id
                    return (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVehicleId(v.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                          sel ? 'bg-accent-wash border-2 border-teal-500' : 'bg-inset border border-divider hover:border-outline'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                          sel ? 'bg-teal-500 text-white' : 'bg-dim text-ink-muted'
                        }`}>
                          <Car className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink">{v.immatriculation}</p>
                          <p className="text-xs text-ink-muted truncate">{[v.brand, v.modele, v.color].filter(Boolean).join(' — ') || 'Aucun détail'}</p>
                        </div>
                        {sel && <Check className="w-4 h-4 text-accent shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Wash type selector ──────────────────────── */}
          {!showCreateClient && (
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-ink-faded uppercase tracking-wider mb-2">
                <Droplets className="w-3.5 h-3.5" /> Type de lavage *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {washTypesList.map(w => {
                  const sel = selectedWashTypeId === w.id
                  return (
                    <button
                      key={w.id}
                      onClick={() => setSelectedWashTypeId(w.id)}
                      className={`text-left p-3 rounded-xl transition-all ${
                        sel ? 'bg-accent-wash border-2 border-teal-500' : 'bg-inset border border-divider hover:border-outline'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-ink">{w.nom}</p>
                        {sel && <Check className="w-4 h-4 text-accent" />}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs font-semibold text-accent">{w.prixBase.toLocaleString()} FCFA</span>
                        {w.dureeEstimee > 0 && <span className="text-xs text-ink-muted">{w.dureeEstimee} min</span>}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Station + Date/Time ─────────────────────── */}
          {!showCreateClient && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-ink-faded uppercase tracking-wider mb-2">
                  <MapPin className="w-3.5 h-3.5" /> Station
                </label>
                {isSuperAdmin ? (
                  <select
                    value={selectedStationId || ''}
                    onChange={(e) => setSelectedStationId(Number(e.target.value) || null)}
                    className={inputCls}
                  >
                    <option value="">Sélectionner une station</option>
                    {stationsList.map(s => (
                      <option key={s.id} value={s.id}>{s.nom}</option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-inset border border-outline rounded-xl text-sm text-ink">
                    <MapPin className="w-4 h-4 text-ink-muted" />
                    {stationsList.find(s => s.id === selectedStationId)?.nom || 'Station assignée'}
                  </div>
                )}
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-ink-faded uppercase tracking-wider mb-2">
                  <CalendarDays className="w-3.5 h-3.5" /> Date & Heure *
                </label>
                <input
                  type="datetime-local"
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className={inputCls}
                />
              </div>
            </div>
          )}

          {/* ── Summary card ────────────────────────────── */}
          {canSubmit && !showCreateClient && (
            <div className="bg-inset rounded-xl p-4 border border-divider">
              <p className="text-xs font-semibold text-ink-faded uppercase tracking-wider mb-2">Résumé</p>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <span className="text-ink-muted">Client</span>
                <span className="text-ink font-medium">{selectedClient?.nom}</span>
                <span className="text-ink-muted">Véhicule</span>
                <span className="text-ink font-medium">{vehicles.find(v => v.id === selectedVehicleId)?.immatriculation}</span>
                <span className="text-ink-muted">Service</span>
                <span className="text-ink font-medium">{selectedWashType?.nom}</span>
                <span className="text-ink-muted">Montant</span>
                <span className="text-accent font-semibold">{selectedWashType?.prixBase.toLocaleString()} FCFA</span>
                <span className="text-ink-muted">Date</span>
                <span className="text-ink font-medium">
                  {new Date(dateTime).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}{' '}
                  à {new Date(dateTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────── */}
        {!showCreateClient && (
          <div className="px-6 py-4 border-t border-divider flex justify-end gap-3 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2.5 font-medium text-ink-light hover:text-ink transition-colors text-sm"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || onCreate.isPending}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                canSubmit
                  ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30'
                  : 'bg-dim/50 text-ink-muted cursor-not-allowed'
              }`}
            >
              {onCreate.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Création...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" /> Réserver
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
