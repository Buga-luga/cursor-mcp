import { z } from "zod";
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as robot from 'robotjs';

interface ToolDefinition {
    name: string;
    description: string;
    inputSchema: z.ZodSchema<any>;
    handler: (params: any) => Promise<any>;
}

const execAsync = promisify(exec);

interface OpenCursorParams {
    waitForStart: boolean;
    args: string[];
    waitTimeForCline: number;
    enableCline: boolean;
}

export const findCursorExecutable = async (): Promise<string> => {
    const possiblePaths = [
        path.join(process.env.LOCALAPPDATA || '', 'Programs', 'cursor', 'Cursor.exe'),
        path.join(process.env.PROGRAMFILES || '', 'Cursor', 'Cursor.exe'),
        path.join(process.env.PROGRAMFILES || '', 'cursor', 'Cursor.exe'),
    ];

    for (const cursorPath of possiblePaths) {
        try {
            await fs.access(cursorPath);
            return cursorPath;
        } catch {
            continue;
        }
    }

    throw new Error('Cursor executable not found in any of the expected locations');
};

export const findClineExtension = async (): Promise<{exists: boolean, path: string}> => {
    const possiblePaths = [
        path.join(process.env.APPDATA || '', 'Cursor', 'User', 'extensions', 'cursor.cline'),
        path.join(process.env.LOCALAPPDATA || '', 'Programs', 'cursor', 'resources', 'app', 'extensions', 'cursor.cline'),
        path.join(process.env.APPDATA || '', 'Cursor', 'User', 'globalStorage', 'saoudrizwan.claude-dev')
    ];
    
    for (const clinePath of possiblePaths) {
        try {
            await fs.access(clinePath);
            return { exists: true, path: clinePath };
        } catch {
            continue;
        }
    }
    
    return { exists: false, path: '' };
};

export const openClineNewTab = async (waitTime: number = 1500) => {
    // Wait for Cursor to fully load
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    // Open command palette (Ctrl + Shift + P)
    robot.keyTap('p', ['control', 'shift']);
    
    // Wait for palette to open
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Type "Cline: Open in New Tab"
    const command = "Cline: Open in New Tab";
    for (const char of command) {
        robot.typeString(char);
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Wait briefly
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Press Enter to select
    robot.keyTap('enter');
};

export const OpenCursorTool: ToolDefinition = {
    name: "open_cursor_with_cline",
    description: "Opens Cursor IDE and launches Cline in a new tab",
    inputSchema: z.object({
        waitForStart: z.boolean().optional().default(true),
        args: z.array(z.string()).optional().default([]),
        waitTimeForCline: z.number().optional().default(1500),
        enableCline: z.boolean().optional().default(true)
    }).strict(),
    handler: async (params: OpenCursorParams) => {
        try {
            // Check for Cline extension
            const cline = await findClineExtension();
            if (params.enableCline && !cline.exists) {
                return {
                    _meta: {
                        mcp_version: "1.0.1",
                        tool_name: "open_cursor_with_cline",
                        error: true
                    },
                    content: [{
                        type: "text",
                        text: "Cline extension not found. Please install Cline first."
                    }]
                };
            }

            const cursorPath = await findCursorExecutable();
            
            // Add specific arguments to ensure Cline is activated
            const allArgs = [
                ...(params.enableCline ? [
                    '--enable-proposed-api',
                    'cursor.cline',
                    '--load-extension',
                    cline.path
                ] : []),
                ...(params.args || [])
            ];
                
            const command = `"${cursorPath}" ${allArgs.join(' ')}`;
            
            if (params.waitForStart) {
                await execAsync(command);
                // After Cursor launches, open Cline in new tab
                if (params.enableCline) {
                    await openClineNewTab(params.waitTimeForCline);
                }
            } else {
                const { spawn } = require('child_process');
                const process = spawn(cursorPath, allArgs, {
                    detached: true,
                    stdio: 'ignore'
                });
                
                if (params.enableCline) {
                    // Even in non-waiting mode, we need to wait to trigger Cline
                    await openClineNewTab(params.waitTimeForCline);
                }
                
                process.unref();
            }
            
            return {
                _meta: {
                    mcp_version: "1.0.1",
                    tool_name: "open_cursor_with_cline"
                },
                content: [{
                    type: "text",
                    text: `Successfully launched Cursor${params.waitForStart ? ' and confirmed startup' : ''} ${params.enableCline ? 'and opened Cline in new tab' : ''}`
                }]
            };
        } catch (error: unknown) {
            console.error('Error in open_cursor_with_cline:', error);
            const err = error instanceof Error ? error : new Error('Unknown error occurred');
            return {
                _meta: {
                    mcp_version: "1.0.1",
                    tool_name: "open_cursor_with_cline",
                    error: true
                },
                content: [{
                    type: "text",
                    text: `Failed to launch Cursor: ${err.message}`
                }]
            };
        }
    }
};