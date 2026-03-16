import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Car, CheckCircle2, Clock, Loader2, User, Phone, Target,
  TrendingUp, Trophy, Zap, Megaphone, Check, MapPin, Mail,
  ChevronDown, Users, AlertCircle, ChevronLeft, ChevronRight,
} from '@/lib/icons'
import { useAuth } from '@/contexts/AuthContext'
import {
  useCommercialToday,
  useRegisterVehicle,
  useCommercialStats,
  useCommercialPortfolio,
  useCommercialHistory,
} from '@/api/commercial/queries'
import toast from 'react-hot-toast'

const VEHICLE_TYPES = ['Berline', 'SUV', 'Citadine', 'Pick-up', 'Utilitaire', 'Monospace']
const PAGE_LOAD_TIME = Date.now()

/* ─── animations ───────────────────────────────────── */
const fade = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: 'easeOut' as const } } }
const stagger = { show: { transition: { staggerChildren: 0.07 } } }

/* ─── Goal ring SVG ────────────────────────────────── */
function GoalRing({ value, goal }: { value: number; goal: number }) {
  const SIZE = 96
  const STROKE = 7
  const R = (SIZE - STROKE) / 2
  const C = 2 * Math.PI * R
  const progress = goal > 0 ? Math.min(value / goal, 1) : 0
  const offset = C * (1 - progress)

  return (
    <div className="relative flex items-center justify-center" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={STROKE} />
        <circle
          cx={SIZE / 2} cy={SIZE / 2} r={R}
          fill="none"
          stroke={progress >= 1 ? '#34d399' : '#60a5fa'}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-white leading-none">{value}</span>
        <span className="text-[10px] text-white/50 mt-0.5">/ {goal}</span>
      </div>
    </div>
  )
}

/* ─── Stat tile ────────────────────────────────────── */
function StatTile({ label, value, sub, accent }: { label: string; value: number | string; sub?: string; accent?: string }) {
  return (
    <div className="bg-panel border border-edge rounded-2xl px-4 py-3.5 flex-1">
      <p className="text-xs text-ink-faded uppercase tracking-wide font-semibold mb-1">{label}</p>
      <p className={`text-2xl font-bold font-heading ${accent ?? 'text-ink'}`}>{value}</p>
      {sub && <p className="text-xs text-ink-muted mt-0.5">{sub}</p>}
    </div>
  )
}

/* ─── Pagination bar ───────────────────────────────── */
const PAGE_SIZE = 10
function Pager({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  const pages = Math.ceil(total / PAGE_SIZE)
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-divider">
      <span className="text-xs text-ink-muted font-body">
        {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} sur {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="w-7 h-7 rounded-lg flex items-center justify-center border border-edge text-ink-muted hover:text-ink hover:bg-raised transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className="w-7 h-7 rounded-lg text-xs font-semibold font-body transition-colors"
            style={{
              background: n === page ? '#283852' : undefined,
              color: n === page ? '#ffffff' : 'var(--c-ink-muted)',
            }}
          >
            {n}
          </button>
        ))}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === pages}
          className="w-7 h-7 rounded-lg flex items-center justify-center border border-edge text-ink-muted hover:text-ink hover:bg-raised transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

