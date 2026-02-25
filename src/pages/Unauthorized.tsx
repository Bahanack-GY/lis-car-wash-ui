import { useNavigate } from 'react-router-dom'
import { ShieldOff } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export default function Unauthorized() {
  const navigate = useNavigate()
  const { defaultPath } = useAuth()

  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
        <ShieldOff className="w-7 h-7 text-red-500" />
      </div>
      <h2 className="font-heading text-xl font-bold text-ink">Accès refusé</h2>
      <p className="text-sm text-ink-muted max-w-xs">
        Vous n'avez pas les permissions nécessaires pour accéder à cette page.
      </p>
      <button
        onClick={() => navigate(defaultPath)}
        className="mt-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-500 transition-colors"
      >
        Retour à l'accueil
      </button>
    </div>
  )
}
