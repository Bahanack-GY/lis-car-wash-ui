import { apiClient } from '@/lib/axios'
import type { ChatbotResponse, ChatQueryPayload } from './types'

export const chatbotApi = {
  query: async (payload: ChatQueryPayload): Promise<ChatbotResponse> => {
    const response = await apiClient.post<ChatbotResponse>('/chatbot/query', payload)
    return response.data
  },
}
