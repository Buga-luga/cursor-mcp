import { McpError } from '@modelcontextprotocol/sdk/types.js'
import { ResultSchema, RequestSchema } from '@modelcontextprotocol/sdk/types.js'
import type { z } from 'zod'
import { CursorInstanceManager } from '../types/cursor.js'

type ToolResponse = z.infer<typeof ResultSchema>
type ChainContext = z.infer<typeof RequestSchema>['params']

export class CursorToolHandler {
    constructor(private cursorManager: CursorInstanceManager) {}

    async handleOpenCursor(params: any, chainContext?: ChainContext): Promise<ToolResponse> {
        try {
            const instance = await this.cursorManager.create(params.workspacePath);
            
            const response = {
                instanceId: instance.id,
                status: "success"
            };

            return {
                content: [{
                    type: "text",
                    text: JSON.stringify(response)
                }],
                chainContext: {
                    instanceId: instance.id,
                    toolName: "open_cursor"
                }
            };
        } catch (error: any) {
            throw new McpError(500, `Failed to launch Cursor: ${error?.message || 'Unknown error'}`);
        }
    }

    async handleCursorCommand(params: any, chainContext?: ChainContext): Promise<ToolResponse> {
        try {
            const instanceId = params.instanceId || chainContext?.instanceId;
            if (!instanceId) {
                throw new McpError(400, "Instance ID is required");
            }

            const { command } = params;
            await this.cursorManager.openCommandPalette(instanceId);
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const response = {
                status: "success",
                command: command,
                result: "Command executed successfully"
            };

            return {
                content: [{
                    type: "text",
                    text: JSON.stringify(response)
                }],
                chainContext: {
                    instanceId,
                    toolName: "cursor_command",
                    lastCommand: command
                }
            };
        } catch (error: any) {
            throw new McpError(500, `Failed to execute command: ${error?.message || 'Unknown error'}`);
        }
    }

    async handleOpenClineTab(params: any, chainContext?: ChainContext): Promise<ToolResponse> {
        try {
            const instanceId = params.instanceId || chainContext?.instanceId;
            if (!instanceId) {
                throw new McpError(400, "Instance ID is required");
            }

            await this.cursorManager.openClineTab(instanceId);
            
            const response = {
                status: "success",
                instanceId: instanceId,
                tabId: `cline-${Date.now()}`
            };

            return {
                content: [{
                    type: "text",
                    text: JSON.stringify(response)
                }],
                chainContext: {
                    instanceId,
                    toolName: "open_cline_tab",
                    tabId: response.tabId
                }
            };
        } catch (error: any) {
            throw new McpError(500, `Failed to open Cline tab: ${error?.message || 'Unknown error'}`);
        }
    }
} 