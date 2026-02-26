import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Phone, Mail, Shield, MapPin, Calendar, Loader2,
  Pencil, Save, X, ArrowRightLeft, UserCog, Clock, CheckCircle2, XCircle,
  Car, Award, CalendarDays, TrendingUp, AlertTriangle, Ban, UserX, RotateCcw, ShieldAlert,
  Banknote, ClipboardList, CreditCard, Hash, ArrowUpCircle, Megaphone, Target,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts'
import { useUser, useUpdateUser, useTransferStation, useUserPerformance, useAddSanction, useLiftSanction, usePromoteUser } from '@/api/users'
import { useStations } from '@/api/stations'
import { useCaisseTransactions } from '@/api/caisse'
import { useFichesPiste } from '@/api/fiches-piste'
import { useCommercialStatsByUser } from '@/api/commercial/queries'
import type { Affectation, Sanction, SanctionType, Promotion } from '@/api/users/types'
import type { Paiement } from '@/api/paiements/types'
import type { FichePiste } from '@/api/fiches-piste/types'
import type { DatePeriod } from '@/api/dashboard/types'

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
  commercial: { label: 'Commercial', cls: 'bg-blue-500/10 text-blue-600 border-blue-200' },
}

interface PerfRecord {
  id: number
  date: string
  vehiculesLaves: number
  bonusEstime: number | string
  stationId: number
  station?: { id: number; nom: string }
}

const periodTabs: { key: DatePeriod; label: string }[] = [
  { key: 'week', label: 'Cette semaine' },
  { key: 'month', label: 'Ce mois' },
  { key: 'year', label: 'Année' },
  { key: 'custom', label: 'Personnalisé' },
]

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function computeDateRange(period: DatePeriod, customStart: string, customEnd: string): { startDate: string; endDate: string } {
  const now = new Date()
  const todayStr = toDateStr(now)

  switch (period) {
    case 'today':
      return { startDate: todayStr, endDate: todayStr }
    case 'week': {
      const day = now.getDay()
      const monday = new Date(now)
      monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
      return { startDate: toDateStr(monday), endDate: todayStr }
    }
    case 'month': {
      const first = new Date(now.getFullYear(), now.getMonth(), 1)
      return { startDate: toDateStr(first), endDate: todayStr }
    }
    case 'year': {
      const jan1 = new Date(now.getFullYear(), 0, 1)
      return { startDate: toDateStr(jan1), endDate: todayStr }
    }
    case 'custom':
      return {
        startDate: customStart || todayStr,
        endDate: customEnd || todayStr,
      }
  }
}

const periodLabels: Record<DatePeriod, string> = {
  today: "aujourd'hui",
  week: 'cette semaine',
  month: 'ce mois',
  year: 'cette année',
  custom: 'la période sélectionnée',
}

