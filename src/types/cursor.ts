import { ChildProcess } from 'child_process'
import type { Window as WindowManager } from 'node-window-manager'

// Alias the node-window-manager Window type
export type Window = WindowManager

export interface CursorInstance {
    id: string               // UUID of the instance
    process: ChildProcess    // Reference to the spawned process
    window?: Window         // Window object from node-window-manager
    workspacePath?: string   // Optional workspace path this instance was opened with
    createdAt: Date         // When this instance was created
    isActive: boolean       // Whether this instance is still running
}

export interface CursorInstanceManager {
    create(workspacePath?: string): Promise<CursorInstance>
    get(id: string): CursorInstance | undefined
    list(): CursorInstance[]
    remove(id: string): boolean
    sendKeyToInstance(id: string, virtualKey: number): Promise<void>
    openCommandPalette(id: string): Promise<void>
    openClineTab(id: string): Promise<void>
} 