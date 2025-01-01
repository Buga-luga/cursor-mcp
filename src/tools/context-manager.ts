import { z } from 'zod'
import { MCPTool, createSuccessResponse, createErrorResponse } from './tool-framework.js'
import { cursorIndexWatcherTool } from './cursor-index-watcher.js'
import { manualIndexerTool } from './manual-indexer.js'
import { sendToClaudeTool } from './send-to-claude.js'

// Schema for context manager parameters
const ContextManagerParamsSchema = z.object({
  action: z.enum(['sync_with_cursor', 'manual_index']),
  basePath: z.string().optional(),
  projectPaths: z.array(z.string()).optional(),
  manualPath: z.string().optional(),
  format: z.enum(['json', 'markdown']).optional()
})

type ContextManagerParams = z.infer<typeof ContextManagerParamsSchema>

type IndexingContext = {
  type: 'cursor' | 'manual'
  path?: string
  projectPaths?: string[]
  lastIndexed?: Date
  format: 'json' | 'markdown'
}

// Keep track of current context
let currentContext: IndexingContext | null = null

export const contextManagerTool: MCPTool<ContextManagerParams> = {
  name: 'manage_context',
  description: 'Manage codebase indexing context and orchestrate tool workflows',
  inputSchema: ContextManagerParamsSchema,
  handler: async (params: ContextManagerParams) => {
    const { action, format = 'markdown' } = params

    try {
      switch (action) {
        case 'sync_with_cursor': {
          if (!params.basePath) {
            return createErrorResponse('basePath is required for cursor sync')
          }

          console.log('Setting up Cursor sync context...')
          
          // Start cursor watcher
          await cursorIndexWatcherTool.handler({
            basePath: params.basePath,
            projectPaths: params.projectPaths
          })

          // Update context
          currentContext = {
            type: 'cursor',
            path: params.basePath,
            projectPaths: params.projectPaths,
            lastIndexed: new Date(),
            format
          }

          return createSuccessResponse(`Context set to sync with Cursor:
Base Path: ${params.basePath}
Watching Projects: ${params.projectPaths?.join(', ') || 'all'}
Format: ${format}`)
        }

        case 'manual_index': {
          if (!params.manualPath) {
            return createErrorResponse('manualPath is required for manual indexing')
          }

          console.log('Setting up manual indexing context...')

          // Perform manual indexing
          const result = await manualIndexerTool.handler({
            path: params.manualPath,
            sendToClaudeFormat: format
          })

          // Update context
          currentContext = {
            type: 'manual',
            path: params.manualPath,
            lastIndexed: new Date(),
            format
          }

          return result
        }

        default:
          return createErrorResponse(`Unknown action: ${action}`)
      }
    } catch (error) {
      console.error('Error in context manager:', error)
      return createErrorResponse(error as Error)
    }
  }
}

// Helper to get current context
export function getCurrentContext(): IndexingContext | null {
  return currentContext
}

// Helper to check if path is in current context
export function isPathInContext(path: string): boolean {
  if (!currentContext) return false

  if (currentContext.type === 'manual') {
    return path === currentContext.path
  }

  // For cursor context
  if (currentContext.projectPaths?.length) {
    return currentContext.projectPaths.some(p => path.startsWith(p))
  }

  return path.startsWith(currentContext.path || '')
} 