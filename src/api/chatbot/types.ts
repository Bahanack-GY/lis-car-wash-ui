export interface ChatbotResponse {
  success: boolean
  message: string | null
  data?: Record<string, unknown>[]
  sql?: string
}

export interface ChatQueryPayload {
  question: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  data?: Record<string, unknown>[]
  sql?: string
  timestamp: Date
  loading?: boolean
  error?: boolean
}
