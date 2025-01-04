import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { CursorShadowWorkspaceHandler } from "./shadow/CursorShadowWorkspaceHandler.js";
import { initializeWorkspacePaths, getWorkspaceConfig } from "./utils/workspaceConfig.js";
import * as fs from 'fs/promises';
import * as path from 'path';
/**
 * Zod schema for validating run_cursor tool parameters
 * Defines the expected structure and types of the tool's input
 *
 * @property {string} [path] - Path to existing file/directory
 * @property {string} [code] - Code content to create
 * @property {string} [language] - Programming language
 * @property {string} [filename] - Name for new file
 * @property {Array<{code: string, filename: string}>} [dependencies] - Additional files needed
 * @property {string} [entryPoint] - Main file to run if different from the primary file
 */
const CursorRunSchema = z.object({
    path: z.string().optional(),
    code: z.string().optional(),
    language: z.string().optional(),
    filename: z.string().optional(),
    dependencies: z.array(z.object({
        code: z.string(),
        filename: z.string()
    })).optional(),
    entryPoint: z.string().optional()
});
/**
 * Initialize MCP server with tool definitions and capabilities
 * This server implements the Model Context Protocol for Cursor IDE integration
 * Configures the run_cursor tool for executing code with dependencies
 */
const server = new Server({
    name: "cursor",
    version: "1.0.0",
    port: 3010
}, {
    capabilities: {
        tools: {
            "run_cursor": {
                name: "run_cursor",
                description: "Executes code with support for multiple files and dependencies",
                inputSchema: {
                    type: "object",
                    properties: {
                        path: {
                            type: "string",
                            description: "Path to file or directory to run (optional)",
                        },
                        code: {
                            type: "string",
                            description: "Main code to execute (optional)",
                        },
                        language: {
                            type: "string",
                            description: "Programming language of the code",
                        },
                        filename: {
                            type: "string",
                            description: "Name for the main file",
                        },
                        dependencies: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    code: {
                                        type: "string",
                                        description: "Content of the dependency file"
                                    },
                                    filename: {
                                        type: "string",
                                        description: "Name of the dependency file"
                                    }
                                },
                                required: ["code", "filename"]
                            },
                            description: "Additional files needed for the code to run"
                        },
                        entryPoint: {
                            type: "string",
                            description: "Main file to run if different from the primary file"
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
const shadowHandler = new CursorShadowWorkspaceHandler(workspaceConfig.shadowStoragePath);
/**
 * Ensures a directory exists, creating it if necessary
 * @param {string} dirPath - Path to the directory to check/create
 * @throws {Error} If directory creation fails
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
 * Currently supports the 'run_cursor' tool for creating and opening files in isolated workspaces
 *
 * Tool capabilities:
 * 1. Create new files with provided code
 * 2. Open existing files in isolated workspaces
 * 3. Generate file paths if not provided
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
        if (request.params.name === "run_cursor") {
            // Validate and parse the tool parameters
            const params = CursorRunSchema.parse(request.params.arguments);
            let filepath = params.path;
            // Handle code generation if code content is provided
            if (params.code) {
                // Generate filepath if not provided
                if (!filepath) {
                    const filename = params.filename || `file.${params.language || 'txt'}`;
                    filepath = path.join(process.cwd(), filename);
                }
            }
            // Execute the code
            const result = await shadowHandler.runCode({
                code: params.code,
                filename: params.filename,
                filepath: filepath,
                dependencies: params.dependencies,
                entryPoint: params.entryPoint
            });
            // Return success response with output
            return {
                _meta: {},
                content: [{
                        type: "text",
                        text: result.success ?
                            `Execution successful:\n${result.output}` :
                            `Execution failed:\n${result.error}\n\nOutput:\n${result.output}`
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
 * Used by clients to discover supported functionality
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "run_cursor",
                description: "Opens Cursor editor in an invisible shadow workspace with full isolation",
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
 *
 * Error Handling:
 * - Uncaught exceptions
 * - Unhandled promise rejections
 * - Server startup failures
 */
async function main() {
    try {
        // Initialize stdio transport for MCP communication
        const transport = new StdioServerTransport();
        await server.connect(transport);
        // Log successful startup
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
