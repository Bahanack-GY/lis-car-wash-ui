import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Phone, Mail, Shield, MapPin, Calendar, Loader2,
  Pencil, Save, X, ArrowRightLeft, UserCog, Clock, CheckCircle2, XCircle,
  Car, Award, CalendarDays, TrendingUp, AlertTriangle, Ban, UserX, RotateCcw, ShieldAlert,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts'
import { useUser, useUpdateUser, useTransferStation, useUserPerformance, useAddSanction, useLiftSanction } from '@/api/users'
import { useStations } from '@/api/stations'
import type { Affectation, Sanction, SanctionType } from '@/api/users/types'

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } }
const rise = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } } }

const tooltipStyle = {
  background: 'var(--c-panel)',
  border: '1px solid var(--c-edge)',
  borderRadius: 12,
  color: 'var(--c-ink)',
  fontSize: 13,
  boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
}

const roleCfg: Record<string, { label: string; cls: string }> = {
  super_admin: { label: 'Super Admin', cls: 'bg-grape-wash text-grape border-grape-line' },
  manager: { label: 'Manager', cls: 'bg-grape-wash text-grape border-grape-line' },
  controleur: { label: 'Contrôleur', cls: 'bg-info-wash text-info border-info-line' },
  caissiere: { label: 'Caissière', cls: 'bg-warn-wash text-warn border-warn-line' },
  laveur: { label: 'Laveur', cls: 'bg-accent-wash text-accent-bold border-accent-line' },
}

interface PerfRecord {
  id: number
  date: string
  vehiculesLaves: number
  bonusEstime: number | string
  stationId: number
  station?: { id: number; nom: string }
}

