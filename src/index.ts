#!/usr/bin/env node

import { Server } from '../sdk/server/index.js'
import { StdioServerTransport } from '../sdk/server/stdio.js'
import { ListToolsRequestSchema, CallToolRequestSchema } from '../sdk/types.js'
import { readFileSync } from 'fs'
import { openCursorTool } from './tools/open-cursor.js'
import { codebaseSearchTool } from './tools/codebase-search.js'
import { indexBuilderTool } from './tools/index-builder.js'
import { sendToClaudeTool } from './tools/send-to-claude.js'
import { cursorIndexWatcherTool } from './tools/cursor-index-watcher.js'
import { manualIndexerTool } from './tools/manual-indexer.js'
import { contextManagerTool } from './tools/context-manager.js'
import { claudeHelperTool } from './tools/claude-helper.js'
import { createErrorResponse, createSuccessResponse } from './tools/tool-framework.js'

// Get version from package.json
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'))
const version = packageJson.version

/**
 * MCP Server for Cursor IDE integration
 * Provides tools for Claude to interact with Cursor
 */
export async function startServer(basePath: string, projectPaths?: string[]) {
  if (!basePath) {
    throw new Error('Base path is required')
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
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const toolName = request.method.replace('tools/', '')
      
      let result
      switch (toolName) {
        case 'open_cursor': {
          const input = request.params?.parameters || {}
          result = await openCursorTool.handler(input)
          break
        }

        case 'codebase_search': {
          if (!codebaseSearchTool.inputSchema) {
            result = createErrorResponse('Tool schema not defined')
            break
          }
          const params = codebaseSearchTool.inputSchema.parse(request.params.parameters)
          result = await codebaseSearchTool.handler(params)
          break
        }

        case 'build_index': {
          if (!indexBuilderTool.inputSchema) {
            result = createErrorResponse('Tool schema not defined')
            break
          }
          const params = indexBuilderTool.inputSchema.parse(request.params.parameters)
          result = await indexBuilderTool.handler(params)
          break
        }

        case 'send_to_claude': {
          if (!sendToClaudeTool.inputSchema) {
            result = createErrorResponse('Tool schema not defined')
            break
          }
          const params = sendToClaudeTool.inputSchema.parse(request.params.parameters)
          result = await sendToClaudeTool.handler(params)
          break
        }

        case 'watch_cursor_index': {
          if (!cursorIndexWatcherTool.inputSchema) {
            result = createErrorResponse('Tool schema not defined')
            break
          }
          const params = cursorIndexWatcherTool.inputSchema.parse(request.params.parameters)
          result = await cursorIndexWatcherTool.handler(params)
          break
        }

        case 'index_path': {
          if (!manualIndexerTool.inputSchema) {
            result = createErrorResponse('Tool schema not defined')
            break
          }
          const params = manualIndexerTool.inputSchema.parse(request.params.parameters)
          result = await manualIndexerTool.handler(params)
          break
        }

        case 'manage_context': {
          if (!contextManagerTool.inputSchema) {
            result = createErrorResponse('Tool schema not defined')
            break
          }
          const params = contextManagerTool.inputSchema.parse(request.params.parameters)
          result = await contextManagerTool.handler(params)
          break
        }

        case 'claude_helper': {
          if (!claudeHelperTool.inputSchema) {
            result = createErrorResponse('Tool schema not defined')
            break
          }
          const params = claudeHelperTool.inputSchema.parse(request.params.parameters)
          result = await claudeHelperTool.handler(params)
          break
        }

        default:
          result = createErrorResponse(`Unknown tool: ${toolName}`)
      }

      return {
        _meta: {},
        result: result.content[0].text,
        isError: result.isError
      }
    } catch (error) {
      console.error('Error handling tool call:', error)
      const errorResult = createErrorResponse(error as Error)
      return {
        _meta: {},
        result: errorResult.content[0].text,
        isError: true
      }
    }
  })

  try {
    // Start with Cursor sync by default
    const contextResult = await contextManagerTool.handler({
      action: 'sync_with_cursor',
      basePath,
      projectPaths,
      format: 'markdown'
    })

    if (contextResult.isError) {
      throw new Error(contextResult.content[0].text)
    }

    // Get initial context help
    const helpResult = await claudeHelperTool.handler({
      intent: 'understand_context'
    })

    if (helpResult.isError) {
      throw new Error(helpResult.content[0].text)
    }

    const transport = new StdioServerTransport()
    await server.connect(transport)
  } catch (error) {
    console.error('Failed to start MCP server:', error)
    process.exit(1)
  }
} 