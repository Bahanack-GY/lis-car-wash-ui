import { useMutation } from '@tanstack/react-query'
import { chatbotApi } from './api'
import type { ChatQueryPayload } from './types'

export const CHATBOT_KEYS = {
  all: ['chatbot'] as const,
}

export const useChatbotQuery = () => {
  return useMutation({
    mutationFn: (payload: ChatQueryPayload) => chatbotApi.query(payload),
  })
}
