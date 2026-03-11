import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useLeaderboard } from '@/api/users/queries'
import { getNewTrophies, markTrophiesSeen } from '@/lib/trophies'
import type { Trophy } from '@/lib/trophies'
import TrophyUnlockPopup from './TrophyUnlockPopup'

export default function TrophyManager() {
  const { user } = useAuth()
  const [pendingTrophies, setPendingTrophies] = useState<Trophy[]>([])
  const [checked, setChecked] = useState(false)

  const isEligible = user?.role === 'laveur' || user?.role === 'commercial'
  const leaderboardType = user?.role === 'commercial' ? 'commerciaux' : 'laveurs'

  const { data: leaderboard } = useLeaderboard(
    leaderboardType,
    undefined,
  )

  useEffect(() => {
    if (!isEligible || !user || !leaderboard || checked) return

    const myEntry = leaderboard.find((e) => e.id === user.id)
    if (!myEntry) return

    const role = user.role as 'laveur' | 'commercial'
    const newTrophies = getNewTrophies(Number(myEntry.totalPoints), role, user.id)

    if (newTrophies.length > 0) {
      setPendingTrophies(newTrophies)
    }

    setChecked(true)
  }, [leaderboard, user, isEligible, checked])

  const handleDismiss = () => {
    if (!user) return
    markTrophiesSeen(user.id, pendingTrophies.map((t) => t.id))
    setPendingTrophies([])
  }

  if (pendingTrophies.length === 0) return null

  return <TrophyUnlockPopup trophies={pendingTrophies} onDismiss={handleDismiss} />
}
