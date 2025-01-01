import { z } from 'zod'

// Standard response content types
export type MCPContentType = 'text' | 'error' | 'success'

export interface MCPContent {
  type: MCPContentType
  text: string
}

export interface MCPResponse {
  content: MCPContent[]
  isError: boolean
}

// Base interface for all MCP tools
export interface MCPTool<TInput = void> {
  name: string
  description: string
  inputSchema?: z.ZodType<TInput>
  handler: (input: TInput) => Promise<MCPResponse>
}

// Helper to create a success response
export function createSuccessResponse(message: string | object): MCPResponse {
  const text = typeof message === 'string' ? message : JSON.stringify(message, null, 2)
  return {
    content: [
      {
        type: 'success',
        text
      }
    ],
    isError: false
  }
}

// Helper to create an error response
export function createErrorResponse(error: Error | string): MCPResponse {
  const text = error instanceof Error ? error.message : error
  return {
    content: [
      {
        type: 'error',
        text
      }
    ],
    isError: true
  }
}

// Helper to create a tool using the framework
export function createMCPTool<TInput>(config: MCPTool<TInput>): MCPTool<TInput> {
  return config
} 