import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Package, Search, Plus, AlertTriangle, Filter, ShoppingCart, Droplets, Wrench, X, Loader2 } from 'lucide-react'

import { useProduits, useCreateProduit } from '@/api/produits'
import { useMouvementsStock } from '@/api/mouvements-stock'
import type { Produit, CreateProduitDto } from '@/api/produits/types'
import { useAuth } from '@/contexts/AuthContext'

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const rise = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

type Category = 'all' | 'chimique' | 'equipement' | 'consommable'

const categories: { key: Category; label: string; icon: typeof Droplets }[] = [
  { key: 'all', label: 'Tous', icon: Package },
  { key: 'chimique', label: 'Produits Chimiques', icon: Droplets },
  { key: 'consommable', label: 'Boutique / Consommables', icon: ShoppingCart },
  { key: 'equipement', label: 'Équipement / Ustensiles', icon: Wrench },
]

export default function Inventaire() {
  const { selectedStationId } = useAuth()
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState<Category>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [formData, setFormData] = useState<Partial<CreateProduitDto>>({
    nom: '',
    categorie: 'chimique',
    quantiteStock: 0,
    quantiteAlerte: 10,
    prix: 0,
    unite: 'pcs'
  })

  // Queries
  const { data: produitsData, isLoading: prodLoading } = useProduits(selectedStationId ? { stationId: selectedStationId } : undefined)
  const { data: mvtsData, isLoading: mvtsLoading } = useMouvementsStock()
  const createProduit = useCreateProduit()

  const productsList: Produit[] = produitsData?.data || []
  const movementsList = mvtsData?.data || []

  const filtered = productsList.filter((p) => 
    (cat === 'all' || p.categorie === cat) && 
    p.nom.toLowerCase().includes(search.toLowerCase())
  )
  const lowStock = productsList.filter((p) => p.quantiteStock <= p.quantiteAlerte)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload: CreateProduitDto = {
        stationId: selectedStationId!,
        nom: formData.nom || '',
        categorie: formData.categorie as any,
        quantiteStock: Number(formData.quantiteStock),
        quantiteAlerte: Number(formData.quantiteAlerte),
        prix: formData.prix ? Number(formData.prix) : undefined,
        unite: formData.unite,
      }
      await createProduit.mutateAsync(payload)
      setIsModalOpen(false)
      setFormData({ nom: '', categorie: 'chimique', quantiteStock: 0, quantiteAlerte: 10, prix: 0, unite: 'pcs' })
    } catch (err) {
      console.error('Failed to create Product', err)
    }
  }

  return (
    <>
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 relative">
        <motion.div variants={rise} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-ink flex items-center gap-2">
              <Package className="w-6 h-6 text-accent" /> Inventaire
            </h1>
            <p className="text-ink-faded mt-1">Gestion des stocks, produits et mouvements</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2.5 bg-panel border border-edge text-ink-light font-medium rounded-xl shadow-sm hover:bg-inset transition-colors text-sm">
              <ShoppingCart className="w-4 h-4" /> Commande / Ravitaillement
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/25 hover:shadow-teal-500/35 transition-shadow text-sm"
            >
              <Plus className="w-4 h-4" /> Ajouter produit
            </button>
          </div>
        </motion.div>

        {lowStock.length > 0 && (
          <motion.div variants={rise} className="bg-warn-wash border border-warn-line rounded-2xl p-4 flex items-start gap-3 shadow-sm">
            <AlertTriangle className="w-5 h-5 text-warn flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-warn">{lowStock.length} produit(s) en stock faible</p>
              <p className="text-xs text-amber-600/70 mt-0.5">{lowStock.map((p) => p.nom).join(', ')}</p>
            </div>
          </motion.div>
        )}

        <motion.div variants={rise} className="flex flex-col md:flex-row gap-3">
          <div className="flex items-center gap-2 bg-panel border border-edge rounded-xl px-4 py-2.5 flex-1 shadow-sm focus-within:border-teal-500/40 transition-colors">
            <Search className="w-4 h-4 text-ink-muted" />
            <input 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="Rechercher un produit..." 
              className="bg-transparent text-sm text-ink placeholder-ink-muted outline-none flex-1" 
            />
          </div>
          <div className="flex bg-raised border border-edge rounded-xl p-1 overflow-x-auto">
            {categories.map((c) => (
              <button 
                key={c.key} 
                onClick={() => setCat(c.key)} 
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  cat === c.key ? 'bg-panel text-accent shadow-sm' : 'text-ink-faded hover:text-ink-light'
                }`}
              >
                <c.icon className="w-3.5 h-3.5" /> {c.label}
              </button>
            ))}
          </div>
          <button className="p-2.5 bg-panel border border-edge rounded-xl text-ink-muted hover:text-ink-light shadow-sm transition-colors">
            <Filter className="w-4 h-4" />
          </button>
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <motion.div variants={rise} className="xl:col-span-2 bg-panel border border-edge rounded-2xl shadow-sm overflow-hidden">
            {prodLoading ? (
               <div className="flex justify-center p-12">
                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
               </div>
            ) : filtered.length === 0 ? (
               <div className="text-center text-ink-muted p-12 bg-inset/20">
                 Aucun produit trouvé dans cette catégorie.
               </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-edge bg-inset/50">
                      <th className="px-5 py-4 text-xs font-semibold text-ink-faded uppercase tracking-wider">Produit</th>
                      <th className="px-5 py-4 text-xs font-semibold text-ink-faded uppercase tracking-wider">Catégorie</th>
                      <th className="px-5 py-4 text-xs font-semibold text-ink-faded uppercase tracking-wider text-center">Stock</th>
                      <th className="px-5 py-4 text-xs font-semibold text-ink-faded uppercase tracking-wider text-right hidden md:table-cell">Prix unit.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => {
                      const isLow = p.quantiteStock <= p.quantiteAlerte
                      const catColors = {
                        chimique: 'bg-info-wash text-info',
                        consommable: 'bg-grape-wash text-grape',
                        equipement: 'bg-warn-wash text-warn'
                      }
                      const catLabels = {
                        chimique: 'Chimique',
                        consommable: 'Boutique',
                        equipement: 'Équipement'
                      }

                      return (
                        <tr key={p.id} className="border-b border-divider hover:bg-inset transition-colors">
                          <td className="px-5 py-3.5"><p className="text-sm font-medium text-ink">{p.nom}</p></td>
                          <td className="px-5 py-3.5">
                            <span className={`text-xs px-2 py-1 rounded-lg ${catColors[p.categorie] || 'bg-raised text-ink-muted'}`}>
                              {catLabels[p.categorie] || p.categorie}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <span className={`text-sm font-semibold ${isLow ? 'text-bad' : 'text-ink'}`}>{p.quantiteStock}</span>
                              <span className="text-xs text-ink-muted">{p.unite}</span>
                              {isLow && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                            </div>
                            <div className="w-full bg-dim rounded-full h-1 mt-1.5 max-w-[80px] mx-auto">
                              <div 
                                className={`h-1 rounded-full transition-all ${isLow ? 'bg-red-400' : 'bg-teal-500'}`} 
                                style={{ width: `${Math.min(100, (p.quantiteStock / (p.quantiteAlerte * 3)) * 100)}%` }} 
                              />
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right text-sm text-ink-light hidden md:table-cell">
                            {p.prix ? `${p.prix.toLocaleString()} FCFA` : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>

          <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl p-5 shadow-sm">
            <h3 className="font-heading font-semibold text-ink mb-4">Derniers mouvements</h3>
            {mvtsLoading ? (
              <div className="text-center py-4"><Loader2 className="w-5 h-5 animate-spin mx-auto text-teal-500" /></div>
            ) : movementsList.length === 0 ? (
              <p className="text-sm text-ink-muted text-center py-4">Aucun mouvement récent</p>
            ) : (
              <div className="space-y-3">
                {movementsList.slice(0, 10).map((m) => {
                  const mTypeColor = m.typeMouvement === 'entree' ? 'bg-ok-wash text-ok' : m.typeMouvement === 'sortie' ? 'bg-info-wash text-info' : 'bg-bad-wash text-bad'
                  const displayType = m.typeMouvement === 'entree' ? 'Entrée' : m.typeMouvement === 'sortie' ? 'Sortie' : 'Ajustement'
                  const productAssoc = productsList.find(p => p.id === m.produitId)?.nom || `Produit #${m.produitId}`

                  return (
                    <div key={m.id} className="bg-inset rounded-xl p-3 border border-transparent hover:border-outline transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-ink truncate mr-2">{productAssoc}</span>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${mTypeColor}`}>{displayType}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-xs text-ink-muted truncate" title={m.motif}>{m.motif || 'Aucun motif'}</span>
                        <span className="text-xs text-ink-light font-medium ml-2">
                          {m.typeMouvement === 'entree' ? '+' : '-'}{m.quantite}
                        </span>
                      </div>
                      <span className="text-[10px] text-ink-muted mt-1.5 block">
                        {new Date(m.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>

      {/* ── Add Product Modal ──────────────────────── */}
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
              className="relative w-full max-w-md bg-panel border border-edge rounded-2xl shadow-xl overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-divider bg-inset shrink-0">
                <h3 className="font-heading font-bold text-lg text-ink flex items-center gap-2">
                  <Package className="w-5 h-5 text-accent" /> Nouveau Produit
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1 text-ink-muted hover:text-ink transition-colors rounded-lg hover:bg-raised">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[70vh]">
                <form id="prod-form" onSubmit={handleSubmit} className="space-y-4">
                  {createProduit.isError && (
                    <div className="p-3 bg-red-500/10 text-red-500 rounded-xl text-sm border border-red-500/20">
                      Erreur lors de la création du produit.
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-ink-light mb-1.5">Nom du produit *</label>
                    <input 
                      required 
                      type="text" 
                      value={formData.nom || ''} 
                      onChange={(e) => setFormData({ ...formData, nom: e.target.value })} 
                      className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink-light mb-1.5">Catégorie *</label>
                    <select 
                      required
                      value={formData.categorie} 
                      onChange={(e) => setFormData({ ...formData, categorie: e.target.value as any })} 
                      className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500"
                    >
                      <option value="chimique">Chimique (Entretien)</option>
                      <option value="consommable">Consommable (Boutique)</option>
                      <option value="equipement">Équipement (Ustensiles)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-ink-light mb-1.5">Stock initial</label>
                      <input 
                        type="number" 
                        min="0"
                        value={formData.quantiteStock || ''} 
                        onChange={(e) => setFormData({ ...formData, quantiteStock: Number(e.target.value) })} 
                        className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ink-light mb-1.5">Seuil d'alerte</label>
                      <input 
                        type="number" 
                        min="0"
                        value={formData.quantiteAlerte || ''} 
                        onChange={(e) => setFormData({ ...formData, quantiteAlerte: Number(e.target.value) })} 
                        className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-ink-light mb-1.5">Unité</label>
                      <input 
                        type="text" 
                        value={formData.unite || ''} 
                        onChange={(e) => setFormData({ ...formData, unite: e.target.value })} 
                        placeholder="L, pcs, kg..."
                        className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ink-light mb-1.5">Prix (Optionnel)</label>
                      <input 
                        type="number" 
                        min="0"
                        value={formData.prix || ''} 
                        onChange={(e) => setFormData({ ...formData, prix: Number(e.target.value) })} 
                        className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500" 
                      />
                    </div>
                  </div>
                </form>
              </div>

              <div className="p-6 pt-4 border-t border-divider shrink-0 flex justify-end gap-3 bg-panel">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 font-medium text-ink-light hover:text-ink transition-colors">Annuler</button>
                <button type="submit" form="prod-form" disabled={createProduit.isPending} className="px-5 py-2 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-xl transition-colors disabled:opacity-70 flex items-center gap-2">
                  {createProduit.isPending ? 'Création...' : 'Créer'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
