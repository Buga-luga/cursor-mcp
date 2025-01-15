import { CursorInstanceManagerImpl } from '../managers/CursorInstanceManager.js'

async function testCommandPalette() {
    const cursorManager = new CursorInstanceManagerImpl()
    
    try {
        console.log('Creating new Cursor instance...')
        const instance = await cursorManager.create()
        
        if (!instance.window) {
            throw new Error('Failed to create Cursor window')
        }
        
        // Wait for window to initialize
        console.log('Waiting for window initialization...')
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        // Open command palette
        console.log('Opening command palette...')
        await cursorManager.openCommandPalette(instance.id)
        
        // Keep process alive to observe result
        await new Promise(resolve => setTimeout(resolve, 5000))
        
        // Cleanup
        console.log('Cleaning up...')
        cursorManager.remove(instance.id)
        
    } catch (error) {
        console.error('Test failed:', error)
        process.exit(1)
    }
}

// Run the test
testCommandPalette().catch(error => {
    console.error('Unhandled error:', error)
    process.exit(1)
}) 