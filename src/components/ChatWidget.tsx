import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  X,
  Send,
  Bot,
  User,
  AlertCircle,
  Loader2,
  ChevronDown,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { useChatbotQuery } from '@/api/chatbot'
import type { ChatMessage } from '@/api/chatbot'

const SUGGESTIONS = [
  'Combien de fiches de piste ouvertes aujourd\'hui ?',
  'Top 5 clients par points de fidélité',
  'Chiffre d\'affaires de ce mois',
  'Produits en alerte de stock',
  'Nombre de lavages cette semaine',
]

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return value.toLocaleString('fr-FR')
    return value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return String(value)
}

function DataTable({ data }: { data: Record<string, unknown>[] }) {
  if (!data.length) return <p className="text-xs text-ink-muted italic">Aucun résultat.</p>

  const columns = Object.keys(data[0])
  const displayRows = data.slice(0, 50)

  return (
    <div className="mt-2 overflow-x-auto rounded-lg border border-divider">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-inset">
            {columns.map((col) => (
              <th
                key={col}
                className="px-3 py-2 text-left font-semibold text-ink-light whitespace-nowrap border-b border-divider"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, i) => (
            <tr key={i} className="border-b border-divider last:border-0 hover:bg-inset/50 transition-colors">
              {columns.map((col) => (
                <td key={col} className="px-3 py-1.5 text-ink whitespace-nowrap">
                  {formatValue(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > 50 && (
        <p className="px-3 py-1.5 text-xs text-ink-muted bg-inset border-t border-divider">
          … et {data.length - 50} lignes supplémentaires
        </p>
      )}
    </div>
  )
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center ${
          isUser
            ? 'bg-accent-wash text-accent'
            : 'bg-grape-wash text-grape'
        }`}
      >
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-accent text-white rounded-tr-sm'
            : 'bg-panel border border-divider text-ink rounded-tl-sm'
        }`}
      >
        {msg.loading ? (
          <div className="flex items-center gap-2 text-ink-muted">
            <Loader2 size={14} className="animate-spin" />
            <span>Analyse en cours…</span>
          </div>
        ) : msg.error ? (
          <div className="flex items-center gap-2 text-bad">
            <AlertCircle size={14} />
            <span>{msg.content}</span>
          </div>
        ) : (
          <>
            <p className="whitespace-pre-wrap">{msg.content}</p>
            {msg.data && msg.data.length > 0 && <DataTable data={msg.data} />}
          </>
        )}
      </div>
    </motion.div>
  )
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const mutation = useChatbotQuery()

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 200)
    }
  }, [open])

  const handleSend = useCallback(
    async (text?: string) => {
      const question = (text ?? input).trim()
      if (!question || mutation.isPending) return

      const userMsg: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: question,
        timestamp: new Date(),
      }

      const loadingMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        loading: true,
      }

      setMessages((prev) => [...prev, userMsg, loadingMsg])
      setInput('')

      try {
        const result = await mutation.mutateAsync({ question })

        const assistantMsg: ChatMessage = {
          id: loadingMsg.id,
          role: 'assistant',
          content: result.success
            ? result.data && result.data.length > 0
              ? `Voici les résultats (${result.data.length} ligne${result.data.length > 1 ? 's' : ''}) :`
              : 'La requête a été exécutée mais n\'a retourné aucun résultat.'
            : result.message ?? 'Une erreur est survenue.',
          data: result.success ? result.data : undefined,
          sql: result.sql,
          timestamp: new Date(),
          error: !result.success,
        }

        setMessages((prev) =>
          prev.map((m) => (m.id === loadingMsg.id ? assistantMsg : m)),
        )
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingMsg.id
              ? {
                  ...m,
                  loading: false,
                  error: true,
                  content: 'Erreur de connexion au serveur.',
                }
              : m,
          ),
        )
      }
    },
    [input, mutation],
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const clearChat = () => {
    setMessages([])
  }

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-linear-to-br from-teal-500 to-teal-700 text-white shadow-lg shadow-teal-500/25 flex items-center justify-center cursor-pointer"
          >
            <MessageSquare size={22} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50 w-[420px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-3rem)] flex flex-col rounded-2xl border border-edge bg-surface shadow-2xl shadow-black/10 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-linear-to-r from-navy-800 to-navy-700 text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Sparkles size={16} className="text-teal-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold font-heading leading-tight">
                    Assistant IA
                  </h3>
                  <p className="text-[11px] text-white/50">
                    Posez vos questions sur les données
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={clearChat}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                    title="Effacer la conversation"
                  >
                    <Trash2 size={14} className="text-white/60" />
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-grape-wash flex items-center justify-center">
                    <Bot size={24} className="text-grape" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink mb-1">
                      Bonjour ! Comment puis-je vous aider ?
                    </p>
                    <p className="text-xs text-ink-muted max-w-[260px]">
                      Je peux interroger la base de données en langage naturel. Essayez une des suggestions ci-dessous.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 w-full mt-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSend(s)}
                        className="text-left text-xs px-3 py-2.5 rounded-xl border border-divider bg-panel hover:bg-inset hover:border-accent-line transition-all text-ink-light cursor-pointer"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Scroll indicator */}
            {messages.length > 4 && (
              <div className="flex justify-center -mt-2 mb-1">
                <button
                  onClick={scrollToBottom}
                  className="p-1 rounded-full bg-panel border border-divider shadow-sm hover:bg-inset transition-colors cursor-pointer"
                >
                  <ChevronDown size={14} className="text-ink-muted" />
                </button>
              </div>
            )}

            {/* Input Area */}
            <div className="shrink-0 px-4 pb-4 pt-2 border-t border-divider bg-panel">
              <div className="flex items-center gap-2 rounded-xl border border-edge bg-inset px-3 py-2 focus-within:border-accent-line focus-within:ring-2 focus-within:ring-accent-ring transition-all">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Posez votre question…"
                  disabled={mutation.isPending}
                  className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-ghost outline-none disabled:opacity-50"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || mutation.isPending}
                  className="p-1.5 rounded-lg bg-accent text-white disabled:opacity-30 hover:bg-accent-bold transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  {mutation.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-ink-ghost text-center mt-2">
                Propulsé par Qwen — Lecture seule, aucune modification possible
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
