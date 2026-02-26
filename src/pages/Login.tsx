import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import Logo from '@/assets/Logo.png'
import { useLogin } from '@/api/auth'
import { useAuth } from '@/contexts/AuthContext'

export default function Login() {
  const [showPw, setShowPw] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()
  const { login, setStation } = useAuth()

  const loginMutation = useLogin();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await loginMutation.mutateAsync({ email, password })
      const { user: profile, access_token, refresh_token } = response

      // Store token + user in context/localStorage
      login(access_token, refresh_token, profile)

      if (profile.role === 'super_admin' || (profile.role === 'comptable' && profile.globalAccess)) {
        // Owner / global comptable picks their station manually
        navigate('/select-station')
      } else {
        // Everyone else is tied to their affectation station — auto-set it
        const stationId = profile.stationIds?.[0]
        if (stationId) {
          setStation(stationId)
        }
        // Navigate to role-appropriate default page
        const path =
          profile.role === 'laveur'      ? '/mon-espace'        :
          profile.role === 'caissiere'   ? '/coupons'           :
          profile.role === 'controleur'  ? '/fiches-piste'      :
          profile.role === 'commercial'  ? '/espace-commercial' :
          '/dashboard'
        navigate(path)
      }
    } catch (error) {
      console.error('Login failed:', error)
    }
  }

  return (
    <div className="min-h-screen flex bg-panel">
      {/* ── Left panel (decorative — stays dark) ────── */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
        className="hidden lg:flex lg:w-[55%] relative overflow-hidden flex-col items-center justify-center"
        style={{ background: 'linear-gradient(160deg, #283852 0%, #1a2b3d 50%, #162132 100%)' }}
      >
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-teal-500/[0.07] blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-teal-600/[0.05] blur-[100px]" />

        <div className="absolute bottom-0 left-0 right-0 h-[200px] overflow-hidden">
          <div className="wave-wrap">
            <div className="wave-shape" />
            <div className="wave-shape" />
            <div className="wave-shape" />
          </div>
        </div>

        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative z-10 text-center px-16">
          <motion.img
            src={Logo}
            alt="LIS Car Wash"
            className="w-36 h-36 mx-auto mb-10 drop-shadow-[0_20px_60px_rgba(51,203,204,0.25)]"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6, type: 'spring', stiffness: 120 }}
          />
          <motion.h1
            className="font-heading text-5xl font-bold text-white mb-4 tracking-tight"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
            LIS Car Wash
          </motion.h1>
          <motion.p
            className="text-teal-300/80 text-lg max-w-md mx-auto leading-relaxed"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.45, duration: 0.5 }}
          >
            Système de gestion intelligent pour vos stations de lavage automobile
          </motion.p>

          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: 4 + (i % 3) * 3,
                height: 4 + (i % 3) * 3,
                background: `rgba(51, 203, 204, ${0.15 + (i % 3) * 0.1})`,
                left: `${15 + i * 10}%`,
                bottom: '25%',
              }}
              animate={{
                y: [0, -180 - i * 30],
                opacity: [0.7, 0],
                scale: [1, 0.3],
              }}
              transition={{
                duration: 4 + i * 0.6,
                repeat: Infinity,
                delay: i * 0.9,
                ease: 'easeOut',
              }}
            />
          ))}
        </div>

        <motion.div
          className="absolute bottom-8 text-navy-300/60 text-xs tracking-widest uppercase"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          Propulsé par LIS Technologies
        </motion.div>
      </motion.div>

      {/* ── Right panel (form — light) ──────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full lg:w-[45%] flex items-center justify-center p-8 sm:p-12 bg-panel"
      >
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-12">
            <img src={Logo} alt="LIS" className="w-20 h-20 mx-auto mb-4" />
            <h1 className="font-heading text-2xl font-bold text-ink">
              LIS Car Wash
            </h1>
          </div>

          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <h2 className="font-heading text-3xl font-bold text-ink mb-2">
              Connexion
            </h2>
            <p className="text-ink-faded mb-10">
              Bienvenue ! Veuillez vous connecter à votre compte.
            </p>

            {loginMutation.isError && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm">
                Identifiants incorrects. Veuillez réessayer.
              </div>
            )}

            <form onSubmit={submit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-ink-light mb-2">
                  Adresse e-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@liscarwash.com"
                  className="w-full px-4 py-3 bg-inset border border-outline rounded-xl text-ink placeholder-ink-muted outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all duration-200"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-light mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 pr-12 bg-inset border border-outline rounded-xl text-ink placeholder-ink-muted outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all duration-200"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-light transition-colors"
                  >
                    {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-outline bg-panel"
                  />
                  <span className="text-sm text-ink-faded">Se souvenir de moi</span>
                </label>
                <button
                  type="button"
                  className="text-sm text-accent hover:text-accent-bold transition-colors"
                >
                  Mot de passe oublié ?
                </button>
              </div>

              <motion.button
                type="submit"
                disabled={loginMutation.isPending}
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                className="w-full py-3.5 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/25 hover:shadow-teal-500/35 flex items-center justify-center gap-2 group transition-shadow duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loginMutation.isPending ? 'Connexion en cours...' : 'Se connecter'}
                {!loginMutation.isPending && (
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                )}
              </motion.button>
            </form>

            <div className="mt-8 pt-8 border-t border-edge text-center">
              <p className="text-sm text-ink-muted">
                Problème de connexion ?{' '}
                <span className="text-accent hover:underline cursor-pointer">Contactez l'administrateur</span>
              </p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
