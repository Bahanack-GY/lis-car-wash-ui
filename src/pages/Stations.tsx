import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Building2, Plus, MapPin, Phone, Users, Car, Wallet, TrendingUp, Settings, ArrowUpRight, X } from 'lucide-react'
import { useStations, useCreateStation } from '@/api/stations'
import type { CreateStationDto } from '@/api/stations/types'

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }
const rise = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

// Temporary static stats placeholder until we integrate Dashboard endpoint
const globalStats = [
  { label: 'Stations actives', value: '3', icon: Building2, accent: 'bg-teal-500/10 text-accent' },
  { label: 'Employés total', value: '23', icon: Users, accent: 'bg-blue-500/10 text-info' },
  { label: 'Véhicules / jour', value: '54', icon: Car, accent: 'bg-purple-500/10 text-grape' },
  { label: 'Revenu mensuel', value: '28.5M', icon: Wallet, accent: 'bg-emerald-500/10 text-ok' },
]

export default function Stations() {
  const { data: stationsData, isLoading, isError } = useStations()
  const createStation = useCreateStation()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState<CreateStationDto>({
    nom: '',
    adresse: '',
    town: '',
    contact: '',
    status: 'active',
  })

  // Update dynamic stat locally
  const stationsList = stationsData || []
  const activeCount = stationsList.filter(s => s.status === 'active').length

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createStation.mutateAsync(formData)
      setIsModalOpen(false)
      setFormData({ nom: '', adresse: '', town: '', contact: '', status: 'active' })
    } catch (error) {
      console.error('Failed to create station', error)
    }
  }

  return (
    <>
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 relative">
        <motion.div variants={rise} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-ink flex items-center gap-2"><Building2 className="w-6 h-6 text-accent" /> Stations</h1>
            <p className="text-ink-faded mt-1">Gestion multi-stations et vue d'ensemble</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/25 hover:shadow-teal-500/35 transition-shadow text-sm"
          >
            <Plus className="w-4 h-4" /> Ajouter station
          </button>
        </motion.div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {globalStats.map((s, idx) => (
            <motion.div key={s.label} variants={rise} className="bg-panel border border-edge rounded-2xl p-4 shadow-sm">
              <div className={`p-2 rounded-xl w-fit ${s.accent} mb-3`}><s.icon className="w-4 h-4" /></div>
              <p className="font-heading text-xl font-bold text-ink">
                {idx === 0 ? activeCount : s.value} 
              </p>
              <p className="text-xs text-ink-faded mt-0.5">{s.label}</p>
            </motion.div>
          ))}
        </div>

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
              <motion.div key={s.id} variants={rise} className={`bg-panel border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 ${s.status === 'upcoming' || s.status === 'inactive' ? 'border-edge opacity-75' : 'border-edge'}`}>
                <div className="px-6 py-4 border-b border-divider flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.status === 'active' ? 'bg-accent-wash' : 'bg-raised'}`}>
                      <Building2 className={`w-5 h-5 ${s.status === 'active' ? 'text-accent' : 'text-ink-muted'}`} />
                    </div>
                    <div>
                      <h3 className="font-heading font-semibold text-ink text-sm">{s.nom}</h3>
                      <p className="text-xs text-ink-faded flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" /> {s.town}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${s.status === 'active' ? 'bg-ok-wash text-ok border-ok-line' : s.status === 'upcoming' ? 'bg-warn-wash text-warn border-warn-line' : 'bg-raised text-ink-muted border-edge'}`}>
                      {s.status === 'active' ? 'Active' : s.status === 'upcoming' ? 'Bientôt' : 'Inactive'}
                    </span>
                    <button className="p-1.5 rounded-lg text-ink-muted hover:text-ink-light hover:bg-raised transition-colors"><Settings className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="px-6 py-4 space-y-4">
                  <div className="space-y-1.5 text-sm">
                    <p className="text-ink-light flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-ink-muted shrink-0" /> {s.adresse}</p>
                    {s.contact && <p className="text-ink-light flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-ink-muted shrink-0" /> {s.contact}</p>}
                  </div>
                  {s.status === 'active' && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-inset rounded-xl p-3 text-center">
                        <p className="text-lg font-heading font-bold text-ink">{s.activeEmployeesCount ?? 0}</p>
                        <p className="text-xs text-ink-muted mt-0.5">Employés</p>
                      </div>
                      <div className="bg-inset rounded-xl p-3 text-center">
                        <p className="text-lg font-heading font-bold text-accent">0</p>
                        <p className="text-xs text-ink-muted mt-0.5">Laveurs actifs</p>
                      </div>
                      <div className="bg-inset rounded-xl p-3 text-center">
                        <p className="text-lg font-heading font-bold text-ink">0</p>
                        <p className="text-xs text-ink-muted mt-0.5">Véhicules / jour</p>
                      </div>
                      <div className="bg-inset rounded-xl p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <p className="text-lg font-heading font-bold text-ok">—</p>
                          <TrendingUp className="w-3.5 h-3.5 text-ok" />
                        </div>
                        <p className="text-xs text-ink-muted mt-0.5">Croissance</p>
                      </div>
                    </div>
                  )}
                  {s.status === 'active' && (
                    <div className="flex items-center justify-between pt-3 border-t border-divider opacity-50">
                      <div>
                        <p className="text-xs text-ink-muted">Revenu aujourd'hui</p>
                        <p className="text-sm font-semibold text-ink">0 FCFA</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-ink-muted">Revenu mensuel</p>
                        <p className="text-sm font-semibold text-accent">0 FCFA</p>
                      </div>
                      <button disabled className="flex items-center gap-1 text-xs text-accent hover:text-accent-bold transition-colors">Détails <ArrowUpRight className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                  {(s.status === 'upcoming' || s.status === 'inactive') && (
                    <div className="text-center py-4">
                      <p className="text-sm text-ink-muted">
                        {s.status === 'upcoming' ? 'Station en cours de préparation' : 'Station inactive'}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Add Station Modal ──────────────────────── */}
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
              className="relative w-full max-w-lg bg-panel border border-edge rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-divider bg-inset">
                <h3 className="font-heading font-bold text-lg text-ink">Ajouter une station</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
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
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
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
                      value={formData.town}
                      onChange={(e) => setFormData({ ...formData, town: e.target.value })}
                      className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
                      placeholder="ex: Dakar"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-light mb-1.5">Contact</label>
                    <input
                      type="text"
                      value={formData.contact}
                      onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
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
                    value={formData.adresse}
                    onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                    className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
                    placeholder="Numéro et rue..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-light mb-1.5">Statut initial</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
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
                    onClick={() => setIsModalOpen(false)}
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
    </>
  )
}

