import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Megaphone, Car, CheckCircle2, Clock, Loader2, User, Phone } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useCommercialToday, useRegisterVehicle } from '@/api/commercial/queries'
import toast from 'react-hot-toast'

const rise = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}

export default function Commercial() {
  const { user } = useAuth()
  const [plate, setPlate] = useState('')
  const [prospectNom, setProspectNom] = useState('')
  const [prospectTelephone, setProspectTelephone] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: registrations = [], isLoading: todayLoading } = useCommercialToday()
  const registerMutation = useRegisterVehicle()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const canSubmit = plate.trim() && prospectNom.trim() && prospectTelephone.trim()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = plate.trim().toUpperCase()
    if (!trimmed || !prospectNom.trim() || !prospectTelephone.trim()) return

    try {
      await registerMutation.mutateAsync({
        immatriculation: trimmed,
        prospectNom: prospectNom.trim(),
        prospectTelephone: prospectTelephone.trim(),
      })
      toast.success(`Véhicule ${trimmed} enregistré avec succès`)
      setPlate('')
      setProspectNom('')
      setProspectTelephone('')
      inputRef.current?.focus()
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Erreur lors de l'enregistrement"
      toast.error(msg)
    }
  }

  const initials = user ? `${user.prenom[0]}${user.nom[0]}` : '?'

  return (
    <motion.div variants={{ show: { transition: { staggerChildren: 0.08 } } }} initial="hidden" animate="show" className="space-y-6 max-w-2xl mx-auto">

      {/* Profile header */}
      <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-blue-600 to-blue-400 relative">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        </div>
        <div className="px-6 pb-6">
          <div className="flex items-end gap-4 -mt-10 mb-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-2xl border-4 border-panel shadow-lg flex-shrink-0">
              {initials}
            </div>
            <div className="pb-1">
              <h2 className="font-heading font-bold text-xl text-ink">{user?.prenom} {user?.nom}</h2>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600">
                <Megaphone className="w-3 h-3" /> Commercial
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Registration form */}
      <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl p-6">
        <h3 className="font-heading font-semibold text-ink mb-4 flex items-center gap-2">
          <Car className="w-5 h-5 text-blue-500" />
          Enregistrer un prospect
        </h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Plate */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted">
              <Car className="w-4 h-4" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              placeholder="Matricule — DK-1234-AB"
              className="w-full pl-10 pr-4 py-3 bg-inset border border-edge rounded-xl text-ink text-lg font-mono tracking-wider placeholder-ink-muted outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
            />
          </div>

          {/* Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={prospectNom}
                onChange={(e) => setProspectNom(e.target.value)}
                placeholder="Nom du prospect"
                className="w-full pl-10 pr-4 py-3 bg-inset border border-edge rounded-xl text-ink text-sm placeholder-ink-muted outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
              />
            </div>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="tel"
                value={prospectTelephone}
                onChange={(e) => setProspectTelephone(e.target.value)}
                placeholder="Téléphone"
                className="w-full pl-10 pr-4 py-3 bg-inset border border-edge rounded-xl text-ink text-sm placeholder-ink-muted outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={registerMutation.isPending || !canSubmit}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {registerMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Enregistrer
          </button>
        </form>
      </motion.div>

      {/* Today's registrations */}
      <motion.div variants={rise} className="bg-panel border border-edge rounded-2xl">
        <div className="px-6 py-4 border-b border-edge flex items-center justify-between">
          <h3 className="font-heading font-semibold text-ink">Enregistrements du jour</h3>
          <span className="text-xs text-ink-muted bg-raised px-2.5 py-1 rounded-full">{registrations.length} total</span>
        </div>

        {todayLoading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : registrations.length === 0 ? (
          <div className="text-center py-12 text-ink-muted">
            <Car className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucun enregistrement aujourd'hui</p>
          </div>
        ) : (
          <div className="divide-y divide-edge">
            {registrations.map((reg) => (
              <div key={reg.id} className="px-6 py-4 flex items-center gap-4 hover:bg-raised/50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-raised flex items-center justify-center flex-shrink-0">
                  <Car className="w-5 h-5 text-ink-muted" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink font-mono tracking-wider">
                    {reg.immatriculation}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {reg.prospectNom} — {reg.prospectTelephone}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  {reg.confirmed ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500">
                      <CheckCircle2 className="w-3 h-3" />
                      Confirmé
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500">
                      <Clock className="w-3 h-3" />
                      En attente
                    </span>
                  )}
                  <p className="text-xs text-ink-muted mt-0.5">
                    {new Date(reg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
