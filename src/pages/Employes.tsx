import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { UserCog, Search, Plus, Phone, Mail, Award, Car, Shield, Filter, ChevronRight, Star, X, MapPin, Target, Coins } from 'lucide-react'
import { useUsers, useCreateUser, useAssignStation } from '@/api/users'
import { useStations } from '@/api/stations'
import type { CreateUserDto } from '@/api/users/types'
import { useAuth } from '@/contexts/AuthContext'

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const rise = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

const roleCfg: Record<string, { label: string; cls: string }> = {
  super_admin: { label: 'Admin', cls: 'bg-grape-wash text-grape border-grape-line' },
  manager: { label: 'Manager', cls: 'bg-grape-wash text-grape border-grape-line' },
  controleur: { label: 'Contrôleur', cls: 'bg-info-wash text-info border-info-line' },
  caissiere: { label: 'Caissière', cls: 'bg-warn-wash text-warn border-warn-line' },
  laveur: { label: 'Laveur', cls: 'bg-accent-wash text-accent-bold border-accent-line' },
  commercial: { label: 'Commercial', cls: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  comptable: { label: 'Comptable', cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
}

const roleFilter = ['Tous', 'Admin', 'Manager', 'Contrôleur', 'Caissière', 'Laveur', 'Commercial', 'Comptable']

export default function Employes() {
  const { selectedStationId: authStationId, user: authUser } = useAuth()
  const isSuperAdmin = authUser?.role === 'super_admin'
  const [search, setSearch] = useState('')
  const [roleTab, setRoleTab] = useState('Tous')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState<CreateUserDto>({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    password: '',
    role: 'laveur',
  })
  const [selectedStationId, setSelectedStationId] = useState<number | ''>('')
  const navigate = useNavigate()

  // Queries & Mutations
  const { data: usersData, isLoading, isError } = useUsers(authStationId ? { stationId: authStationId } : undefined)
  const { data: stationsList } = useStations()
  const createUser = useCreateUser()
  const assignStation = useAssignStation()

  const usersList = usersData?.data || []
  const stations = stationsList || []

  const filtered = usersList.filter((e) => {
    const fullName = `${e.prenom} ${e.nom}`.toLowerCase()
    const matchSearch = fullName.includes(search.toLowerCase()) || e.email.toLowerCase().includes(search.toLowerCase())
    const roleObj = roleCfg[e.role]
    const matchRole = roleTab === 'Tous' || (roleObj && roleObj.label === roleTab)
    return matchSearch && matchRole
  })

  // Derived stats
  const totalLaveurs = usersList.filter(u => u.role === 'laveur').length
  const totalCaissieres = usersList.filter(u => u.role === 'caissiere').length

  const performanceStats = [
    { label: 'Total employés', value: usersList.length.toString(), icon: UserCog, accent: 'bg-teal-500/10 text-accent' },
    { label: 'Laveurs', value: totalLaveurs.toString(), icon: Car, accent: 'bg-blue-500/10 text-info' },
    { label: 'Caissières', value: totalCaissieres.toString(), icon: Award, accent: 'bg-emerald-500/10 text-ok' },
    { label: 'Stations', value: stations.length.toString(), icon: MapPin, accent: 'bg-amber-500/10 text-warn' },
  ]

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const newUser = await createUser.mutateAsync(formData)

      if (selectedStationId) {
        await assignStation.mutateAsync({
          id: newUser.id,
          data: {
            stationId: Number(selectedStationId),
            dateDebut: new Date().toISOString().split('T')[0],
          },
        })
      }

      toast.success(`${formData.prenom} ${formData.nom} ajouté avec succès !`)
      setIsModalOpen(false)
      setFormData({ nom: '', prenom: '', email: '', telephone: '', password: '', role: 'laveur', bonusParLavage: undefined, objectifJournalier: undefined, globalAccess: undefined })
      setSelectedStationId('')
    } catch {
      // error displayed by axios interceptor
    }
  }

  return (
    <>
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 relative">
        <motion.div variants={rise} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-ink flex items-center gap-2">
              <UserCog className="w-6 h-6 text-accent" /> Employés
            </h1>
            <p className="text-ink-faded mt-1">Gestion du personnel, performances et bonus</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/25 hover:shadow-teal-500/35 transition-shadow text-sm"
          >
            <Plus className="w-4 h-4" /> Ajouter employé
          </button>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {performanceStats.map((s) => (
            <motion.div key={s.label} variants={rise} className="bg-panel border border-edge rounded-2xl p-4 shadow-sm">
              <div className={`p-2 rounded-xl w-fit ${s.accent} mb-3`}><s.icon className="w-4 h-4" /></div>
              <p className="font-heading text-xl font-bold text-ink">{s.value}</p>
              <p className="text-xs text-ink-faded mt-0.5">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Search & filters */}
        <motion.div variants={rise} className="flex flex-col md:flex-row gap-3">
          <div className="flex items-center gap-2 bg-panel border border-edge rounded-xl px-4 py-2.5 flex-1 shadow-sm focus-within:border-teal-500/40 transition-colors">
            <Search className="w-4 h-4 text-ink-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un employé (nom, email)..."
              className="bg-transparent text-sm text-ink placeholder-ink-muted outline-none flex-1"
            />
          </div>
          <div className="flex bg-raised border border-edge rounded-xl p-1 overflow-x-auto whitespace-nowrap hide-scrollbar">
            {roleFilter.map((r) => (
              <button
                key={r}
                onClick={() => setRoleTab(r)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${roleTab === r ? 'bg-panel text-accent shadow-sm' : 'text-ink-faded hover:text-ink-light'}`}
              >
                {r}
              </button>
            ))}
          </div>
          <button className="p-2.5 bg-panel border border-edge rounded-xl text-ink-muted hover:text-ink-light shadow-sm transition-colors">
            <Filter className="w-4 h-4" />
          </button>
        </motion.div>

        {/* Employee list */}
        {isLoading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
          </div>
        ) : isError ? (
          <div className="p-4 bg-red-500/10 text-red-500 rounded-xl">
            Erreur lors du chargement des employés.
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-ink-muted p-12 border border-dashed border-divider rounded-xl">
            Aucun employé ne correspond à votre recherche.
          </div>
        ) : (
          <motion.div
            key={roleTab}
            variants={stagger}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          >
            {filtered.map((e) => {
              const role = roleCfg[e.role] || { label: e.role, cls: 'bg-raised text-ink-muted border-edge' }
              const initials = (e.prenom?.[0] || '') + (e.nom?.[0] || '')
              const activeAffectations = (e.affectations || []).filter(a => a.statut === 'active')
              const stationNames = activeAffectations.map(a => a.station?.nom).filter(Boolean)

              return (
                <motion.div key={e.id} variants={rise} onClick={() => navigate(`/employes/${e.id}`)} className="bg-panel border border-edge rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow duration-300 cursor-pointer group">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-navy-500 flex items-center justify-center text-white font-heading font-bold text-sm flex-shrink-0 uppercase">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-heading font-semibold text-ink line-clamp-1">{e.prenom} {e.nom}</h3>
                        <ChevronRight className="w-4 h-4 text-ink-ghost group-hover:text-accent transition-colors shrink-0" />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium border ${role.cls}`}>
                          <Shield className="w-3 h-3" /> {role.label}
                        </span>
                        <span className={`w-2 h-2 rounded-full ${e.actif !== false ? 'bg-emerald-500' : 'bg-red-500'}`} title={e.actif !== false ? 'Actif' : 'Inactif'} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1.5">
                    {e.telephone && <p className="text-xs text-ink-faded flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-ink-muted shrink-0" /> {e.telephone}</p>}
                    <p className="text-xs text-ink-faded flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-ink-muted shrink-0" /> <span className="truncate">{e.email}</span></p>
                  </div>

                  {e.role === 'laveur' && (
                    <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-divider opacity-60">
                      <div className="text-center">
                        <p className="text-sm font-semibold text-ink flex items-center justify-center gap-1"><Car className="w-3 h-3 text-ink-muted" /> 0</p>
                        <p className="text-xs text-ink-muted">Véhicules</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-accent">0</p>
                        <p className="text-xs text-ink-muted">Bonus FCFA</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-amber-500"><Star className="w-3 h-3 fill-amber-500" /><span className="text-sm font-semibold">—</span></div>
                        <p className="text-xs text-ink-muted">Note</p>
                      </div>
                    </div>
                  )}

                  {/* Station assignment */}
                  <div className="mt-3 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-ink-muted shrink-0" />
                    {stationNames.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {stationNames.map((name) => (
                          <span key={name} className="text-xs px-2 py-0.5 rounded-lg bg-accent-wash text-accent-bold border border-accent-line font-medium">
                            {name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-ink-muted">Aucune station assignée</span>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </motion.div>

      {/* ── Add Employee Modal ──────────────────────── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
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
                  <UserCog className="w-5 h-5 text-accent" /> Nouveau Collaborateur
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 text-ink-muted hover:text-ink transition-colors rounded-lg hover:bg-raised"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-6 space-y-4 overflow-y-auto">
                {createUser.isError && (
                  <div className="p-3 bg-red-500/10 text-red-500 rounded-xl text-sm border border-red-500/20">
                    Erreur lors de la création de l'employé.
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-light mb-1.5">Prénom *</label>
                    <input
                      required
                      type="text"
                      value={formData.prenom}
                      onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                      className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
                      placeholder="Jean"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-light mb-1.5">Nom *</label>
                    <input
                      required
                      type="text"
                      value={formData.nom}
                      onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                      className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
                      placeholder="Dupont"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-light mb-1.5">Email *</label>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
                    placeholder="jean.dupont@liscarwash.com"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-light mb-1.5">Téléphone</label>
                    <input
                      type="text"
                      value={formData.telephone}
                      onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                      className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
                      placeholder="+221 ..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-light mb-1.5">Rôle *</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as any, bonusParLavage: undefined, objectifJournalier: undefined, globalAccess: undefined })}
                      className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
                    >
                      <option value="laveur">Laveur</option>
                      <option value="caissiere">Caissière</option>
                      <option value="controleur">Contrôleur</option>
                      <option value="commercial">Commercial</option>
                      <option value="comptable">Comptable</option>
                      {isSuperAdmin && <option value="manager">Manager</option>}
                      {isSuperAdmin && <option value="super_admin">Super Admin</option>}
                    </select>
                  </div>
                </div>

                {/* Comptable: global access toggle */}
                {formData.role === 'comptable' && (
                  <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div
                        onClick={() => setFormData({ ...formData, globalAccess: !formData.globalAccess })}
                        className={`relative w-10 h-5 rounded-full transition-colors ${formData.globalAccess ? 'bg-emerald-500' : 'bg-raised border border-edge'}`}
                      >
                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${formData.globalAccess ? 'translate-x-5' : ''}`} />
                      </div>
                      <span className="text-sm font-medium text-ink">Accès global (toutes les stations)</span>
                    </label>
                    <p className="text-xs text-ink-muted mt-1">
                      {formData.globalAccess
                        ? 'La comptable pourra consulter les données de toutes les stations'
                        : 'La comptable sera limitée à une station spécifique'}
                    </p>
                  </div>
                )}

                {/* Station assignment */}
                {!(formData.role === 'comptable' && formData.globalAccess) && (
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-ink-light mb-1.5">
                      <MapPin className="w-3.5 h-3.5" /> Station {(formData.role === 'manager' || (formData.role === 'comptable' && !formData.globalAccess)) && '*'}
                    </label>
                    <select
                      required={formData.role === 'manager' || (formData.role === 'comptable' && !formData.globalAccess)}
                      value={selectedStationId}
                      onChange={(e) => setSelectedStationId(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
                    >
                      <option value="">— Aucune station —</option>
                      {stations.map((s) => (
                        <option key={s.id} value={s.id}>{s.nom} — {s.town}</option>
                      ))}
                    </select>
                    {formData.role === 'manager' && !selectedStationId && (
                      <p className="text-xs text-warn mt-1">Un manager doit être assigné à une station</p>
                    )}
                    {formData.role === 'comptable' && !formData.globalAccess && !selectedStationId && (
                      <p className="text-xs text-warn mt-1">Une comptable sans accès global doit être assignée à une station</p>
                    )}
                  </div>
                )}

                {/* Role-specific fields */}
                {formData.role === 'laveur' && (
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-ink-light mb-1.5">
                      <Coins className="w-3.5 h-3.5" /> Bonus par lavage (FCFA)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.bonusParLavage ?? ''}
                      onChange={(e) => setFormData({ ...formData, bonusParLavage: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
                      placeholder="Ex: 500"
                    />
                    <p className="text-xs text-ink-muted mt-1">Montant du bonus attribué pour chaque lavage effectué</p>
                  </div>
                )}

                {formData.role === 'commercial' && (
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-ink-light mb-1.5">
                      <Target className="w-3.5 h-3.5" /> Objectif journalier
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.objectifJournalier ?? ''}
                      onChange={(e) => setFormData({ ...formData, objectifJournalier: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
                      placeholder="Ex: 10"
                    />
                    <p className="text-xs text-ink-muted mt-1">Nombre de véhicules à enregistrer par jour</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-ink-light mb-1.5">Mot de passe provisoire *</label>
                  <input
                    required
                    type="text"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
                    placeholder="Minimum 6 caractères"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-divider mt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 font-medium text-ink-light hover:text-ink transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={createUser.isPending || assignStation.isPending}
                    className="px-5 py-2 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-xl transition-colors disabled:opacity-70 flex items-center gap-2"
                  >
                    {createUser.isPending || assignStation.isPending ? 'Création...' : 'Valider'}
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
