import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X } from '@/lib/icons'
import type { Trophy } from '@/lib/trophies'

interface Props {
  trophies: Trophy[]
  onDismiss: () => void
}

const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  delay: Math.random() * 0.6,
  duration: 1.2 + Math.random() * 0.8,
  size: 4 + Math.random() * 8,
  color: ['#fbbf24', '#f59e0b', '#fb923c', '#a78bfa', '#34d399', '#60a5fa'][Math.floor(Math.random() * 6)],
}))

export default function TrophyUnlockPopup({ trophies, onDismiss }: Props) {
  const [current, setCurrent] = useState(0)
  const trophy = trophies[current]
  const isLast = current === trophies.length - 1

  // Auto-reset current when trophies change
  useEffect(() => {
    setCurrent(0)
  }, [trophies])

  if (!trophy) return null

  const handleNext = () => {
    if (isLast) {
      onDismiss()
    } else {
      setCurrent((c) => c + 1)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        style={{ backdropFilter: 'blur(12px)', backgroundColor: 'rgba(0,0,0,0.6)' }}
      >
        {/* Floating particles */}
        {PARTICLES.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: `${p.x}%`,
              bottom: '-10px',
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
            }}
            animate={{
              y: [0, -window.innerHeight - 100],
              opacity: [0, 1, 1, 0],
              rotate: [0, 360],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
        ))}

        {/* Card */}
        <motion.div
          key={trophy.id}
          initial={{ scale: 0.5, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: -20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          className="relative w-full max-w-sm mx-auto"
        >
          {/* Glow behind card */}
          <div className={`absolute inset-0 rounded-3xl bg-linear-to-br ${trophy.gradient} opacity-20 blur-2xl scale-110`} />

          <div className="relative bg-panel border border-edge rounded-3xl overflow-hidden shadow-2xl">
            {/* Top gradient strip */}
            <div className={`h-2 w-full bg-linear-to-r ${trophy.gradient}`} />

            {/* Close / skip button */}
            <button
              onClick={onDismiss}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-raised flex items-center justify-center text-ink-muted hover:text-ink transition-colors z-10"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="p-8 flex flex-col items-center text-center gap-4">
              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-semibold">
                <Sparkles className="w-3 h-3" />
                Nouveau trophée débloqué !
              </div>

              {/* Emoji with bounce */}
              <motion.div
                animate={{
                  scale: [1, 1.15, 0.95, 1.08, 1],
                  rotate: [0, -5, 5, -3, 0],
                }}
                transition={{ duration: 0.8, delay: 0.2, ease: 'easeInOut' }}
                className={`w-28 h-28 rounded-3xl bg-linear-to-br ${trophy.gradient} flex items-center justify-center shadow-lg`}
              >
                <span className="text-6xl" role="img" aria-label={trophy.label}>
                  {trophy.emoji}
                </span>
              </motion.div>

              {/* Trophy name */}
              <div>
                <h2 className="font-heading font-bold text-2xl text-ink">{trophy.label}</h2>
                <p className="text-sm text-ink-muted mt-1">{trophy.description}</p>
              </div>

              {/* Motivational message */}
              <p className="text-xs text-ink-faded italic px-4">
                {motivationalMessage(trophy)}
              </p>

              {/* Progress indicator for multiple trophies */}
              {trophies.length > 1 && (
                <div className="flex gap-1.5">
                  {trophies.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? 'w-6 bg-teal-500' : 'w-1.5 bg-edge'}`}
                    />
                  ))}
                </div>
              )}

              {/* CTA */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleNext}
                className={`w-full py-3 rounded-2xl font-semibold text-white bg-linear-to-r ${trophy.gradient} shadow-lg text-sm`}
              >
                {isLast ? '🎉 Continuer' : 'Suivant →'}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function motivationalMessage(trophy: Trophy): string {
  const messages: Record<string, string> = {
    lav_10: 'Un bon départ ! Continue sur cette lancée 💪',
    lav_50: 'Tu es dans le rythme ! Les clients te font confiance.',
    lav_100: 'Cent lavages, c\'est du sérieux ! Tu es un pilier de l\'équipe.',
    lav_250: 'Impressionnant ! Ton expertise parle d\'elle-même.',
    lav_500: 'Champion ! Tu es une référence dans l\'équipe.',
    lav_1000: 'Une légende vivante du car wash ! Respect total. 👑',
    com_5: 'Premier pas vers le succès ! Continue à prospecter.',
    com_20: 'Tu sais convaincre ! Ta clientèle grandit.',
    com_50: 'Vendeur né ! L\'équipe compte sur toi.',
    com_100: 'Cent clients convaincus — tu es incroyable !',
    com_200: 'Champion de la prospection ! Personne ne t\'arrête.',
    com_500: 'Une légende commerciale ! Tu es le meilleur. 👑',
  }
  return messages[trophy.id] ?? 'Félicitations pour cette belle récompense !'
}
