import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Plus, Search, Banknote, TrendingDown, TrendingUp, X, Pencil, ListFilter } from 'lucide-react'
import { useExtras, useCreateExtra, useUpdateExtra } from '@/api/extras'
import type { ExtraService, CreateExtraServiceDto, UpdateExtraServiceDto } from '@/api/extras/types'
import { useAuth } from '@/contexts/AuthContext'

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const rise = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

function formatPrice(price: number | string) {
  return new Intl.NumberFormat('fr-FR').format(Number(price))
}

const emptyForm: CreateExtraServiceDto = { nom: '', prix: 0 }

export default function ServicesAdditionnels() {
  const { selectedStationId } = useAuth()
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingExtra, setEditingExtra] = useState<ExtraService | null>(null)
  const [formData, setFormData] = useState<CreateExtraServiceDto>(emptyForm)

  const { data: extrasData, isLoading, isError } = useExtras(selectedStationId ? { stationId: selectedStationId } : undefined)
  const createExtra = useCreateExtra()
  const updateExtra = useUpdateExtra()

  const extras: ExtraService[] = Array.isArray(extrasData)
    ? extrasData
    : (extrasData as any)?.data || []

  const filtered = extras.filter((e) =>
    e.nom.toLowerCase().includes(search.toLowerCase())
  )

  const avgPrice = extras.length > 0
    ? Math.round(extras.reduce((s, e) => s + Number(e.prix), 0) / extras.length)
    : 0

  const maxPrice = extras.length > 0
    ? Math.max(...extras.map(e => Number(e.prix)))
    : 0

  const minPrice = extras.length > 0
    ? Math.min(...extras.map(e => Number(e.prix)))
    : 0

  const summaryStats = [
    { label: 'Total services', value: extras.length.toString(), icon: Sparkles, accent: 'bg-teal-500/10 text-accent' },
    { label: 'Prix moyen', value: `${formatPrice(avgPrice)} F`, icon: Banknote, accent: 'bg-emerald-500/10 text-ok' },
    { label: 'Prix le plus haut', value: `${formatPrice(maxPrice)} F`, icon: TrendingUp, accent: 'bg-purple-500/10 text-grape' },
    { label: 'Prix le plus bas', value: `${formatPrice(minPrice)} F`, icon: TrendingDown, accent: 'bg-amber-500/10 text-warn' },
  ]

  const openCreate = () => {
    setEditingExtra(null)
    setFormData(emptyForm)
    setIsModalOpen(true)
  }

  const openEdit = (extra: ExtraService) => {
    setEditingExtra(extra)
    setFormData({
      nom: extra.nom,
      prix: Number(extra.prix),
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingExtra(null)
    setFormData(emptyForm)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingExtra) {
        const changes: UpdateExtraServiceDto = {}
        if (formData.nom !== editingExtra.nom) changes.nom = formData.nom
        if (formData.prix !== Number(editingExtra.prix)) changes.prix = formData.prix
        await updateExtra.mutateAsync({ id: editingExtra.id, data: changes })
      } else {
        await createExtra.mutateAsync({ ...formData, stationId: selectedStationId || undefined })
      }
      closeModal()
    } catch (error) {
      console.error('Failed to save extra service', error)
    }
  }

  const isPending = createExtra.isPending || updateExtra.isPending
  const isSubmitError = createExtra.isError || updateExtra.isError

  return (
    <>
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 relative">
        {/* Header */}
        <motion.div variants={rise} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-ink flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-accent" /> Services Additionnels
            </h1>
            <p className="text-ink-faded mt-1">Gérez les services supplémentaires et leurs tarifs</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/25 hover:shadow-teal-500/35 transition-shadow text-sm"
          >
            <Plus className="w-4 h-4" /> Nouveau service
          </button>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {summaryStats.map((s) => (
            <motion.div key={s.label} variants={rise} className="bg-panel border border-edge rounded-2xl p-4 shadow-sm">
              <div className={`p-2 rounded-xl w-fit ${s.accent} mb-3`}><s.icon className="w-4 h-4" /></div>
              <p className="font-heading text-xl font-bold text-ink">{s.value}</p>
              <p className="text-xs text-ink-faded mt-0.5">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Search */}
        <motion.div variants={rise} className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 bg-panel border border-edge rounded-xl px-4 py-2.5 flex-1 shadow-sm focus-within:border-teal-500/40 transition-colors">
            <Search className="w-4 h-4 text-ink-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un service..."
              className="bg-transparent text-sm text-ink placeholder-ink-muted outline-none flex-1"
            />
          </div>
          <button className="p-2.5 bg-panel border border-edge rounded-xl text-ink-muted hover:text-ink-light shadow-sm transition-colors">
            <ListFilter className="w-4 h-4" />
          </button>
        </motion.div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
          </div>
        ) : isError ? (
          <div className="p-4 bg-red-500/10 text-red-500 rounded-xl">
            Erreur lors du chargement des services additionnels.
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-ink-muted p-12 border border-dashed border-divider rounded-xl">
            {search ? 'Aucun service ne correspond à la recherche.' : 'Aucun service additionnel configuré. Commencez par en créer un.'}
          </div>
        ) : (
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          >
            {filtered.map((extra) => (
              <motion.div
                key={extra.id}
                variants={rise}
                className="bg-panel border border-edge rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 group"
              >
                <div className="h-1.5 bg-gradient-to-r from-purple-500 to-fuchsia-500" />

                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center text-white shadow-sm">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-heading font-semibold text-ink">{extra.nom}</h3>
                        <p className="text-xs text-ink-faded mt-0.5">Service additionnel</p>
                      </div>
                    </div>
                    <button
                      onClick={() => openEdit(extra)}
                      className="p-1.5 rounded-lg text-ink-muted hover:text-accent hover:bg-accent-wash transition-colors opacity-0 group-hover:opacity-100"
                      title="Modifier"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="bg-inset rounded-xl p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <Banknote className="w-3.5 h-3.5 text-ok" />
                      <span className="font-heading text-lg font-bold text-ink">{formatPrice(extra.prix)}</span>
                    </div>
                    <p className="text-xs text-ink-muted">FCFA</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* ── Create / Edit Modal ──────────────────────── */}
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
              className="relative w-full max-w-md bg-panel border border-edge rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-divider bg-inset">
                <h3 className="font-heading font-bold text-lg text-ink flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent" />
                  {editingExtra ? 'Modifier le service' : 'Nouveau service additionnel'}
                </h3>
                <button
                  onClick={closeModal}
                  className="p-1 text-ink-muted hover:text-ink transition-colors rounded-lg hover:bg-raised"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {isSubmitError && (
                  <div className="p-3 bg-red-500/10 text-red-500 rounded-xl text-sm border border-red-500/20">
                    Erreur lors de {editingExtra ? 'la modification' : 'la création'} du service.
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-ink-light mb-1.5">Nom du service *</label>
                  <input
                    required
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
                    placeholder="ex: Cire de protection, Shampoing sièges..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-light mb-1.5">Prix (FCFA) *</label>
                  <input
                    required
                    type="number"
                    min={0}
                    step={100}
                    value={formData.prix || ''}
                    onChange={(e) => setFormData({ ...formData, prix: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
                    placeholder="2000"
                  />
                </div>

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
                    disabled={isPending}
                    className="px-5 py-2 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-xl transition-colors disabled:opacity-70 flex items-center gap-2"
                  >
                    {isPending ? 'Enregistrement...' : editingExtra ? 'Mettre à jour' : 'Créer le service'}
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
