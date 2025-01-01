import { ModelContext, ModelContextProtocol } from '@modelcontextprotocol/typescript-sdk'
import type { ClaudeContext } from '@/types/mcp'

export function createMCPClient() {
  const mcp = new ModelContextProtocol()
  
  async function connect() {
    try {
      await mcp.connect()
      return true
    } catch (error) {
      console.error('Failed to connect to MCP:', error)
      return false
    }
  }

  async function getContext(): Promise<ModelContext | null> {
    try {
      return await mcp.getContext()
    } catch (error) {
      console.error('Failed to get context:', error)
      return null
    }
  }

  async function setContext(context: ClaudeContext) {
    try {
      await mcp.setContext({
        model: context.model,
        conversation: {
          id: context.conversation_id,
          messageId: context.message_id,
          parentId: context.parent_id,
        },
        parameters: {
          temperature: context.temperature,
          maxTokens: context.max_tokens,
        },
      })
      return true
    } catch (error) {
      console.error('Failed to set context:', error)
      return false
    }
  }

  async function clearContext() {
    try {
      await mcp.clearContext()
      return true
    } catch (error) {
      console.error('Failed to clear context:', error)
      return false
    }
  }

  return {
    connect,
    getContext,
    setContext,
    clearContext,
  }
} 