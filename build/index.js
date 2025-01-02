import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { CursorShadowWorkspaceHandler } from "./shadow/CursorShadowWorkspaceHandler.js";
import { initializeWorkspacePaths, getWorkspaceConfig } from "./utils/workspaceConfig.js";
import * as fs from 'fs/promises';
import * as path from 'path';
// Schema for open_cursor tool parameters
const CursorOpenSchema = z.object({
    path: z.string().optional(),
    code: z.string().optional(),
    language: z.string().optional(),
    filename: z.string().optional(),
});
// Create server instance
const server = new Server({
    name: "cursor",
    version: "1.0.0",
    port: 3010
}, {
    capabilities: {
        tools: {
            "open_cursor": {
                name: "open_cursor",
                description: "Opens Cursor editor in a shadow workspace with full isolation",
                inputSchema: {
                    type: "object",
                    properties: {
                        path: {
                            type: "string",
                            description: "Path to file or directory to open in Cursor (optional)",
                        },
                        code: {
                            type: "string",
                            description: "Code to be generated in the workspace (optional)",
                        },
                        language: {
                            type: "string",
                            description: "Programming language of the generated code",
                        },
                        filename: {
                            type: "string",
                            description: "Name for the generated file",
                        }
                    },
                    required: [],
                    additionalProperties: false
                }
            }
        }
    }
});
// Initialize workspace paths
initializeWorkspacePaths();
const workspaceConfig = getWorkspaceConfig();
// Initialize shadow workspace handler
const shadowHandler = new CursorShadowWorkspaceHandler({
    basePath: workspaceConfig.basePath,
    shadowPath: workspaceConfig.shadowStoragePath
});
// Helper function to ensure directory exists
async function ensureDirectoryExists(dirPath) {
    try {
        await fs.access(dirPath);
    }
    catch {
        await fs.mkdir(dirPath, { recursive: true });
    }
}
// Handler for tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
        if (request.params.name === "open_cursor") {
            const params = CursorOpenSchema.parse(request.params.arguments);
            let filepath = params.path;
            // If code is provided, write it to the specified path or generate one
            if (params.code) {
                // If no path is provided, use filename or generate one
                if (!filepath) {
                    const filename = params.filename || `file.${params.language || 'txt'}`;
                    filepath = path.join(process.cwd(), filename);
                }
                // Ensure the directory exists
                const dirPath = path.dirname(filepath);
                await ensureDirectoryExists(dirPath);
                // Write the file
                await fs.writeFile(filepath, params.code, 'utf-8');
            }
            const result = await shadowHandler.openWithGeneratedCode({
                code: params.code,
                language: params.language,
                filename: params.filename,
                filepath: filepath,
                isolationLevel: 'full'
            });
            return {
                _meta: {},
                content: [{
                        type: "text",
                        text: `Opened ${params.filename || filepath} in shadow workspace (ID: ${result.workspaceId})`
                    }]
            };
        }
        return {
            _meta: {},
            error: {
                code: "UNKNOWN_TOOL",
                message: `Unknown tool: ${request.params.name}`
            }
        };
    }
    catch (err) {
        const error = err;
        console.error('Error handling tool call:', error);
        return {
            _meta: {},
            error: {
                code: "EXECUTION_ERROR",
                message: `Failed to execute tool: ${error.message}`
            }
        };
    }
});
// Handler for tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "open_cursor",
                description: "Opens Cursor editor in a shadow workspace with full isolation",
                inputSchema: {
                    type: "object",
                    properties: {
                        path: {
                            type: "string",
                            description: "Path to file or directory to open in Cursor (optional)",
                        },
                        code: {
                            type: "string",
                            description: "Code to be generated in the workspace (optional)",
                        },
                        language: {
                            type: "string",
                            description: "Programming language of the generated code",
                        },
                        filename: {
                            type: "string",
                            description: "Name for the generated file",
                        }
                    },
                    required: [],
                    additionalProperties: false
                }
            }
        ]
    };
});
async function main() {
    try {
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error("[MCP-Cursor] Server running on stdio");
        console.error("[MCP-Cursor] Using workspace path:", workspaceConfig.basePath);
    }
    catch (error) {
        console.error("[MCP-Cursor] Failed to start server:", error);
        process.exit(1);
    }
}
process.on('uncaughtException', (error) => {
    console.error('[MCP-Cursor] Uncaught Exception:', error);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('[MCP-Cursor] Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
main().catch((error) => {
    console.error("[MCP-Cursor] Fatal error in main():", error);
    process.exit(1);
});
