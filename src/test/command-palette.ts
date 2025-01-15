import { windowManager } from 'node-window-manager'
import { WindowsApiService, VirtualKeys } from '../services/WindowsApiService.js'
import { CursorInstanceManagerImpl } from '../managers/CursorInstanceManager.js'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

async function testCommandPalette() {
    const windowsApi = new WindowsApiService()
    const cursorManager = new CursorInstanceManagerImpl()
    
    try {
        console.log('Creating new Cursor instance...')
        const instance = await cursorManager.create()
        if (!instance.window) {
            throw new Error('Failed to create Cursor window')
        }
        const cursorWindow = instance.window
        
        // Wait for window to be fully initialized
        console.log('Waiting for window initialization...')
        await new Promise(resolve => setTimeout(resolve, 5000))

        // Verify window is still active
        if (!instance.isActive) {
            throw new Error('Cursor instance became inactive during initialization. This may indicate that Cursor is not installed correctly or is missing dependencies.')
        }

        // Verify window title
        const title = await cursorWindow.getTitle()
        if (!title) {
            throw new Error('Failed to get window title. The window may not be responding.')
        }
        console.log('Found Cursor window:', title)
        
        // Open command palette
        console.log('Opening command palette...')
        await windowsApi.openCommandPalette(cursorWindow)
        
        // Wait for command palette to open
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Type "Cline: Open in New Tab"
        console.log('Typing command...')
        const text = "Cline: Open in New Tab"
        for (const char of text) {
            try {
                const keyCode = await windowsApi.getVirtualKeyForChar(char)
                await windowsApi.simulateKeyboardEvent(cursorWindow, {
                    type: 'keyDown',
                    keyCode
                })
                await new Promise(resolve => setTimeout(resolve, 30))
                await windowsApi.simulateKeyboardEvent(cursorWindow, {
                    type: 'keyUp',
                    keyCode
                })
                await new Promise(resolve => setTimeout(resolve, 30))
            } catch (error) {
                console.warn(`Skipping character "${char}": ${error}`)
            }
        }

        // Press Enter
        console.log('Pressing Enter...')
        await windowsApi.simulateKeyboardEvent(cursorWindow, {
            type: 'keyDown',
            keyCode: VirtualKeys.ENTER
        })
        await new Promise(resolve => setTimeout(resolve, 30))
        await windowsApi.simulateKeyboardEvent(cursorWindow, {
            type: 'keyUp',
            keyCode: VirtualKeys.ENTER
        })
        
        console.log('Command executed!')
        
        // Keep the process alive for a bit to observe the result
        await new Promise(resolve => setTimeout(resolve, 5000))
        
        // Clean up
        console.log('Cleaning up...')
        cursorManager.remove(instance.id)
        
    } catch (error) {
        if (error instanceof Error && error.message.includes('windows-foreground-love')) {
            console.error('Test failed: Cursor is missing required dependencies. Please ensure Cursor is installed correctly with all dependencies.')
        } else {
            console.error('Test failed:', error)
        }
        process.exit(1)
    }
}

// Run the test
testCommandPalette().catch(error => {
    console.error('Unhandled error:', error)
    process.exit(1)
}) 