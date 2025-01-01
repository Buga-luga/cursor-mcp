import { spawn } from 'child_process'

/**
 * Opens Cursor IDE with optional path.
 * If no path is provided, opens a new window.
 * @param path Optional path to open in Cursor
 * @returns {Promise<void>} Resolves when Cursor opens
 */
export async function openCursor(path?: string): Promise<void> {
  const args = path ? [path] : ['--new-window']
  
  // Use the cursor command which should be installed via
  // "Shell Command: Install 'cursor' command" from Command Palette
  spawn('cursor', args, {
    detached: true,
    stdio: 'ignore',
    shell: true
  }).unref()
}

export const openCursorTool = {
  name: 'open_cursor',
  description: 'Opens Cursor IDE. Can open a specific path or create a new window.',
  handler: openCursor
} 