export default function EmployeDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const userId = Number(id) || 0

  const { data: user, isLoading, isError } = useUser(userId)
  const { data: stationsList } = useStations()
  const { data: perfData } = useUserPerformance(userId)
  const updateUser = useUpdateUser()
  const transferStation = useTransferStation()

  const stations = stationsList || []
  const performances: PerfRecord[] = perfData || []

  // Edit state
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({ nom: '', prenom: '', email: '', telephone: '', role: '' as string })

  // Transfer state
  const [transferStationId, setTransferStationId] = useState<number | ''>('')
  const [showTransferConfirm, setShowTransferConfirm] = useState(false)

  // Sanction state
  const addSanction = useAddSanction()
  const liftSanction = useLiftSanction()
  const [showSanctionModal, setShowSanctionModal] = useState(false)
  const [sanctionType, setSanctionType] = useState<SanctionType>('avertissement')
  const [sanctionMotif, setSanctionMotif] = useState('')
  const [showLiftModal, setShowLiftModal] = useState(false)
  const [liftTargetId, setLiftTargetId] = useState<number | null>(null)
  const [liftNote, setLiftNote] = useState('')

  /* ── Performance computed stats ─────────────────── */
  const totalVehicles = useMemo(() =>
    performances.reduce((s, p) => s + (Number(p.vehiculesLaves) || 0), 0), [performances])

  const totalBonus = useMemo(() =>
    performances.reduce((s, p) => s + (Number(p.bonusEstime) || 0), 0), [performances])

  const daysWorked = performances.length

  // Average vehicles per day
  const avgPerDay = daysWorked > 0 ? (totalVehicles / daysWorked).toFixed(1) : '0'

  /* ── Chart: Vehicles washed per month ──────────── */
  const vehiclesPerMonth = useMemo(() => {
    const map = new Map<string, { vehicles: number; bonus: number; days: number }>()
    performances.forEach(p => {
      const d = new Date(p.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const existing = map.get(key) || { vehicles: 0, bonus: 0, days: 0 }
      existing.vehicles += Number(p.vehiculesLaves) || 0
      existing.bonus += Number(p.bonusEstime) || 0
      existing.days += 1
      map.set(key, existing)
    })
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([key, data]) => {
        const [year, month] = key.split('-')
        const label = new Date(Number(year), Number(month) - 1).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
        return { name: label, vehicules: data.vehicles, bonus: Math.round(data.bonus), jours: data.days }
      })
  }, [performances])

  /* ── Chart: Bonus over time ────────────────────── */
  const bonusPerMonth = useMemo(() => {
    return vehiclesPerMonth.map(v => ({ name: v.name, bonus: v.bonus }))
  }, [vehiclesPerMonth])

  const startEditing = () => {
    if (!user) return
    setEditData({
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      telephone: user.telephone || '',
      role: user.role,
    })
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (!user) return
    try {
      await updateUser.mutateAsync({
        id: user.id,
        data: {
          nom: editData.nom,
          prenom: editData.prenom,
          email: editData.email,
          telephone: editData.telephone || undefined,
          role: editData.role as any,
        },
      })
      toast.success('Employé mis à jour avec succès')
      setIsEditing(false)
    } catch {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const handleTransfer = async () => {
    if (!user || !transferStationId) return
    try {
      await transferStation.mutateAsync({
        id: user.id,
        data: { newStationId: Number(transferStationId) },
      })
      toast.success('Transfert effectué avec succès')
      setTransferStationId('')
      setShowTransferConfirm(false)
    } catch {
      toast.error('Erreur lors du transfert')
    }
  }

  const handleAddSanction = async () => {
    if (!user || !sanctionMotif.trim()) return
    try {
      await addSanction.mutateAsync({ id: user.id, data: { type: sanctionType, motif: sanctionMotif.trim() } })
      const labels: Record<SanctionType, string> = { avertissement: 'Avertissement', suspension: 'Suspension', renvoi: 'Renvoi' }
      toast.success(`${labels[sanctionType]} appliqué avec succès`)
      setShowSanctionModal(false)
      setSanctionType('avertissement')
      setSanctionMotif('')
    } catch {
      toast.error("Erreur lors de l'ajout de la sanction")
    }
  }

  const openLiftModal = (sanctionId: number) => {
    setLiftTargetId(sanctionId)
    setLiftNote('')
    setShowLiftModal(true)
  }

  const handleLiftSanction = async () => {
    if (!user || !liftTargetId) return
    try {
      await liftSanction.mutateAsync({ sanctionId: liftTargetId, userId: user.id, data: { noteLevee: liftNote.trim() || undefined } })
      toast.success('Sanction levée avec succès')
      setShowLiftModal(false)
      setLiftTargetId(null)
      setLiftNote('')
    } catch {
      toast.error('Erreur lors de la levée de la sanction')
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
        <p className="text-sm text-ink-muted">Chargement du profil employé...</p>
      </div>
    )
  }

  if (isError || !user) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
        <p className="text-red-500 text-sm">Employé introuvable.</p>
        <button onClick={() => navigate('/employes')} className="text-accent text-sm hover:underline">
          Retour aux employés
        </button>
      </div>
    )
  }

  const initials = ((user.prenom?.[0] || '') + (user.nom?.[0] || '')).toUpperCase()
  const role = roleCfg[user.role] || { label: user.role, cls: 'bg-raised text-ink-muted border-edge' }
  const affectations: Affectation[] = user.affectations || []
  const activeAffectations = affectations.filter(a => a.statut === 'active')
  const currentStation = activeAffectations[0]?.station?.nom
  const sanctions: Sanction[] = user.sanctions || []
  const activeSanctions = sanctions.filter(s => s.statut === 'active')
  const memberSince = new Date(user.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  // Ancienneté calculation
  const months = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30))
  const anciennete = months < 1 ? 'Nouveau' : months < 12 ? `${months} mois` : `${Math.floor(months / 12)} an${Math.floor(months / 12) > 1 ? 's' : ''}`

  const statCards = [
    { label: 'Rôle', value: role.label, icon: Shield, accent: 'bg-grape-500/10 text-grape' },
    { label: 'Station actuelle', value: currentStation || 'Non assigné', icon: MapPin, accent: 'bg-teal-500/10 text-accent' },
    { label: 'Statut', value: user.actif !== false ? 'Actif' : 'Inactif', icon: user.actif !== false ? CheckCircle2 : XCircle, accent: user.actif !== false ? 'bg-emerald-500/10 text-ok' : 'bg-red-500/10 text-red-500' },
    { label: 'Ancienneté', value: anciennete, icon: Clock, accent: 'bg-amber-500/10 text-warn' },
  ]

  const perfCards = [
    { label: 'Jours travaillés', value: daysWorked.toString(), icon: CalendarDays, accent: 'bg-blue-500/10 text-info' },
    { label: 'Véhicules lavés', value: totalVehicles.toLocaleString(), icon: Car, accent: 'bg-teal-500/10 text-accent' },
    { label: 'Bonus total', value: `${Math.round(totalBonus).toLocaleString()} FCFA`, icon: Award, accent: 'bg-emerald-500/10 text-ok' },
    { label: 'Moy. / jour', value: `${avgPerDay} véh.`, icon: TrendingUp, accent: 'bg-amber-500/10 text-warn' },
  ]

  // Stations available for transfer (exclude current)
  const transferableStations = stations.filter(s => !activeAffectations.some(a => a.stationId === s.id))

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      {/* ── Header ──────────────────────────────────────── */}
      <motion.div variants={rise} className="flex items-start gap-4">
        <button
          onClick={() => navigate('/employes')}
          className="p-2 rounded-xl hover:bg-raised transition-colors text-ink-muted hover:text-ink mt-1"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-4 flex-1">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-navy-500 flex items-center justify-center text-white font-heading font-bold text-xl shrink-0 shadow-lg shadow-teal-500/20 uppercase">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="font-heading text-2xl font-bold text-ink">{user.prenom} {user.nom}</h1>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${role.cls}`}>
                <Shield className="w-3 h-3" /> {role.label}
              </span>
              <span className={`w-2.5 h-2.5 rounded-full ${user.actif !== false ? 'bg-emerald-500' : 'bg-red-500'}`} />
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-1.5">
              <span className="text-sm text-ink-faded flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> {user.email}
              </span>
              {user.telephone && (
                <span className="text-sm text-ink-faded flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> {user.telephone}
                </span>
              )}
              <span className="text-xs text-ink-muted flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Membre depuis {memberSince}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Stat cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map(s => {
          const Icon = s.icon
          return (
            <motion.div key={s.label} variants={rise} className="bg-panel border border-edge rounded-2xl p-5 shadow-sm">
              <div className={`p-2.5 rounded-xl w-fit ${s.accent} mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="font-heading text-xl font-bold text-ink">{s.value}</p>
              <p className="text-xs text-ink-faded mt-0.5">{s.label}</p>
            </motion.div>
          )
        })}
      </div>

      {/* ── Performance stat cards ──────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {perfCards.map(s => {
          const Icon = s.icon
          return (
            <motion.div key={s.label} variants={rise} className="bg-panel border border-edge rounded-2xl p-5 shadow-sm">
              <div className={`p-2.5 rounded-xl w-fit ${s.accent} mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="font-heading text-xl font-bold text-ink">{s.value}</p>
              <p className="text-xs text-ink-faded mt-0.5">{s.label}</p>
            </motion.div>
          )
        })}
      </div>

      {/* ── Performance charts ─────────────────────────── */}
      {vehiclesPerMonth.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Vehicles washed per month */}
          <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl p-6 shadow-sm">
            <h3 className="font-heading font-semibold text-ink mb-1">Véhicules lavés</h3>
            <p className="text-sm text-ink-faded mb-4">Performance mensuelle</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={vehiclesPerMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--c-edge)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--c-ink-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--c-ink-muted)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <RechartsTooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number, name: string) => {
                    if (name === 'vehicules') return [`${v} véhicule${v > 1 ? 's' : ''}`, 'Lavés']
                    return [v, name]
                  }}
                />
                <Bar dataKey="vehicules" fill="#33cbcc" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Bonus over time */}
          <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl p-6 shadow-sm">
            <h3 className="font-heading font-semibold text-ink mb-1">Bonus estimé</h3>
            <p className="text-sm text-ink-faded mb-4">Évolution mensuelle (FCFA)</p>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={bonusPerMonth}>
                <defs>
                  <linearGradient id="gBonus" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--c-edge)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--c-ink-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--c-ink-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v: number) => v >= 1000 ? `${v / 1000}k` : String(v)} />
                <RechartsTooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${(v ?? 0).toLocaleString()} FCFA`, 'Bonus']} />
                <Area type="monotone" dataKey="bonus" stroke="#10b981" strokeWidth={2.5} fill="url(#gBonus)" />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      )}

      {/* ── Days worked per month ──────────────────────── */}
      {vehiclesPerMonth.length > 0 && (
        <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl p-6 shadow-sm">
          <h3 className="font-heading font-semibold text-ink mb-1">Jours travaillés</h3>
          <p className="text-sm text-ink-faded mb-4">Nombre de jours de présence par mois</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={vehiclesPerMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--c-edge)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--c-ink-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--c-ink-muted)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
              <RechartsTooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} jour${v > 1 ? 's' : ''}`, 'Travaillés']} />
              <Bar dataKey="jours" fill="#283852" radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* ── Edit section ────────────────────────────────── */}
      <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-heading font-semibold text-ink flex items-center gap-2">
            <UserCog className="w-5 h-5 text-accent" /> Informations
          </h3>
          {!isEditing ? (
            <button
              onClick={startEditing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent-wash rounded-lg transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" /> Modifier
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={cancelEditing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-ink-muted hover:text-ink hover:bg-raised rounded-lg transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={updateUser.isPending}
                className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-teal-500 hover:bg-teal-600 rounded-lg transition-colors disabled:opacity-70"
              >
                <Save className="w-3.5 h-3.5" /> {updateUser.isPending ? 'Sauvegarde...' : 'Enregistrer'}
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-light mb-1.5">Prénom</label>
              <input
                type="text"
                value={editData.prenom}
                onChange={(e) => setEditData({ ...editData, prenom: e.target.value })}
                className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-light mb-1.5">Nom</label>
              <input
                type="text"
                value={editData.nom}
                onChange={(e) => setEditData({ ...editData, nom: e.target.value })}
                className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-light mb-1.5">Email</label>
              <input
                type="email"
                value={editData.email}
                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-light mb-1.5">Téléphone</label>
              <input
                type="text"
                value={editData.telephone}
                onChange={(e) => setEditData({ ...editData, telephone: e.target.value })}
                className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-light mb-1.5">Rôle</label>
              <select
                value={editData.role}
                onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
              >
                <option value="laveur">Laveur</option>
                <option value="caissiere">Caissière</option>
                <option value="controleur">Contrôleur</option>
                <option value="manager">Manager</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'Prénom', value: user.prenom },
              { label: 'Nom', value: user.nom },
              { label: 'Email', value: user.email },
              { label: 'Téléphone', value: user.telephone || '—' },
              { label: 'Rôle', value: role.label },
            ].map(f => (
              <div key={f.label} className="p-3 bg-inset rounded-xl border border-divider">
                <p className="text-xs text-ink-muted mb-0.5">{f.label}</p>
                <p className="text-sm font-medium text-ink">{f.value}</p>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Station transfer (hidden for super_admin) ───── */}
      {user.role !== 'super_admin' && <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl p-6 shadow-sm">
        <h3 className="font-heading font-semibold text-ink flex items-center gap-2 mb-4">
          <ArrowRightLeft className="w-5 h-5 text-accent" /> Affectation station
        </h3>

        <div className="flex items-center gap-3 p-4 bg-inset rounded-xl border border-divider mb-4">
          <MapPin className="w-5 h-5 text-accent shrink-0" />
          <div>
            <p className="text-xs text-ink-muted">Station actuelle</p>
            {activeAffectations.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {activeAffectations.map(a => (
                  <span key={a.id} className="px-2.5 py-1 rounded-lg text-sm font-medium bg-accent-wash text-accent-bold border border-accent-line">
                    {a.station?.nom || `Station #${a.stationId}`}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm font-medium text-ink-faded mt-0.5">Aucune station assignée</p>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={transferStationId}
            onChange={(e) => setTransferStationId(e.target.value ? Number(e.target.value) : '')}
            className="flex-1 px-3 py-2.5 bg-inset border border-outline rounded-xl text-ink text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
          >
            <option value="">— Sélectionner une nouvelle station —</option>
            {transferableStations.map(s => (
              <option key={s.id} value={s.id}>{s.nom} — {s.town}</option>
            ))}
          </select>
          <button
            onClick={() => setShowTransferConfirm(true)}
            disabled={!transferStationId}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/25 hover:shadow-teal-500/35 transition-shadow text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none whitespace-nowrap"
          >
            <ArrowRightLeft className="w-4 h-4" /> Transférer
          </button>
        </div>
      </motion.div>}

      {/* ── Sanctions section (hidden for super_admin) ──── */}
      {user.role !== 'super_admin' && (
        <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-divider flex items-center justify-between">
            <h3 className="font-heading font-semibold text-ink flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" /> Sanctions
              {activeSanctions.length > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                  {activeSanctions.length} active{activeSanctions.length > 1 ? 's' : ''}
                </span>
              )}
            </h3>
            <button
              onClick={() => { setSanctionType('avertissement'); setSanctionMotif(''); setShowSanctionModal(true) }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Sanctionner
            </button>
          </div>

          {sanctions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-ink-faded uppercase tracking-wider bg-inset">
                    <th className="px-6 py-3 font-semibold">Type</th>
                    <th className="px-6 py-3 font-semibold">Motif</th>
                    <th className="px-6 py-3 font-semibold">Date</th>
                    <th className="px-6 py-3 font-semibold">Appliquée par</th>
                    <th className="px-6 py-3 font-semibold">Statut</th>
                    <th className="px-6 py-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sanctions
                    .sort((a, b) => new Date(b.dateDebut).getTime() - new Date(a.dateDebut).getTime())
                    .map((s, i) => {
                      const typeCfg: Record<string, { label: string; icon: typeof AlertTriangle; cls: string }> = {
                        avertissement: { label: 'Avertissement', icon: AlertTriangle, cls: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
                        suspension: { label: 'Suspension', icon: Ban, cls: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
                        renvoi: { label: 'Renvoi', icon: UserX, cls: 'bg-red-500/10 text-red-600 border-red-500/20' },
                      }
                      const tc = typeCfg[s.type] || typeCfg.avertissement
                      const TypeIcon = tc.icon
                      return (
                        <tr key={s.id} className={`border-b border-divider last:border-0 ${i % 2 === 0 ? '' : 'bg-inset/50'} hover:bg-raised/50 transition-colors`}>
                          <td className="px-6 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${tc.cls}`}>
                              <TypeIcon className="w-3 h-3" /> {tc.label}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-ink max-w-[250px] truncate">{s.motif}</td>
                          <td className="px-6 py-3 text-ink whitespace-nowrap">
                            {new Date(s.dateDebut).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                            {s.dateFin && (
                              <span className="text-ink-muted"> → {new Date(s.dateFin).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            )}
                          </td>
                          <td className="px-6 py-3 text-ink-light text-xs">
                            {s.createur ? `${s.createur.prenom} ${s.createur.nom}` : '—'}
                          </td>
                          <td className="px-6 py-3">
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-medium border ${s.statut === 'active'
                              ? 'bg-red-500/10 text-red-600 border-red-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                              }`}>
                              {s.statut === 'active' ? 'Active' : 'Levée'}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-right">
                            {s.statut === 'active' && (
                              <button
                                onClick={() => openLiftModal(s.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors"
                              >
                                <RotateCcw className="w-3 h-3" /> Lever
                              </button>
                            )}
                            {s.statut === 'levee' && s.noteLevee && (
                              <span className="text-xs text-ink-muted italic" title={s.noteLevee}>
                                {s.noteLevee.length > 30 ? s.noteLevee.slice(0, 30) + '…' : s.noteLevee}
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center p-8">
              <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-ink-muted" />
              <p className="text-sm text-ink-muted">Aucune sanction enregistrée</p>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Performance history table ───────────────────── */}
      {performances.length > 0 && (
        <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-divider">
            <h3 className="font-heading font-semibold text-ink flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent" /> Historique des performances ({performances.length} jours)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-faded uppercase tracking-wider bg-inset">
                  <th className="px-6 py-3 font-semibold">Date</th>
                  <th className="px-6 py-3 font-semibold">Station</th>
                  <th className="px-6 py-3 font-semibold text-right">Véhicules</th>
                  <th className="px-6 py-3 font-semibold text-right">Bonus</th>
                </tr>
              </thead>
              <tbody>
                {performances.slice(0, 50).map((p, i) => (
                  <tr key={p.id} className={`border-b border-divider last:border-0 ${i % 2 === 0 ? '' : 'bg-inset/50'} hover:bg-raised/50 transition-colors`}>
                    <td className="px-6 py-3 text-ink whitespace-nowrap">
                      {new Date(p.date).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-3 text-ink">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-ink-muted" />
                        {p.station?.nom || `Station #${p.stationId}`}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-semibold text-ink">
                      {Number(p.vehiculesLaves) || 0}
                    </td>
                    <td className="px-6 py-3 text-right font-semibold text-ok whitespace-nowrap">
                      {Math.round(Number(p.bonusEstime) || 0).toLocaleString()} FCFA
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {performances.length > 50 && (
            <div className="px-6 py-3 text-center text-xs text-ink-muted border-t border-divider">
              Affichage des 50 derniers jours sur {performances.length}
            </div>
          )}
        </motion.div>
      )}

      {/* ── Affectation history ─────────────────────────── */}
      <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-divider">
          <h3 className="font-heading font-semibold text-ink flex items-center gap-2">
            <Clock className="w-5 h-5 text-accent" /> Historique des affectations ({affectations.length})
          </h3>
        </div>
        {affectations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-faded uppercase tracking-wider bg-inset">
                  <th className="px-6 py-3 font-semibold">Station</th>
                  <th className="px-6 py-3 font-semibold">Date début</th>
                  <th className="px-6 py-3 font-semibold">Date fin</th>
                  <th className="px-6 py-3 font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody>
                {affectations
                  .sort((a, b) => new Date(b.dateDebut).getTime() - new Date(a.dateDebut).getTime())
                  .map((a, i) => (
                    <tr key={a.id} className={`border-b border-divider last:border-0 ${i % 2 === 0 ? '' : 'bg-inset/50'} hover:bg-raised/50 transition-colors`}>
                      <td className="px-6 py-3 text-ink font-medium">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-ink-muted" />
                          {a.station?.nom || `Station #${a.stationId}`}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-ink whitespace-nowrap">
                        {new Date(a.dateDebut).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-3 text-ink whitespace-nowrap">
                        {a.dateFin
                          ? new Date(a.dateFin).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-medium border ${a.statut === 'active'
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : 'bg-raised text-ink-muted border-edge'
                          }`}>
                          {a.statut === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center p-8">
            <MapPin className="w-8 h-8 mx-auto mb-2 text-ink-muted" />
            <p className="text-sm text-ink-muted">Aucune affectation enregistrée</p>
          </div>
        )}
      </motion.div>

      {/* ── Transfer confirmation modal ─────────────────── */}
      <AnimatePresence>
        {showTransferConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTransferConfirm(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-panel border border-edge rounded-2xl shadow-xl p-6"
            >
              <h3 className="font-heading font-bold text-lg text-ink flex items-center gap-2 mb-3">
                <ArrowRightLeft className="w-5 h-5 text-accent" /> Confirmer le transfert
              </h3>
              <p className="text-sm text-ink-light mb-1">
                Vous allez transférer <strong>{user.prenom} {user.nom}</strong> vers :
              </p>
              <p className="text-sm font-semibold text-accent mb-4">
                {stations.find(s => s.id === Number(transferStationId))?.nom || 'Nouvelle station'}
              </p>
              <p className="text-xs text-ink-muted mb-6">
                Toutes les affectations actives seront désactivées et une nouvelle affectation sera créée.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowTransferConfirm(false)}
                  className="px-4 py-2 font-medium text-ink-light hover:text-ink transition-colors text-sm"
                >
                  Annuler
                </button>
                <button
                  onClick={handleTransfer}
                  disabled={transferStation.isPending}
                  className="px-5 py-2 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-xl transition-colors disabled:opacity-70 text-sm flex items-center gap-2"
                >
                  {transferStation.isPending ? 'Transfert...' : 'Confirmer le transfert'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Add Sanction modal ────────────────────────────── */}
      <AnimatePresence>
        {showSanctionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSanctionModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-panel border border-edge rounded-2xl shadow-xl p-6"
            >
              <h3 className="font-heading font-bold text-lg text-ink flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-amber-500" /> Ajouter une sanction
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ink-light mb-1.5">Type de sanction</label>
                  <select
                    value={sanctionType}
                    onChange={(e) => setSanctionType(e.target.value as SanctionType)}
                    className="w-full px-3 py-2.5 bg-inset border border-outline rounded-xl text-ink text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
                  >
                    <option value="avertissement">Avertissement</option>
                    <option value="suspension">Suspension</option>
                    <option value="renvoi">Renvoi</option>
                  </select>
                </div>

                {(sanctionType === 'suspension' || sanctionType === 'renvoi') && (
                  <div className={`flex items-start gap-3 p-3 rounded-xl border ${sanctionType === 'renvoi' ? 'bg-red-500/5 border-red-500/20' : 'bg-orange-500/5 border-orange-500/20'}`}>
                    {sanctionType === 'renvoi' ? <UserX className="w-5 h-5 text-red-500 shrink-0 mt-0.5" /> : <Ban className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />}
                    <div className="text-xs">
                      <p className={`font-semibold ${sanctionType === 'renvoi' ? 'text-red-600' : 'text-orange-600'}`}>
                        {sanctionType === 'suspension' ? "L'employé sera suspendu" : "L'employé sera renvoyé"}
                      </p>
                      <p className="text-ink-muted mt-0.5">
                        {sanctionType === 'suspension'
                          ? 'Son accès au système sera immédiatement bloqué.'
                          : 'Son accès sera bloqué et toutes ses affectations seront désactivées.'}
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-ink-light mb-1.5">Motif</label>
                  <textarea
                    value={sanctionMotif}
                    onChange={(e) => setSanctionMotif(e.target.value)}
                    placeholder="Décrivez la raison de la sanction..."
                    rows={3}
                    className="w-full px-3 py-2.5 bg-inset border border-outline rounded-xl text-ink text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowSanctionModal(false)}
                  className="px-4 py-2 font-medium text-ink-light hover:text-ink transition-colors text-sm"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddSanction}
                  disabled={!sanctionMotif.trim() || addSanction.isPending}
                  className={`px-5 py-2 text-white font-medium rounded-xl transition-colors disabled:opacity-70 text-sm flex items-center gap-2 ${
                    sanctionType === 'renvoi'
                      ? 'bg-red-500 hover:bg-red-600'
                      : sanctionType === 'suspension'
                        ? 'bg-orange-500 hover:bg-orange-600'
                        : 'bg-amber-500 hover:bg-amber-600'
                  }`}
                >
                  {addSanction.isPending ? 'Application...' : 'Appliquer la sanction'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Lift Sanction modal ───────────────────────────── */}
      <AnimatePresence>
        {showLiftModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLiftModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-panel border border-edge rounded-2xl shadow-xl p-6"
            >
              <h3 className="font-heading font-bold text-lg text-ink flex items-center gap-2 mb-3">
                <RotateCcw className="w-5 h-5 text-emerald-500" /> Lever la sanction
              </h3>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 mb-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-xs text-ink-muted">
                  Si cette sanction bloquait l'accès de l'employé et qu'il n'a pas d'autre sanction active bloquante, son accès sera rétabli.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-light mb-1.5">Note (optionnelle)</label>
                <textarea
                  value={liftNote}
                  onChange={(e) => setLiftNote(e.target.value)}
                  placeholder="Raison de la levée de sanction..."
                  rows={3}
                  className="w-full px-3 py-2.5 bg-inset border border-outline rounded-xl text-ink text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowLiftModal(false)}
                  className="px-4 py-2 font-medium text-ink-light hover:text-ink transition-colors text-sm"
                >
                  Annuler
                </button>
                <button
                  onClick={handleLiftSanction}
                  disabled={liftSanction.isPending}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors disabled:opacity-70 text-sm flex items-center gap-2"
                >
                  {liftSanction.isPending ? 'Traitement...' : 'Lever la sanction'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
