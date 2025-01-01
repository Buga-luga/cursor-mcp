import { spawn } from 'child_process';
import { platform } from 'os';
import { z } from 'zod';
// Optional input schema for path parameter
const OpenCursorInput = z.object({
    path: z.string().optional()
}).optional();
// Create the open_cursor tool
export const openCursorTool = {
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
            return {
                content: [
                    {
                        type: 'text',
                        text: 'Successfully opened Cursor IDE'
                    }
                ],
                isError: false
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error: ${error instanceof Error ? error.message : 'Failed to open Cursor IDE'}`
                    }
                ],
                isError: true
            };
        }
    }
};
