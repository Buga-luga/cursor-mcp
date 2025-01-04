import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { CursorShadowWorkspaceHandler } from "./shadow/CursorShadowWorkspaceHandler.js";
import { initializeWorkspacePaths, getWorkspaceConfig } from "./utils/workspaceConfig.js";
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Zod schema for validating open_cursor tool parameters
 * Defines the expected structure and types of the tool's input
 */
const CursorOpenSchema = z.object({
    path: z.string().optional(),      // Path to existing file/directory
    code: z.string().optional(),      // Code content to create
    language: z.string().optional(),  // Programming language
    filename: z.string().optional(),  // Name for new file
});

/**
 * Initialize MCP server with tool definitions and capabilities
 * This server implements the Model Context Protocol for Cursor IDE integration
 */
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

// Set up workspace infrastructure
initializeWorkspacePaths();
const workspaceConfig = getWorkspaceConfig();

// Initialize handler for isolated workspaces
const shadowHandler = new CursorShadowWorkspaceHandler({
    basePath: workspaceConfig.basePath,
    shadowPath: workspaceConfig.shadowStoragePath
});

/**
 * Ensures a directory exists, creating it if necessary
 * @param {string} dirPath - Path to the directory to check/create
 */
async function ensureDirectoryExists(dirPath) {
    try {
        await fs.access(dirPath);
    }
    catch {
        await fs.mkdir(dirPath, { recursive: true });
    }
}

/**
 * Handles incoming tool call requests
 * Currently supports the 'open_cursor' tool for creating and opening files in isolated workspaces
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
        if (request.params.name === "open_cursor") {
            // Validate and parse the tool parameters
            const params = CursorOpenSchema.parse(request.params.arguments);
            let filepath = params.path;

            // Handle code generation if code content is provided
            if (params.code) {
                // Generate filepath if not provided
                if (!filepath) {
                    const filename = params.filename || `file.${params.language || 'txt'}`;
                    filepath = path.join(process.cwd(), filename);
                }

                // Ensure target directory exists
                const dirPath = path.dirname(filepath);
                await ensureDirectoryExists(dirPath);

                // Write the code to file
                await fs.writeFile(filepath, params.code, 'utf-8');
            }

            // Create and open isolated workspace
            const result = await shadowHandler.openWithGeneratedCode({
                code: params.code,
                language: params.language,
                filename: params.filename,
                filepath: filepath,
                isolationLevel: 'full'
            });

            // Return success response
            return {
                _meta: {},
                content: [{
                    type: "text",
                    text: `Opened ${params.filename || filepath} in shadow workspace (ID: ${result.workspaceId})`
                }]
            };
        }

        // Handle unknown tool requests
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

/**
 * Handles tool listing requests
 * Returns metadata about available tools and their capabilities
 */
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

/**
 * Main application entry point
 * Sets up the MCP server with stdio transport
 * Configures error handling and graceful shutdown
 */
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

// Global error handlers for uncaught errors
process.on('uncaughtException', (error) => {
    console.error('[MCP-Cursor] Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[MCP-Cursor] Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start the server
main().catch((error) => {
    console.error("[MCP-Cursor] Fatal error in main():", error);
    process.exit(1);
});
