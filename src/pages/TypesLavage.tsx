import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Droplets, Plus, Search, Clock, Banknote, Sparkles, Zap, X, Pencil, ListFilter } from 'lucide-react'
import { useWashTypes, useCreateWashType, useUpdateWashType } from '@/api/wash-types'
import type { WashType, CreateWashTypeDto, UpdateWashTypeDto } from '@/api/wash-types/types'
import { useAuth } from '@/contexts/AuthContext'

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const rise = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

const tierIcons: Record<string, React.ElementType> = {
  Express: Zap,
  Simple: Droplets,
  Complet: Sparkles,
  Premium: Sparkles,
}

const tierAccents: Record<string, string> = {
  Express: 'from-amber-500 to-orange-500',
  Simple: 'from-sky-500 to-blue-500',
  Complet: 'from-teal-500 to-emerald-500',
  Premium: 'from-purple-500 to-fuchsia-500',
}

const defaultGradient = 'from-teal-500 to-teal-600'

function formatPrice(price: number | string) {
  return new Intl.NumberFormat('fr-FR').format(Number(price))
}

function formatDuration(minutes: number | string) {
  const m = Number(minutes)
  if (!m) return '—'
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem > 0 ? `${h}h ${rem}min` : `${h}h`
}

const emptyForm: CreateWashTypeDto = { nom: '', particularites: '', prixBase: 0, dureeEstimee: 0 }

