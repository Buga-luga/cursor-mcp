#!/usr/bin/env node

import { Server } from '../sdk/server/index.js'
import { StdioServerTransport } from '../sdk/server/stdio.js'
import { ListToolsRequestSchema, CallToolRequestSchema, CallToolRequest } from '../sdk/types.js'
import { readFileSync } from 'fs'
import { openCursorTool } from './tools/open-cursor.js'
import { codebaseSearchTool } from './tools/codebase-search.js'
import { indexBuilderTool } from './tools/index-builder.js'
import { sendToClaudeTool } from './tools/send-to-claude.js'
import { cursorIndexWatcherTool } from './tools/cursor-index-watcher.js'
import { manualIndexerTool } from './tools/manual-indexer.js'
import { contextManagerTool } from './tools/context-manager.js'
import { claudeHelperTool } from './tools/claude-helper.js'
import { createErrorResponse } from './tools/tool-framework.js'

// Get version from package.json
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'))
const version = packageJson.version

/**
 * MCP Server for Cursor IDE integration
 * Provides tools for Claude to interact with Cursor
 */
export async function startServer(basePath: string, projectPaths?: string[]) {
  if (!basePath) {
    console.error('Base path is required')
    process.exit(1)
  }

  // Keep process alive
  process.stdin.resume()

  const server = new Server({
    name: 'cursor-mcp',
    version
  }, {
    capabilities: {
      tools: {
        [openCursorTool.name]: {
          description: openCursorTool.description
        },
        [codebaseSearchTool.name]: {
          description: codebaseSearchTool.description
        },
        [indexBuilderTool.name]: {
          description: indexBuilderTool.description
        },
        [sendToClaudeTool.name]: {
          description: sendToClaudeTool.description
        },
        [cursorIndexWatcherTool.name]: {
          description: cursorIndexWatcherTool.description
        },
        [manualIndexerTool.name]: {
          description: manualIndexerTool.description
        },
        [contextManagerTool.name]: {
          description: contextManagerTool.description
        },
        [claudeHelperTool.name]: {
          description: claudeHelperTool.description
        }
      }
    }
  })

  // Register tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      openCursorTool,
      codebaseSearchTool,
      indexBuilderTool,
      sendToClaudeTool,
      cursorIndexWatcherTool,
      manualIndexerTool,
      contextManagerTool,
      claudeHelperTool
    ]
  }))

  // Handle tool calls
  async function handleToolCall(request: any): Promise<any> {
    try {
      const toolName = request.method.replace('tools/', '')
      
      switch (toolName) {
        case 'open_cursor': {
          const input = request.params?.parameters || {}
          await openCursorTool.handler(input)
          return { success: true }
        }

        case 'codebase_search': {
          if (!codebaseSearchTool.inputSchema) {
            return createErrorResponse('Tool schema not defined')
          }
          const params = codebaseSearchTool.inputSchema.parse(request.params.parameters)
          const result = await codebaseSearchTool.handler(params)
          return result
        }

        case 'build_index': {
          if (!indexBuilderTool.inputSchema) {
            return createErrorResponse('Tool schema not defined')
          }
          const params = indexBuilderTool.inputSchema.parse(request.params.parameters)
          const indexResult = await indexBuilderTool.handler(params)
          return indexResult
        }

        case 'send_to_claude': {
          if (!sendToClaudeTool.inputSchema) {
            return createErrorResponse('Tool schema not defined')
          }
          const params = sendToClaudeTool.inputSchema.parse(request.params.parameters)
          const sendResult = await sendToClaudeTool.handler(params)
          return sendResult
        }

        case 'watch_cursor_index': {
          if (!cursorIndexWatcherTool.inputSchema) {
            return createErrorResponse('Tool schema not defined')
          }
          const params = cursorIndexWatcherTool.inputSchema.parse(request.params.parameters)
          await cursorIndexWatcherTool.handler(params)
          return { success: true }
        }

        case 'index_path': {
          if (!manualIndexerTool.inputSchema) {
            return createErrorResponse('Tool schema not defined')
          }
          const params = manualIndexerTool.inputSchema.parse(request.params.parameters)
          const manualResult = await manualIndexerTool.handler(params)
          return manualResult
        }

        case 'manage_context': {
          if (!contextManagerTool.inputSchema) {
            return createErrorResponse('Tool schema not defined')
          }
          const params = contextManagerTool.inputSchema.parse(request.params.parameters)
          const contextResult = await contextManagerTool.handler(params)
          return contextResult
        }

        case 'claude_helper': {
          if (!claudeHelperTool.inputSchema) {
            return createErrorResponse('Tool schema not defined')
          }
          const params = claudeHelperTool.inputSchema.parse(request.params.parameters)
          const helperResult = await claudeHelperTool.handler(params)
          return helperResult
        }

        default:
          return createErrorResponse(`Unknown tool: ${toolName}`)
      }
    } catch (error) {
      console.error('Error handling tool call:', error)
      return createErrorResponse(error as Error)
    }
  }

  try {
    // Start with Cursor sync by default
    console.log('Setting up initial Cursor sync context...')
    await contextManagerTool.handler({
      action: 'sync_with_cursor',
      basePath,
      projectPaths,
      format: 'markdown'
    })

    // Print initial context help
    const initialHelp = await claudeHelperTool.handler({
      intent: 'understand_context'
    })
    console.log('\nAvailable Context:\n' + initialHelp)

    const transport = new StdioServerTransport()
    await server.connect(transport)
  } catch (error) {
    console.error('Failed to start MCP server:', error)
    process.exit(1)
  }
} 