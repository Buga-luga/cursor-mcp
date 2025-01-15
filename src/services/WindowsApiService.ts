import { windowManager, Window } from 'node-window-manager'
import clipboard from 'clipboardy'
import robot from 'robotjs'

// Maximum retry attempts for window operations
const MAX_RETRIES = 3
const RETRY_DELAY = 500 // ms
const OPERATION_TIMEOUT = 10000 // 10 seconds max for any operation

// Virtual key codes for Windows
export enum VirtualKeys {
    CONTROL = 0x11,  // VK_CONTROL
    ALT = 0x12,      // VK_ALT
    SHIFT = 0x10,    // VK_SHIFT
    ENTER = 0x0D,    // VK_RETURN
    ESCAPE = 0x1B,   // VK_ESCAPE
    TAB = 0x09,      // VK_TAB
    LEFT = 0x25,     // VK_LEFT
    UP = 0x26,      // VK_UP
    RIGHT = 0x27,    // VK_RIGHT
    DOWN = 0x28,     // VK_DOWN
    SPACE = 0x20,    // VK_SPACE
    COLON = 0xBA,    // VK_OEM_1
    A = 0x41,        // VK_A
    B = 0x42,        // VK_B
    C = 0x43,        // VK_C
    D = 0x44,        // VK_D
    E = 0x45,        // VK_E
    F = 0x46,        // VK_F
    G = 0x47,        // VK_G
    H = 0x48,        // VK_H
    I = 0x49,        // VK_I
    J = 0x4A,        // VK_J
    K = 0x4B,        // VK_K
    L = 0x4C,        // VK_L
    M = 0x4D,        // VK_M
    N = 0x4E,        // VK_N
    O = 0x4F,        // VK_O
    P = 0x50,        // VK_P
    Q = 0x51,        // VK_Q
    R = 0x52,        // VK_R
    S = 0x53,        // VK_S
    T = 0x54,        // VK_T
    U = 0x55,        // VK_U
    V = 0x56,        // VK_V
    W = 0x57,        // VK_W
    X = 0x58,        // VK_X
    Y = 0x59,        // VK_Y
    Z = 0x5A,        // VK_Z
}

// Map of virtual key codes to robotjs key strings
const keyMap: { [key: number]: string } = {
    [VirtualKeys.CONTROL]: 'control',
    [VirtualKeys.ALT]: 'alt',
    [VirtualKeys.SHIFT]: 'shift',
    [VirtualKeys.ENTER]: 'enter',
    [VirtualKeys.ESCAPE]: 'escape',
    [VirtualKeys.TAB]: 'tab',
    [VirtualKeys.LEFT]: 'left',
    [VirtualKeys.UP]: 'up',
    [VirtualKeys.RIGHT]: 'right',
    [VirtualKeys.DOWN]: 'down',
    [VirtualKeys.SPACE]: 'space',
    [VirtualKeys.COLON]: ':',
    [VirtualKeys.A]: 'a',
    [VirtualKeys.B]: 'b',
    [VirtualKeys.C]: 'c',
    [VirtualKeys.D]: 'd',
    [VirtualKeys.E]: 'e',
    [VirtualKeys.F]: 'f',
    [VirtualKeys.G]: 'g',
    [VirtualKeys.H]: 'h',
    [VirtualKeys.I]: 'i',
    [VirtualKeys.J]: 'j',
    [VirtualKeys.K]: 'k',
    [VirtualKeys.L]: 'l',
    [VirtualKeys.M]: 'm',
    [VirtualKeys.N]: 'n',
    [VirtualKeys.O]: 'o',
    [VirtualKeys.P]: 'p',
    [VirtualKeys.Q]: 'q',
    [VirtualKeys.R]: 'r',
    [VirtualKeys.S]: 's',
    [VirtualKeys.T]: 't',
    [VirtualKeys.U]: 'u',
    [VirtualKeys.V]: 'v',
    [VirtualKeys.W]: 'w',
    [VirtualKeys.X]: 'x',
    [VirtualKeys.Y]: 'y',
    [VirtualKeys.Z]: 'z',
}

// Keyboard event types that match node-window-manager's supported types
export type KeyboardEventType = 'keyDown' | 'keyUp'

export const KeyboardEventTypes = {
    KeyDown: 'keyDown' as const,
    KeyUp: 'keyUp' as const
}

interface KeyboardEvent {
    type: KeyboardEventType
    keyCode: number
    modifiers?: {
        alt?: boolean
        ctrl?: boolean
        shift?: boolean
    }
}

export class WindowsApiService {
    // Track windows created by our tool
    private managedWindows = new Set<number>()

    // Register a window as managed by our tool
    registerManagedWindow(processId: number) {
        this.managedWindows.add(processId)
    }

    // Check if a window is managed by our tool
    isManagedWindow(processId: number): boolean {
        return this.managedWindows.has(processId)
    }