/* ─── Main ─────────────────────────────────────────── */
export default function Commercial() {
  const { user } = useAuth()
  const [tab, setTab] = useState<'enregistrer' | 'portefeuille'>('enregistrer')
  const [plate, setPlate] = useState('')
  const [prospectNom, setProspectNom] = useState('')
  const [prospectTelephone, setProspectTelephone] = useState('')
  const [prospectEmail, setProspectEmail] = useState('')
  const [prospectQuartier, setProspectQuartier] = useState('')
  const [vehicleBrand, setVehicleBrand] = useState('')
  const [vehicleModele, setVehicleModele] = useState('')
  const [vehicleColor, setVehicleColor] = useState('')
  const [vehicleType, setVehicleType] = useState('Berline')
  const [submitted, setSubmitted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const [clientPage,   setClientPage]   = useState(1)
  const [prospectPage, setProspectPage] = useState(1)

  const { data: registrations = [], isLoading: todayLoading } = useCommercialToday()
  const { data: stats } = useCommercialStats()
  const { data: portfolio = [], isLoading: portfolioLoading } = useCommercialPortfolio()
  const { data: pendingHistory = [] } = useCommercialHistory({ status: 'pending' })
  const registerMutation = useRegisterVehicle()

  useEffect(() => { inputRef.current?.focus() }, [])

  const canSubmit = plate.trim() && prospectNom.trim() && prospectTelephone.trim()
  const goal = stats?.dailyGoal ?? 10
  const todayTotal = stats?.todayTotal ?? registrations.length
  const todayConfirmed = stats?.todayConfirmed ?? registrations.filter(r => r.confirmed).length
  const conversionRate = todayTotal > 0 ? Math.round((todayConfirmed / todayTotal) * 100) : 0
  const initials = user ? `${user.prenom[0]}${user.nom[0]}`.toUpperCase() : '??'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedPlate = plate.trim().toUpperCase()
    if (!trimmedPlate || !prospectNom.trim() || !prospectTelephone.trim()) return

    try {
      await registerMutation.mutateAsync({
        immatriculation: trimmedPlate,
        prospectNom: prospectNom.trim(),
        prospectTelephone: prospectTelephone.trim(),
        prospectEmail: prospectEmail.trim() || undefined,
        prospectQuartier: prospectQuartier.trim() || undefined,
        vehicleBrand: vehicleBrand.trim() || undefined,
        vehicleModele: vehicleModele.trim() || undefined,
        vehicleColor: vehicleColor.trim() || undefined,
        vehicleType: vehicleType || undefined,
      })
      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 1800)
      toast.success(`${trimmedPlate} enregistré`)
      setPlate('')
      setProspectNom('')
      setProspectTelephone('')
      setProspectEmail('')
      setProspectQuartier('')
      setVehicleBrand('')
      setVehicleModele('')
      setVehicleColor('')
      setVehicleType('Berline')
      inputRef.current?.focus()
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Erreur lors de l'enregistrement"
      toast.error(msg)
    }
  }

  return (
    <div className="space-y-4 max-w-xl mx-auto pb-8">
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4">

      {/* ── Mission header ───────────────────────────── */}
      <motion.div variants={fade}>
        <div
          className="rounded-2xl overflow-hidden relative"
          style={{ background: 'linear-gradient(135deg, oklch(0.22 0.06 250) 0%, oklch(0.18 0.05 240) 100%)' }}
        >
          {/* subtle dot grid */}
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }}
          />
          <div className="relative px-6 py-6 flex items-center gap-5">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, oklch(0.55 0.15 250), oklch(0.42 0.18 255))' }}>
              {initials}
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              {/* <p className="text-white/50 text-xs font-medium uppercase tracking-widest mb-0.5">Espace Commercial</p> */}
              <h2 className="font-heading text-lg font-bold text-white leading-tight">{user?.prenom} {user?.nom}</h2>
           
            </div>
            {/* Goal ring */}
            <div className="shrink-0 flex flex-col items-center gap-1">
              <GoalRing value={todayConfirmed} goal={goal} />
              <span className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {todayConfirmed >= goal ? '🎯 Objectif atteint' : 'confirmés / objectif'}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Stats row ────────────────────────────────── */}
      <motion.div variants={fade} className="flex gap-3">
        <StatTile label="Aujourd'hui" value={todayTotal} sub="prospects" />
        <StatTile label="Confirmés" value={todayConfirmed} sub={`${conversionRate}% taux`} accent="text-ok" />
        <StatTile label="Portefeuille" value={portfolio.length} sub="clients" accent="text-info" />
      </motion.div>

      {/* ── Tab switcher ─────────────────────────────── */}
      <motion.div variants={fade} className="flex bg-raised border border-edge rounded-xl p-1">
        {([
          { key: 'enregistrer', label: 'Enregistrer', icon: Zap },
          { key: 'portefeuille', label: 'Portefeuille clients', icon: Users },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? 'bg-panel text-ink shadow-sm' : 'text-ink-faded hover:text-ink-light'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </motion.div>

    </motion.div>{/* end stagger */}

    <AnimatePresence mode="wait">
      {tab === 'enregistrer' && (
      <motion.div key="tab-enregistrer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-4">

      {/* ── Registration form ────────────────────────── */}
      <div className="bg-panel border border-edge rounded-2xl overflow-hidden">

        <div className="px-5 pt-5 pb-1 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'oklch(0.55 0.15 250 / 0.15)' }}>
            <Car className="w-4 h-4" style={{ color: 'oklch(0.7 0.12 250)' }} />
          </div>
          <h3 className="font-heading font-semibold text-ink text-sm">Enregistrer un prospect</h3>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">

          {/* ── Prospect section ── */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-ink-faded uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Prospect
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <User className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={prospectNom}
                  onChange={(e) => setProspectNom(e.target.value)}
                  placeholder="Nom complet *"
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-inset border border-edge rounded-xl text-ink text-sm placeholder-ink-muted outline-none focus:border-blue-400/60 transition-colors"
                />
              </div>
              <div className="relative">
                <Phone className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={prospectTelephone}
                  onChange={(e) => setProspectTelephone(e.target.value)}
                  placeholder="Téléphone *"
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-inset border border-edge rounded-xl text-ink text-sm placeholder-ink-muted outline-none focus:border-blue-400/60 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <MapPin className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={prospectQuartier}
                  onChange={(e) => setProspectQuartier(e.target.value)}
                  placeholder="Quartier"
                  className="w-full pl-9 pr-3 py-2.5 bg-inset border border-edge rounded-xl text-ink text-sm placeholder-ink-muted outline-none focus:border-blue-400/60 transition-colors"
                />
              </div>
              <div className="relative">
                <Mail className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={prospectEmail}
                  onChange={(e) => setProspectEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full pl-9 pr-3 py-2.5 bg-inset border border-edge rounded-xl text-ink text-sm placeholder-ink-muted outline-none focus:border-blue-400/60 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* ── Vehicle section ── */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-ink-faded uppercase tracking-wider flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5" /> Véhicule
            </p>

            {/* Plate — styled like a real plate */}
            <div>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value.toUpperCase())}
                  placeholder="DK-1234-AB"
                  maxLength={12}
                  required
                  className="w-full px-4 py-3 border-2 rounded-xl text-ink text-xl font-mono tracking-[0.2em] text-center placeholder-ink-muted/40 outline-none transition-all"
                  style={{
                    background: plate ? 'oklch(0.97 0.01 100)' : undefined,
                    borderColor: plate ? 'oklch(0.75 0.12 85)' : undefined,
                    color: plate ? 'oklch(0.15 0.04 250)' : undefined,
                  }}
                />
                {plate && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-widest text-ink-muted/50">
                    SÉNÉGAL
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={vehicleBrand}
                onChange={(e) => setVehicleBrand(e.target.value)}
                placeholder="Marque (Toyota…)"
                className="px-3 py-2.5 bg-inset border border-edge rounded-xl text-ink text-sm placeholder-ink-muted outline-none focus:border-blue-400/60 transition-colors"
              />
              <input
                type="text"
                value={vehicleModele}
                onChange={(e) => setVehicleModele(e.target.value)}
                placeholder="Modèle (Camry…)"
                className="px-3 py-2.5 bg-inset border border-edge rounded-xl text-ink text-sm placeholder-ink-muted outline-none focus:border-blue-400/60 transition-colors"
              />
              <input
                type="text"
                value={vehicleColor}
                onChange={(e) => setVehicleColor(e.target.value)}
                placeholder="Couleur"
                className="px-3 py-2.5 bg-inset border border-edge rounded-xl text-ink text-sm placeholder-ink-muted outline-none focus:border-blue-400/60 transition-colors"
              />
              <div className="relative">
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full appearance-none px-3 py-2.5 bg-inset border border-edge rounded-xl text-ink text-sm outline-none focus:border-blue-400/60 transition-colors pr-8"
                >
                  {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-ink-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Submit */}
          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="success"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full py-3 rounded-xl flex items-center justify-center gap-2 font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, oklch(0.55 0.14 155), oklch(0.48 0.14 155))' }}
              >
                <Check className="w-4 h-4" /> Enregistré !
              </motion.div>
            ) : (
              <motion.button
                key="submit"
                type="submit"
                disabled={registerMutation.isPending || !canSubmit}
                className="w-full py-3 rounded-xl flex items-center justify-center gap-2 font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, oklch(0.48 0.17 250), oklch(0.42 0.18 255))' }}
                whileTap={canSubmit ? { scale: 0.98 } : undefined}
              >
                {registerMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                Enregistrer le prospect
              </motion.button>
            )}
          </AnimatePresence>
        </form>
      </div>

      {/* ── Today's feed ─────────────────────────────── */}
      <div className="bg-panel border border-edge rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-divider flex items-center justify-between">
          <h3 className="font-heading font-semibold text-ink text-sm flex items-center gap-2">
            <Target className="w-4 h-4 text-ink-muted" />
            Contacts du jour
          </h3>
          <div className="flex items-center gap-2">
            {todayConfirmed > 0 && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-ok-wash text-ok">
                {todayConfirmed} confirmé{todayConfirmed > 1 ? 's' : ''}
              </span>
            )}
            <span className="text-xs text-ink-muted bg-raised px-2.5 py-1 rounded-full">
              {registrations.length} total
            </span>
          </div>
        </div>

        {todayLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
          </div>
        ) : registrations.length === 0 ? (
          <div className="py-12 flex flex-col items-center gap-3 text-center px-6">
            <div className="w-12 h-12 rounded-2xl bg-inset flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-ink-muted/40" />
            </div>
            <div>
              <p className="text-sm font-medium text-ink-light">Pas encore de contacts aujourd'hui</p>
              <p className="text-xs text-ink-muted mt-0.5">Enregistrez votre premier prospect ci-dessus.</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-divider">
            {[...registrations].reverse().map((reg, i) => {
              const prospectInitial = reg.prospectNom ? reg.prospectNom[0].toUpperCase() : '?'
              const time = new Date(reg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
              return (
                <motion.div
                  key={reg.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="px-5 py-3.5 flex items-center gap-3 hover:bg-inset/60 transition-colors"
                >
                  {/* Prospect avatar */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                    reg.confirmed
                      ? 'bg-ok-wash text-ok'
                      : 'bg-raised text-ink-muted'
                  }`}>
                    {prospectInitial}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-mono font-semibold text-ink tracking-wider">{reg.immatriculation}</span>
                      {reg.vehicleType && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-raised text-ink-muted font-medium">{reg.vehicleType}</span>
                      )}
                    </div>
                    <p className="text-xs text-ink-faded truncate">
                      {reg.prospectNom}
                      {reg.prospectQuartier && <span className="text-ink-muted"> · {reg.prospectQuartier}</span>}
                    </p>
                    {(reg.vehicleBrand || reg.vehicleModele) && (
                      <p className="text-[10px] text-ink-muted/60 truncate mt-0.5">
                        {[reg.vehicleBrand, reg.vehicleModele, reg.vehicleColor].filter(Boolean).join(' ')}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-1">
                    {reg.confirmed ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-ok-wash text-ok">
                        <CheckCircle2 className="w-3 h-3" /> Venu
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-warn-wash text-warn">
                        <Clock className="w-3 h-3" /> En attente
                      </span>
                    )}
                    <span className="text-[10px] text-ink-muted">{time}</span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        {registrations.length > 0 && registrations.every(r => r.confirmed) && (
          <div className="px-5 py-4 border-t border-divider bg-ok-wash/30 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-ok" />
            <p className="text-xs font-medium text-ok">Tous vos prospects sont venus — excellent travail !</p>
          </div>
        )}
      </div>
      </motion.div>)}

      {tab === 'portefeuille' && (
      <motion.div key="tab-portefeuille" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-4">

        {/* ── Prospects à relancer ─────────────────────── */}
        <div className="bg-panel border border-edge rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-divider flex items-center justify-between">
            <h3 className="font-heading font-semibold text-ink text-sm flex items-center gap-2">
              <Phone className="w-4 h-4 text-warn" /> Prospects à relancer
            </h3>
            {pendingHistory.length > 0 && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-warn-wash text-warn">
                {pendingHistory.length}
              </span>
            )}
          </div>

          {pendingHistory.length === 0 ? (
            <div className="px-5 py-6 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-ok shrink-0" />
              <p className="text-sm text-ink-light">Tous vos prospects ont déjà confirmé leur passage.</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-divider">
                {pendingHistory.slice((prospectPage - 1) * PAGE_SIZE, prospectPage * PAGE_SIZE).map((p) => {
                  const daysSince = Math.floor((PAGE_LOAD_TIME - new Date(p.createdAt).getTime()) / 86_400_000)
                  return (
                    <div key={p.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-inset/60 transition-colors">
                      <div className="w-9 h-9 rounded-xl bg-warn-wash flex items-center justify-center text-sm font-bold text-warn shrink-0">
                        {p.prospectNom?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-ink">{p.prospectNom}</span>
                          {p.prospectQuartier && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-raised text-ink-muted">{p.prospectQuartier}</span>
                          )}
                        </div>
                        <p className="text-xs text-ink-faded font-mono mt-0.5">{p.immatriculation}
                          {(p.vehicleBrand || p.vehicleModele) && (
                            <span className="font-sans text-ink-muted"> · {[p.vehicleBrand, p.vehicleModele].filter(Boolean).join(' ')}</span>
                          )}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        {daysSince > 0 && (
                          <div className="flex items-center gap-1 text-[10px] text-ink-muted">
                            <AlertCircle className="w-3 h-3" />
                            {daysSince}j
                          </div>
                        )}
                        <a
                          href={`tel:${p.prospectTelephone}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-colors"
                          style={{ background: 'linear-gradient(135deg, oklch(0.55 0.14 155), oklch(0.48 0.14 155))' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone className="w-3 h-3" />
                          Appeler
                        </a>
                      </div>
                    </div>
                  )
                })}
              </div>
              <Pager page={prospectPage} total={pendingHistory.length} onChange={setProspectPage} />
            </>
          )}
        </div>

        {/* ── Mes clients ──────────────────────────────── */}
        <div className="bg-panel border border-edge rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-divider flex items-center justify-between">
            <h3 className="font-heading font-semibold text-ink text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-ink-muted" /> Mes clients
            </h3>
            <span className="text-xs text-ink-muted bg-raised px-2.5 py-1 rounded-full">{portfolio.length}</span>
          </div>

          {portfolioLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
            </div>
          ) : portfolio.length === 0 ? (
            <div className="py-10 flex flex-col items-center gap-3 text-center px-6">
              <div className="w-12 h-12 rounded-2xl bg-inset flex items-center justify-center">
                <Megaphone className="w-6 h-6 text-ink-muted/40" />
              </div>
              <div>
                <p className="text-sm font-medium text-ink-light">Aucun client dans votre portefeuille</p>
                <p className="text-xs text-ink-muted mt-0.5">Les prospects confirmés deviennent automatiquement vos clients.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="divide-y divide-divider">
                {portfolio.slice((clientPage - 1) * PAGE_SIZE, clientPage * PAGE_SIZE).map((client) => {
                  const mainVehicle = client.vehicles[0]
                  return (
                    <div key={client.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-inset/60 transition-colors">
                      <div className="w-9 h-9 rounded-xl bg-raised flex items-center justify-center text-sm font-bold text-ink-muted shrink-0">
                        {client.nom?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-ink">{client.nom}</span>
                          {client.quartier && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-raised text-ink-muted">{client.quartier}</span>
                          )}
                        </div>
                        <p className="text-xs text-ink-faded mt-0.5">
                          {client.contact}
                          {mainVehicle && <span className="text-ink-muted font-mono"> · {mainVehicle.immatriculation}</span>}
                        </p>
                        {client.email && (
                          <p className="text-[10px] text-ink-muted/60 truncate mt-0.5">{client.email}</p>
                        )}
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-2">
                        <span className="text-[11px] font-semibold text-info">{client.pointsFidelite} pts</span>
                        <div className="flex items-center gap-1.5">
                          {client.contact && (
                            <a
                              href={`tel:${client.contact}`}
                              className="w-7 h-7 rounded-lg bg-ok-wash flex items-center justify-center hover:bg-ok/20 transition-colors"
                              title="Appeler"
                            >
                              <Phone className="w-3.5 h-3.5 text-ok" />
                            </a>
                          )}
                          {client.email && (
                            <a
                              href={`mailto:${client.email}`}
                              className="w-7 h-7 rounded-lg bg-info-wash flex items-center justify-center hover:bg-info/20 transition-colors"
                              title="Envoyer un email"
                            >
                              <Mail className="w-3.5 h-3.5 text-info" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <Pager page={clientPage} total={portfolio.length} onChange={setClientPage} />
            </>
          )}
        </div>

      </motion.div>)}

    </AnimatePresence>
    </div>
  )
}
