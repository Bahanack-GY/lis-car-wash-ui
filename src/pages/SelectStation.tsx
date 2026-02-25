import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Building2, MapPin, Users, ArrowRight, LogOut, Sun, Moon, Clock,
} from 'lucide-react'
import Logo from '@/assets/Logo.png'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { useStations } from '@/api/stations'

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
}
const rise = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

export default function SelectStation() {
  const navigate = useNavigate()
  const { isDark, toggle } = useTheme()
  const { user, logout, setStation, defaultPath } = useAuth()
  const { data: stationsData, isLoading, isError } = useStations()

  const stationsList = stationsData || []

  // Non-super_admin should never reach this page — redirect immediately
  useEffect(() => {
    if (user && user.role !== 'super_admin') {
      navigate(defaultPath, { replace: true })
    }
  }, [user, defaultPath, navigate])

  const select = (id: number, status: string) => {
    if (status === 'active') {
      setStation(id)
      navigate(defaultPath)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const roleLabel: Record<string, string> = {
    super_admin: 'Super Administrateur',
    manager: 'Manager',
    controleur: 'Contrôleur',
    caissiere: 'Caissière',
    laveur: 'Laveur',
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 sm:px-10 py-5">
        <div className="flex items-center gap-3">
          <img src={Logo} alt="LIS" className="w-9 h-9 rounded-lg object-contain" />
          <div>
            <h1 className="font-heading font-bold text-sm text-ink leading-tight">LIS Car Wash</h1>
            <p className="text-[11px] text-ink-muted leading-tight">Système de gestion</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <div className="hidden sm:flex items-center gap-2 text-sm text-ink-muted">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white font-bold text-[10px]">
                {user.prenom[0]}{user.nom[0]}
              </div>
              <span className="font-medium text-ink">{user.prenom} {user.nom}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent-wash text-accent font-medium">
                {roleLabel[user.role] ?? user.role}
              </span>
            </div>
          )}
          <button
            onClick={toggle}
            className="text-ink-muted hover:text-ink p-2 rounded-xl hover:bg-raised transition-colors"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-ink-muted hover:text-bad transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-6 pb-16">
        <motion.div variants={stagger} initial="hidden" animate="show" className="w-full max-w-3xl">
          <motion.div variants={rise} className="text-center mb-10">
            <div className="w-14 h-14 rounded-2xl bg-accent-wash border border-accent-line flex items-center justify-center mx-auto mb-5">
              <Building2 className="w-7 h-7 text-accent" />
            </div>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-ink tracking-tight">
              Choisir une station
            </h2>
            <p className="text-ink-faded mt-3 max-w-md mx-auto">
              Sélectionnez la station sur laquelle vous travaillez aujourd'hui.
            </p>
          </motion.div>

          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
            </div>
          ) : isError ? (
            <div className="p-4 bg-red-500/10 text-red-500 rounded-xl text-center">
              Erreur lors du chargement des stations.
            </div>
          ) : stationsList.length === 0 ? (
            <div className="text-center text-ink-muted p-8 border border-dashed border-divider rounded-xl">
              Aucune station disponible.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {stationsList.map((s) => {
                const isOpen = s.status === 'active'
                return (
                  <motion.button
                    key={s.id}
                    variants={rise}
                    onClick={() => select(s.id, s.status)}
                    disabled={!isOpen}
                    whileHover={isOpen ? { scale: 1.02, y: -2 } : undefined}
                    whileTap={isOpen ? { scale: 0.98 } : undefined}
                    className={`relative text-left p-6 rounded-2xl border-2 transition-all duration-200 group flex flex-col ${
                      isOpen
                        ? 'bg-panel border-edge hover:border-teal-500 hover:shadow-lg hover:shadow-teal-500/10 cursor-pointer'
                        : 'bg-inset border-edge opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="absolute top-5 right-5">
                      {isOpen ? (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-ok">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                          </span>
                          Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
                          <Clock className="w-3 h-3" />
                          {s.status === 'upcoming' ? 'Bientôt' : 'Inactive'}
                        </span>
                      )}
                    </div>

                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${isOpen ? 'bg-accent-wash' : 'bg-raised'}`}>
                      <Building2 className={`w-5 h-5 ${isOpen ? 'text-accent' : 'text-ink-muted'}`} />
                    </div>

                    <h3 className="font-heading font-bold text-lg text-ink mb-1">{s.nom}</h3>
                    <p className="text-sm text-ink-faded flex items-center gap-1.5 mb-4 flex-1">
                      <MapPin className="w-3.5 h-3.5 text-ink-muted flex-shrink-0" />
                      {s.adresse}, {s.town}
                    </p>

                    {isOpen && (
                      <div className="flex items-center gap-4 pt-4 border-t border-divider mt-auto w-full">
                        <div className="flex items-center gap-1.5 text-sm text-ink-faded">
                          <Users className="w-3.5 h-3.5 text-ink-muted" />
                          <span className="font-semibold text-ink">{(s as any).employesActifs ?? 0}</span> employés
                        </div>
                      </div>
                    )}

                    {isOpen && (
                      <div className="absolute bottom-5 right-5 w-8 h-8 rounded-full bg-raised group-hover:bg-teal-500 flex items-center justify-center transition-all duration-200">
                        <ArrowRight className="w-4 h-4 text-ink-muted group-hover:text-white transition-colors" />
                      </div>
                    )}
                  </motion.button>
                )
              })}
            </div>
          )}

          <motion.p variants={rise} className="text-center text-xs text-ink-muted mt-8">
            Vous pouvez changer de station à tout moment depuis le menu
          </motion.p>
        </motion.div>
      </div>
    </div>
  )
}
