import { spawn } from 'child_process';
import { platform } from 'os';
export const openCursorTool = {
    name: 'open_cursor',
    description: 'Opens Cursor IDE with the MCP tool enabled',
    inputSchema: {
        type: 'object',
        properties: {}
    },
    handler: async () => {
        const isWindows = platform() === 'win32';
        const cursorPath = isWindows ? 'C:\\Users\\%USERNAME%\\AppData\\Local\\Programs\\Cursor\\Cursor.exe' : '/Applications/Cursor.app/Contents/MacOS/Cursor';
        try {
            spawn(cursorPath, [], {
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
                        text: `Failed to open Cursor IDE: ${error.message}`
                    }
                ],
                isError: true
            };
        }
    }
};
