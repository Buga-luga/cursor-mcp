#!/usr/bin/env node
import { Server } from '../sdk/server/index.js';
import { StdioServerTransport } from '../sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '../sdk/types.js';
import { readFileSync } from 'fs';
import { openCursorTool } from './tools/open-cursor.js';
// Get version from package.json
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'));
const version = packageJson.version;
export async function startServer(workspacePath) {
    if (!workspacePath) {
        console.error('Workspace path is required');
        process.exit(1);
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
                    description: openCursorTool.description,
                    parameters: openCursorTool.inputSchema
                }
            }
        }
    });
    // Handle tool listing
    server.setRequestHandler(ListToolsRequestSchema, async () => {
        return {
            tools: [{
                    name: openCursorTool.name,
                    description: openCursorTool.description,
                    inputSchema: openCursorTool.inputSchema
                }]
        };
    });
    // Handle tool calls
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        if (request.params.name === openCursorTool.name) {
            return { result: await openCursorTool.handler() };
        }
        throw new Error(`Unknown tool: ${request.params.name}`);
    });
    try {
        console.error('Starting Cursor MCP server...');
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error('✓ Cursor MCP server is running');
        console.error(`Workspace path: ${workspacePath}`);
    }
    catch (error) {
        console.error('Failed to start MCP server:', error);
        process.exit(1);
    }
}
