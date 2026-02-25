import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Phone, Mail, Car, Award, Droplets, Wallet,
  Calendar, CreditCard, Tag, Palette, Truck, Loader2,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts'
import { useClient } from '@/api/clients'
import { useFichesPiste } from '@/api/fiches-piste'
import type { FichePiste } from '@/api/fiches-piste/types'

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } }
const rise = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } } }

const PIE_COLORS = ['#33cbcc', '#283852', '#5dd8d8', '#a78bfa', '#f472b6', '#f59e0b']

const tooltipStyle = {
  background: 'var(--c-panel)',
  border: '1px solid var(--c-edge)',
  borderRadius: 12,
  color: 'var(--c-ink)',
  fontSize: 13,
  boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
}

function getFicheTotal(f: FichePiste): number {
  const base = Number(f.typeLavage?.prixBase) || 0
  const extras = (f.extras || []).reduce((sum, e) => sum + (Number(e.prix) || 0), 0)
  return base + extras
}

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const clientId = Number(id) || 0

  const { data: client, isLoading: clientLoading, isError: clientError } = useClient(clientId)
  const { data: fichesData, isLoading: fichesLoading } = useFichesPiste({ clientId, limit: 200 })

  const fiches: FichePiste[] = fichesData?.data || []

  /* ── Computed stats ────────────────────────────────── */
  const totalSpent = useMemo(() => fiches.reduce((s, f) => s + getFicheTotal(f), 0), [fiches])
  const totalWashes = fiches.length
  const completedWashes = fiches.filter(f => f.statut === 'completed').length

  /* ── Chart: Spending over time (by month) ──────────── */
  const spendingByMonth = useMemo(() => {
    const map = new Map<string, number>()
    fiches.forEach(f => {
      const d = new Date(f.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      map.set(key, (map.get(key) || 0) + getFicheTotal(f))
    })
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([key, amount]) => {
        const [year, month] = key.split('-')
        const label = new Date(Number(year), Number(month) - 1).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
        return { name: label, montant: amount }
      })
  }, [fiches])

  /* ── Chart: Wash type distribution ─────────────────── */
  const washTypeDistribution = useMemo(() => {
    const map = new Map<string, number>()
    fiches.forEach(f => {
      const name = f.typeLavage?.nom || 'Inconnu'
      map.set(name, (map.get(name) || 0) + 1)
    })
    return Array.from(map.entries()).map(([name, count], i) => ({
      name,
      value: count,
      color: PIE_COLORS[i % PIE_COLORS.length],
    }))
  }, [fiches])

  /* ── Chart: Washes per month (bar) ─────────────────── */
  const washesPerMonth = useMemo(() => {
    const map = new Map<string, number>()
    fiches.forEach(f => {
      const d = new Date(f.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      map.set(key, (map.get(key) || 0) + 1)
    })
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([key, count]) => {
        const [year, month] = key.split('-')
        const label = new Date(Number(year), Number(month) - 1).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
        return { name: label, lavages: count }
      })
  }, [fiches])

  const isLoading = clientLoading || fichesLoading

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
        <p className="text-sm text-ink-muted">Chargement du profil client...</p>
      </div>
    )
  }

  if (clientError || !client) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
        <p className="text-red-500 text-sm">Client introuvable.</p>
        <button onClick={() => navigate('/clients')} className="text-accent text-sm hover:underline">
          Retour aux clients
        </button>
      </div>
    )
  }

  const initials = client.nom.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  const vehicles = client.vehicles || []
  const subscriptions = client.subscriptions || []
  const activeSubscriptions = subscriptions.filter(s => s.actif)

  const statCards = [
    { label: 'Total dépensé', value: `${totalSpent.toLocaleString()} FCFA`, icon: Wallet, accent: 'bg-teal-500/10 text-accent' },
    { label: 'Lavages effectués', value: totalWashes.toString(), sub: `${completedWashes} terminé${completedWashes !== 1 ? 's' : ''}`, icon: Droplets, accent: 'bg-blue-500/10 text-info' },
    { label: 'Véhicules', value: vehicles.length.toString(), icon: Car, accent: 'bg-amber-500/10 text-warn' },
    { label: 'Points fidélité', value: (Number(client.pointsFidelite) || 0).toLocaleString(), icon: Award, accent: 'bg-emerald-500/10 text-ok' },
  ]

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      {/* ── Header ──────────────────────────────────────── */}
      <motion.div variants={rise} className="flex items-start gap-4">
        <button
          onClick={() => navigate('/clients')}
          className="p-2 rounded-xl hover:bg-raised transition-colors text-ink-muted hover:text-ink mt-1"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-4 flex-1">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-navy-500 flex items-center justify-center text-white font-heading font-bold text-xl shrink-0 shadow-lg shadow-teal-500/20">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-heading text-2xl font-bold text-ink">{client.nom}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-1.5">
              {client.contact && (
                <span className="text-sm text-ink-faded flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> {client.contact}
                </span>
              )}
              {client.email && (
                <span className="text-sm text-ink-faded flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> {client.email}
                </span>
              )}
              <span className="text-xs text-ink-muted flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Client depuis {new Date(client.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {activeSubscriptions.length > 0 ? (
                activeSubscriptions.map(s => (
                  <span key={s.id} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-accent-wash text-accent-bold border border-accent-line">
                    <CreditCard className="w-3 h-3 inline mr-1" />
                    Abonnement {s.type}
                  </span>
                ))
              ) : (
                <span className="px-2.5 py-1 rounded-lg text-xs text-ink-muted bg-raised border border-edge">Sans abonnement</span>
              )}
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
              <p className="font-heading text-2xl font-bold text-ink">{s.value}</p>
              <p className="text-xs text-ink-faded mt-0.5">{s.label}</p>
              {'sub' in s && s.sub && <p className="text-[11px] text-ink-muted mt-0.5">{s.sub}</p>}
            </motion.div>
          )
        })}
      </div>

      {/* ── Charts row ──────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Spending over time */}
        <motion.div variants={rise} className="xl:col-span-2 bg-panel border border-edge rounded-2xl p-6 shadow-sm">
          <h3 className="font-heading font-semibold text-ink mb-1">Dépenses mensuelles</h3>
          <p className="text-sm text-ink-faded mb-4">Évolution des montants dépensés</p>
          {spendingByMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={spendingByMonth}>
                <defs>
                  <linearGradient id="gSpend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#33cbcc" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#33cbcc" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--c-edge)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--c-ink-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--c-ink-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v: number) => v >= 1000 ? `${v / 1000}k` : String(v)} />
                <RechartsTooltip contentStyle={tooltipStyle} formatter={(v: number | undefined) => [`${(v ?? 0).toLocaleString()} FCFA`, 'Dépensé']} />
                <Area type="monotone" dataKey="montant" stroke="#33cbcc" strokeWidth={2.5} fill="url(#gSpend)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center border border-dashed border-edge rounded-xl">
              <p className="text-sm text-ink-muted">Aucune donnée de dépenses</p>
            </div>
          )}
        </motion.div>

        {/* Wash type distribution */}
        <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl p-6 shadow-sm flex flex-col">
          <h3 className="font-heading font-semibold text-ink mb-4">Types de lavage</h3>
          {washTypeDistribution.length > 0 ? (
            <>
              <div className="flex-1 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={washTypeDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                      {washTypeDistribution.map(w => (
                        <Cell key={w.name} fill={w.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={tooltipStyle} formatter={(v: number | undefined) => [`${v ?? 0} lavage${(v ?? 0) > 1 ? 's' : ''}`, '']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-3">
                {washTypeDistribution.map(w => (
                  <div key={w.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: w.color }} />
                      <span className="text-ink-light truncate max-w-[140px]" title={w.name}>{w.name}</span>
                    </div>
                    <span className="text-ink-faded font-medium">{w.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center border border-dashed border-edge rounded-xl min-h-[200px]">
              <p className="text-sm text-ink-muted">Aucun lavage enregistré</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Washes per month bar chart ────────────────── */}
      {washesPerMonth.length > 0 && (
        <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl p-6 shadow-sm">
          <h3 className="font-heading font-semibold text-ink mb-1">Fréquence de lavage</h3>
          <p className="text-sm text-ink-faded mb-4">Nombre de visites par mois</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={washesPerMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--c-edge)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--c-ink-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--c-ink-muted)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
              <RechartsTooltip contentStyle={tooltipStyle} formatter={(v: number | undefined) => [`${v ?? 0} lavage${(v ?? 0) > 1 ? 's' : ''}`, 'Visites']} />
              <Bar dataKey="lavages" fill="#33cbcc" radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* ── Vehicles ────────────────────────────────────── */}
      <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl p-6 shadow-sm">
        <h3 className="font-heading font-semibold text-ink mb-4 flex items-center gap-2">
          <Car className="w-5 h-5 text-accent" /> Véhicules ({vehicles.length})
        </h3>
        {vehicles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {vehicles.map(v => (
              <div key={v.id} className="flex items-center gap-3 p-3.5 bg-inset rounded-xl border border-divider hover:border-edge transition-colors">
                <div className="w-10 h-10 rounded-lg bg-dim flex items-center justify-center shrink-0">
                  <Car className="w-5 h-5 text-ink-muted" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-semibold text-sm text-ink">{v.immatriculation}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                    {v.brand && (
                      <span className="text-xs text-ink-faded flex items-center gap-1">
                        <Tag className="w-2.5 h-2.5" /> {v.brand}
                      </span>
                    )}
                    {v.modele && (
                      <span className="text-xs text-ink-faded flex items-center gap-1">
                        <Truck className="w-2.5 h-2.5" /> {v.modele}
                      </span>
                    )}
                    {v.color && (
                      <span className="text-xs text-ink-faded flex items-center gap-1">
                        <Palette className="w-2.5 h-2.5" /> {v.color}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-6 border border-dashed border-edge rounded-xl">
            <p className="text-sm text-ink-muted">Aucun véhicule enregistré</p>
          </div>
        )}
      </motion.div>

      {/* ── Wash history table ───────────────────────────── */}
      <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-divider">
          <h3 className="font-heading font-semibold text-ink flex items-center gap-2">
            <Droplets className="w-5 h-5 text-accent" /> Historique des lavages ({totalWashes})
          </h3>
        </div>
        {fiches.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-faded uppercase tracking-wider bg-inset">
                  <th className="px-6 py-3 font-semibold">Date</th>
                  <th className="px-6 py-3 font-semibold">Véhicule</th>
                  <th className="px-6 py-3 font-semibold">Type</th>
                  <th className="px-6 py-3 font-semibold">Extras</th>
                  <th className="px-6 py-3 font-semibold">Statut</th>
                  <th className="px-6 py-3 font-semibold text-right">Montant</th>
                </tr>
              </thead>
              <tbody>
                {fiches.map((f, i) => {
                  const total = getFicheTotal(f)
                  const statusMap: Record<string, { label: string; cls: string }> = {
                    open: { label: 'Ouvert', cls: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
                    in_progress: { label: 'En cours', cls: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
                    completed: { label: 'Terminé', cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
                  }
                  const status = statusMap[f.statut] || { label: f.statut, cls: 'bg-raised text-ink-muted border-edge' }

                  return (
                    <tr key={f.id} className={`border-b border-divider last:border-0 ${i % 2 === 0 ? '' : 'bg-inset/50'} hover:bg-raised/50 transition-colors`}>
                      <td className="px-6 py-3 text-ink whitespace-nowrap">
                        {new Date(f.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-3 text-ink font-medium">
                        {f.vehicle?.immatriculation || '—'}
                        {f.vehicle?.modele && <span className="text-ink-faded font-normal ml-1.5">({f.vehicle.modele})</span>}
                      </td>
                      <td className="px-6 py-3 text-ink">{f.typeLavage?.nom || '—'}</td>
                      <td className="px-6 py-3">
                        {f.extras && f.extras.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {f.extras.map(e => (
                              <span key={e.id} className="px-1.5 py-0.5 bg-raised border border-edge rounded text-[11px] text-ink-faded">
                                {e.nom}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-ink-muted">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-medium border ${status.cls}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right font-semibold text-ink whitespace-nowrap">
                        {total.toLocaleString()} FCFA
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center p-8">
            <Droplets className="w-8 h-8 mx-auto mb-2 text-ink-muted" />
            <p className="text-sm text-ink-muted">Aucun lavage enregistré pour ce client</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
