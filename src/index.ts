#!/usr/bin/env node

import { Server } from '../sdk/server/index.js'
import { StdioServerTransport } from '../sdk/server/stdio.js'
import { ListToolsRequestSchema, CallToolRequestSchema, CallToolRequest } from '../sdk/types.js'
import { readFileSync } from 'fs'
import { openCursorTool } from './tools/open-cursor.js'

// Get version from package.json
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'))
const version = packageJson.version

/**
 * MCP Server for Cursor IDE integration
 * Provides tools for Claude to interact with Cursor
 */
export async function startServer(workspacePath?: string) {
  if (!workspacePath) {
    console.error('Workspace path is required')
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
        }
      }
    }
  })

  // Register tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [openCursorTool]
  }))

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
    if (request.params.name === openCursorTool.name) {
      await openCursorTool.handler()
      return { result: null }
    }
    throw new Error(`Unknown tool: ${request.params.name}`)
  })

  try {
    const transport = new StdioServerTransport()
    await server.connect(transport)
  } catch (error) {
    console.error('Failed to start MCP server:', error)
    process.exit(1)
  }
} 