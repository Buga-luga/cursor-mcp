import { spawn } from 'child_process';
import { platform } from 'os';
import { createMCPTool, createSuccessResponse, createErrorResponse } from './tool-framework.js';
import { z } from 'zod';
// Optional input schema for path parameter
const OpenCursorInput = z.object({
    path: z.string().optional()
}).optional();
// Create the open_cursor tool using the framework
export const openCursorTool = createMCPTool({
    name: 'open_cursor',
    description: 'Opens Cursor IDE. Can open a specific path or create a new window.',
    inputSchema: OpenCursorInput,
    handler: async (input) => {
        const isWindows = platform() === 'win32';
        const cursorPath = isWindows
            ? 'C:\\Users\\%USERNAME%\\AppData\\Local\\Programs\\Cursor\\Cursor.exe'
            : '/Applications/Cursor.app/Contents/MacOS/Cursor';
        try {
            const args = input?.path ? [input.path] : ['--new-window'];
            spawn(cursorPath, args, {
                detached: true,
                stdio: 'ignore',
                shell: true
            }).unref();
            return createSuccessResponse('Successfully opened Cursor IDE');
        }
        catch (error) {
            if (error instanceof Error) {
                return createErrorResponse(error);
            }
            else {
                return createErrorResponse('Failed to open Cursor IDE');
            }
        }
    }
});