export default function EmployeDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const userId = Number(id) || 0

  const { data: user, isLoading, isError } = useUser(userId)
  const { data: stationsList } = useStations()
  const updateUser = useUpdateUser()
  const transferStation = useTransferStation()

  // Period state
  const [period, setPeriod] = useState<DatePeriod>('month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const dateRange = useMemo(
    () => computeDateRange(period, customStart, customEnd),
    [period, customStart, customEnd],
  )

  const { data: perfData, isFetching: perfFetching } = useUserPerformance(userId, undefined, dateRange.startDate, dateRange.endDate)

  const stations = stationsList || []
  const performances: PerfRecord[] = perfData || []

  // Employee's current station (0 if not assigned yet / still loading)
  const employeeStationId = user?.affectations?.find((a: Affectation) => a.statut === 'active')?.stationId || 0

  // Caissière: fetch their transactions (only fires when stationId > 0)
  const { data: caisseData, isFetching: caisseFetching } = useCaisseTransactions({
    stationId: employeeStationId,
    userId: userId,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    limit: 500,
  })

  // Commercial: fetch their stats
  const { data: commercialStats } = useCommercialStatsByUser(userId)

  // Contrôleur: fetch their fiches
  const { data: fichesData, isFetching: fichesFetching } = useFichesPiste({
    controleurId: userId,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    limit: 500,
  })

  // Edit state
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({ nom: '', prenom: '', email: '', telephone: '', bonusParLavage: '' as string, objectifJournalier: '' as string })

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

  // Promotion state
  const promoteUser = usePromoteUser()
  const [showPromoteModal, setShowPromoteModal] = useState(false)
  const [promoteRole, setPromoteRole] = useState('')
  const [promoteMotif, setPromoteMotif] = useState('')

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

  /* ── Caissière computed stats ──────────────────── */
  const caisseTransactions: Paiement[] = caisseData?.data || []
  const totalEncaisse = useMemo(() =>
    caisseTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.montant, 0), [caisseTransactions])
  const incomeTxCount = useMemo(() =>
    caisseTransactions.filter(t => t.type === 'income').length, [caisseTransactions])
  const totalCaisseTx = caisseTransactions.length
  const avgPerTx = incomeTxCount > 0 ? Math.round(totalEncaisse / incomeTxCount) : 0
  const uniquePaymentMethods = useMemo(() =>
    new Set(caisseTransactions.map(t => t.methode)).size, [caisseTransactions])

  const caissePerMonth = useMemo(() => {
    const map = new Map<string, number>()
    caisseTransactions.filter(t => t.type === 'income').forEach(t => {
      const d = new Date(t.createdAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      map.set(key, (map.get(key) || 0) + t.montant)
    })
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([key, montant]) => {
        const [year, month] = key.split('-')
        const label = new Date(Number(year), Number(month) - 1).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
        return { name: label, montant: Math.round(montant) }
      })
  }, [caisseTransactions])

  const methodBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>()
    caisseTransactions.forEach(t => {
      const existing = map.get(t.methode) || { count: 0, total: 0 }
      existing.count += 1
      existing.total += t.montant
      map.set(t.methode, existing)
    })
    const labels: Record<string, string> = {
      cash: 'Espèces', card: 'Carte', wave: 'Wave', orange_money: 'Orange Money', transfer: 'Virement',
    }
    return Array.from(map.entries()).map(([methode, data]) => ({
      name: labels[methode] || methode,
      transactions: data.count,
      montant: Math.round(data.total),
    }))
  }, [caisseTransactions])

  /* ── Contrôleur computed stats ─────────────────── */
  const controleurFiches: FichePiste[] = fichesData?.data || []
  const totalFiches = fichesData?.total || controleurFiches.length
  const completedFiches = useMemo(() =>
    controleurFiches.filter(f => f.statut === 'completed').length, [controleurFiches])
  const openFiches = useMemo(() =>
    controleurFiches.filter(f => f.statut === 'open').length, [controleurFiches])
  const completionRate = totalFiches > 0 ? Math.round((completedFiches / totalFiches) * 100) : 0

  const fichesPerMonth = useMemo(() => {
    const map = new Map<string, number>()
    controleurFiches.forEach(f => {
      const d = new Date(f.date || f.createdAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      map.set(key, (map.get(key) || 0) + 1)
    })
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([key, count]) => {
        const [year, month] = key.split('-')
        const label = new Date(Number(year), Number(month) - 1).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
        return { name: label, fiches: count }
      })
  }, [controleurFiches])

  const startEditing = () => {
    if (!user) return
    setEditData({
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      telephone: user.telephone || '',
      bonusParLavage: user.bonusParLavage != null ? String(user.bonusParLavage) : '',
      objectifJournalier: user.objectifJournalier != null ? String(user.objectifJournalier) : '',
    })
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (!user) return
    try {
      const payload: Record<string, any> = {
        nom: editData.nom,
        prenom: editData.prenom,
        email: editData.email,
        telephone: editData.telephone || undefined,
      }
      if (user.role === 'laveur') {
        payload.bonusParLavage = editData.bonusParLavage ? Number(editData.bonusParLavage) : undefined
      }
      if (user.role === 'commercial') {
        payload.objectifJournalier = editData.objectifJournalier ? Number(editData.objectifJournalier) : undefined
      }
      await updateUser.mutateAsync({ id: user.id, data: payload })
      toast.success('Employé mis à jour avec succès')
      setIsEditing(false)
    } catch {
      // error displayed by axios interceptor
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

  const handlePromote = async () => {
    if (!user || !promoteRole || !promoteMotif.trim()) return
    try {
      await promoteUser.mutateAsync({ id: user.id, data: { nouveauRole: promoteRole, motif: promoteMotif.trim() } })
      toast.success('Promotion effectuée avec succès')
      setShowPromoteModal(false)
      setPromoteRole('')
      setPromoteMotif('')
    } catch {
      toast.error('Erreur lors de la promotion')
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
  const promotions: Promotion[] = user.promotions || []
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

  const caissiereCards = [
    { label: 'Total encaissé', value: `${totalEncaisse.toLocaleString()} FCFA`, icon: Banknote, accent: 'bg-emerald-500/10 text-ok' },
    { label: 'Transactions', value: totalCaisseTx.toLocaleString(), icon: Hash, accent: 'bg-blue-500/10 text-info' },
    { label: 'Moy. / transaction', value: `${avgPerTx.toLocaleString()} FCFA`, icon: TrendingUp, accent: 'bg-teal-500/10 text-accent' },
    { label: 'Méthodes utilisées', value: uniquePaymentMethods.toString(), icon: CreditCard, accent: 'bg-amber-500/10 text-warn' },
  ]

  const controleurCards = [
    { label: 'Fiches inspectées', value: totalFiches.toLocaleString(), icon: ClipboardList, accent: 'bg-blue-500/10 text-info' },
    { label: 'Complétées', value: completedFiches.toLocaleString(), icon: CheckCircle2, accent: 'bg-emerald-500/10 text-ok' },
    { label: 'En attente', value: openFiches.toLocaleString(), icon: Clock, accent: 'bg-amber-500/10 text-warn' },
    { label: 'Taux complétion', value: `${completionRate}%`, icon: TrendingUp, accent: 'bg-teal-500/10 text-accent' },
  ]

  const roleCards = user.role === 'laveur' ? perfCards
    : user.role === 'caissiere' ? caissiereCards
    : user.role === 'controleur' ? controleurCards
    : null

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
              <button
                onClick={() => { setPromoteRole(''); setPromoteMotif(''); setShowPromoteModal(true) }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-grape-wash text-grape border border-grape-line hover:bg-grape-wash/80 transition-colors"
              >
                <ArrowUpCircle className="w-3 h-3" /> Promouvoir
              </button>
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

      {/* ── Period selector ──────────────────────────────── */}
      <motion.div variants={rise} className="flex flex-wrap items-center gap-3">
        <div className="flex bg-panel border border-edge rounded-xl p-1 shadow-sm">
          {periodTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setPeriod(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                period === tab.key
                  ? 'bg-accent-wash text-accent'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-panel border border-edge rounded-xl px-3 py-1.5 text-sm text-ink outline-none focus:border-teal-500 shadow-sm"
            />
            <span className="text-ink-muted text-sm">—</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-panel border border-edge rounded-xl px-3 py-1.5 text-sm text-ink outline-none focus:border-teal-500 shadow-sm"
            />
          </div>
        )}

        <span className="text-xs text-ink-faded capitalize flex items-center gap-2">
          {periodLabels[period]}
          {(perfFetching || caisseFetching || fichesFetching) && <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-500" />}
        </span>
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

      {/* ── Role-specific stat cards ────────────────────── */}
      {roleCards && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {roleCards.map(s => {
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
      )}

      {/* ── Laveur: Performance charts ──────────────────── */}
      {user.role === 'laveur' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl p-6 shadow-sm">
            <h3 className="font-heading font-semibold text-ink mb-1">Véhicules lavés</h3>
            <p className="text-sm text-ink-faded mb-4">Performance sur la période</p>
            {vehiclesPerMonth.length > 0 ? (
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
            ) : (
              <div className="h-[240px] flex items-center justify-center border border-dashed border-edge rounded-xl">
                <p className="text-sm text-ink-muted">Aucune donnée pour cette période</p>
              </div>
            )}
          </motion.div>

          <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl p-6 shadow-sm">
            <h3 className="font-heading font-semibold text-ink mb-1">Bonus estimé</h3>
            <p className="text-sm text-ink-faded mb-4">Évolution sur la période (FCFA)</p>
            {bonusPerMonth.length > 0 ? (
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
            ) : (
              <div className="h-[240px] flex items-center justify-center border border-dashed border-edge rounded-xl">
                <p className="text-sm text-ink-muted">Aucune donnée pour cette période</p>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {user.role === 'laveur' && (
        <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl p-6 shadow-sm">
          <h3 className="font-heading font-semibold text-ink mb-1">Jours travaillés</h3>
          <p className="text-sm text-ink-faded mb-4">Nombre de jours de présence par mois</p>
          {vehiclesPerMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={vehiclesPerMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--c-edge)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--c-ink-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--c-ink-muted)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <RechartsTooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} jour${v > 1 ? 's' : ''}`, 'Travaillés']} />
                <Bar dataKey="jours" fill="#283852" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center border border-dashed border-edge rounded-xl">
              <p className="text-sm text-ink-muted">Aucune donnée pour cette période</p>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Caissière: Revenue charts ────────────────────── */}
      {user.role === 'caissiere' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl p-6 shadow-sm">
            <h3 className="font-heading font-semibold text-ink mb-1">Recettes encaissées</h3>
            <p className="text-sm text-ink-faded mb-4">Évolution sur la période (FCFA)</p>
            {caissePerMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={caissePerMonth}>
                  <defs>
                    <linearGradient id="gCaisse" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--c-edge)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--c-ink-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--c-ink-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)} />
                  <RechartsTooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${(v ?? 0).toLocaleString()} FCFA`, 'Encaissé']} />
                  <Area type="monotone" dataKey="montant" stroke="#10b981" strokeWidth={2.5} fill="url(#gCaisse)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[240px] flex items-center justify-center border border-dashed border-edge rounded-xl">
                <p className="text-sm text-ink-muted">Aucune donnée pour cette période</p>
              </div>
            )}
          </motion.div>

          <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl p-6 shadow-sm">
            <h3 className="font-heading font-semibold text-ink mb-1">Méthodes de paiement</h3>
            <p className="text-sm text-ink-faded mb-4">Répartition des transactions</p>
            {methodBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={methodBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--c-edge)" horizontal={false} />
                  <XAxis type="number" stroke="var(--c-ink-muted)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" stroke="var(--c-ink-muted)" fontSize={12} tickLine={false} axisLine={false} width={100} />
                  <RechartsTooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => {
                    if (name === 'transactions') return [`${v} transaction${v > 1 ? 's' : ''}`, 'Nombre']
                    return [`${(v ?? 0).toLocaleString()} FCFA`, 'Montant']
                  }} />
                  <Bar dataKey="transactions" fill="#33cbcc" radius={[0, 6, 6, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[240px] flex items-center justify-center border border-dashed border-edge rounded-xl">
                <p className="text-sm text-ink-muted">Aucune donnée pour cette période</p>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* ── Contrôleur: Fiches charts ────────────────────── */}
      {user.role === 'controleur' && (
        <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl p-6 shadow-sm">
          <h3 className="font-heading font-semibold text-ink mb-1">Fiches inspectées</h3>
          <p className="text-sm text-ink-faded mb-4">Nombre de fiches par mois</p>
          {fichesPerMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={fichesPerMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--c-edge)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--c-ink-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--c-ink-muted)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <RechartsTooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} fiche${v > 1 ? 's' : ''}`, 'Inspectées']} />
                <Bar dataKey="fiches" fill="#33cbcc" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center border border-dashed border-edge rounded-xl">
              <p className="text-sm text-ink-muted">Aucune donnée pour cette période</p>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Commercial: Registration stats ────────────────── */}
      {user.role === 'commercial' && commercialStats && (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { label: "Enregistrés aujourd'hui", value: commercialStats.todayTotal, icon: Car, accent: 'bg-blue-500/10 text-blue-500' },
              { label: "Confirmés aujourd'hui", value: commercialStats.todayConfirmed, icon: CheckCircle2, accent: 'bg-emerald-500/10 text-emerald-500' },
              { label: 'Total enregistrés', value: commercialStats.allTimeTotal, icon: TrendingUp, accent: 'bg-teal-500/10 text-teal-500' },
              { label: 'Total confirmés', value: commercialStats.allTimeConfirmed, icon: Target, accent: 'bg-purple-500/10 text-purple-500' },
            ].map((s) => {
              const Icon = s.icon
              return (
                <motion.div key={s.label} variants={rise} className="bg-panel border border-edge rounded-2xl p-4 shadow-sm">
                  <div className={`p-2.5 rounded-xl w-fit ${s.accent} mb-3`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="font-heading text-xl font-bold text-ink">{s.value}</p>
                  <p className="text-xs text-ink-faded mt-0.5">{s.label}</p>
                </motion.div>
              )
            })}
          </div>

          <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading font-semibold text-ink flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-blue-500" /> Objectif du jour
              </h3>
              <span className="text-sm font-medium text-ink-muted">
                {commercialStats.todayConfirmed} / {commercialStats.dailyGoal}
              </span>
            </div>
            <div className="relative h-4 bg-inset rounded-full overflow-hidden border border-edge">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((commercialStats.todayConfirmed / commercialStats.dailyGoal) * 100, 100)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={`absolute inset-y-0 left-0 rounded-full ${
                  commercialStats.todayConfirmed >= commercialStats.dailyGoal
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                    : 'bg-gradient-to-r from-blue-600 to-blue-400'
                }`}
              />
            </div>
            {commercialStats.todayConfirmed >= commercialStats.dailyGoal && (
              <p className="text-xs text-emerald-500 font-medium mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Objectif atteint !
              </p>
            )}
          </motion.div>
        </>
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
            {user.role === 'laveur' && (
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-ink-light mb-1.5">
                  <Banknote className="w-3.5 h-3.5" /> Bonus par lavage (FCFA)
                </label>
                <input
                  type="number"
                  min="0"
                  value={editData.bonusParLavage}
                  onChange={(e) => setEditData({ ...editData, bonusParLavage: e.target.value })}
                  className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
                  placeholder="Ex: 500"
                />
              </div>
            )}
            {user.role === 'commercial' && (
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-ink-light mb-1.5">
                  <Target className="w-3.5 h-3.5" /> Objectif journalier
                </label>
                <input
                  type="number"
                  min="1"
                  value={editData.objectifJournalier}
                  onChange={(e) => setEditData({ ...editData, objectifJournalier: e.target.value })}
                  className="w-full px-3 py-2 bg-inset border border-outline rounded-xl text-ink outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
                  placeholder="Ex: 10"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'Prénom', value: user.prenom },
              { label: 'Nom', value: user.nom },
              { label: 'Email', value: user.email },
              { label: 'Téléphone', value: user.telephone || '—' },
              { label: 'Rôle', value: role.label },
              ...(user.role === 'laveur' ? [{ label: 'Bonus par lavage', value: user.bonusParLavage != null ? `${Number(user.bonusParLavage).toLocaleString()} FCFA` : 'Non défini' }] : []),
              ...(user.role === 'commercial' ? [{ label: 'Objectif journalier', value: user.objectifJournalier != null ? `${user.objectifJournalier} véhicules/jour` : 'Non défini' }] : []),
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

      {/* ── Promotion history ───────────────────────────── */}
      <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-divider flex items-center justify-between">
          <h3 className="font-heading font-semibold text-ink flex items-center gap-2">
            <ArrowUpCircle className="w-5 h-5 text-grape" /> Historique des promotions
            {promotions.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-grape-wash text-grape border border-grape-line">
                {promotions.length}
              </span>
            )}
          </h3>
          <button
            onClick={() => { setPromoteRole(''); setPromoteMotif(''); setShowPromoteModal(true) }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-grape hover:bg-grape-wash rounded-lg transition-colors"
          >
            <ArrowUpCircle className="w-3.5 h-3.5" /> Promouvoir
          </button>
        </div>

        {promotions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-faded uppercase tracking-wider bg-inset">
                  <th className="px-6 py-3 font-semibold">Ancien rôle</th>
                  <th className="px-6 py-3 font-semibold">Nouveau rôle</th>
                  <th className="px-6 py-3 font-semibold">Motif</th>
                  <th className="px-6 py-3 font-semibold">Date</th>
                  <th className="px-6 py-3 font-semibold">Par</th>
                </tr>
              </thead>
              <tbody>
                {promotions
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((p, i) => {
                    const ancienCfg = roleCfg[p.ancienRole] || { label: p.ancienRole, cls: 'bg-raised text-ink-muted border-edge' }
                    const nouveauCfg = roleCfg[p.nouveauRole] || { label: p.nouveauRole, cls: 'bg-raised text-ink-muted border-edge' }
                    return (
                      <tr key={p.id} className={`border-b border-divider last:border-0 ${i % 2 === 0 ? '' : 'bg-inset/50'} hover:bg-raised/50 transition-colors`}>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${ancienCfg.cls}`}>
                            {ancienCfg.label}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${nouveauCfg.cls}`}>
                            {nouveauCfg.label}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-ink max-w-[250px] truncate">{p.motif}</td>
                        <td className="px-6 py-3 text-ink whitespace-nowrap">
                          {new Date(p.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-3 text-ink-light text-xs">
                          {p.promoteur ? `${p.promoteur.prenom} ${p.promoteur.nom}` : '—'}
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center p-8">
            <ArrowUpCircle className="w-8 h-8 mx-auto mb-2 text-ink-muted" />
            <p className="text-sm text-ink-muted">Aucune promotion enregistrée</p>
          </div>
        )}
      </motion.div>

      {/* ── Laveur: Performance history table ──────────── */}
      {user.role === 'laveur' && (
        <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-divider">
            <h3 className="font-heading font-semibold text-ink flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent" /> Historique des performances ({performances.length} jours)
            </h3>
          </div>
          {performances.length > 0 ? (
            <>
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
            </>
          ) : (
            <div className="text-center p-8">
              <p className="text-sm text-ink-muted">Aucune performance enregistrée pour cette période</p>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Caissière: Transaction history table ─────────── */}
      {user.role === 'caissiere' && (
        <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-divider">
            <h3 className="font-heading font-semibold text-ink flex items-center gap-2">
              <Banknote className="w-5 h-5 text-accent" /> Historique des transactions ({caisseTransactions.length})
            </h3>
          </div>
          {caisseTransactions.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-ink-faded uppercase tracking-wider bg-inset">
                      <th className="px-6 py-3 font-semibold">Date</th>
                      <th className="px-6 py-3 font-semibold">Méthode</th>
                      <th className="px-6 py-3 font-semibold">Description</th>
                      <th className="px-6 py-3 font-semibold">Type</th>
                      <th className="px-6 py-3 font-semibold text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {caisseTransactions.slice(0, 50).map((t, i) => {
                      const methodeLabels: Record<string, string> = {
                        cash: 'Espèces', card: 'Carte', wave: 'Wave', orange_money: 'Orange Money', transfer: 'Virement',
                      }
                      return (
                        <tr key={t.id} className={`border-b border-divider last:border-0 ${i % 2 === 0 ? '' : 'bg-inset/50'} hover:bg-raised/50 transition-colors`}>
                          <td className="px-6 py-3 text-ink whitespace-nowrap">
                            {new Date(t.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-6 py-3 text-ink">
                            <span className="flex items-center gap-1.5">
                              <CreditCard className="w-3.5 h-3.5 text-ink-muted" />
                              {methodeLabels[t.methode] || t.methode}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-ink max-w-[200px] truncate">{t.description || '—'}</td>
                          <td className="px-6 py-3">
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-medium border ${
                              t.type === 'income'
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                : 'bg-red-500/10 text-red-600 border-red-500/20'
                            }`}>
                              {t.type === 'income' ? 'Recette' : 'Dépense'}
                            </span>
                          </td>
                          <td className={`px-6 py-3 text-right font-semibold whitespace-nowrap ${t.type === 'income' ? 'text-ok' : 'text-red-500'}`}>
                            {t.type === 'income' ? '+' : '-'}{t.montant.toLocaleString()} FCFA
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {caisseTransactions.length > 50 && (
                <div className="px-6 py-3 text-center text-xs text-ink-muted border-t border-divider">
                  Affichage des 50 dernières transactions sur {caisseTransactions.length}
                </div>
              )}
            </>
          ) : (
            <div className="text-center p-8">
              <p className="text-sm text-ink-muted">Aucune transaction pour cette période</p>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Contrôleur: Fiches history table ──────────────── */}
      {user.role === 'controleur' && (
        <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-divider">
            <h3 className="font-heading font-semibold text-ink flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-accent" /> Fiches inspectées ({totalFiches})
            </h3>
          </div>
          {controleurFiches.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-ink-faded uppercase tracking-wider bg-inset">
                      <th className="px-6 py-3 font-semibold">Date</th>
                      <th className="px-6 py-3 font-semibold">N° Fiche</th>
                      <th className="px-6 py-3 font-semibold">Véhicule</th>
                      <th className="px-6 py-3 font-semibold">Client</th>
                      <th className="px-6 py-3 font-semibold">Type</th>
                      <th className="px-6 py-3 font-semibold">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {controleurFiches.slice(0, 50).map((f, i) => {
                      const statusCfg: Record<string, { label: string; cls: string }> = {
                        open: { label: 'Ouverte', cls: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
                        in_progress: { label: 'En cours', cls: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
                        completed: { label: 'Complétée', cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
                      }
                      const st = statusCfg[f.statut] || statusCfg.open
                      return (
                        <tr key={f.id} className={`border-b border-divider last:border-0 ${i % 2 === 0 ? '' : 'bg-inset/50'} hover:bg-raised/50 transition-colors`}>
                          <td className="px-6 py-3 text-ink whitespace-nowrap">
                            {new Date(f.date || f.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-6 py-3 text-ink font-medium">{f.numero || `#${f.id}`}</td>
                          <td className="px-6 py-3 text-ink">{f.vehicle?.immatriculation || '—'}</td>
                          <td className="px-6 py-3 text-ink">{f.client?.nom || '—'}</td>
                          <td className="px-6 py-3 text-ink">{f.typeLavage?.nom || '—'}</td>
                          <td className="px-6 py-3">
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-medium border ${st.cls}`}>
                              {st.label}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {controleurFiches.length > 50 && (
                <div className="px-6 py-3 text-center text-xs text-ink-muted border-t border-divider">
                  Affichage des 50 dernières fiches sur {totalFiches}
                </div>
              )}
            </>
          ) : (
            <div className="text-center p-8">
              <p className="text-sm text-ink-muted">Aucune fiche pour cette période</p>
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

      {/* ── Promotion modal ────────────────────────────── */}
      <AnimatePresence>
        {showPromoteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPromoteModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-panel border border-edge rounded-2xl shadow-xl p-6"
            >
              <h3 className="font-heading font-bold text-lg text-ink flex items-center gap-2 mb-4">
                <ArrowUpCircle className="w-5 h-5 text-grape" /> Promouvoir l'employé
              </h3>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-grape-wash border border-grape-line mb-4">
                <Shield className="w-5 h-5 text-grape shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-grape">Rôle actuel : {role.label}</p>
                  <p className="text-ink-muted mt-0.5">Le rôle de l'employé sera modifié et un historique sera conservé.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ink-light mb-1.5">Nouveau rôle</label>
                  <select
                    value={promoteRole}
                    onChange={(e) => setPromoteRole(e.target.value)}
                    className="w-full px-3 py-2.5 bg-inset border border-outline rounded-xl text-ink text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
                  >
                    <option value="">— Sélectionner un rôle —</option>
                    {Object.entries(roleCfg)
                      .filter(([key]) => key !== user.role)
                      .map(([key, cfg]) => (
                        <option key={key} value={key}>{cfg.label}</option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-light mb-1.5">Motif de la promotion</label>
                  <textarea
                    value={promoteMotif}
                    onChange={(e) => setPromoteMotif(e.target.value)}
                    placeholder="Décrivez la raison de la promotion..."
                    rows={3}
                    className="w-full px-3 py-2.5 bg-inset border border-outline rounded-xl text-ink text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowPromoteModal(false)}
                  className="px-4 py-2 font-medium text-ink-light hover:text-ink transition-colors text-sm"
                >
                  Annuler
                </button>
                <button
                  onClick={handlePromote}
                  disabled={!promoteRole || !promoteMotif.trim() || promoteUser.isPending}
                  className="px-5 py-2 bg-grape hover:bg-grape/90 text-white font-medium rounded-xl transition-colors disabled:opacity-70 text-sm flex items-center gap-2"
                >
                  {promoteUser.isPending ? 'Promotion...' : 'Confirmer la promotion'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
