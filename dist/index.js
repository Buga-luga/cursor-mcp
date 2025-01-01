#!/usr/bin/env node
import { Server } from '../sdk/server/index.js';
import { StdioServerTransport } from '../sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '../sdk/types.js';
import { readFileSync } from 'fs';
import { openCursorTool } from './tools/open-cursor.js';
// Get version from package.json
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'));
const version = packageJson.version;
/**
 * MCP Server for Cursor IDE integration
 * Provides tools for Claude to interact with Cursor
 */
export async function startServer(basePath) {
    if (!basePath) {
        throw new Error('Base path is required');
    }
    // Keep process alive
    process.stdin.resume();
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
    });
    // Register tools
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: [openCursorTool]
    }));
    // Handle tool calls
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        try {
            const toolName = request.method.replace('tools/', '');
            let result;
            switch (toolName) {
                case 'open_cursor': {
                    const input = request.params?.parameters || {};
                    result = await openCursorTool.handler(input);
                    break;
                }
                default:
                    result = {
                        content: [
                            {
                                type: 'text',
                                text: `Error: Unknown tool: ${toolName}`
                            }
                        ],
                        isError: true
                    };
            }
            return {
                _meta: {},
                content: result.content,
                isError: result.isError
            };
        }
        catch (error) {
            console.error('Error handling tool call:', error);
            return {
                _meta: {},
                content: [
                    {
                        type: 'text',
                        text: `Error: ${error instanceof Error ? error.message : String(error)}`
                    }
                ],
                isError: true
            };
        }
    });
    try {
        const transport = new StdioServerTransport();
        await server.connect(transport);
    }
    catch (error) {
        console.error('Failed to start MCP server:', error);
        process.exit(1);
    }
}
