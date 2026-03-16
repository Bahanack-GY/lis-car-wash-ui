import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package, ArrowLeft, AlertTriangle, Plus, X, Loader2,
  TrendingDown, ArrowUpCircle, ArrowDownLeft, RefreshCw,
} from '@/lib/icons'
import { useProduit, useUpdateProduit } from '@/api/produits'
import { useMouvementsStock, useCreateMouvementStock } from '@/api/mouvements-stock'
import type { UniteStock } from '@/api/produits/types'

const UNITS: { value: UniteStock; label: string }[] = [
  { value: 'L', label: 'Litre (L)' },
  { value: 'mL', label: 'Millilitre (mL)' },
  { value: 'pcs', label: 'Pièce (pcs)' },
  { value: 'kg', label: 'Kilogramme (kg)' },
  { value: 'g', label: 'Gramme (g)' },
  { value: 'carton', label: 'Carton' },
  { value: 'sachet', label: 'Sachet' },
  { value: 'bouteille', label: 'Bouteille' },
  { value: 'bidon', label: 'Bidon' },
  { value: 'rouleau', label: 'Rouleau' },
]

const catColors: Record<string, string> = {
  chimique: 'bg-info-wash text-info',
  consommable: 'bg-grape-wash text-grape',
  equipement: 'bg-warn-wash text-warn',
}
const catLabels: Record<string, string> = {
  chimique: 'Chimique',
  consommable: 'Boutique',
  equipement: 'Équipement',
}

type MouvementType = 'entree' | 'sortie' | 'ajustement'

const mvtColors: Record<MouvementType, string> = {
  entree: 'bg-ok-wash text-ok',
  sortie: 'bg-info-wash text-info',
  ajustement: 'bg-warn-wash text-warn',
}
const mvtLabels: Record<MouvementType, string> = {
  entree: 'Entrée',
  sortie: 'Sortie',
  ajustement: 'Ajustement',
}

const rise = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }
const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } }

