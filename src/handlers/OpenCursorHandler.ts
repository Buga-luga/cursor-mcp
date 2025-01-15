import { z } from "zod";
import { CursorInstanceManagerImpl } from '../managers/CursorInstanceManager.js';
import { McpError } from "@modelcontextprotocol/sdk/types.js";
import * as fs from 'fs-extra';

interface ToolDefinition {
    name: string;
    description: string;
    inputSchema: z.ZodSchema<any>;
    handler: (params: any) => Promise<any>;
}

interface OpenCursorParams {
    workspacePath?: string;
}

// Create a singleton instance of the manager
const cursorManager = new CursorInstanceManagerImpl();

export const OpenCursorTool: ToolDefinition = {
    name: "open_cursor",
    description: "Opens Cursor IDE and returns an instance identifier",
    inputSchema: z.object({
        workspacePath: z.string().optional()
    }).strict(),
    handler: async (params: OpenCursorParams) => {
        try {
            // Validate workspace path if provided
            if (params.workspacePath) {
                if (!await fs.pathExists(params.workspacePath)) {
                    throw new McpError(404, `Workspace path does not exist: ${params.workspacePath}`);
                }
                
                try {
                    await fs.access(params.workspacePath, fs.constants.R_OK);
                } catch {
                    throw new McpError(403, `No read permission for workspace path: ${params.workspacePath}`);
                }
            }

            const instance = await cursorManager.create(params.workspacePath);
            
            if (!instance.isActive) {
                throw new McpError(500, 'Failed to start Cursor instance');
            }

            if (!instance.window) {
                throw new McpError(500, 'Failed to obtain window handle for Cursor instance');
            }

            return {
                _meta: {
                    mcp_version: "1.0.1",
                    tool_name: "open_cursor"
                },
                content: [{
                    type: "text",
                    text: `Successfully launched Cursor${params.workspacePath ? ` with workspace: ${params.workspacePath}` : ''}`
                }],
                instance_id: instance.id
            };
        } catch (error: unknown) {
            console.error('Error in open_cursor:', error);
            
            // Handle different types of errors
            if (error instanceof McpError) {
                throw error; // Re-throw MCP errors directly
            }
            
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            
            // Map certain error messages to specific MCP error codes
            if (message.includes('ENOENT')) {
                throw new McpError(404, 'Cursor executable not found. Please ensure Cursor IDE is installed.');
            }
            if (message.includes('EACCES')) {
                throw new McpError(403, 'Permission denied when trying to launch Cursor');
            }
            if (message.includes('timed out')) {
                throw new McpError(408, 'Timed out waiting for Cursor to start');
            }
            
            // Default error response
            throw new McpError(500, `Failed to launch Cursor: ${message}`);
        }
    }
};