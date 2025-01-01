import { z } from 'zod'
import type { ModelContext } from '@modelcontextprotocol/typescript-sdk'

export const ClaudeContextSchema = z.object({
  conversation_id: z.string().optional(),
  message_id: z.string().optional(),
  parent_id: z.string().optional(),
  model: z.string(),
  temperature: z.number().min(0).max(1).optional(),
  max_tokens: z.number().positive().optional(),
})

export type ClaudeContext = z.infer<typeof ClaudeContextSchema>

export interface MCPState {
  context: ModelContext | null
  isConnected: boolean
  error: Error | null
} 