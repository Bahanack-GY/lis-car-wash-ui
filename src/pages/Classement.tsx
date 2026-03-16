import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Medal, Droplets, Megaphone, Crown, Lock } from '@/lib/icons'
import { useAuth } from '@/contexts/AuthContext'
import { useLeaderboard } from '@/api/users/queries'
import type { LeaderboardEntry } from '@/api/users/types'
import {
  getTrophiesForRole,
  getUnlockedTrophies,
  getNextTrophy,
  type Trophy as TrophyType,
} from '@/lib/trophies'

const rise = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}

const podiumColors = [
  { bg: 'bg-amber-400', text: 'text-amber-400', border: 'border-amber-400', icon: Crown },
  { bg: 'bg-slate-400', text: 'text-slate-400', border: 'border-slate-400', icon: Medal },
  { bg: 'bg-orange-500', text: 'text-orange-500', border: 'border-orange-500', icon: Medal },
]

function getInitials(nom: string, prenom: string) {
  return `${prenom[0] ?? ''}${nom[0] ?? ''}`.toUpperCase()
}

function PodiumCard({ entry, position }: { entry: LeaderboardEntry; position: 0 | 1 | 2 }) {
  const cfg = podiumColors[position]
  const Icon = cfg.icon
  const heights = ['h-28', 'h-20', 'h-16']

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <div className={`w-16 h-16 rounded-2xl bg-panel border-2 ${cfg.border} flex items-center justify-center text-lg font-bold text-ink shadow-lg`}>
          {getInitials(entry.nom, entry.prenom)}
        </div>
        <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full ${cfg.bg} flex items-center justify-center`}>
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-ink leading-tight">{entry.prenom} {entry.nom}</p>
        <p className={`text-xs font-bold ${cfg.text}`}>{Number(entry.totalPoints).toLocaleString()} pts</p>
      </div>
      <div className={`w-20 ${heights[position]} ${cfg.bg} rounded-t-xl opacity-20`} />
    </div>
  )
}

function RankingList({
  entries,
  currentUserId,
  pointsLabel,
}: {
  entries: LeaderboardEntry[]
  currentUserId?: number
  pointsLabel: string
}) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-ink-muted">
        <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Aucun résultat disponible</p>
      </div>
    )
  }

  const rankIcons: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

  return (
    <div className="divide-y divide-edge">
      {entries.map((entry) => {
        const isMe = entry.id === currentUserId
        return (
          <div
            key={entry.id}
            className={`flex items-center gap-4 px-6 py-3.5 transition-colors ${isMe ? 'bg-teal-500/5 border-l-2 border-teal-500' : 'hover:bg-raised/50'}`}
          >
            <div className="w-8 text-center shrink-0">
              {rankIcons[entry.rank] ? (
                <span className="text-lg">{rankIcons[entry.rank]}</span>
              ) : (
                <span className="text-sm font-bold text-ink-muted">#{entry.rank}</span>
              )}
            </div>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${isMe ? 'bg-teal-500 text-white' : 'bg-raised text-ink-muted'}`}>
              {getInitials(entry.nom, entry.prenom)}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold leading-tight ${isMe ? 'text-teal-600' : 'text-ink'}`}>
                {entry.prenom} {entry.nom}
                {isMe && <span className="ml-2 text-xs font-normal text-teal-500">(vous)</span>}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-ink">{Number(entry.totalPoints).toLocaleString()}</p>
              <p className="text-xs text-ink-muted">{pointsLabel}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TrophyShowcase({
  totalPoints,
  role,
}: {
  totalPoints: number
  role: 'laveur' | 'commercial'
}) {
  const allTrophies = getTrophiesForRole(role)
  const unlocked = getUnlockedTrophies(totalPoints, role)
  const next = getNextTrophy(totalPoints, role)
  const unlockedIds = new Set(unlocked.map((t) => t.id))

  // Progress toward next trophy
  const prevThreshold = unlocked.length > 0 ? unlocked[unlocked.length - 1].threshold : 0
  const nextThreshold = next?.threshold ?? prevThreshold
  const progressPct = next
    ? Math.min(100, ((totalPoints - prevThreshold) / (nextThreshold - prevThreshold)) * 100)
    : 100

  return (
    <div className="bg-panel border border-edge rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-edge flex items-center justify-between">
        <h3 className="font-heading font-semibold text-ink">Mes trophées</h3>
        <span className="text-xs text-ink-muted bg-raised px-2.5 py-1 rounded-full">
          {unlocked.length}/{allTrophies.length} débloqués
        </span>
      </div>

      {/* Next trophy progress */}
      {next && (
        <div className="px-6 py-4 border-b border-edge">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-ink-muted">Prochain trophée</span>
            <span className="text-xs font-semibold text-ink">
              {totalPoints} / {next.threshold} pts
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2.5 bg-raised rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full bg-linear-to-r ${next.gradient}`}
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
              />
            </div>
            <span className="text-lg shrink-0" title={next.label}>{next.emoji}</span>
          </div>
          <p className="text-xs text-ink-muted mt-1">
            Encore <span className="font-semibold text-ink">{next.threshold - totalPoints}</span> points pour obtenir <span className={`font-semibold ${next.color}`}>{next.label}</span>
          </p>
        </div>
      )}

      {/* Trophy grid */}
      <div className="p-6 grid grid-cols-3 gap-3">
        {allTrophies.map((trophy) => {
          const isUnlocked = unlockedIds.has(trophy.id)
          return (
            <motion.div
              key={trophy.id}
              whileHover={isUnlocked ? { scale: 1.05 } : undefined}
              title={trophy.description}
              className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${
                isUnlocked
                  ? `${trophy.bgColor} ${trophy.borderColor} cursor-default`
                  : 'bg-raised border-edge opacity-50'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                isUnlocked
                  ? `bg-linear-to-br ${trophy.gradient} shadow-sm`
                  : 'bg-surface'
              }`}>
                {isUnlocked ? (
                  <span role="img" aria-label={trophy.label}>{trophy.emoji}</span>
                ) : (
                  <Lock className="w-5 h-5 text-ink-faded" />
                )}
              </div>
              <div className="text-center">
                <p className={`text-xs font-semibold leading-tight ${isUnlocked ? trophy.color : 'text-ink-faded'}`}>
                  {trophy.label}
                </p>
                <p className="text-[10px] text-ink-faded leading-tight mt-0.5">
                  {trophy.threshold} pts
                </p>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

function LeaderboardSection({
  type,
  stationId,
  currentUserId,
}: {
  type: 'laveurs' | 'commerciaux'
  stationId?: number
  currentUserId?: number
}) {
  const { data: entries = [], isFetching } = useLeaderboard(type, stationId)
  const pointsLabel = type === 'laveurs' ? 'lavages' : 'inscrits'
  const top3 = entries.slice(0, 3)
  const myEntry = entries.find((e) => e.id === currentUserId)
  const role = type === 'laveurs' ? 'laveur' : 'commercial'

  // Podium order: 2nd left, 1st center, 3rd right
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean) as LeaderboardEntry[]
  const podiumPositions: Array<0 | 1 | 2> = [1, 0, 2]

  // Spinner only while fetching with no data yet
  if (isFetching && entries.length === 0) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
      </div>
    )
  }

  // Empty state when fetch is done and there's nothing
  if (!isFetching && entries.length === 0) {
    return (
      <div className="bg-panel border border-edge rounded-2xl text-center py-16 text-ink-muted">
        <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">Aucun participant trouvé</p>
        <p className="text-xs text-ink-faded mt-1">
          {type === 'laveurs' ? 'Aucun laveur actif pour le moment' : 'Aucun commercial actif pour le moment'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* My rank + trophy showcase (for laveurs/commerciaux) */}
      {currentUserId && myEntry && (
        <>
          <div className="bg-teal-500/10 border border-teal-500/30 rounded-2xl px-6 py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {getInitials(myEntry.nom, myEntry.prenom)}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-ink">Votre classement</p>
              <p className="text-xs text-ink-muted">
                {myEntry.rank <= 3
                  ? `🏆 ${myEntry.rank === 1 ? '1ère' : `${myEntry.rank}ème`} place`
                  : `#${myEntry.rank} sur ${entries.length}`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-teal-500">{Number(myEntry.totalPoints).toLocaleString()}</p>
              <p className="text-xs text-ink-muted">{pointsLabel}</p>
            </div>
          </div>

          <TrophyShowcase totalPoints={Number(myEntry.totalPoints)} role={role} />
        </>
      )}

      {/* Podium */}
      {top3.length > 0 && (
        <div className="bg-panel border border-edge rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-ink-muted mb-6 text-center uppercase tracking-wider">Top 3</h3>
          <div className="flex items-end justify-center gap-4">
            {podiumOrder.map((entry, i) => (
              <PodiumCard key={entry.id} entry={entry} position={podiumPositions[i]} />
            ))}
          </div>
        </div>
      )}

      {/* Full list */}
      {entries.length > 0 && (
        <div className="bg-panel border border-edge rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-edge flex items-center justify-between">
            <h3 className="font-heading font-semibold text-ink">Classement complet</h3>
            <span className="text-xs text-ink-muted bg-raised px-2.5 py-1 rounded-full">
              {entries.length} participants
            </span>
          </div>
          <RankingList entries={entries} currentUserId={currentUserId} pointsLabel={pointsLabel} />
        </div>
      )}
    </div>
  )
}

