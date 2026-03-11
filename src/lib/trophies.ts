export interface Trophy {
  id: string
  label: string
  description: string
  emoji: string
  threshold: number
  color: string
  bgColor: string
  gradient: string
  borderColor: string
}

export const LAVEUR_TROPHIES: Trophy[] = [
  {
    id: 'lav_10',
    label: 'Débutant',
    description: '10 lavages effectués',
    emoji: '🌱',
    threshold: 10,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    gradient: 'from-emerald-400 to-green-600',
    borderColor: 'border-emerald-500/40',
  },
  {
    id: 'lav_50',
    label: 'Régulier',
    description: '50 lavages effectués',
    emoji: '⚡',
    threshold: 50,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    gradient: 'from-blue-400 to-cyan-600',
    borderColor: 'border-blue-500/40',
  },
  {
    id: 'lav_100',
    label: 'Expérimenté',
    description: '100 lavages effectués',
    emoji: '🔥',
    threshold: 100,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    gradient: 'from-orange-400 to-red-500',
    borderColor: 'border-orange-500/40',
  },
  {
    id: 'lav_250',
    label: 'Expert',
    description: '250 lavages effectués',
    emoji: '💎',
    threshold: 250,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    gradient: 'from-purple-400 to-violet-600',
    borderColor: 'border-purple-500/40',
  },
  {
    id: 'lav_500',
    label: 'Champion',
    description: '500 lavages effectués',
    emoji: '🏆',
    threshold: 500,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    gradient: 'from-amber-400 to-yellow-600',
    borderColor: 'border-amber-500/40',
  },
  {
    id: 'lav_1000',
    label: 'Légende',
    description: '1000 lavages effectués',
    emoji: '👑',
    threshold: 1000,
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
    gradient: 'from-rose-400 to-pink-600',
    borderColor: 'border-rose-500/40',
  },
]

export const COMMERCIAL_TROPHIES: Trophy[] = [
  {
    id: 'com_5',
    label: 'Débutant',
    description: '5 inscriptions confirmées',
    emoji: '🌱',
    threshold: 5,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    gradient: 'from-emerald-400 to-green-600',
    borderColor: 'border-emerald-500/40',
  },
  {
    id: 'com_20',
    label: 'Prospecteur',
    description: '20 inscriptions confirmées',
    emoji: '⚡',
    threshold: 20,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    gradient: 'from-blue-400 to-cyan-600',
    borderColor: 'border-blue-500/40',
  },
  {
    id: 'com_50',
    label: 'Vendeur',
    description: '50 inscriptions confirmées',
    emoji: '🔥',
    threshold: 50,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    gradient: 'from-orange-400 to-red-500',
    borderColor: 'border-orange-500/40',
  },
  {
    id: 'com_100',
    label: 'Expert',
    description: '100 inscriptions confirmées',
    emoji: '💎',
    threshold: 100,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    gradient: 'from-purple-400 to-violet-600',
    borderColor: 'border-purple-500/40',
  },
  {
    id: 'com_200',
    label: 'Champion',
    description: '200 inscriptions confirmées',
    emoji: '🏆',
    threshold: 200,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    gradient: 'from-amber-400 to-yellow-600',
    borderColor: 'border-amber-500/40',
  },
  {
    id: 'com_500',
    label: 'Légende',
    description: '500 inscriptions confirmées',
    emoji: '👑',
    threshold: 500,
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
    gradient: 'from-rose-400 to-pink-600',
    borderColor: 'border-rose-500/40',
  },
]

export function getTrophiesForRole(role: 'laveur' | 'commercial'): Trophy[] {
  return role === 'laveur' ? LAVEUR_TROPHIES : COMMERCIAL_TROPHIES
}

export function getUnlockedTrophies(totalPoints: number, role: 'laveur' | 'commercial'): Trophy[] {
  return getTrophiesForRole(role).filter((t) => totalPoints >= t.threshold)
}

export function getNextTrophy(totalPoints: number, role: 'laveur' | 'commercial'): Trophy | null {
  return getTrophiesForRole(role).find((t) => totalPoints < t.threshold) ?? null
}

const seenKey = (userId: number) => `trophies_seen_${userId}`

export function getSeenTrophyIds(userId: number): string[] {
  try {
    return JSON.parse(localStorage.getItem(seenKey(userId)) ?? '[]') as string[]
  } catch {
    return []
  }
}

export function markTrophiesSeen(userId: number, ids: string[]): void {
  const seen = getSeenTrophyIds(userId)
  const updated = [...new Set([...seen, ...ids])]
  localStorage.setItem(seenKey(userId), JSON.stringify(updated))
}

export function getNewTrophies(totalPoints: number, role: 'laveur' | 'commercial', userId: number): Trophy[] {
  const unlocked = getUnlockedTrophies(totalPoints, role)
  const seen = getSeenTrophyIds(userId)
  return unlocked.filter((t) => !seen.includes(t.id))
}
