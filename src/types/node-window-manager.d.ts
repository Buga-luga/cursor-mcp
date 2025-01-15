declare module 'node-window-manager' {
    export interface Window {
        processId: number
        handle: number
        getTitle(): string
        bringToTop(): void
        show(): void
        restore(): void
    }

    export interface KeyboardInput {
        type: 'keyDown' | 'keyUp'
        keyCode: number
    }

    export interface WindowManager {
        getWindows(): Window[]
        sendKeyboardInput(inputs: KeyboardInput[]): void
    }

    export const windowManager: WindowManager
} 