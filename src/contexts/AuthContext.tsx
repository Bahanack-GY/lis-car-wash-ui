import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { authApi } from '@/api/auth/api'
import type { UserProfile } from '@/api/auth/types'

export type UserRole = 'super_admin' | 'manager' | 'controleur' | 'caissiere' | 'laveur'

interface AuthContextValue {
  user: UserProfile | null
  selectedStationId: number | null
  isLoading: boolean
  login: (token: string, refreshToken: string, user: UserProfile) => void
  logout: () => void
  setStation: (id: number) => void
  hasRole: (...roles: UserRole[]) => boolean
  defaultPath: string
}

const AuthContext = createContext<AuthContextValue | null>(null)

function autoStation(profile: UserProfile): number | null {
  if (profile.role === 'super_admin') return null
  return profile.stationIds?.[0] ?? null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })

  const [selectedStationId, setSelectedStationId] = useState<number | null>(() => {
    // Restore from localStorage
    const s = localStorage.getItem('selectedStation')
    if (s) return Number(s)
    // For non-super_admin, restore from stored user's stationIds
    const stored = localStorage.getItem('user')
    if (stored) {
      const profile: UserProfile = JSON.parse(stored)
      const sid = autoStation(profile)
      if (sid) {
        localStorage.setItem('selectedStation', sid.toString())
        return sid
      }
    }
    return null
  })

  const [isLoading, setIsLoading] = useState(
    !localStorage.getItem('user') && !!localStorage.getItem('token')
  )

  // Token exists but user not cached — fetch profile
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token && !user) {
      setIsLoading(true)
      authApi.getProfile()
        .then((profile) => {
          setUser(profile)
          localStorage.setItem('user', JSON.stringify(profile))
          // Auto-set station for non-super_admin
          if (!localStorage.getItem('selectedStation')) {
            const sid = autoStation(profile)
            if (sid) {
              localStorage.setItem('selectedStation', sid.toString())
              setSelectedStationId(sid)
            }
          }
        })
        .catch(() => {
          localStorage.removeItem('token')
          localStorage.removeItem('refresh_token')
          localStorage.removeItem('user')
        })
        .finally(() => setIsLoading(false))
    }
  }, [])

  const login = (token: string, refreshToken: string, profile: UserProfile) => {
    localStorage.setItem('token', token)
    localStorage.setItem('refresh_token', refreshToken)
    localStorage.setItem('user', JSON.stringify(profile))
    setUser(profile)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    localStorage.removeItem('selectedStation')
    setUser(null)
    setSelectedStationId(null)
  }

  const setStation = (id: number) => {
    localStorage.setItem('selectedStation', id.toString())
    setSelectedStationId(id)
  }

  const hasRole = (...roles: UserRole[]) => {
    if (!user) return false
    return roles.includes(user.role as UserRole)
  }

  const defaultPath = (() => {
    if (!user) return '/dashboard'
    switch (user.role) {
      case 'laveur':    return '/mon-espace'
      case 'caissiere': return '/coupons'
      case 'controleur':return '/fiches-piste'
      default:          return '/dashboard'
    }
  })()

  return (
    <AuthContext.Provider value={{ user, selectedStationId, isLoading, login, logout, setStation, hasRole, defaultPath }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
