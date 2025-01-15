import { z } from 'zod'

// Define the structure of a Cursor command
interface CursorCommand {
    name: string
    description: string
    palette_command: string
}

// Define core Cursor commands that Claude can use
export const CURSOR_COMMANDS: Record<string, CursorCommand> = {
    'openCline': {
        name: 'openCline',
        description: 'Opens a new Cline AI assistant tab',
        palette_command: 'Cline: Open in New Tab'
    },
    'openExtensions': {
        name: 'openExtensions',
        description: 'Opens the extensions panel',
        palette_command: 'Extensions: Install Extensions'
    },
    'openSettings': {
        name: 'openSettings',
        description: 'Opens Cursor settings',
        palette_command: 'Preferences: Open Settings'
    },
    'openTerminal': {
        name: 'openTerminal',
        description: 'Opens a new terminal',
        palette_command: 'Terminal: Create New Terminal'
    }
}

// Schema for command execution
export const CommandSchema = z.object({
    command: z.enum(['openCline', 'openExtensions', 'openSettings', 'openTerminal']),
    args: z.record(z.any()).optional()
})

export type CommandRequest = z.infer<typeof CommandSchema>

// Get the palette command for a given command name
export function getPaletteCommand(commandName: string): string | null {
    const command = CURSOR_COMMANDS[commandName]
    return command ? command.palette_command : null
} 