export default function InventaireDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const produitId = Number(id)

  const { data: produit, isLoading: prodLoading } = useProduit(produitId)
  const { data: mvtsData, isLoading: mvtsLoading } = useMouvementsStock({ produitId, limit: 50 })
  const createMouvement = useCreateMouvementStock()
  const updateProduit = useUpdateProduit()

  const [isMovementOpen, setIsMovementOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [mvtForm, setMvtForm] = useState({ typeMouvement: 'entree' as MouvementType, quantite: 1, motif: '' })
  const [editForm, setEditForm] = useState<{ prixRevient?: number; prix?: number; quantiteAlerte?: number; unite?: string }>({})

  const mouvements = mvtsData?.data || []

  const totalEntrees = mouvements.filter(m => m.typeMouvement === 'entree').reduce((s, m) => s + m.quantite, 0)
  const totalSorties = mouvements.filter(m => m.typeMouvement === 'sortie').reduce((s, m) => s + m.quantite, 0)

  const handleMovement = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createMouvement.mutateAsync({
        produitId,
        date: new Date().toISOString().split('T')[0],
        typeMouvement: mvtForm.typeMouvement,
        quantite: Number(mvtForm.quantite),
        motif: mvtForm.motif || undefined,
      })
      setIsMovementOpen(false)
      setMvtForm({ typeMouvement: 'entree', quantite: 1, motif: '' })
    } catch (err) {
      console.error(err)
    }
  }

  const openEdit = () => {
    if (produit) {
      setEditForm({
        prixRevient: produit.prixRevient,
        prix: produit.prix,
        quantiteAlerte: produit.quantiteAlerte,
        unite: produit.unite,
      })
      setIsEditOpen(true)
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await updateProduit.mutateAsync({
        id: produitId,
        data: {
          prixRevient: editForm.prixRevient ? Number(editForm.prixRevient) : undefined,
          prix: editForm.prix ? Number(editForm.prix) : undefined,
          quantiteAlerte: editForm.quantiteAlerte ? Number(editForm.quantiteAlerte) : undefined,
          unite: editForm.unite,
        }
      })
      setIsEditOpen(false)
    } catch (err) {
      console.error(err)
    }
  }

  const mvtExpensePreview = produit?.prixRevient && mvtForm.typeMouvement === 'entree'
    ? Number(mvtForm.quantite) * Number(produit.prixRevient)
    : null

  if (prodLoading) {
    return (
      <div className="flex items-center justify-center h-60">
        <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
      </div>
    )
  }

  if (!produit) {
    return (
      <div className="text-center py-20 text-ink-muted">
        <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Produit introuvable.</p>
        <button onClick={() => navigate('/inventaire')} className="mt-4 text-sm text-accent underline">Retour à l'inventaire</button>
      </div>
    )
  }

  const isLow = produit.quantiteStock <= produit.quantiteAlerte
  const stockPercent = Math.min(100, (produit.quantiteStock / (produit.quantiteAlerte * 3)) * 100)

  return (
    <>
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
        {/* Header */}
        <motion.div variants={rise} className="flex items-center gap-4">
          <button
            onClick={() => navigate('/inventaire')}
            className="p-2 rounded-xl border border-edge bg-panel hover:bg-inset transition-colors text-ink-muted hover:text-ink"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-heading text-2xl font-bold text-ink">{produit.nom}</h1>
              <span className={`text-xs px-2 py-1 rounded-lg font-medium ${catColors[produit.categorie] || 'bg-raised text-ink-muted'}`}>
                {catLabels[produit.categorie] || produit.categorie}
              </span>
              {isLow && (
                <span className="text-xs px-2 py-1 rounded-lg bg-bad-wash text-bad font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Stock faible
                </span>
              )}
            </div>
            <p className="text-ink-faded text-sm mt-0.5">Station #{produit.stationId}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={openEdit}
              className="px-4 py-2 text-sm font-medium bg-panel border border-edge rounded-xl text-ink-light hover:text-ink hover:bg-inset transition-colors"
            >
              Modifier
            </button>
            <button
              onClick={() => setIsMovementOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-gradient-to-r from-teal-600 to-teal-500 text-white rounded-xl shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30 transition-shadow"
            >
              <Plus className="w-4 h-4" /> Mouvement
            </button>
          </div>
        </motion.div>

        {/* Stats row */}
        <motion.div variants={rise} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-panel border border-edge rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-ink-faded uppercase tracking-wide font-semibold mb-1">Stock actuel</p>
            <p className={`text-3xl font-bold font-heading ${isLow ? 'text-bad' : 'text-ink'}`}>
              {produit.quantiteStock}
            </p>
            <p className="text-sm text-ink-muted mt-0.5">{produit.unite}</p>
            <div className="w-full bg-dim rounded-full h-1.5 mt-3">
              <div
                className={`h-1.5 rounded-full ${isLow ? 'bg-red-400' : 'bg-teal-500'}`}
                style={{ width: `${stockPercent}%` }}
              />
            </div>
            <p className="text-[10px] text-ink-muted mt-1">Seuil : {produit.quantiteAlerte} {produit.unite}</p>
          </div>

          <div className="bg-panel border border-edge rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-ink-faded uppercase tracking-wide font-semibold mb-1">Prix de revient</p>
            <p className="text-2xl font-bold font-heading text-ink">
              {produit.prixRevient ? Number(produit.prixRevient).toLocaleString() : '—'}
            </p>
            {produit.prixRevient && <p className="text-sm text-ink-muted mt-0.5">FCFA / {produit.unite}</p>}
          </div>

          <div className="bg-panel border border-edge rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-ink-faded uppercase tracking-wide font-semibold mb-1">Total entrées</p>
            <p className="text-2xl font-bold font-heading text-ok">{totalEntrees}</p>
            <p className="text-sm text-ink-muted mt-0.5">{produit.unite} ({mouvements.filter(m => m.typeMouvement === 'entree').length} mvt.)</p>
          </div>

          <div className="bg-panel border border-edge rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-ink-faded uppercase tracking-wide font-semibold mb-1">Total sorties</p>
            <p className="text-2xl font-bold font-heading text-info">{totalSorties}</p>
            <p className="text-sm text-ink-muted mt-0.5">{produit.unite} ({mouvements.filter(m => m.typeMouvement === 'sortie').length} mvt.)</p>
          </div>
        </motion.div>

        {/* Movements history */}
        <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-divider flex items-center justify-between">
            <h2 className="font-heading font-semibold text-ink">Historique des mouvements</h2>
            <span className="text-xs text-ink-faded">{mouvements.length} mouvement(s)</span>
          </div>

          {mvtsLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-teal-500" /></div>
          ) : mouvements.length === 0 ? (
            <div className="text-center py-12 text-ink-muted">
              <RefreshCw className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucun mouvement enregistré.</p>
              <p className="text-xs mt-1">Créez le premier mouvement avec le bouton ci-dessus.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-edge bg-inset/50">
                    <th className="px-6 py-3 text-xs font-semibold text-ink-faded uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-xs font-semibold text-ink-faded uppercase tracking-wider text-right">Quantité</th>
                    <th className="px-6 py-3 text-xs font-semibold text-ink-faded uppercase tracking-wider hidden sm:table-cell">Motif</th>
                    <th className="px-6 py-3 text-xs font-semibold text-ink-faded uppercase tracking-wider text-right hidden md:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {mouvements.map((m) => {
                    const type = m.typeMouvement as MouvementType
                    const isEntree = type === 'entree'
                    const isSortie = type === 'sortie'
                    return (
                      <tr key={m.id} className="border-b border-divider hover:bg-inset/50 transition-colors">
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2">
                            {isEntree ? (
                              <ArrowUpCircle className="w-4 h-4 text-ok" />
                            ) : isSortie ? (
                              <ArrowDownLeft className="w-4 h-4 text-info" />
                            ) : (
                              <RefreshCw className="w-4 h-4 text-warn" />
                            )}
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${mvtColors[type]}`}>
                              {mvtLabels[type]}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <span className={`text-sm font-semibold ${isEntree ? 'text-ok' : isSortie ? 'text-info' : 'text-warn'}`}>
                            {isEntree ? '+' : isSortie ? '-' : ''}{m.quantite}
                          </span>
                          <span className="text-xs text-ink-muted ml-1">{produit.unite}</span>
                        </td>
                        <td className="px-6 py-3.5 text-sm text-ink-faded hidden sm:table-cell">
                          {m.motif || <span className="italic opacity-50">—</span>}
                        </td>
                        <td className="px-6 py-3.5 text-right text-sm text-ink-muted hidden md:table-cell">
                          {new Date(m.createdAt).toLocaleString('fr-FR', {
                            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* ── Movement Modal ───────────────── */}
      <AnimatePresence>
        {isMovementOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMovementOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-panel border border-edge rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-divider bg-inset">
                <h3 className="font-heading font-bold text-ink">Nouveau mouvement</h3>
                <button onClick={() => setIsMovementOpen(false)} className="p-1 text-ink-muted hover:text-ink rounded-lg hover:bg-raised">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleMovement} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ink-light mb-1.5">Type de mouvement</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['entree', 'sortie', 'ajustement'] as MouvementType[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setMvtForm({ ...mvtForm, typeMouvement: t })}
                        className={`py-2 text-sm font-medium rounded-xl border transition-all ${
                          mvtForm.typeMouvement === t
                            ? 'border-teal-500 bg-teal-500/10 text-teal-600'
                            : 'border-outline text-ink-faded hover:text-ink-light hover:border-outline/80'
                        }`}
                      >
                        {mvtLabels[t]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-light mb-1.5">
                    Quantité <span className="text-ink-muted">({produit.unite})</span>
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={mvtForm.quantite}
                    onChange={(e) => setMvtForm({ ...mvtForm, quantite: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-light mb-1.5">Motif <span className="text-ink-muted">(optionnel)</span></label>
                  <input
                    type="text"
                    value={mvtForm.motif}
                    onChange={(e) => setMvtForm({ ...mvtForm, motif: e.target.value })}
                    placeholder="Ex: Réapprovisionnement mensuel"
                    className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500"
                  />
                </div>

                {mvtExpensePreview !== null && (
                  <div className="p-3 bg-ok-wash border border-ok-line rounded-xl text-sm flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-ok shrink-0 rotate-180" />
                    <span className="text-ok font-medium">
                      Dépense générée : <strong>{mvtExpensePreview.toLocaleString()} FCFA</strong>
                    </span>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setIsMovementOpen(false)} className="px-4 py-2 font-medium text-ink-light hover:text-ink">Annuler</button>
                  <button
                    type="submit"
                    disabled={createMouvement.isPending}
                    className="px-5 py-2 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-xl transition-colors disabled:opacity-70"
                  >
                    {createMouvement.isPending ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Edit Modal ───────────────── */}
      <AnimatePresence>
        {isEditOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsEditOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-panel border border-edge rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-divider bg-inset">
                <h3 className="font-heading font-bold text-ink">Modifier le produit</h3>
                <button onClick={() => setIsEditOpen(false)} className="p-1 text-ink-muted hover:text-ink rounded-lg hover:bg-raised">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleEdit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-light mb-1.5">Prix de revient</label>
                    <input
                      type="number" min="0"
                      value={editForm.prixRevient ?? ''}
                      onChange={(e) => setEditForm({ ...editForm, prixRevient: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-light mb-1.5">Prix de vente</label>
                    <input
                      type="number" min="0"
                      value={editForm.prix ?? ''}
                      onChange={(e) => setEditForm({ ...editForm, prix: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-light mb-1.5">Seuil d'alerte</label>
                    <input
                      type="number" min="0"
                      value={editForm.quantiteAlerte ?? ''}
                      onChange={(e) => setEditForm({ ...editForm, quantiteAlerte: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-light mb-1.5">Unité</label>
                    <select
                      value={editForm.unite || 'pcs'}
                      onChange={(e) => setEditForm({ ...editForm, unite: e.target.value })}
                      className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500"
                    >
                      {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setIsEditOpen(false)} className="px-4 py-2 font-medium text-ink-light hover:text-ink">Annuler</button>
                  <button
                    type="submit"
                    disabled={updateProduit.isPending}
                    className="px-5 py-2 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-xl transition-colors disabled:opacity-70"
                  >
                    {updateProduit.isPending ? 'Enregistrement...' : 'Enregistrer'}
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
