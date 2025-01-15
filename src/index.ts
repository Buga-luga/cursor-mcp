/**
 * @fileoverview Main entry point for the MCP (Model Context Protocol) Cursor integration.
 * This file sets up a server that handles code execution requests in isolated workspaces.
 * It implements the MCP protocol for communication between Cursor IDE and the execution environment.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { CursorInstanceManagerImpl } from './managers/CursorInstanceManager.js'
import { CursorToolHandler } from './handlers/CursorToolHandler.js'
import { CursorTools } from './tools/cursor-tools.js'

async function main() {
    const server = new Server(
        {
            name: 'cursor-mcp',
            version: '1.0.0'
        },
        {
            capabilities: {
                tools: {
                    listChanged: true
                }
            }
        }
    )

    const cursorManager = new CursorInstanceManagerImpl()
    const toolHandler = new CursorToolHandler(cursorManager)

    server.setRequestHandler(ListToolsRequestSchema, () => {
        return { tools: CursorTools }
    })

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, _meta } = request.params
        const params = request.params.arguments || {}
        
        switch (name) {
            case 'open_cursor':
                return toolHandler.handleOpenCursor(params)
            case 'cursor_command':
                return toolHandler.handleCursorCommand(params)
            case 'open_cline_tab':
                return toolHandler.handleOpenClineTab(params)
            default:
                throw new Error(`Unknown tool: ${name}`)
        }
    })

    const transport = new StdioServerTransport()
    await server.connect(transport)
}

main().catch(error => {
    console.error('Server error:', error)
    process.exit(1)
})