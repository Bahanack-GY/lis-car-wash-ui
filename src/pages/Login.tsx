import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, ArrowRight } from '@/lib/icons'
import Logo from '@/assets/Logo.png'
import { useLogin } from '@/api/auth'
import { useAuth } from '@/contexts/AuthContext'

const NAVY   = '#283852'
const TEAL   = '#33cbcc'
const WASH   = '#e3f6f6'

function getTimeContext(): { greeting: string; note: string } {
  const h = new Date().getHours()
  if (h >= 5  && h < 12) return { greeting: 'Bonne matinée',  note: "La journée commence. L'équipe vous attend." }
  if (h >= 12 && h < 14) return { greeting: 'Bonne journée',  note: 'Service de mi-journée en cours.' }
  if (h >= 14 && h < 19) return { greeting: 'Bon après-midi', note: "L'activité bat son plein." }
  if (h >= 19 && h < 22) return { greeting: 'Bonne soirée',   note: 'La journée tire à sa fin.' }
  return                         { greeting: 'Bonne nuit',     note: 'Quelqu\'un travaille tard ce soir.' }
}

export default function Login() {
  const timeCtx = getTimeContext()
  const [showPw, setShowPw] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()
  const { login, setStation } = useAuth()

  const loginMutation = useLogin()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await loginMutation.mutateAsync({ email, password })
      const { user: profile, access_token, refresh_token } = response

      login(access_token, refresh_token, profile)

      if (profile.role === 'super_admin' || (profile.role === 'comptable' && profile.globalAccess)) {
        navigate('/select-station')
      } else {
        const stationId = profile.stationIds?.[0]
        if (stationId) setStation(stationId)
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
    <div className="min-h-screen flex" style={{ background: WASH }}>

      {/* ── Left panel — Navy ──────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col items-center justify-center p-16"
        style={{ background: NAVY }}
      >

        {/* Content */}
        <div className="relative z-10 text-center">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5, type: 'spring', stiffness: 150 }}
            className="w-24 h-24 mx-auto mb-8 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(51,203,204,0.15)', border: `1.5px solid rgba(51,203,204,0.3)` }}
          >
            <img src={Logo} alt="LIS" className="w-14 h-14 object-contain" />
          </motion.div>

          <motion.h1
            className="font-heading font-bold text-white mb-3"
            style={{ fontSize: 'clamp(36px, 4vw, 52px)', letterSpacing: '-0.02em', lineHeight: 1.1 }}
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            LIS Car Wash
          </motion.h1>

          <motion.p
            className="font-body text-base max-w-xs mx-auto leading-relaxed"
            style={{ color: WASH, opacity: 0.8 }}
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            Système de gestion intelligent pour vos stations de lavage automobile
          </motion.p>

          {/* Time-of-day greeting */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 mx-auto max-w-[220px]"
            style={{
              borderTop: `1px solid rgba(51,203,204,0.2)`,
              paddingTop: '1.25rem',
            }}
          >
            <p className="font-heading text-sm font-medium text-white" style={{ opacity: 0.9 }}>
              {timeCtx.greeting}
            </p>
            <p className="font-body text-xs mt-1" style={{ color: WASH, opacity: 0.5 }}>
              {timeCtx.note}
            </p>
          </motion.div>

        </div>

        {/* Bottom brand */}
        <motion.p
          className="absolute bottom-6 text-xs font-body tracking-widest uppercase"
          style={{ color: WASH, opacity: 0.3 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ delay: 0.8 }}
        >
          LIS Technologies · {new Date().getFullYear()}
        </motion.p>
      </motion.div>

      {/* ── Right panel — White form ───────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="w-full lg:w-[48%] flex items-center justify-center p-6 sm:p-10 lg:p-14 bg-panel"
      >
        <div className="w-full max-w-[400px]">

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <div
              className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
              style={{ background: WASH }}
            >
              <img src={Logo} alt="LIS" className="w-10 h-10 object-contain" />
            </div>
            <h1 className="font-heading text-2xl font-bold" style={{ color: NAVY }}>
              LIS Car Wash
            </h1>
          </div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
            <h2 className="font-heading font-bold mb-1" style={{ fontSize: 32, color: NAVY, letterSpacing: '-0.02em' }}>
              Connexion
            </h2>
            <p className="font-body mb-8" style={{ color: 'var(--c-ink-muted)' }}>
              Bienvenue ! Veuillez vous connecter à votre compte.
            </p>

            {/* Error */}
            {loginMutation.isError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 p-3.5 rounded-xl text-sm font-body flex items-center gap-2"
                style={{
                  background: 'var(--c-bad-wash)',
                  border: '1px solid var(--c-bad-line)',
                  color: 'var(--c-bad)',
                }}
              >
                Identifiants incorrects. Veuillez réessayer.
              </motion.div>
            )}

            <form onSubmit={submit} className="space-y-5">
              {/* Email */}
              <div>
                <label
                  className="block text-xs font-semibold font-body tracking-wide mb-2"
                  style={{ color: NAVY }}
                >
                  Adresse e-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@liscarwash.com"
                  className="w-full px-4 py-3 text-sm rounded-xl border outline-none transition-all duration-200 font-body"
                  style={{
                    background: 'var(--c-inset)',
                    borderColor: 'var(--c-outline)',
                    color: 'var(--c-ink)',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = TEAL
                    e.target.style.boxShadow = `0 0 0 3px rgba(51,203,204,0.15)`
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--c-outline)'
                    e.target.style.boxShadow = 'none'
                  }}
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label
                  className="block text-xs font-semibold font-body tracking-wide mb-2"
                  style={{ color: NAVY }}
                >
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 pr-12 text-sm rounded-xl border outline-none transition-all duration-200 font-body"
                    style={{
                      background: 'var(--c-inset)',
                      borderColor: 'var(--c-outline)',
                      color: 'var(--c-ink)',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = TEAL
                      e.target.style.boxShadow = `0 0 0 3px rgba(51,203,204,0.15)`
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--c-outline)'
                      e.target.style.boxShadow = 'none'
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: 'var(--c-ink-muted)' }}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Options */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded"
                    style={{ accentColor: TEAL }}
                  />
                  <span className="text-sm font-body" style={{ color: 'var(--c-ink-faded)' }}>
                    Se souvenir de moi
                  </span>
                </label>
                <span
                  className="text-sm font-body"
                  style={{ color: 'var(--c-ink-muted)' }}
                >
                  Mot de passe oublié ? Contactez l'admin.
                </span>
              </div>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={loginMutation.isPending}
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                className="w-full py-3.5 rounded-xl font-body font-semibold text-sm flex items-center justify-center gap-2 group transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: loginMutation.isPending ? 'var(--c-dim)' : TEAL,
                  color: '#ffffff',
                  boxShadow: loginMutation.isPending ? 'none' : `0 4px 16px rgba(51,203,204,0.35)`,
                }}
              >
                {loginMutation.isPending ? 'Connexion…' : 'Se connecter'}
                {!loginMutation.isPending && (
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                )}
              </motion.button>
            </form>

            {/* Footer */}
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
