import { ToolSchema } from '@modelcontextprotocol/sdk/types.js'
import type { z } from 'zod'

type ToolDefinition = z.infer<typeof ToolSchema>

export const CursorTools: ToolDefinition[] = [
    {
        name: "open_cursor",
        description: "Opens a new Cursor IDE instance and returns its identifier",
        inputSchema: {
            type: "object",
            properties: {
                workspacePath: {
                    type: "string",
                    description: "Optional path to workspace to open"
                }
            }
        },
        outputSchema: {
            type: "object",
            properties: {
                instanceId: {
                    type: "string",
                    description: "UUID of the created Cursor instance"
                },
                status: {
                    type: "string",
                    enum: ["success", "error"]
                }
            },
            required: ["instanceId", "status"]
        }
    },
    {
        name: "cursor_command",
        description: "Execute a command in a specific Cursor IDE instance",
        inputSchema: {
            type: "object",
            properties: {
                instanceId: {
                    type: "string",
                    description: "UUID of the Cursor instance"
                },
                command: {
                    type: "string",
                    description: "Command to execute"
                }
            },
            required: ["instanceId", "command"]
        },
        outputSchema: {
            type: "object",
            properties: {
                status: {
                    type: "string",
                    enum: ["success", "error"]
                },
                command: {
                    type: "string",
                    description: "The executed command"
                },
                result: {
                    type: "string",
                    description: "Result of the command execution"
                }
            },
            required: ["status", "command"]
        },
        chainable: {
            accepts: ["open_cursor"],
            provides: ["cursor_command", "open_cline_tab"]
        }
    },
    {
        name: "open_cline_tab",
        description: "Opens a new Cline tab in a specific Cursor instance",
        inputSchema: {
            type: "object",
            properties: {
                instanceId: {
                    type: "string",
                    description: "UUID of the Cursor instance"
                }
            },
            required: ["instanceId"]
        },
        outputSchema: {
            type: "object",
            properties: {
                status: {
                    type: "string",
                    enum: ["success", "error"]
                },
                instanceId: {
                    type: "string",
                    description: "UUID of the Cursor instance"
                },
                tabId: {
                    type: "string",
                    description: "Identifier for the opened Cline tab"
                }
            },
            required: ["status", "instanceId"]
        },
        chainable: {
            accepts: ["open_cursor", "cursor_command"],
            provides: ["cursor_command"]
        }
    }
] 