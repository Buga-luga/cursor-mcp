import { useState, useEffect } from 'react'
import type { MCPState, ClaudeContext } from '@/types/mcp'
import { createMCPClient } from '@/lib/mcp'

export function useMCP() {
  const [state, setState] = useState<MCPState>({
    context: null,
    isConnected: false,
    error: null,
  })

  const client = createMCPClient()

  useEffect(() => {
    async function initializeMCP() {
      const connected = await client.connect()
      if (connected) {
        const context = await client.getContext()
        setState(prev => ({ ...prev, isConnected: true, context }))
      } else {
        setState(prev => ({ 
          ...prev, 
          error: new Error('Failed to connect to MCP'),
          isConnected: false 
        }))
      }
    }

    initializeMCP()
  }, [])

  async function updateContext(context: ClaudeContext) {
    if (!state.isConnected) {
      setState(prev => ({ 
        ...prev, 
        error: new Error('MCP not connected') 
      }))
      return false
    }

    const success = await client.setContext(context)
    if (success) {
      const newContext = await client.getContext()
      setState(prev => ({ ...prev, context: newContext }))
    }
    return success
  }

  async function resetContext() {
    if (!state.isConnected) return false
    
    const success = await client.clearContext()
    if (success) {
      setState(prev => ({ ...prev, context: null }))
    }
    return success
  }

  return {
    ...state,
    updateContext,
    resetContext,
  }
} 