export default function Classement() {
  const { user, selectedStationId } = useAuth()
  const isLaveur = user?.role === 'laveur'
  const isCommercial = user?.role === 'commercial'
  const isObserver = !isLaveur && !isCommercial

  const [tab, setTab] = useState<'laveurs' | 'commerciaux'>(isCommercial ? 'commerciaux' : 'laveurs')

  const stationId = isObserver ? (selectedStationId ?? undefined) : undefined

  // Prefetch both tabs for observers so switching is instant
  useLeaderboard('laveurs', isObserver ? stationId : undefined)
  useLeaderboard('commerciaux', isObserver ? stationId : undefined)

  return (
    <motion.div
      variants={{ show: { transition: { staggerChildren: 0.08 } } }}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-2xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={rise} className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <h1 className="font-heading font-bold text-xl text-ink">Classement</h1>
          <p className="text-xs text-ink-muted">Programme de récompenses</p>
        </div>
      </motion.div>

      {/* Tab selector — only for admins/controleurs */}
      {isObserver && (
        <motion.div variants={rise} className="flex bg-raised rounded-xl p-1 gap-1">
          <button
            onClick={() => setTab('laveurs')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'laveurs' ? 'bg-panel text-ink shadow-sm' : 'text-ink-muted hover:text-ink'}`}
          >
            <Droplets className="w-4 h-4" />
            Laveurs
          </button>
          <button
            onClick={() => setTab('commerciaux')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'commerciaux' ? 'bg-panel text-ink shadow-sm' : 'text-ink-muted hover:text-ink'}`}
          >
            <Megaphone className="w-4 h-4" />
            Commerciaux
          </button>
        </motion.div>
      )}

      {/* Role label for laveurs/commerciaux */}
      {!isObserver && (
        <motion.div variants={rise} className="flex items-center gap-2 flex-wrap">
          {isLaveur ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-600">
              <Droplets className="w-3.5 h-3.5" /> Classement Laveurs
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-600">
              <Megaphone className="w-3.5 h-3.5" /> Classement Commerciaux
            </span>
          )}
          <span className="text-xs text-ink-muted">Toutes stations confondues</span>
        </motion.div>
      )}

      {/* Leaderboard content */}
      {isLaveur && (
        <LeaderboardSection type="laveurs" currentUserId={user?.id} stationId={stationId} />
      )}
      {isCommercial && (
        <LeaderboardSection type="commerciaux" currentUserId={user?.id} stationId={stationId} />
      )}
      {isObserver && (
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <LeaderboardSection type={tab} stationId={stationId} />
          </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  )
}
