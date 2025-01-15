declare module 'node-windows' {
    interface WindowInfo {
        handle: number
        processId: number
        title: string
    }

    interface WindowManager {
        getWindows(callback: (windows: WindowInfo[]) => void): void
        focusWindow(handle: number, callback: (success: boolean) => void): void
        sendKeys(handle: number, keys: string, callback: () => void): void
        getTitle(handle: number, callback: (title: string) => void): void
    }

    export const windowManager: WindowManager
} 