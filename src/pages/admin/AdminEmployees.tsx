import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  UserCog, Car, Award, MapPin, Search, X,
  Phone, Mail, Shield, ChevronRight, Star,
} from 'lucide-react'
import { useUsers } from '@/api/users/queries'
import { useStations } from '@/api/stations/queries'
import type { User, UserFilters } from '@/api/users/types'

/* ─── Animations ──────────────────────────────────────────────────── */
const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const rise = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

/* ─── Role config ─────────────────────────────────────────────────── */
const roleConfig: Record<string, { label: string; color: string; bg: string }> = {
  super_admin: { label: 'Super Admin', color: 'text-purple-600', bg: 'bg-purple-500/10' },
  manager:     { label: 'Manager',     color: 'text-blue-600',   bg: 'bg-blue-500/10' },
  controleur:  { label: 'Contrôleur',  color: 'text-teal-600',   bg: 'bg-teal-500/10' },
  caissiere:   { label: 'Caissière',   color: 'text-amber-600',  bg: 'bg-amber-500/10' },
  laveur:      { label: 'Laveur',      color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  commercial:  { label: 'Commercial',  color: 'text-pink-600',   bg: 'bg-pink-500/10' },
}

const roleTabs = ['Tous', 'Admin', 'Manager', 'Contrôleur', 'Caissière', 'Laveur', 'Commercial']
const roleTabMap: Record<string, string | undefined> = {
  Tous: undefined,
  Admin: 'super_admin',
  Manager: 'manager',
  Contrôleur: 'controleur',
  Caissière: 'caissiere',
  Laveur: 'laveur',
  Commercial: 'commercial',
}

export default function AdminEmployees() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [roleTab, setRoleTab] = useState('Tous')

  const filters: UserFilters = useMemo(() => ({
    role: roleTabMap[roleTab] as UserFilters['role'],
    search: search || undefined,
    limit: 200,
  }), [roleTab, search])

  const { data, isLoading } = useUsers(filters)
  const { data: stationsList } = useStations()
  const users: User[] = useMemo(() => {
    if (!data) return []
    return Array.isArray(data) ? data : (data as any).data ?? []
  }, [data])

  const stations = stationsList || []

  const laveurCount = users.filter(u => u.role === 'laveur').length
  const caissiereCount = users.filter(u => u.role === 'caissiere').length

  const stats = [
    { label: 'Total employés', value: users.length, icon: UserCog, accent: 'bg-teal-500/10 text-accent' },
    { label: 'Laveurs', value: laveurCount, icon: Car, accent: 'bg-blue-500/10 text-info' },
    { label: 'Caissières', value: caissiereCount, icon: Award, accent: 'bg-emerald-500/10 text-ok' },
    { label: 'Stations', value: stations.length, icon: MapPin, accent: 'bg-amber-500/10 text-warn' },
  ]

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <motion.div key={s.label} variants={rise} className="bg-panel border border-edge rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-xl ${s.accent}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <p className="font-heading text-2xl font-bold text-ink">{s.value}</p>
              <p className="text-sm text-ink-faded mt-0.5">{s.label}</p>
            </motion.div>
          )
        })}
      </div>

      {/* Search + Role tabs */}
      <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2 bg-inset border border-edge rounded-xl px-3 py-2 focus-within:border-teal-500/40 transition-colors">
          <Search className="w-4 h-4 text-ink-muted shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou email..."
            className="bg-transparent text-sm text-ink placeholder-ink-muted outline-none flex-1"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-ink-muted hover:text-ink-light">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {roleTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setRoleTab(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                roleTab === tab
                  ? 'bg-accent-wash text-accent'
                  : 'text-ink-muted hover:text-ink hover:bg-raised'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Employee cards */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
        </div>
      ) : users.length === 0 ? (
        <motion.div variants={rise} className="text-center py-12">
          <UserCog className="w-10 h-10 mx-auto text-ink-muted opacity-30 mb-3" />
          <p className="text-sm text-ink-muted">Aucun employé trouvé</p>
        </motion.div>
      ) : (
        <motion.div variants={stagger} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {users.map((u) => {
            const rc = roleConfig[u.role] ?? roleConfig.laveur
            const initials = `${u.prenom[0]}${u.nom[0]}`
            const activeStations = u.affectations?.filter(a => a.statut === 'active') ?? []

            return (
              <motion.div
                key={u.id}
                variants={rise}
                onClick={() => navigate(`/employes/${u.id}`)}
                className="bg-panel border border-edge rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-teal-500 to-teal-800 flex items-center justify-center text-white font-bold text-sm shrink-0 uppercase">
                      {initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">{u.prenom} {u.nom}</p>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${rc.color}`}>
                        <Shield className="w-3 h-3" />
                        {rc.label}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${u.actif ? 'bg-emerald-500' : 'bg-red-400'}`} />
                    <ChevronRight className="w-4 h-4 text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>

                {/* Contact */}
                <div className="space-y-1 mb-3">
                  {u.telephone && (
                    <div className="flex items-center gap-2 text-xs text-ink-light">
                      <Phone className="w-3 h-3 text-ink-muted" />
                      {u.telephone}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-ink-light">
                    <Mail className="w-3 h-3 text-ink-muted" />
                    {u.email}
                  </div>
                </div>

                {/* Laveur-specific stats */}
                {u.role === 'laveur' && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-inset rounded-lg p-2 text-center">
                      <p className="text-sm font-bold text-ink">—</p>
                      <p className="text-[10px] text-ink-muted">Véhicules</p>
                    </div>
                    <div className="bg-inset rounded-lg p-2 text-center">
                      <p className="text-sm font-bold text-ink">{u.bonusParLavage ?? 0}</p>
                      <p className="text-[10px] text-ink-muted">Bonus FCFA</p>
                    </div>
                    <div className="bg-inset rounded-lg p-2 text-center flex items-center justify-center gap-0.5">
                      <Star className="w-3 h-3 text-amber-500" />
                      <p className="text-sm font-bold text-ink">—</p>
                    </div>
                  </div>
                )}

                {/* Station assignments */}
                {activeStations.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {activeStations.map((a) => (
                      <span
                        key={a.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium bg-inset text-ink-light border border-edge"
                      >
                        <MapPin className="w-2.5 h-2.5" />
                        {a.station?.nom ?? `Station #${a.stationId}`}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </motion.div>
  )
}
