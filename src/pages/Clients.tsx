import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Users, Search, Plus, Phone, Car, Award, CreditCard,
  ChevronRight, ChevronLeft, X, Mail, Palette, Tag, Truck,
} from 'lucide-react'
import { useClients, useCreateClient, useCreateVehicle } from '@/api/clients'
import type { CreateClientDto, CreateVehicleDto, Client } from '@/api/clients/types'
import { useAuth } from '@/contexts/AuthContext'

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const rise = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

const inputCls = 'w-full px-3 py-2.5 bg-inset border border-outline rounded-xl text-sm text-ink placeholder-ink-muted outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 transition-all'

export default function Clients() {
  const { selectedStationId } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)

  /* ── Debounce search ─────────────────────────────── */
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  /* ── Queries ─────────────────────────────────────── */
  const { data: clientsData, isLoading, isError } = useClients({
    search: debouncedSearch || undefined,
    page,
    limit: 12,
    stationId: selectedStationId || undefined,
  })

  const clientsList: Client[] = clientsData?.data || []
  const totalPages = clientsData?.totalPages || 1
  const totalClients = clientsData?.total || 0

  /* ── Derived stats from current page ─────────────── */
  let totalSubscribers = 0
  let totalPoints = 0
  let totalVehicles = 0
  clientsList.forEach(c => {
    if (Number(c.activeSubscriptionCount) > 0) totalSubscribers++
    totalPoints += Number(c.pointsFidelite) || 0
    totalVehicles += Number(c.vehicleCount) || 0
  })

  const summaryCards = [
    { label: 'Total clients', value: totalClients.toLocaleString(), icon: Users, accent: 'bg-teal-500/10 text-accent' },
    { label: 'Abonnés actifs', value: totalSubscribers.toString(), icon: CreditCard, accent: 'bg-purple-500/10 text-grape' },
    { label: 'Véhicules', value: totalVehicles.toString(), icon: Car, accent: 'bg-amber-500/10 text-warn' },
    { label: 'Points fidélité', value: totalPoints.toLocaleString(), icon: Award, accent: 'bg-emerald-500/10 text-ok' },
  ]

  return (
    <>
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 relative">
        {/* ── Header ─────────────────────────────────── */}
        <motion.div variants={rise} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-ink flex items-center gap-2">
              <Users className="w-6 h-6 text-accent" /> Clients
            </h1>
            <p className="text-ink-faded mt-1">Gestion CRM, abonnements et fidélité</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/25 hover:shadow-teal-500/35 transition-shadow text-sm"
          >
            <Plus className="w-4 h-4" /> Nouveau client
          </button>
        </motion.div>

        {/* ── Stats ───────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {summaryCards.map((s) => {
            const Icon = s.icon
            return (
              <motion.div key={s.label} variants={rise} className="bg-panel border border-edge rounded-2xl p-4 shadow-sm">
                <div className={`p-2 rounded-xl w-fit ${s.accent} mb-3`}><Icon className="w-4 h-4" /></div>
                <p className="font-heading text-xl font-bold text-ink">{s.value}</p>
                <p className="text-xs text-ink-faded mt-0.5">{s.label}</p>
              </motion.div>
            )
          })}
        </div>

        {/* ── Search ──────────────────────────────────── */}
        <motion.div variants={rise}>
          <div className="flex items-center gap-2 bg-panel border border-edge rounded-xl px-4 py-2.5 shadow-sm focus-within:border-teal-500/40 transition-colors">
            <Search className="w-4 h-4 text-ink-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, téléphone, email..."
              className="bg-transparent text-sm text-ink placeholder-ink-muted outline-none flex-1"
            />
          </div>
        </motion.div>

        {/* ── Content ─────────────────────────────────── */}
        {isLoading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
          </div>
        ) : isError ? (
          <div className="p-4 bg-red-500/10 text-red-500 rounded-xl">
            Erreur lors du chargement des clients.
          </div>
        ) : clientsList.length === 0 ? (
          <div className="text-center text-ink-muted p-12 border border-dashed border-divider rounded-xl">
            <Users className="w-8 h-8 mx-auto mb-2 text-ink-muted" />
            Aucun client ne correspond à la recherche.
          </div>
        ) : (
          <>
            <motion.div
              key={`${debouncedSearch}-${page}`}
              variants={stagger}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
            >
              {clientsList.map((c) => {
                const initials = c.nom.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                const vehicleCount = Number(c.vehicleCount) || 0
                const points = Number(c.pointsFidelite) || 0
                const hasActiveSub = Number(c.activeSubscriptionCount) > 0

                return (
                  <motion.div key={c.id} variants={rise} onClick={() => navigate(`/clients/${c.id}`)} className="bg-panel border border-edge rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow duration-300 group cursor-pointer">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-navy-500 flex items-center justify-center text-white font-heading font-bold text-sm shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-heading font-semibold text-ink line-clamp-1">{c.nom}</h3>
                          <ChevronRight className="w-4 h-4 text-ink-ghost group-hover:text-accent transition-colors shrink-0" />
                        </div>
                        {c.contact && (
                          <p className="text-xs text-ink-faded flex items-center gap-1.5 mt-1">
                            <Phone className="w-3 h-3" /> {c.contact}
                          </p>
                        )}
                        {c.email && (
                          <p className="text-xs text-ink-faded flex items-center gap-1.5 mt-0.5">
                            <Mail className="w-3 h-3" /> {c.email}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-divider">
                      <div className="text-center">
                        <p className="text-sm font-semibold text-ink flex items-center justify-center gap-1">
                          <Car className="w-3.5 h-3.5 text-ink-muted" /> {vehicleCount}
                        </p>
                        <p className="text-xs text-ink-muted mt-0.5">Véhicule{vehicleCount !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-accent">{points.toLocaleString()}</p>
                        <p className="text-xs text-ink-muted mt-0.5">Points</p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-end">
                      {hasActiveSub ? (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-accent-wash text-accent-bold border border-accent-line">
                          Abonné
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg text-xs text-ink-muted bg-raised border border-edge">Sans abonnement</span>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>

            {/* ── Pagination ──────────────────────────── */}
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

      {/* ── Create Client Modal ────────────────────── */}
      <AnimatePresence>
        {isModalOpen && (
          <CreateClientModal
            onClose={() => setIsModalOpen(false)}
            stationId={selectedStationId}
          />
        )}
      </AnimatePresence>
    </>
  )
}

/* ================================================================
   CREATE CLIENT MODAL
   ================================================================ */
function CreateClientModal({ onClose, stationId }: { onClose: () => void; stationId: number | null }) {
  const createClient = useCreateClient()
  const createVehicle = useCreateVehicle()

  const [formData, setFormData] = useState<CreateClientDto>({ nom: '', contact: '', email: '' })
  const [addVehicle, setAddVehicle] = useState(false)
  const [vehicleData, setVehicleData] = useState<CreateVehicleDto>({
    immatriculation: '', modele: '', brand: '', color: '', type: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const newClient = await createClient.mutateAsync({ ...formData, stationId: stationId || undefined })

      if (addVehicle && vehicleData.immatriculation.trim()) {
        await createVehicle.mutateAsync({ id: newClient.id, data: vehicleData })
      }

      toast.success(`Client "${formData.nom}" créé avec succès !`)
      onClose()
    } catch {
      // error displayed by axios interceptor
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
        className="relative w-full max-w-lg bg-panel border border-edge rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-divider bg-inset shrink-0">
          <h3 className="font-heading font-bold text-lg text-ink flex items-center gap-2">
            <Users className="w-5 h-5 text-accent" /> Nouveau Client
          </h3>
          <button onClick={onClose} className="p-1 text-ink-muted hover:text-ink transition-colors rounded-lg hover:bg-raised">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {createClient.isError && (
            <div className="p-3 bg-red-500/10 text-red-500 rounded-xl text-sm border border-red-500/20">
              Erreur lors de la création du client.
            </div>
          )}

          {/* ── Client fields ──────────────────────── */}
          <div>
            <label className="block text-xs font-semibold text-ink-faded uppercase tracking-wider mb-1.5">Nom complet *</label>
            <input
              required
              type="text"
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              className={inputCls}
              placeholder="Mamadou Diallo"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-ink-faded uppercase tracking-wider mb-1.5">
                <Phone className="w-3 h-3" /> Téléphone
              </label>
              <input
                type="text"
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                className={inputCls}
                placeholder="+221 77 ..."
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-ink-faded uppercase tracking-wider mb-1.5">
                <Mail className="w-3 h-3" /> Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={inputCls}
                placeholder="client@email.com"
              />
            </div>
          </div>

          {/* ── Vehicle toggle ─────────────────────── */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setAddVehicle(!addVehicle)}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                addVehicle ? 'text-accent' : 'text-ink-muted hover:text-ink-light'
              }`}
            >
              <Car className="w-4 h-4" />
              {addVehicle ? 'Masquer le véhicule' : 'Ajouter un véhicule'}
              <Plus className={`w-3.5 h-3.5 transition-transform ${addVehicle ? 'rotate-45' : ''}`} />
            </button>
          </div>

          {/* ── Vehicle fields ─────────────────────── */}
          <AnimatePresence>
            {addVehicle && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="p-4 bg-inset rounded-xl border border-divider space-y-3">
                  <p className="text-xs font-semibold text-ink-faded uppercase tracking-wider flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5" /> Véhicule
                  </p>

                  <div>
                    <label className="block text-xs font-medium text-ink-light mb-1">Immatriculation *</label>
                    <input
                      type="text"
                      value={vehicleData.immatriculation}
                      onChange={(e) => setVehicleData({ ...vehicleData, immatriculation: e.target.value })}
                      className={inputCls}
                      placeholder="AB-1234-CD"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="flex items-center gap-1 text-xs font-medium text-ink-light mb-1">
                        <Tag className="w-3 h-3" /> Marque
                      </label>
                      <input
                        type="text"
                        value={vehicleData.brand}
                        onChange={(e) => setVehicleData({ ...vehicleData, brand: e.target.value })}
                        className={inputCls}
                        placeholder="Toyota"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-1 text-xs font-medium text-ink-light mb-1">
                        <Car className="w-3 h-3" /> Modèle
                      </label>
                      <input
                        type="text"
                        value={vehicleData.modele}
                        onChange={(e) => setVehicleData({ ...vehicleData, modele: e.target.value })}
                        className={inputCls}
                        placeholder="Corolla"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="flex items-center gap-1 text-xs font-medium text-ink-light mb-1">
                        <Palette className="w-3 h-3" /> Couleur
                      </label>
                      <input
                        type="text"
                        value={vehicleData.color}
                        onChange={(e) => setVehicleData({ ...vehicleData, color: e.target.value })}
                        className={inputCls}
                        placeholder="Noir"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-1 text-xs font-medium text-ink-light mb-1">
                        <Truck className="w-3 h-3" /> Type
                      </label>
                      <input
                        type="text"
                        value={vehicleData.type}
                        onChange={(e) => setVehicleData({ ...vehicleData, type: e.target.value })}
                        className={inputCls}
                        placeholder="Berline"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Actions ────────────────────────────── */}
          <div className="pt-4 flex justify-end gap-3 border-t border-divider mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-medium text-ink-light hover:text-ink transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={createClient.isPending || createVehicle.isPending}
              className="px-5 py-2 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-xl transition-colors disabled:opacity-70 flex items-center gap-2"
            >
              {createClient.isPending || createVehicle.isPending ? 'Création...' : 'Créer le client'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
