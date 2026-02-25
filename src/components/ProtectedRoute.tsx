import { Navigate } from 'react-router-dom'
import { useAuth, type UserRole } from '@/contexts/AuthContext'

interface Props {
  roles: UserRole[]
  children: React.ReactNode
}

export default function ProtectedRoute({ roles, children }: Props) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
      </div>
    )
  }

  // Not logged in
  if (!user) return <Navigate to="/" replace />

  // Wrong role
  if (!roles.includes(user.role as UserRole)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}
