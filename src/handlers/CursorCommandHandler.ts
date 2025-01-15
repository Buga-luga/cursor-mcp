import { z } from "zod"
import { CursorInstanceManagerImpl } from '../managers/CursorInstanceManager.js'
import { VirtualKeys } from '../services/WindowsApiService.js'
import { McpError } from "@modelcontextprotocol/sdk/types.js"

interface ToolDefinition {
    name: string
    description: string
    inputSchema: z.ZodSchema<any>
    handler: (params: any) => Promise<any>
}

// Define supported Cursor commands
export enum CursorCommand {
    OPEN_COMMAND_PALETTE = 'openCommandPalette',
    OPEN_CLINE_TAB = 'openClineTab'
}

const cursorManager = new CursorInstanceManagerImpl()

export const CursorCommandTool: ToolDefinition = {
    name: "cursor_command",
    description: "Execute commands in a Cursor IDE instance",
    inputSchema: z.object({
        instanceId: z.string(),
        command: z.nativeEnum(CursorCommand)
    }).strict(),
    handler: async (params: { instanceId: string, command: CursorCommand }) => {
        try {
            const instance = cursorManager.get(params.instanceId)
            if (!instance) {
                throw new McpError(404, `Cursor instance ${params.instanceId} not found`)
            }

            if (!instance.isActive) {
                throw new McpError(400, `Cursor instance ${params.instanceId} is no longer active`)
            }

            if (!instance.window) {
                throw new McpError(400, `Window handle not available for instance ${params.instanceId}`)
            }

            let actionDescription: string
            switch (params.command) {
                case CursorCommand.OPEN_COMMAND_PALETTE:
                    actionDescription = 'Opening command palette'
                    await cursorManager.openCommandPalette(params.instanceId)
                    break
                case CursorCommand.OPEN_CLINE_TAB:
                    actionDescription = 'Opening Cline tab'
                    await cursorManager.openClineTab(params.instanceId)
                    break
                default:
                    throw new McpError(400, `Unsupported command: ${params.command}`)
            }

            return {
                _meta: {
                    mcp_version: "1.0.1",
                    tool_name: "cursor_command"
                },
                content: [{
                    type: "text",
                    text: `Successfully executed command: ${params.command}`
                }, {
                    type: "text",
                    text: actionDescription
                }]
            }
        } catch (error: unknown) {
            console.error('Error executing Cursor command:', error)
            
            // Handle different types of errors
            if (error instanceof McpError) {
                throw error // Re-throw MCP errors directly
            }
            
            const message = error instanceof Error ? error.message : 'Unknown error occurred'
            
            // Map certain error messages to specific MCP error codes
            if (message.includes('timed out')) {
                throw new McpError(408, `Command timed out: ${message}`)
            }
            if (message.includes('unresponsive')) {
                throw new McpError(503, `Cursor instance unresponsive: ${message}`)
            }
            
            // Default error response
            throw new McpError(500, `Failed to execute command: ${message}`)
        }
    }
} 