    private async withTimeout<T>(operation: () => Promise<T>, timeoutMs: number = OPERATION_TIMEOUT): Promise<T> {
        const timeout = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
        })
        
        return Promise.race([operation(), timeout])
    }

    private async verifyWindow(window: Window, options: { initialCreation?: boolean } = {}): Promise<boolean> {
        return this.withTimeout(async () => {
            try {
                // Check if window still exists
                const windows = windowManager.getWindows()
                const exists = windows.some(w => w.handle === window.handle)
                
                if (!exists) return false

                // During initial creation, we only check if the window exists
                if (options.initialCreation) {
                    return true
                }

                // For established windows, verify it's managed by us
                if (!this.isManagedWindow(window.processId)) {
                    return false
                }

                // Verify it's a Cursor window by checking title
                const title = window.getTitle()
                if (!title.includes('Cursor')) {
                    return false
                }

                return true
            } catch (error) {
                console.error('Error verifying window:', error)
                return false
            }
        })
    }

    private async withRetry<T>(
        operation: () => Promise<T>,
        window: Window,
        options: { requireFocus?: boolean } = {}
    ): Promise<T> {
        const { requireFocus = false } = options
        let lastError: Error | undefined

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                // Verify window is valid
                if (!await this.isWindowResponding(window)) {
                    throw new Error('Window is not responding')
                }

                // Focus window if required
                if (requireFocus) {
                    await this.focusWindow(window)
                }

                // Execute the operation
                return await operation()
            } catch (error) {
                lastError = error as Error
                console.error(`Operation failed (attempt ${attempt}/${MAX_RETRIES}):`, error)
                
                if (attempt < MAX_RETRIES) {
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
                }
            }
        }

        throw lastError || new Error('Operation failed after retries')
    }

    private async withWindowContext<T>(window: Window, operation: () => Promise<T>): Promise<T> {
        // Store the currently active window handle
        const activeWindows = windowManager.getWindows()
        const activeWindow = activeWindows.find(w => w.getTitle().length > 0)
        
        try {
            // Briefly activate our target window
            window.bringToTop()
            await new Promise(resolve => setTimeout(resolve, 50))
            
            // Perform the operation
            const result = await operation()
            
            // Restore previous window if there was one
            if (activeWindow && activeWindow.handle !== window.handle) {
                activeWindow.bringToTop()
            }
            
            return result
        } catch (error) {
            // Ensure we restore the previous window even if operation fails
            if (activeWindow && activeWindow.handle !== window.handle) {
                activeWindow.bringToTop()
            }
            throw error
        }
    }

    async findWindowByProcessId(processId: number, options: { initialCreation?: boolean } = {}): Promise<Window | null> {
        try {
            const windows = windowManager.getWindows()
            const window = windows.find(w => w.processId === processId)
            
            if (window) {
                // For initial creation, register the window as managed
                if (options.initialCreation) {
                    this.registerManagedWindow(processId)
                }
                
                if (await this.verifyWindow(window, options)) {
                    return window
                }
            }
            return null
        } catch (error) {
            console.error('Error finding window:', error)
            return null
        }
    }

    async findWindowByUuid(uuid: string): Promise<Window | null> {
        try {
            // For backward compatibility, treat UUID-based lookups as unmanaged
            const windows = windowManager.getWindows()
            const window = windows.find(w => w.getTitle().includes('Cursor'))
            
            if (window && await this.verifyWindow(window)) {
                return window
            }
            return null
        } catch (error) {
            console.error('Error finding window by UUID:', error)
            return null
        }
    }

    async focusWindow(window: Window): Promise<boolean> {
        return this.withRetry(async () => {
            window.show()
            window.restore()
            window.bringToTop()
            
            // Verify focus was obtained
            await new Promise(resolve => setTimeout(resolve, 100))
            const title = await this.getWindowTitle(window)
            if (!title) {
                throw new Error('Failed to obtain window focus')
            }
            
            return true
        }, window)
    }

    async sendKeyToWindow(window: Window, keyCode: number, modifiers?: KeyboardEvent['modifiers']): Promise<void> {
        await this.withRetry(async () => {
            // Ensure window is focused before sending keys
            await this.ensureWindowFocus(window)
            
            // Verify window is still valid and responding
            if (!await this.isWindowResponding(window)) {
                throw new Error('Window is not responding')
            }
            
            // Send key down event
            await this.simulateKeyboardEvent(window, {
                type: KeyboardEventTypes.KeyDown,
                keyCode,
                modifiers
            })

            // Small delay between down and up
            await new Promise(resolve => setTimeout(resolve, 50))

            // Send key up event
            await this.simulateKeyboardEvent(window, {
                type: KeyboardEventTypes.KeyUp,
                keyCode,
                modifiers
            })
        }, window, { requireFocus: true })
    }

    private async ensureWindowFocus(window: Window): Promise<void> {
        // Bring window to top and activate it
        window.bringToTop()
        window.show()
        window.restore()
        
        // Small delay to allow window manager to process
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Verify window is actually focused by checking title
        const title = await this.getWindowTitle(window)
        if (!title) {
            // If not focused, try alternative method using screen coordinates
            const screen = robot.getScreenSize()
            const centerX = Math.floor(screen.width / 2)
            const centerY = Math.floor(screen.height / 2)
            
            // Move mouse to center of screen and click
            robot.moveMouse(centerX, centerY)
            robot.mouseClick()
            
            // Additional delay to ensure focus
            await new Promise(resolve => setTimeout(resolve, 100))
            
            // Final verification
            const finalTitle = await this.getWindowTitle(window)
            if (!finalTitle) {
                throw new Error('Failed to focus window after multiple attempts')
            }
        }
    }

    async simulateKeyboardEvent(window: Window, event: KeyboardEvent): Promise<void> {
        const { type, keyCode, modifiers = {} } = event
        const { alt, ctrl, shift } = modifiers

        try {
            // Ensure we're focused on the right window
            await this.ensureWindowFocus(window)

            const key = keyMap[keyCode]
            if (!key) {
                throw new Error(`Unsupported key code: ${keyCode}`)
            }

            // Toggle the key
            robot.keyToggle(key, type === KeyboardEventTypes.KeyDown ? 'down' : 'up')

            // Small delay after event to ensure processing
            await new Promise(resolve => setTimeout(resolve, 30))
        } catch (error) {
            console.error('Error simulating keyboard event:', error)
            throw error
        }
    }

    async openCommandPalette(window: Window): Promise<void> {
        await this.withRetry(async () => {
            try {
                // Ensure we're focused on the right window
                await this.ensureWindowFocus(window)

                // Press Ctrl+Shift+P using only robotjs
                robot.keyToggle('control', 'down')
                await new Promise(resolve => setTimeout(resolve, 50))
                
                robot.keyToggle('shift', 'down')
                await new Promise(resolve => setTimeout(resolve, 50))
                
                robot.keyToggle('p', 'down')
                await new Promise(resolve => setTimeout(resolve, 50))

                // Release in reverse order with delays
                robot.keyToggle('p', 'up')
                await new Promise(resolve => setTimeout(resolve, 50))
                
                robot.keyToggle('shift', 'up')
                await new Promise(resolve => setTimeout(resolve, 50))
                
                robot.keyToggle('control', 'up')
                await new Promise(resolve => setTimeout(resolve, 50))

                // Wait for command palette to appear
                await new Promise(resolve => setTimeout(resolve, 500))
            } catch (error) {
                console.error('Error opening command palette:', error)
                throw error
            }
        }, window)
    }

    async getVirtualKeyForChar(char: string): Promise<number> {
        const upperChar = char.toUpperCase()
        if (upperChar === ' ') return VirtualKeys.SPACE
        if (upperChar === ':') return VirtualKeys.COLON
        if (upperChar >= 'A' && upperChar <= 'Z') {
            return VirtualKeys[upperChar as keyof typeof VirtualKeys]
        }
        throw new Error(`No virtual key code for character: ${char}`)
    }

    async getWindowTitle(window: Window): Promise<string> {
        try {
            return window.getTitle()
        } catch (error) {
            console.error('Error getting window title:', error)
            return ''
        }
    }

    async isWindowResponding(window: Window): Promise<boolean> {
        try {
            const title = await this.getWindowTitle(window)
            return title.length > 0
        } catch (error) {
            console.error('Error checking window state:', error)
            return false
        }
    }

    async openClineTab(window: Window): Promise<void> {
        await this.withRetry(async () => {
            // 1. Open command palette
            await this.openCommandPalette(window)
            await new Promise(resolve => setTimeout(resolve, 500))

            // 2. Type "Cline: Open in New Tab"
            const text = "Cline: Open in New Tab"
            for (const char of text) {
                const keyCode = await this.getVirtualKeyForChar(char)
                await this.simulateKeyboardEvent(window, {
                    type: KeyboardEventTypes.KeyDown,
                    keyCode
                })
                await new Promise(resolve => setTimeout(resolve, 30))
                await this.simulateKeyboardEvent(window, {
                    type: KeyboardEventTypes.KeyUp,
                    keyCode
                })
                await new Promise(resolve => setTimeout(resolve, 30))
            }

            // 3. Press Enter
            await this.simulateKeyboardEvent(window, {
                type: KeyboardEventTypes.KeyDown,
                keyCode: VirtualKeys.ENTER
            })
            await new Promise(resolve => setTimeout(resolve, 30))
            await this.simulateKeyboardEvent(window, {
                type: KeyboardEventTypes.KeyUp,
                keyCode: VirtualKeys.ENTER
            })

            // Wait for command to execute
            await new Promise(resolve => setTimeout(resolve, 500))
        }, window)
    }
} 