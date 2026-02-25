import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Droplets,
  User,
  ClipboardList,
  Users,
  Printer,
  ChevronLeft,
  ChevronRight,
  Search,
  Check,
  Phone,
  Sparkles,
  Zap,
  ShieldCheck,
  X,
  Car,
  Plus,
} from 'lucide-react'
import Logo from '@/assets/Logo.png'

import { useWashTypes } from '@/api/wash-types'
import { useExtras } from '@/api/extras'
import { useClients, useCreateClient, useCreateVehicle, useClientVehicles } from '@/api/clients'
import type { Vehicle } from '@/api/clients'
import { useUsers } from '@/api/users'
import { useCreateNouveauLavage } from '@/api/fiches-piste'
import { useCoupons } from '@/api/coupons'
import { useAuth } from '@/contexts/AuthContext'

/* ================================================================
   ICONS MAPPING
   ================================================================ */
// We dynamically assign an icon based on names since DB won't have it
const getWashIconAndGradient = (name: string) => {
  const n = name.toLowerCase()
  if (n.includes('express')) return { icon: Zap, gradient: 'from-sky-500/20 to-sky-600/10' }
  if (n.includes('premium')) return { icon: Sparkles, gradient: 'from-teal-500/20 to-teal-600/10' }
  if (n.includes('complet')) return { icon: ShieldCheck, gradient: 'from-purple-500/20 to-purple-600/10' }
  return { icon: Droplets, gradient: 'from-blue-500/20 to-blue-600/10' }
}

const DAMAGE_OPTIONS = [
  'Rayures existantes',
  'Bosses / enfoncements',
  'Pare-chocs endommagé',
  'Rétroviseur fêlé',
  'Vitre fissurée',
  'Pneu(s) usé(s)',
  'Peinture écaillée',
  'Antenne manquante',
]

const VEHICLE_TYPES = ['Berline', 'SUV', 'Citadine', 'Pick-up', 'Utilitaire', 'Monospace']

const STEPS = [
  { label: 'Service', icon: Droplets },
  { label: 'Client', icon: User },
  { label: 'Inspection', icon: ClipboardList },
  { label: 'Laveurs', icon: Users },
  { label: 'Coupon', icon: Printer },
]

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 320 : -320, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -320 : 320, opacity: 0 }),
}

