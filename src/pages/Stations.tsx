import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { Building2, Plus, MapPin, Phone, Users, Settings, ArrowUpRight, X, Globe, Clock, Shield, UserX, ArrowRightLeft } from 'lucide-react'
import { useStations, useCreateStation, useUpdateStation } from '@/api/stations'
import { useUsers, useCreateUser, useAssignStation, useTransferStation, useUnassignStation } from '@/api/users'
import { useDashboardStats } from '@/api/dashboard'
import { useAuth } from '@/contexts/AuthContext'
import type { Station, CreateStationDto, UpdateStationDto } from '@/api/stations/types'
import type { User } from '@/api/users/types'

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }
const rise = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

/* ─── Per-station card with live dashboard data ─────────────── */
function StationCard({
  station,
  manager,
  isSuperAdmin,
  onEdit,
  onViewDetails,
  onManageManager,
}: {
  station: Station
  manager: User | undefined
  isSuperAdmin: boolean
  onEdit: (s: Station) => void
  onViewDetails: (s: Station) => void
  onManageManager: (s: Station) => void
}) {
  const { data: stats } = useDashboardStats(station.status === 'active' ? station.id : 0)

  return (
    <motion.div
      variants={rise}
      className={`bg-panel border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 ${
        station.status !== 'active' ? 'border-edge opacity-75' : 'border-edge'
      }`}
    >
      <div className="px-6 py-4 border-b border-divider flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${station.status === 'active' ? 'bg-accent-wash' : 'bg-raised'}`}>
            <Building2 className={`w-5 h-5 ${station.status === 'active' ? 'text-accent' : 'text-ink-muted'}`} />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-ink text-sm">{station.nom}</h3>
            <p className="text-xs text-ink-faded flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" /> {station.town}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
            station.status === 'active'
              ? 'bg-ok-wash text-ok border-ok-line'
              : station.status === 'upcoming'
              ? 'bg-warn-wash text-warn border-warn-line'
              : 'bg-raised text-ink-muted border-edge'
          }`}>
            {station.status === 'active' ? 'Active' : station.status === 'upcoming' ? 'Bientôt' : 'Inactive'}
          </span>
          <button
            onClick={() => onEdit(station)}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink-light hover:bg-raised transition-colors"
            title="Modifier la station"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="px-6 py-4 space-y-4">
        <div className="space-y-1.5 text-sm">
          <p className="text-ink-light flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-ink-muted shrink-0" /> {station.adresse}</p>
          {station.contact && <p className="text-ink-light flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-ink-muted shrink-0" /> {station.contact}</p>}
        </div>

        {/* ── Manager display ── */}
        <div className="flex items-center justify-between bg-inset rounded-xl px-4 py-3">
          <div className="flex items-center gap-3">
            {manager ? (
              <>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-heading font-bold text-xs uppercase">
                  {(manager.prenom?.[0] || '') + (manager.nom?.[0] || '')}
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">{manager.prenom} {manager.nom}</p>
                  <p className="text-xs text-ink-faded flex items-center gap-1"><Shield className="w-3 h-3" /> Manager</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-ink-muted">Aucun manager assigné</p>
            )}
          </div>
          {isSuperAdmin && (
            <button
              onClick={() => onManageManager(station)}
              className="text-xs font-medium text-accent hover:text-accent-bold transition-colors"
            >
              {manager ? 'Gérer' : 'Assigner'}
            </button>
          )}
        </div>

        {station.status === 'active' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-inset rounded-xl p-3 text-center">
              <p className="text-lg font-heading font-bold text-ink">{station.activeEmployeesCount ?? 0}</p>
              <p className="text-xs text-ink-muted mt-0.5">Employés</p>
            </div>
            <div className="bg-inset rounded-xl p-3 text-center">
              <p className="text-lg font-heading font-bold text-accent">{stats?.vehicules ?? '—'}</p>
              <p className="text-xs text-ink-muted mt-0.5">Véhicules aujourd'hui</p>
            </div>
            <div className="bg-inset rounded-xl p-3 text-center">
              <p className="text-lg font-heading font-bold text-ink">{stats?.lavagesActifs ?? '—'}</p>
              <p className="text-xs text-ink-muted mt-0.5">Lavages en cours</p>
            </div>
            <div className="bg-inset rounded-xl p-3 text-center">
              <p className="text-lg font-heading font-bold text-ok">{stats?.reservations ?? '—'}</p>
              <p className="text-xs text-ink-muted mt-0.5">Réservations</p>
            </div>
          </div>
        )}

        {station.status === 'active' && (
          <div className="flex items-center justify-between pt-3 border-t border-divider">
            <div>
              <p className="text-xs text-ink-muted">Revenu aujourd'hui</p>
              <p className="text-sm font-semibold text-ink">
                {stats ? `${stats.revenue.toLocaleString()} FCFA` : '— FCFA'}
              </p>
            </div>
            <button
              onClick={() => onViewDetails(station)}
              className="flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-bold transition-colors"
            >
              Voir le tableau de bord <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {(station.status === 'upcoming' || station.status === 'inactive') && (
          <div className="text-center py-4">
            <p className="text-sm text-ink-muted">
              {station.status === 'upcoming' ? 'Station en cours de préparation' : 'Station inactive'}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* ─── Main Stations Page ─────────────────────────────────────── */
export default function Stations() {
  const { data: stationsData, isLoading, isError } = useStations()
  const { data: managersData } = useUsers({ role: 'manager', limit: 100 })
  const createStation = useCreateStation()
  const updateStation = useUpdateStation()
  const createUser = useCreateUser()
  const assignStation = useAssignStation()
  const transferStation = useTransferStation()
  const unassignStation = useUnassignStation()
  const { setStation, user: authUser } = useAuth()
  const navigate = useNavigate()

  const isSuperAdmin = authUser?.role === 'super_admin'

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingStation, setEditingStation] = useState<Station | null>(null)
  const [managerStation, setManagerStation] = useState<Station | null>(null)
  const [showCreateManager, setShowCreateManager] = useState(false)
  const [newManager, setNewManager] = useState({ nom: '', prenom: '', email: '', telephone: '', password: '' })

  const [createForm, setCreateForm] = useState<CreateStationDto>({
    nom: '',
    adresse: '',
    town: '',
    contact: '',
    status: 'active',
  })

  const [editForm, setEditForm] = useState<UpdateStationDto>({
    nom: '',
    adresse: '',
    town: '',
    contact: '',
    status: 'active',
  })

  const stationsList = stationsData || []
  const allManagers = managersData?.data || []

  // Build stationId → manager map
  const managerByStation = useMemo(() => {
    const map = new Map<number, User>()
    allManagers.forEach(m => {
      const activeAff = (m.affectations || []).find(a => a.statut === 'active')
      if (activeAff) {
        map.set(activeAff.stationId, m)
      }
    })
    return map
  }, [allManagers])

  // Managers without an active station (available for assignment)
  const unassignedManagers = useMemo(() =>
    allManagers.filter(m => !(m.affectations || []).some(a => a.statut === 'active')),
    [allManagers]
  )

  // ── Compute dynamic global stats ──
  const globalStats = useMemo(() => {
    const activeCount = stationsList.filter(s => s.status === 'active').length
    const totalEmployees = stationsList.reduce((sum, s) => sum + (s.activeEmployeesCount ?? 0), 0)
    const uniqueTowns = new Set(stationsList.map(s => s.town)).size
    const upcomingCount = stationsList.filter(s => s.status === 'upcoming').length

    return [
      { label: 'Stations actives', value: activeCount.toString(), icon: Building2, accent: 'bg-teal-500/10 text-accent' },
      { label: 'Employés total', value: totalEmployees.toString(), icon: Users, accent: 'bg-blue-500/10 text-info' },
      { label: 'Villes couvertes', value: uniqueTowns.toString(), icon: Globe, accent: 'bg-purple-500/10 text-grape' },
      { label: 'Stations à venir', value: upcomingCount.toString(), icon: Clock, accent: 'bg-amber-500/10 text-warn' },
    ]
  }, [stationsList])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createStation.mutateAsync(createForm)
      setIsCreateModalOpen(false)
      setCreateForm({ nom: '', adresse: '', town: '', contact: '', status: 'active' })
      toast.success('Station créée avec succès')
    } catch {
      toast.error('Erreur lors de la création de la station')
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingStation) return
    try {
      await updateStation.mutateAsync({ id: editingStation.id, data: editForm })
      setEditingStation(null)
      toast.success('Station mise à jour')
    } catch {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const openEditModal = (station: Station) => {
    setEditingStation(station)
    setEditForm({
      nom: station.nom,
      adresse: station.adresse,
      town: station.town,
      contact: station.contact || '',
      status: station.status,
    })
  }

  const handleViewDetails = (station: Station) => {
    setStation(station.id)
    navigate('/')
  }

  const closeManagerModal = () => {
    setManagerStation(null)
    setShowCreateManager(false)
    setNewManager({ nom: '', prenom: '', email: '', telephone: '', password: '' })
  }

  // ── Manager management handlers ──
  const handleCreateAndAssignManager = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!managerStation) return
    try {
      const created = await createUser.mutateAsync({
        ...newManager,
        role: 'manager',
      })
      await assignStation.mutateAsync({
        id: created.id,
        data: {
          stationId: managerStation.id,
          dateDebut: new Date().toISOString().split('T')[0],
        },
      })
      closeManagerModal()
      toast.success(`${newManager.prenom} ${newManager.nom} créé et assigné comme manager`)
    } catch {
      toast.error('Erreur lors de la création du manager')
    }
  }

  const handleAssignManager = async (managerId: number) => {
    if (!managerStation) return
    try {
      await assignStation.mutateAsync({
        id: managerId,
        data: {
          stationId: managerStation.id,
          dateDebut: new Date().toISOString().split('T')[0],
        },
      })
      closeManagerModal()
      toast.success('Manager assigné avec succès')
    } catch {
      toast.error("Erreur lors de l'assignation du manager")
    }
  }

  const handleTransferManager = async (managerId: number, newStationId: number) => {
    try {
      await transferStation.mutateAsync({
        id: managerId,
        data: { newStationId },
      })
      closeManagerModal()
      toast.success('Manager transféré avec succès')
    } catch {
      toast.error('Erreur lors du transfert du manager')
    }
  }

  const handleDismissManager = async (managerId: number) => {
    try {
      await unassignStation.mutateAsync(managerId)
      closeManagerModal()
      toast.success('Manager retiré de la station')
    } catch {
      toast.error('Erreur lors du retrait du manager')
    }
  }

  // Current manager for the station being managed
  const currentManagerForStation = managerStation ? managerByStation.get(managerStation.id) : undefined
  // Other stations for transfer destination
  const otherStations = stationsList.filter(s => s.id !== managerStation?.id && s.status === 'active')

  return (
    <>
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 relative">
        <motion.div variants={rise} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-ink flex items-center gap-2"><Building2 className="w-6 h-6 text-accent" /> Stations</h1>
            <p className="text-ink-faded mt-1">Gestion multi-stations et vue d'ensemble</p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/25 hover:shadow-teal-500/35 transition-shadow text-sm"
          >
            <Plus className="w-4 h-4" /> Ajouter station
          </button>
        </motion.div>

        {/* ── Global stats ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {globalStats.map((s) => (
            <motion.div key={s.label} variants={rise} className="bg-panel border border-edge rounded-2xl p-4 shadow-sm">
              <div className={`p-2 rounded-xl w-fit ${s.accent} mb-3`}><s.icon className="w-4 h-4" /></div>
              <p className="font-heading text-xl font-bold text-ink">{s.value}</p>
              <p className="text-xs text-ink-faded mt-0.5">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* ── Station cards ── */}
        {isLoading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
          </div>
        ) : isError ? (
          <div className="p-4 bg-red-500/10 text-red-500 rounded-xl">
            Erreur lors du chargement des stations.
          </div>
        ) : stationsList.length === 0 ? (
          <div className="text-center text-ink-muted p-12 border border-dashed border-divider rounded-xl">
            Aucune station n'a été trouvée.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {stationsList.map((s) => (
              <StationCard
                key={s.id}
                station={s}
                manager={managerByStation.get(s.id)}
                isSuperAdmin={isSuperAdmin}
                onEdit={openEditModal}
                onViewDetails={handleViewDetails}
                onManageManager={setManagerStation}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Create Station Modal ──────────────────────── */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-panel border border-edge rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-divider bg-inset">
                <h3 className="font-heading font-bold text-lg text-ink">Ajouter une station</h3>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1 text-ink-muted hover:text-ink transition-colors rounded-lg hover:bg-raised"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-6 space-y-4">
                {createStation.isError && (
                  <div className="p-3 bg-red-500/10 text-red-500 rounded-xl text-sm border border-red-500/20">
                    Erreur lors de la création de la station.
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-ink-light mb-1.5">Nom de la station *</label>
                  <input
                    required
                    type="text"
                    value={createForm.nom}
                    onChange={(e) => setCreateForm({ ...createForm, nom: e.target.value })}
                    className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
                    placeholder="ex: LIS Car Wash - Plateau"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-light mb-1.5">Ville *</label>
                    <input
                      required
                      type="text"
                      value={createForm.town}
                      onChange={(e) => setCreateForm({ ...createForm, town: e.target.value })}
                      className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
                      placeholder="ex: Dakar"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-light mb-1.5">Contact</label>
                    <input
                      type="text"
                      value={createForm.contact}
                      onChange={(e) => setCreateForm({ ...createForm, contact: e.target.value })}
                      className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
                      placeholder="+221 ..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-light mb-1.5">Adresse *</label>
                  <input
                    required
                    type="text"
                    value={createForm.adresse}
                    onChange={(e) => setCreateForm({ ...createForm, adresse: e.target.value })}
                    className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
                    placeholder="Numéro et rue..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-light mb-1.5">Statut initial</label>
                  <select
                    value={createForm.status}
                    onChange={(e) => setCreateForm({ ...createForm, status: e.target.value as CreateStationDto['status'] })}
                    className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
                  >
                    <option value="active">Active</option>
                    <option value="upcoming">Bientôt</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-divider mt-6">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 font-medium text-ink-light hover:text-ink transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={createStation.isPending}
                    className="px-5 py-2 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-xl transition-colors disabled:opacity-70 flex items-center gap-2"
                  >
                    {createStation.isPending ? 'Création...' : 'Créer la station'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Edit Station Modal ──────────────────────── */}
      <AnimatePresence>
        {editingStation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingStation(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-panel border border-edge rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-divider bg-inset">
                <h3 className="font-heading font-bold text-lg text-ink">Modifier la station</h3>
                <button
                  onClick={() => setEditingStation(null)}
                  className="p-1 text-ink-muted hover:text-ink transition-colors rounded-lg hover:bg-raised"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEdit} className="p-6 space-y-4">
                {updateStation.isError && (
                  <div className="p-3 bg-red-500/10 text-red-500 rounded-xl text-sm border border-red-500/20">
                    Erreur lors de la mise à jour de la station.
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-ink-light mb-1.5">Nom de la station *</label>
                  <input
                    required
                    type="text"
                    value={editForm.nom}
                    onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })}
                    className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-light mb-1.5">Ville *</label>
                    <input
                      required
                      type="text"
                      value={editForm.town}
                      onChange={(e) => setEditForm({ ...editForm, town: e.target.value })}
                      className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-light mb-1.5">Contact</label>
                    <input
                      type="text"
                      value={editForm.contact}
                      onChange={(e) => setEditForm({ ...editForm, contact: e.target.value })}
                      className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-light mb-1.5">Adresse *</label>
                  <input
                    required
                    type="text"
                    value={editForm.adresse}
                    onChange={(e) => setEditForm({ ...editForm, adresse: e.target.value })}
                    className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-light mb-1.5">Statut</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as CreateStationDto['status'] })}
                    className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
                  >
                    <option value="active">Active</option>
                    <option value="upcoming">Bientôt</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-divider mt-6">
                  <button
                    type="button"
                    onClick={() => setEditingStation(null)}
                    className="px-4 py-2 font-medium text-ink-light hover:text-ink transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={updateStation.isPending}
                    className="px-5 py-2 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-xl transition-colors disabled:opacity-70 flex items-center gap-2"
                  >
                    {updateStation.isPending ? 'Mise à jour...' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Manager Management Modal ──────────────────────── */}
      <AnimatePresence>
        {managerStation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeManagerModal}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-panel border border-edge rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-divider bg-inset shrink-0">
                <div>
                  <h3 className="font-heading font-bold text-lg text-ink">Gérer le manager</h3>
                  <p className="text-xs text-ink-faded mt-0.5">{managerStation.nom}</p>
                </div>
                <button
                  onClick={closeManagerModal}
                  className="p-1 text-ink-muted hover:text-ink transition-colors rounded-lg hover:bg-raised"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto">
                {/* Current manager */}
                {currentManagerForStation ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 bg-inset rounded-xl p-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-heading font-bold text-sm uppercase">
                        {(currentManagerForStation.prenom?.[0] || '') + (currentManagerForStation.nom?.[0] || '')}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-ink">{currentManagerForStation.prenom} {currentManagerForStation.nom}</p>
                        <p className="text-xs text-ink-faded">{currentManagerForStation.email}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium border bg-grape-wash text-grape border-grape-line">
                        Manager
                      </span>
                    </div>

                    {/* Transfer to another station */}
                    {otherStations.length > 0 && (
                      <div>
                        <label className="flex items-center gap-1.5 text-sm font-medium text-ink-light mb-2">
                          <ArrowRightLeft className="w-3.5 h-3.5" /> Transférer vers une autre station
                        </label>
                        <div className="space-y-2">
                          {otherStations.map(s => {
                            const otherManager = managerByStation.get(s.id)
                            return (
                              <button
                                key={s.id}
                                onClick={() => handleTransferManager(currentManagerForStation.id, s.id)}
                                disabled={transferStation.isPending}
                                className="w-full flex items-center justify-between px-4 py-3 bg-inset rounded-xl hover:bg-raised transition-colors text-left disabled:opacity-50"
                              >
                                <div>
                                  <p className="text-sm font-medium text-ink">{s.nom}</p>
                                  <p className="text-xs text-ink-faded">{s.town}</p>
                                </div>
                                {otherManager && (
                                  <span className="text-xs text-warn">
                                    Manager actuel : {otherManager.prenom} {otherManager.nom}
                                  </span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Dismiss */}
                    <div className="pt-3 border-t border-divider">
                      <button
                        onClick={() => handleDismissManager(currentManagerForStation.id)}
                        disabled={unassignStation.isPending}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-500/10 rounded-xl transition-colors w-full disabled:opacity-50"
                      >
                        <UserX className="w-4 h-4" />
                        {unassignStation.isPending ? 'Retrait en cours...' : 'Retirer le manager de cette station'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* No manager — show assign + create options */
                  <div className="space-y-4">
                    {!showCreateManager ? (
                      <>
                        <p className="text-sm text-ink-faded">Sélectionnez un manager existant ou créez-en un nouveau :</p>

                        {/* Unassigned managers */}
                        {unassignedManagers.length > 0 && (
                          <div className="space-y-2">
                            {unassignedManagers.map(m => (
                              <button
                                key={m.id}
                                onClick={() => handleAssignManager(m.id)}
                                disabled={assignStation.isPending}
                                className="w-full flex items-center gap-3 px-4 py-3 bg-inset rounded-xl hover:bg-raised transition-colors text-left disabled:opacity-50"
                              >
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-heading font-bold text-xs uppercase">
                                  {(m.prenom?.[0] || '') + (m.nom?.[0] || '')}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-ink">{m.prenom} {m.nom}</p>
                                  <p className="text-xs text-ink-faded">{m.email}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Reassign a manager from another station */}
                        {allManagers.filter(m => {
                          const aff = (m.affectations || []).find(a => a.statut === 'active')
                          return aff && aff.stationId !== managerStation.id
                        }).length > 0 && (
                          <div>
                            <label className="flex items-center gap-1.5 text-sm font-medium text-ink-light mb-2">
                              <ArrowRightLeft className="w-3.5 h-3.5" /> Transférer un manager d'une autre station
                            </label>
                            <div className="space-y-2">
                              {allManagers
                                .filter(m => {
                                  const aff = (m.affectations || []).find(a => a.statut === 'active')
                                  return aff && aff.stationId !== managerStation.id
                                })
                                .map(m => {
                                  const aff = (m.affectations || []).find(a => a.statut === 'active')
                                  return (
                                    <button
                                      key={m.id}
                                      onClick={() => handleTransferManager(m.id, managerStation.id)}
                                      disabled={transferStation.isPending}
                                      className="w-full flex items-center gap-3 px-4 py-3 bg-inset rounded-xl hover:bg-raised transition-colors text-left disabled:opacity-50"
                                    >
                                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-heading font-bold text-xs uppercase">
                                        {(m.prenom?.[0] || '') + (m.nom?.[0] || '')}
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-ink">{m.prenom} {m.nom}</p>
                                        <p className="text-xs text-ink-faded">Actuellement à : {aff?.station?.nom || 'Inconnu'}</p>
                                      </div>
                                    </button>
                                  )
                                })}
                            </div>
                          </div>
                        )}

                        {/* Create new manager button */}
                        <div className="pt-3 border-t border-divider">
                          <button
                            onClick={() => setShowCreateManager(true)}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-accent hover:bg-accent-wash rounded-xl transition-colors w-full"
                          >
                            <Plus className="w-4 h-4" /> Créer un nouveau manager
                          </button>
                        </div>
                      </>
                    ) : (
                      /* Create manager form */
                      <form onSubmit={handleCreateAndAssignManager} className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-ink">Nouveau manager</p>
                          <button
                            type="button"
                            onClick={() => setShowCreateManager(false)}
                            className="text-xs text-ink-muted hover:text-ink transition-colors"
                          >
                            Retour
                          </button>
                        </div>

                        {createUser.isError && (
                          <div className="p-3 bg-red-500/10 text-red-500 rounded-xl text-sm border border-red-500/20">
                            Erreur lors de la création du manager.
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-ink-light mb-1">Prénom *</label>
                            <input
                              required
                              type="text"
                              value={newManager.prenom}
                              onChange={(e) => setNewManager({ ...newManager, prenom: e.target.value })}
                              className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
                              placeholder="Jean"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-ink-light mb-1">Nom *</label>
                            <input
                              required
                              type="text"
                              value={newManager.nom}
                              onChange={(e) => setNewManager({ ...newManager, nom: e.target.value })}
                              className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
                              placeholder="Dupont"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-ink-light mb-1">Email *</label>
                          <input
                            required
                            type="email"
                            value={newManager.email}
                            onChange={(e) => setNewManager({ ...newManager, email: e.target.value })}
                            className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
                            placeholder="manager@liscarwash.com"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-ink-light mb-1">Téléphone</label>
                            <input
                              type="text"
                              value={newManager.telephone}
                              onChange={(e) => setNewManager({ ...newManager, telephone: e.target.value })}
                              className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
                              placeholder="+221 ..."
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-ink-light mb-1">Mot de passe *</label>
                            <input
                              required
                              type="text"
                              minLength={6}
                              value={newManager.password}
                              onChange={(e) => setNewManager({ ...newManager, password: e.target.value })}
                              className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
                              placeholder="Min. 6 car."
                            />
                          </div>
                        </div>

                        <div className="pt-3 flex justify-end gap-3 border-t border-divider">
                          <button
                            type="button"
                            onClick={() => setShowCreateManager(false)}
                            className="px-4 py-2 text-sm font-medium text-ink-light hover:text-ink transition-colors"
                          >
                            Annuler
                          </button>
                          <button
                            type="submit"
                            disabled={createUser.isPending || assignStation.isPending}
                            className="px-5 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-70 flex items-center gap-2"
                          >
                            {createUser.isPending || assignStation.isPending ? 'Création...' : 'Créer et assigner'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