export default function TypesLavage() {
  const { selectedStationId } = useAuth()
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingType, setEditingType] = useState<WashType | null>(null)
  const [formData, setFormData] = useState<CreateWashTypeDto>(emptyForm)

  const { data: washTypesData, isLoading, isError } = useWashTypes(selectedStationId ? { stationId: selectedStationId } : undefined)
  const createWashType = useCreateWashType()
  const updateWashType = useUpdateWashType()

  const washTypes: WashType[] = Array.isArray(washTypesData)
    ? washTypesData
    : (washTypesData as any)?.data || []

  const filtered = washTypes.filter((wt) =>
    wt.nom.toLowerCase().includes(search.toLowerCase()) ||
    (wt.particularites || '').toLowerCase().includes(search.toLowerCase())
  )

  const avgPrice = washTypes.length > 0
    ? Math.round(washTypes.reduce((s, wt) => s + Number(wt.prixBase), 0) / washTypes.length)
    : 0

  const maxPrice = washTypes.length > 0
    ? Math.max(...washTypes.map(wt => Number(wt.prixBase)))
    : 0

  const avgDuration = washTypes.length > 0
    ? Math.round(washTypes.reduce((s, wt) => s + (Number(wt.dureeEstimee) || 0), 0) / washTypes.length)
    : 0

  const summaryStats = [
    { label: 'Types de lavage', value: washTypes.length.toString(), icon: Droplets, accent: 'bg-teal-500/10 text-accent' },
    { label: 'Prix moyen', value: `${formatPrice(avgPrice)} F`, icon: Banknote, accent: 'bg-emerald-500/10 text-ok' },
    { label: 'Prix le plus haut', value: `${formatPrice(maxPrice)} F`, icon: Sparkles, accent: 'bg-purple-500/10 text-grape' },
    { label: 'Durée moyenne', value: formatDuration(avgDuration), icon: Clock, accent: 'bg-amber-500/10 text-warn' },
  ]

  const openCreate = () => {
    setEditingType(null)
    setFormData(emptyForm)
    setIsModalOpen(true)
  }

  const openEdit = (wt: WashType) => {
    setEditingType(wt)
    setFormData({
      nom: wt.nom,
      particularites: wt.particularites || '',
      prixBase: Number(wt.prixBase),
      dureeEstimee: Number(wt.dureeEstimee) || 0,
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingType(null)
    setFormData(emptyForm)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingType) {
        const changes: UpdateWashTypeDto = {}
        if (formData.nom !== editingType.nom) changes.nom = formData.nom
        if (formData.particularites !== (editingType.particularites || '')) changes.particularites = formData.particularites
        if (formData.prixBase !== Number(editingType.prixBase)) changes.prixBase = formData.prixBase
        if (formData.dureeEstimee !== (Number(editingType.dureeEstimee) || 0)) changes.dureeEstimee = formData.dureeEstimee
        await updateWashType.mutateAsync({ id: editingType.id, data: changes })
      } else {
        await createWashType.mutateAsync({ ...formData, stationId: selectedStationId || undefined })
      }
      closeModal()
    } catch (error) {
      console.error('Failed to save wash type', error)
    }
  }

  const isPending = createWashType.isPending || updateWashType.isPending
  const isSubmitError = createWashType.isError || updateWashType.isError

  return (
    <>
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 relative">
        {/* Header */}
        <motion.div variants={rise} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-ink flex items-center gap-2">
              <Droplets className="w-6 h-6 text-accent" /> Types de Lavage
            </h1>
            <p className="text-ink-faded mt-1">Configurez les formules de lavage et tarifs</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/25 hover:shadow-teal-500/35 transition-shadow text-sm"
          >
            <Plus className="w-4 h-4" /> Nouveau type
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
              placeholder="Rechercher par nom ou description..."
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
            Erreur lors du chargement des types de lavage.
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-ink-muted p-12 border border-dashed border-divider rounded-xl">
            {search ? 'Aucun type de lavage ne correspond à la recherche.' : 'Aucun type de lavage configuré. Commencez par en créer un.'}
          </div>
        ) : (
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          >
            {filtered.map((wt) => {
              const gradient = tierAccents[wt.nom] || defaultGradient
              const TierIcon = tierIcons[wt.nom] || Droplets

              return (
                <motion.div
                  key={wt.id}
                  variants={rise}
                  className="bg-panel border border-edge rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 group"
                >
                  {/* Gradient header strip */}
                  <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />

                  <div className="p-5">
                    {/* Top row: icon + name + edit */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-sm`}>
                          <TierIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-heading font-semibold text-ink">{wt.nom}</h3>
                          <p className="text-xs text-ink-faded mt-0.5">Lavage {wt.nom.toLowerCase()}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => openEdit(wt)}
                        className="p-1.5 rounded-lg text-ink-muted hover:text-accent hover:bg-accent-wash transition-colors opacity-0 group-hover:opacity-100"
                        title="Modifier"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Description */}
                    {wt.particularites && (
                      <p className="text-sm text-ink-light leading-relaxed mb-4 line-clamp-2">{wt.particularites}</p>
                    )}

                    {/* Stats row */}
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-divider">
                      <div className="bg-inset rounded-xl p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                          <Banknote className="w-3.5 h-3.5 text-ok" />
                          <span className="font-heading text-lg font-bold text-ink">{formatPrice(wt.prixBase)}</span>
                        </div>
                        <p className="text-xs text-ink-muted">FCFA</p>
                      </div>
                      <div className="bg-inset rounded-xl p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                          <Clock className="w-3.5 h-3.5 text-warn" />
                          <span className="font-heading text-lg font-bold text-ink">{formatDuration(wt.dureeEstimee)}</span>
                        </div>
                        <p className="text-xs text-ink-muted">Durée</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
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
              className="relative w-full max-w-lg bg-panel border border-edge rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-divider bg-inset">
                <h3 className="font-heading font-bold text-lg text-ink flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-accent" />
                  {editingType ? 'Modifier le type' : 'Nouveau type de lavage'}
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
                    Erreur lors de {editingType ? 'la modification' : 'la création'} du type de lavage.
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-ink-light mb-1.5">Nom *</label>
                  <input
                    required
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
                    placeholder="ex: Express, Complet, Premium..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-light mb-1.5">Description / Particularités</label>
                  <textarea
                    rows={3}
                    value={formData.particularites || ''}
                    onChange={(e) => setFormData({ ...formData, particularites: e.target.value })}
                    className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 resize-none"
                    placeholder="Décrivez les services inclus dans cette formule..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-light mb-1.5">Prix de base (FCFA) *</label>
                    <input
                      required
                      type="number"
                      min={0}
                      step={100}
                      value={formData.prixBase || ''}
                      onChange={(e) => setFormData({ ...formData, prixBase: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
                      placeholder="5000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-light mb-1.5">Durée estimée (min)</label>
                    <input
                      type="number"
                      min={0}
                      step={5}
                      value={formData.dureeEstimee || ''}
                      onChange={(e) => setFormData({ ...formData, dureeEstimee: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
                      placeholder="30"
                    />
                  </div>
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
                    {isPending ? 'Enregistrement...' : editingType ? 'Mettre à jour' : 'Créer le type'}
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