export default function NouveauLavage() {
  const navigate = useNavigate()
  const { selectedStationId } = useAuth()

  /* ================================================================
     QUERIES & MUTATIONS
     ================================================================ */
  const { data: washTypesData } = useWashTypes(selectedStationId ? { stationId: selectedStationId } : undefined)
  const { data: extrasData } = useExtras(selectedStationId ? { stationId: selectedStationId } : undefined)
  const { data: clientsData } = useClients(selectedStationId ? { stationId: selectedStationId } : undefined)
  const { data: usersData } = useUsers(selectedStationId ? { stationId: selectedStationId } : undefined)
  const createClient = useCreateClient()
  const createVehicle = useCreateVehicle()
  const createLavage = useCreateNouveauLavage()

  const { data: couponsData } = useCoupons()

  const washTypes = washTypesData || []
  const availableExtras = extrasData || []
  const clientsList = clientsData?.data || []
  // Only employees/washers
  const washersList = (usersData?.data || []).filter(u => u.role === 'laveur')

  // Washers currently assigned to a "washing" coupon
  const busyWasherIds = useMemo(() => {
    const ids = new Set<number>()
    const coupons = couponsData?.data || []
    for (const c of coupons) {
      if (c.statut === 'washing' && c.washers) {
        for (const w of c.washers) ids.add(w.id)
      }
    }
    return ids
  }, [couponsData])

  // ── Navigation ───────────────────────────────────
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(0)
  const goTo = (next: number) => {
    setDirection(next > step ? 1 : -1)
    setStep(next)
  }

  // ── Step 0 — Service ─────────────────────────────
  const [washId, setWashId] = useState<number | null>(null)
  const [selectedExtrasIds, setSelectedExtrasIds] = useState<number[]>([])
  const toggleExtra = (id: number) => setSelectedExtrasIds((p) => (p.includes(id) ? p.filter((e) => e !== id) : [...p, id]))

  // ── Step 1 — Client ──────────────────────────────
  const [isNewClient, setIsNewClient] = useState(false)
  const [clientSearch, setClientSearch] = useState('')
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null)

  // New Client Form
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newEmail, setNewEmail] = useState('')

  // Vehicle — existing vs new
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null)
  const [isNewVehicle, setIsNewVehicle] = useState(false)

  // New Vehicle Form
  const [vPlate, setVPlate] = useState('')
  const [vModel, setVModel] = useState('')
  const [vBrand, setVBrand] = useState('')
  const [vColor, setVColor] = useState('')
  const [vType, setVType] = useState('Berline')

  // Fetch vehicles for selected client
  const { data: clientVehicles, isLoading: vehiclesLoading } = useClientVehicles(selectedClientId ?? 0)

  // Auto-switch vehicle mode when client's vehicles load
  useEffect(() => {
    if (!selectedClientId || isNewClient) {
      // New client → always new vehicle
      setIsNewVehicle(true)
      setSelectedVehicleId(null)
      return
    }
    if (vehiclesLoading) return
    const vehicles = clientVehicles || []
    if (vehicles.length > 0) {
      setIsNewVehicle(false)
      setSelectedVehicleId(vehicles[0].id)
    } else {
      setIsNewVehicle(true)
      setSelectedVehicleId(null)
    }
  }, [selectedClientId, isNewClient, clientVehicles, vehiclesLoading])

  // ── Step 4 — Coupon result ─────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [createdCoupon, setCreatedCoupon] = useState<any | null>(null)

  // ── Step 2 — Inspection ──────────────────────────
  const [inspNotes, setInspNotes] = useState('')
  const [damages, setDamages] = useState<string[]>([])
  const toggleDamage = (d: string) => setDamages((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d]))

  // ── Step 3 — Washers ─────────────────────────────
  // Multiple washers might need a specific relation, but for FichePiste it takes 1 controller if any according to DTO. 
  // We will map "pickedWashers" to "controleurId" for now as single for simplicity, or just as UI mock for now until DB supports multiple laveurs
  const [pickedWasherId, setPickedWasherId] = useState<number | null>(null)
  const [busyWasherConfirm, setBusyWasherConfirm] = useState<number | null>(null) // washer ID pending confirmation

  // ── Derived data ─────────────────────────────────
  const wash = washTypes.find((w) => w.id === washId) ?? null
  const selectedExtras = availableExtras.filter((e) => selectedExtrasIds.includes(e.id))
  
  const total = useMemo(() => {
    let s = wash?.prixBase ?? 0
    selectedExtras.forEach((e) => (s += (e.prix || 0)))
    return s
  }, [wash, selectedExtras])

  const selectedClientRecord = clientsList.find(c => c.id === selectedClientId)
  const clientNameDisplay = isNewClient ? newName : selectedClientRecord?.nom ?? ''
  const clientPhoneDisplay = isNewClient ? newPhone : selectedClientRecord?.contact ?? ''

  const now = new Date()
  const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  const filteredClients = clientsList.filter(
    (c) =>
      c.nom.toLowerCase().includes(clientSearch.toLowerCase()) ||
      (c.contact || '').includes(clientSearch),
  )

  // ── Validation ───────────────────────────────────
  const canProceed = useMemo(() => {
    switch (step) {
      case 0: return washId !== null
      case 1: {
        const clientOk = isNewClient ? (newName.trim() !== '' && newPhone.trim() !== '') : selectedClientId !== null
        const vehicleOk = isNewVehicle ? vPlate.trim() !== '' : selectedVehicleId !== null
        return clientOk && vehicleOk
      }
      case 2: return true
      case 3: return pickedWasherId !== null
      default: return false
    }
  }, [step, washId, isNewClient, newName, newPhone, selectedClientId, pickedWasherId, vPlate, isNewVehicle, selectedVehicleId])

  // ── Derived: selected existing vehicle record ───
  const selectedVehicleRecord = (clientVehicles || []).find((v: Vehicle) => v.id === selectedVehicleId)

  // Vehicle display — use selected existing vehicle or the new vehicle form fields
  const vehicleBrandDisplay = isNewVehicle ? (vBrand || 'Inconnu') : (selectedVehicleRecord?.brand || 'Inconnu')
  const vehicleModelDisplay = isNewVehicle ? vModel : (selectedVehicleRecord?.modele || '')
  const vehiclePlateDisplay = isNewVehicle ? vPlate : (selectedVehicleRecord?.immatriculation || '')
  const vehicleColorDisplay = isNewVehicle ? vColor : (selectedVehicleRecord?.color || '')

  // ── Confirm ──────────────────────────────────────
  const handleConfirm = async () => {
    try {
      let finalClientId = selectedClientId

      if (isNewClient && newName && newPhone) {
        const newC = await createClient.mutateAsync({
          nom: newName,
          contact: newPhone,
          email: newEmail,
          stationId: selectedStationId || undefined,
        })
        finalClientId = newC.id
      }

      // Use existing vehicle or create a new one
      let finalVehicleId = selectedVehicleId
      if (isNewVehicle) {
        const vehicle = await createVehicle.mutateAsync({
          id: Number(finalClientId),
          data: {
            immatriculation: vPlate,
            modele: vModel || undefined,
            brand: vBrand || undefined,
            color: vColor || undefined,
            type: vType || undefined,
          },
        })
        finalVehicleId = vehicle.id
      }

      const etatLieuStr = [...damages, inspNotes].filter(Boolean).join('; ')

      // Create Fiche + Coupon in one shot
      const result = await createLavage.mutateAsync({
        stationId: selectedStationId!,
        clientId: Number(finalClientId),
        vehicleId: Number(finalVehicleId),
        typeLavageId: Number(washId),
        controleurId: pickedWasherId ? Number(pickedWasherId) : undefined,
        extrasIds: selectedExtrasIds,
        washerIds: pickedWasherId ? [Number(pickedWasherId)] : [],
        date: new Date().toISOString().split('T')[0],
        etatLieu: etatLieuStr,
      })

      // Stay on step 4 — show real coupon number
      setCreatedCoupon(result)
    } catch (err) {
      console.error("Failed to submit Fiche de piste flow", err)
      alert("Erreur lors de la création")
    }
  }

  const inputCls = 'w-full px-4 py-2.5 bg-inset border border-outline rounded-xl text-sm text-ink placeholder-ink-muted outline-none focus:border-accent-ring focus:ring-2 focus:ring-teal-500/15 transition-all'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink">Nouveau Lavage</h1>
          <p className="text-ink-faded text-sm mt-1">Créer un coupon de lavage en 5 étapes</p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-ink-faded hover:text-ink transition-colors"
        >
          <X className="w-4 h-4" /> Annuler
        </button>
      </div>

      <div className="bg-panel border border-edge shadow-sm rounded-2xl px-6 py-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {STEPS.map((s, i) => {
            const done = i < step
            const active = i === step
            return (
              <div key={s.label} className="flex items-center flex-1 last:flex-initial">
                <button
                  onClick={() => i < step && goTo(i)}
                  className={`
                    relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 flex-shrink-0
                    ${done ? 'bg-teal-500 border-teal-500 text-white cursor-pointer' : ''}
                    ${active ? 'border-teal-500 bg-accent-wash text-accent' : ''}
                    ${!done && !active ? 'border-edge bg-raised text-ink-muted' : ''}
                  `}
                >
                  {done ? <Check className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
                </button>
                <span
                  className={`absolute mt-14 text-[11px] font-medium whitespace-nowrap hidden sm:block ${
                    active ? 'text-accent' : done ? 'text-ink-light' : 'text-ink-muted'
                  }`}
                  style={{ transform: 'translateX(-25%)' }}
                >
                  {s.label}
                </span>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 h-[2px] mx-2">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        i < step ? 'bg-teal-500' : 'bg-dim'
                      }`}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <div className="bg-panel border border-edge shadow-sm rounded-2xl p-6 min-h-[420px] relative overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                {step === 0 && (
                  <div className="space-y-6">
                    <h3 className="font-heading font-semibold text-ink text-lg">Choisir le type de lavage</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {washTypes.map((w) => {
                        const sel = washId === w.id
                        const { icon: WashIcon, gradient } = getWashIconAndGradient(w.nom)
                        return (
                          <button
                            key={w.id}
                            onClick={() => setWashId(w.id)}
                            className={`relative text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                              sel
                                ? 'border-teal-500 bg-accent-wash'
                                : 'border-edge bg-inset hover:border-outline'
                            }`}
                          >
                            {sel && (
                              <div className="absolute top-3 right-3 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-3`}>
                              <WashIcon className="w-5 h-5 text-accent" />
                            </div>
                            <p className="font-heading font-semibold text-ink">{w.nom}</p>
                            <p className="text-xs text-ink-faded mt-0.5 min-h-[32px]">{w.particularites}</p>
                            <div className="flex items-center justify-between mt-3 pt-2 border-t border-divider">
                              <span className="text-sm font-bold text-accent">{w.prixBase.toLocaleString()} FCFA</span>
                              <span className="text-xs text-ink-muted">{w.dureeEstimee} min</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>

                    <div>
                      <h4 className="font-heading font-medium text-ink text-sm mb-3">Services additionnels</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {availableExtras.map((e) => {
                          const on = selectedExtrasIds.includes(e.id)
                          return (
                            <button
                              key={e.id}
                              onClick={() => toggleExtra(e.id)}
                              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left text-sm transition-all ${
                                on
                                  ? 'border-accent-ring bg-accent-wash text-accent-bold'
                                  : 'border-edge text-ink-faded hover:border-outline'
                              }`}
                            >
                              <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                                on ? 'bg-teal-500 border-teal-500' : 'border-outline'
                              }`}>
                                {on && <Check className="w-2.5 h-2.5 text-white" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="block truncate">{e.nom}</span>
                                <span className="text-xs text-ink-muted">{e.prix?.toLocaleString()} F</span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-5">
                    <div className="flex items-center gap-3">
                      <h3 className="font-heading font-semibold text-ink text-lg">Client</h3>
                      <div className="flex bg-inset rounded-lg p-0.5">
                        <button
                          onClick={() => setIsNewClient(false)}
                          className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                            !isNewClient ? 'bg-accent-wash text-accent' : 'text-ink-faded'
                          }`}
                        >
                          Existant
                        </button>
                        <button
                          onClick={() => { setIsNewClient(true); setSelectedClientId(null); }}
                          className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                            isNewClient ? 'bg-accent-wash text-accent' : 'text-ink-faded'
                          }`}
                        >
                          Nouveau
                        </button>
                      </div>
                    </div>

                    {!isNewClient ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 bg-inset border border-outline rounded-xl px-4 py-2.5 focus-within:border-teal-500/40 transition-colors">
                          <Search className="w-4 h-4 text-ink-muted" />
                          <input
                            value={clientSearch}
                            onChange={(e) => setClientSearch(e.target.value)}
                            placeholder="Rechercher par nom ou téléphone..."
                            className="bg-transparent text-sm text-ink placeholder-ink-muted outline-none flex-1"
                          />
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                          {filteredClients.map((c) => {
                            const sel = selectedClientId === c.id
                            return (
                              <button
                                key={c.id}
                                onClick={() => setSelectedClientId(c.id)}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                                  sel ? 'bg-accent-wash border border-accent-line' : 'bg-inset border border-divider hover:border-outline'
                                }`}
                              >
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500/80 to-navy-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                                  {c.nom.split(' ').map((n) => n[0]).join('')}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-ink">{c.nom}</p>
                                  <p className="text-xs text-ink-muted">{c.contact}</p>
                                </div>
                                {sel && <Check className="w-4 h-4 text-accent" />}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-ink-light mb-1.5">Nom complet *</label>
                          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nom et prénom" className={inputCls} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-ink-light mb-1.5">Téléphone *</label>
                          <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+221 7X XXX XXXX" className={inputCls} />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-ink-light mb-1.5">Email</label>
                          <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@exemple.com" className={inputCls} />
                        </div>
                      </div>
                    )}

                    <div className="pt-4 border-t border-divider">
                      <div className="flex items-center gap-3 mb-3">
                        <h4 className="font-heading font-medium text-ink text-sm">Véhicule</h4>
                        {/* Toggle only when client has existing vehicles */}
                        {!isNewClient && selectedClientId && (clientVehicles || []).length > 0 && (
                          <div className="flex bg-inset rounded-lg p-0.5">
                            <button
                              onClick={() => { setIsNewVehicle(false); setSelectedVehicleId((clientVehicles || [])[0]?.id ?? null) }}
                              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                                !isNewVehicle ? 'bg-accent-wash text-accent' : 'text-ink-faded'
                              }`}
                            >
                              Existant
                            </button>
                            <button
                              onClick={() => { setIsNewVehicle(true); setSelectedVehicleId(null) }}
                              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                                isNewVehicle ? 'bg-accent-wash text-accent' : 'text-ink-faded'
                              }`}
                            >
                              Nouveau
                            </button>
                          </div>
                        )}
                      </div>

                      {!isNewVehicle && !isNewClient && selectedClientId ? (
                        <div className="space-y-2">
                          {vehiclesLoading ? (
                            <p className="text-sm text-ink-muted py-4 text-center">Chargement des véhicules...</p>
                          ) : (clientVehicles || []).length > 0 ? (
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                              {(clientVehicles || []).map((v: Vehicle) => {
                                const sel = selectedVehicleId === v.id
                                return (
                                  <button
                                    key={v.id}
                                    onClick={() => setSelectedVehicleId(v.id)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                                      sel ? 'bg-accent-wash border border-accent-line' : 'bg-inset border border-divider hover:border-outline'
                                    }`}
                                  >
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                                      sel ? 'bg-teal-500 text-white' : 'bg-dim text-ink-muted'
                                    }`}>
                                      <Car className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-ink">{v.immatriculation}</p>
                                      <p className="text-xs text-ink-muted">{[v.brand, v.modele, v.color].filter(Boolean).join(' — ') || 'Aucun détail'}</p>
                                    </div>
                                    {sel && <Check className="w-4 h-4 text-accent" />}
                                  </button>
                                )
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-ink-muted py-4 text-center">Aucun véhicule enregistré</p>
                          )}
                          {/* Quick add button */}
                          <button
                            onClick={() => { setIsNewVehicle(true); setSelectedVehicleId(null) }}
                            className="flex items-center gap-2 text-sm text-accent hover:text-accent-bold transition-colors mt-2"
                          >
                            <Plus className="w-4 h-4" /> Ajouter un nouveau véhicule
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-ink-light mb-1.5">Immatriculation *</label>
                            <input value={vPlate} onChange={(e) => setVPlate(e.target.value)} placeholder="DK-0000-XX" className={inputCls} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-ink-light mb-1.5">Marque</label>
                            <input value={vBrand} onChange={(e) => setVBrand(e.target.value)} placeholder="Toyota" className={inputCls} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-ink-light mb-1.5">Modèle</label>
                            <input value={vModel} onChange={(e) => setVModel(e.target.value)} placeholder="Camry" className={inputCls} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-ink-light mb-1.5">Couleur</label>
                            <input value={vColor} onChange={(e) => setVColor(e.target.value)} placeholder="Gris" className={inputCls} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-ink-light mb-1.5">Type</label>
                            <select value={vType} onChange={(e) => setVType(e.target.value)} className={inputCls}>
                              {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-5">
                    <h3 className="font-heading font-semibold text-ink text-lg">Fiche de Piste — Inspection</h3>
                    <p className="text-sm text-ink-faded">
                      Relevez l'état du véhicule avant le lavage.
                    </p>

                    <div>
                      <p className="text-xs font-medium text-ink-light mb-2">Dommages constatés</p>
                      <div className="grid grid-cols-2 gap-2">
                        {DAMAGE_OPTIONS.map((d) => {
                          const on = damages.includes(d)
                          return (
                            <button
                              key={d}
                              onClick={() => toggleDamage(d)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm text-left transition-all ${
                                on
                                  ? 'border-warn-line bg-warn-wash text-warn'
                                  : 'border-edge text-ink-faded hover:border-outline'
                              }`}
                            >
                              <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                                on ? 'bg-amber-500 border-amber-500' : 'border-outline'
                              }`}>
                                {on && <Check className="w-2.5 h-2.5 text-white" />}
                              </div>
                              {d}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-ink-light mb-1.5">Notes supplémentaires</label>
                      <textarea
                        value={inspNotes}
                        onChange={(e) => setInspNotes(e.target.value)}
                        rows={3}
                        placeholder="Décrivez l'état général du véhicule, sinistres visibles..."
                        className={`${inputCls} resize-none`}
                      />
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-5">
                    <h3 className="font-heading font-semibold text-ink text-lg">Affecter un laveur</h3>
                    <p className="text-sm text-ink-faded">
                      Sélectionnez un employé responsable.
                    </p>

                    <div className="space-y-2 pr-2">
                      {washersList.map((w) => {
                        const sel = pickedWasherId === w.id
                        const isBusy = busyWasherIds.has(w.id)
                        return (
                          <button
                            key={w.id}
                            onClick={() => {
                              if (isBusy && !sel) {
                                setBusyWasherConfirm(w.id)
                              } else {
                                setPickedWasherId(w.id)
                              }
                            }}
                            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                              sel
                                ? 'border-teal-500 bg-accent-wash'
                                : isBusy
                                  ? 'border-warn-line bg-warn-wash/30 hover:border-warn'
                                  : 'border-edge bg-inset hover:border-outline'
                            }`}
                          >
                            <div className={`w-11 h-11 rounded-full flex items-center justify-center font-heading font-bold text-sm flex-shrink-0 ${
                              sel ? 'bg-teal-500 text-white' : 'bg-gradient-to-br from-teal-500/60 to-navy-500 text-white'
                            }`}>
                              {sel ? <Check className="w-5 h-5" /> : w.nom[0] + (w.nom.split(' ')[1]?.[0] || '')}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-ink">{w.nom}</p>
                              <p className={`text-xs mt-0.5 ${isBusy ? 'text-warn font-medium' : 'text-ink-muted'}`}>
                                {isBusy ? 'Lavage en cours' : 'Laveur'}
                              </p>
                            </div>
                            <div className="flex-shrink-0">
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                                sel ? 'bg-teal-500/20 text-accent-bold' : isBusy ? 'bg-warn-wash text-warn' : 'bg-emerald-500/10 text-ok'
                              }`}>
                                {sel ? 'Assigné' : isBusy ? 'Occupé' : 'Sélectionner'}
                              </span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-5">
                    <h3 className="font-heading font-semibold text-ink text-lg">Coupon de lavage</h3>
                    <p className="text-sm text-ink-faded">
                      {createdCoupon ? 'Coupon créé avec succès ! Vous pouvez l\'imprimer.' : 'Vérifiez les informations puis confirmez le lavage.'}
                    </p>

                    <div id="coupon-print" className="bg-white text-gray-900 rounded-2xl p-8 max-w-md mx-auto shadow-2xl shadow-black/30">
                      <div className="text-center border-b-2 border-dashed border-gray-300 pb-4 mb-4">
                        <img src={Logo} alt="LIS" className="w-14 h-14 mx-auto mb-2 print-logo" />
                        <h2 className="font-heading font-bold text-lg text-gray-900">LIS CAR WASH</h2>
                        <p className="text-xs text-gray-500">Dakar Centre — +221 33 820 1234</p>
                      </div>

                      <div className="text-center bg-gray-100 rounded-xl py-3 mb-4">
                        {createdCoupon ? (
                          <>
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Coupon N°</p>
                            <p className="font-heading font-bold text-2xl text-gray-900">{createdCoupon.numero}</p>
                          </>
                        ) : (
                          <>
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Coupon — Aperçu</p>
                            <p className="font-heading font-bold text-2xl text-gray-900">CPN-XXXX</p>
                          </>
                        )}
                        <p className="text-xs text-gray-500 mt-0.5">{dateStr} — {timeStr}</p>
                      </div>

                      <div className="mb-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Client</p>
                        <p className="text-sm font-semibold text-gray-900">{clientNameDisplay}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3" /> {clientPhoneDisplay}</p>
                      </div>

                      <div className="mb-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Véhicule</p>
                        <p className="text-sm font-semibold text-gray-900">{vehicleBrandDisplay} {vehicleModelDisplay}</p>
                        <p className="text-xs text-gray-500">{vehiclePlateDisplay}{vehicleColorDisplay ? ` — ${vehicleColorDisplay}` : ''}</p>
                      </div>

                      <div className="border-t border-dashed border-gray-300 pt-3 mb-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Services</p>
                        {wash && (
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-gray-900">{wash.nom}</span>
                            <span className="text-gray-700">{wash.prixBase.toLocaleString()} F</span>
                          </div>
                        )}
                        {selectedExtras.map((e) => (
                          <div key={e.id} className="flex justify-between text-sm mb-0.5 pl-3">
                            <span className="text-gray-600">+ {e.nom}</span>
                            <span className="text-gray-500">{e.prix?.toLocaleString()} F</span>
                          </div>
                        ))}
                      </div>

                      <div className="border-t-2 border-gray-900 pt-2 mb-4">
                        <div className="flex justify-between">
                          <span className="font-heading font-bold text-lg text-gray-900">TOTAL</span>
                          <span className="font-heading font-bold text-lg text-gray-900">{total.toLocaleString()} FCFA</span>
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Laveurs assignés</p>
                        <div className="space-y-1">
                          {washersList.filter((w) => pickedWasherId === w.id).map((w) => (
                            <p key={w.id} className="text-sm text-gray-700">• {w.nom}</p>
                          ))}
                        </div>
                      </div>

                      {(damages.length > 0 || inspNotes) && (
                        <div className="mb-4 bg-gray-100 rounded-xl p-3">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">État des lieux</p>
                          {damages.length > 0 && (
                            <p className="text-xs text-gray-600">{damages.join(', ')}</p>
                          )}
                          {inspNotes && <p className="text-xs text-gray-600 mt-0.5">{inspNotes}</p>}
                        </div>
                      )}

                      <div className="border-t border-dashed border-gray-300 pt-3 text-center">
                        <p className="text-xs text-gray-400">Merci de votre confiance !</p>
                        <p className="text-[10px] text-gray-300 mt-0.5">www.liscarwash.com</p>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center justify-between mt-8 pt-4 border-t border-divider">
              {!createdCoupon && (
                <button
                  onClick={() => (step > 0 ? goTo(step - 1) : navigate(-1))}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm text-ink-faded hover:text-ink hover:bg-raised transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  {step > 0 ? 'Précédent' : 'Retour'}
                </button>
              )}

              {step < 4 ? (
                <button
                  onClick={() => canProceed && goTo(step + 1)}
                  disabled={!canProceed}
                  className={`flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    canProceed
                      ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30'
                      : 'bg-dim/50 text-ink-muted cursor-not-allowed'
                  }`}
                >
                  Suivant <ChevronRight className="w-4 h-4" />
                </button>
              ) : createdCoupon ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const logoImg = document.querySelector('#coupon-print img') as HTMLImageElement | null
                      const logoSrc = logoImg?.src || ''
                      const washerName = washersList.find(w => w.id === pickedWasherId)?.nom || ''
                      const extrasHtml = selectedExtras.map(e =>
                        `<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:2px;padding-left:12px;color:#4b5563">
                          <span>+ ${e.nom}</span><span style="color:#6b7280">${e.prix?.toLocaleString()} F</span>
                        </div>`
                      ).join('')
                      const etatHtml = (damages.length > 0 || inspNotes) ? `
                        <div style="margin-bottom:16px;background:#f3f4f6;border-radius:12px;padding:12px">
                          <p style="font-size:9px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 4px">État des lieux</p>
                          ${damages.length > 0 ? `<p style="font-size:11px;color:#4b5563;margin:0">${damages.join(', ')}</p>` : ''}
                          ${inspNotes ? `<p style="font-size:11px;color:#4b5563;margin:2px 0 0">${inspNotes}</p>` : ''}
                        </div>` : ''

                      const printWindow = window.open('', '_blank')
                      if (!printWindow) return
                      printWindow.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Coupon ${createdCoupon.numero}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Inter',system-ui,sans-serif; background:#f8f9fa; display:flex; justify-content:center; padding:24px 0; }
  .coupon { background:#fff; border-radius:16px; padding:32px; max-width:380px; width:100%; box-shadow:0 4px 24px rgba(0,0,0,0.08); }
  .header { text-align:center; border-bottom:2px dashed #d1d5db; padding-bottom:16px; margin-bottom:16px; }
  .header img { width:56px; height:56px; margin:0 auto 8px; display:block; }
  .header h2 { font-size:16px; font-weight:700; color:#111827; }
  .header .sub { font-size:11px; color:#6b7280; margin-top:2px; }
  .numero-box { text-align:center; background:#f3f4f6; border-radius:12px; padding:12px; margin-bottom:16px; }
  .numero-box .label { font-size:10px; color:#6b7280; text-transform:uppercase; letter-spacing:0.08em; }
  .numero-box .num { font-size:22px; font-weight:700; color:#111827; margin:2px 0; }
  .numero-box .date { font-size:11px; color:#6b7280; }
  .section { margin-bottom:16px; }
  .section-label { font-size:9px; font-weight:700; color:#9ca3af; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:4px; }
  .section .name { font-size:13px; font-weight:600; color:#111827; }
  .section .detail { font-size:11px; color:#6b7280; margin-top:1px; }
  .section .detail svg { width:12px; height:12px; vertical-align:middle; margin-right:2px; }
  .services { border-top:1px dashed #d1d5db; padding-top:12px; margin-bottom:12px; }
  .services .section-label { margin-bottom:8px; }
  .svc-row { display:flex; justify-content:space-between; font-size:13px; margin-bottom:4px; }
  .svc-row .svc-name { font-weight:500; color:#111827; }
  .svc-row .svc-price { color:#374151; }
  .total-row { border-top:2px solid #111827; padding-top:8px; margin-bottom:16px; display:flex; justify-content:space-between; }
  .total-row span { font-size:16px; font-weight:700; color:#111827; }
  .washers .washer { font-size:13px; color:#374151; margin-bottom:2px; }
  .etat { margin-bottom:16px; background:#f3f4f6; border-radius:12px; padding:12px; }
  .etat .section-label { margin-bottom:4px; }
  .etat p { font-size:11px; color:#4b5563; }
  .footer { border-top:1px dashed #d1d5db; padding-top:12px; text-align:center; }
  .footer .thanks { font-size:11px; color:#9ca3af; }
  .footer .url { font-size:9px; color:#d1d5db; margin-top:2px; }
  @media print { body { background:#fff; padding:0; } .coupon { box-shadow:none; padding:20px; } }
</style>
</head><body>
<div class="coupon">
  <div class="header">
    <img src="${logoSrc}" alt="LIS" />
    <h2>LIS CAR WASH</h2>
    <p class="sub">Dakar Centre — +221 33 820 1234</p>
  </div>
  <div class="numero-box">
    <p class="label">Coupon N°</p>
    <p class="num">${createdCoupon.numero}</p>
    <p class="date">${dateStr} — ${timeStr}</p>
  </div>
  <div class="section">
    <p class="section-label">Client</p>
    <p class="name">${clientNameDisplay}</p>
    <p class="detail"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg> ${clientPhoneDisplay}</p>
  </div>
  <div class="section">
    <p class="section-label">Véhicule</p>
    <p class="name">${vehicleBrandDisplay} ${vehicleModelDisplay}</p>
    <p class="detail">${vehiclePlateDisplay}${vehicleColorDisplay ? ` — ${vehicleColorDisplay}` : ''}</p>
  </div>
  <div class="services">
    <p class="section-label">Services</p>
    ${wash ? `<div class="svc-row"><span class="svc-name">${wash.nom}</span><span class="svc-price">${wash.prixBase.toLocaleString()} F</span></div>` : ''}
    ${extrasHtml}
  </div>
  <div class="total-row">
    <span>TOTAL</span>
    <span>${total.toLocaleString()} FCFA</span>
  </div>
  <div class="section washers">
    <p class="section-label">Laveurs assignés</p>
    <p class="washer">• ${washerName}</p>
  </div>
  ${etatHtml}
  <div class="footer">
    <p class="thanks">Merci de votre confiance !</p>
    <p class="url">www.liscarwash.com</p>
  </div>
</div>
</body></html>`)
                      printWindow.document.close()
                      printWindow.focus()
                      printWindow.print()
                    }}
                    className="flex items-center gap-1.5 px-5 py-2.5 border-2 border-teal-500 text-accent rounded-xl text-sm font-semibold hover:bg-accent-wash transition-all"
                  >
                    <Printer className="w-4 h-4" /> Imprimer
                  </button>
                  <button
                    onClick={() => navigate('/coupons')}
                    className="flex items-center gap-1.5 px-6 py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30 transition-all"
                  >
                    Terminer <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleConfirm}
                    disabled={createLavage.isPending || createVehicle.isPending || createClient.isPending}
                    className="flex items-center gap-1.5 px-6 py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30 transition-all disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" /> {(createLavage.isPending || createVehicle.isPending || createClient.isPending) ? 'Enregistrement...' : 'Confirmer le lavage'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="xl:col-span-1">
          <div className="bg-panel border border-edge shadow-sm rounded-2xl p-5 sticky top-6">
            <h3 className="font-heading font-semibold text-ink mb-4">Résumé de la commande</h3>

            {wash ? (
              <div className="mb-4">
                <p className="text-[10px] font-bold text-ink-faded uppercase tracking-widest mb-1.5">Service</p>
                <div className="flex items-center justify-between bg-inset rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink">{wash.nom}</span>
                  </div>
                  <span className="text-sm font-semibold text-accent">{wash.prixBase.toLocaleString()} F</span>
                </div>
                {selectedExtras.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {selectedExtras.map((e) => (
                      <div key={e.id} className="flex justify-between text-xs px-3 py-1.5 text-ink-faded">
                        <span>+ {e.nom}</span>
                        <span>{e.prix?.toLocaleString()} F</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-4 bg-inset/30 rounded-xl px-4 py-6 text-center">
                <Droplets className="w-6 h-6 text-ink-muted mx-auto mb-1" />
                <p className="text-xs text-ink-muted">Aucun service sélectionné</p>
              </div>
            )}

            <div className="mb-4">
              <p className="text-[10px] font-bold text-ink-faded uppercase tracking-widest mb-1.5">Client</p>
              {clientNameDisplay ? (
                <div className="bg-inset rounded-xl px-3 py-2.5">
                  <p className="text-sm font-medium text-ink">{clientNameDisplay}</p>
                  <p className="text-xs text-ink-muted flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3" /> {clientPhoneDisplay}
                  </p>
                </div>
              ) : (
                <div className="bg-inset/30 rounded-xl px-3 py-3 text-center">
                  <p className="text-xs text-ink-muted">Non renseigné</p>
                </div>
              )}
            </div>

            <div className="mb-5">
              <p className="text-[10px] font-bold text-ink-faded uppercase tracking-widest mb-1.5">Laveurs (Contrôleur)</p>
              {pickedWasherId ? (
                <div className="space-y-1">
                  {washersList.filter((w) => pickedWasherId === w.id).map((w) => (
                    <div key={w.id} className="flex items-center gap-2 bg-inset rounded-xl px-3 py-2">
                      <div className="w-6 h-6 rounded-full bg-accent-wash flex items-center justify-center text-[10px] font-bold text-accent-bold">
                        U
                      </div>
                      <span className="text-sm text-ink">{w.nom}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-inset/30 rounded-xl px-3 py-3 text-center">
                  <p className="text-xs text-ink-muted">Non assigné</p>
                </div>
              )}
            </div>

            <div className="border-t border-divider pt-4">
              <div className="flex items-center justify-between">
                <span className="font-heading font-bold text-ink">Total</span>
                <span className="font-heading font-bold text-xl text-accent">{total.toLocaleString()} FCFA</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Busy washer confirmation modal */}
      <AnimatePresence>
        {busyWasherConfirm !== null && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setBusyWasherConfirm(null)}
          >
            <motion.div
              className="bg-panel border border-edge rounded-2xl shadow-2xl p-6 max-w-sm mx-4 w-full"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-full bg-warn-wash flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-warn" />
              </div>
              <h3 className="font-heading font-semibold text-ink text-center mb-2">
                Laveur déjà occupé
              </h3>
              <p className="text-sm text-ink-faded text-center mb-6">
                Ce laveur est déjà dans un lavage en cours. Voulez-vous vraiment lui assigner ce véhicule ?
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setBusyWasherConfirm(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-edge text-sm font-medium text-ink-faded hover:bg-raised transition-colors"
                >
                  Non
                </button>
                <button
                  onClick={() => {
                    setPickedWasherId(busyWasherConfirm)
                    setBusyWasherConfirm(null)
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 text-white text-sm font-semibold shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30 transition-all"
                >
                  Oui, assigner
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
