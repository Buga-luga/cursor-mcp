import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
export class CursorShadowWorkspaceHandler {
    workspaceBaseDir;
    workspaceCount;
    constructor(config) {
        this.workspaceBaseDir = config?.shadowPath || path.join(process.cwd(), 'shadow-workspaces');
        this.workspaceCount = 0;
        this.initializeWorkspaceDirectory();
    }
    async initializeWorkspaceDirectory() {
        try {
            await fs.mkdir(this.workspaceBaseDir, { recursive: true });
        }
        catch (error) {
            console.error('Error creating workspace directory:', error);
        }
    }
    async createWorkspaceDirectory() {
        const workspaceId = `workspace_${++this.workspaceCount}`;
        const workspacePath = path.join(this.workspaceBaseDir, workspaceId);
        await fs.mkdir(workspacePath, { recursive: true });
        // Create workspace settings directory
        const settingsDir = path.join(workspacePath, '.cursor');
        await fs.mkdir(settingsDir, { recursive: true });
        // Create settings.json with extensions disabled
        const settingsData = {
            "workbench.startupEditor": "none",
            "extensions.autoUpdate": false,
            "extensions.autoCheckUpdates": false,
            "extensions.ignoreRecommendations": true,
            "extensions.showRecommendationsOnlyOnDemand": true,
            "workbench.enableExperiments": false,
            "telemetry.enableTelemetry": false,
            "telemetry.enableCrashReporter": false,
            "update.mode": "none",
            "update.showReleaseNotes": false,
            "workbench.settings.enableNaturalLanguageSearch": false,
            "security.workspace.trust.enabled": false,
            "extensions.experimental.affinity": {
                "*": 1
            }
        };
        await fs.writeFile(path.join(settingsDir, 'settings.json'), JSON.stringify(settingsData, null, 2));
        return workspacePath;
    }
    async openWithGeneratedCode(options) {
        try {
            const workspacePath = await this.createWorkspaceDirectory();
            let filePath;
            // Handle code generation if provided
            if (options.code && options.filename) {
                filePath = path.join(workspacePath, options.filename);
                await fs.writeFile(filePath, options.code, 'utf-8');
            }
            else if (options.filepath) {
                filePath = options.filepath;
            }
            else {
                throw new Error('Either code and filename or filepath must be provided');
            }
            // Get Cursor executable path based on OS
            const cursorPath = this.getCursorExecutablePath();
            // Launch Cursor with extensions disabled and other startup flags
            const command = process.platform === 'win32'
                ? `"${cursorPath}" --new-window --disable-extensions --disable-workspace-trust --no-sandbox --disable-gpu --disable-dev-shm-usage --user-data-dir="${workspacePath}" "${filePath}"`
                : `"${cursorPath}" --new-window --disable-extensions --disable-workspace-trust --user-data-dir="${workspacePath}" "${filePath}"`;
            const { stdout, stderr } = await this.executeCommand(command);
            // Wait a brief moment to ensure the window is visible
            await new Promise(resolve => setTimeout(resolve, 1000));
            return {
                workspaceId: path.basename(workspacePath),
                filePath,
                output: stdout,
                error: stderr
            };
        }
        catch (error) {
            console.error('Error in openWithGeneratedCode:', error);
            throw error;
        }
    }
    getCursorExecutablePath() {
        const username = process.env.USERNAME || process.env.USER;
        switch (process.platform) {
            case 'win32':
                return `C:\\Users\\${username}\\AppData\\Local\\Programs\\Cursor\\Cursor.exe`;
            case 'darwin':
                return '/Applications/Cursor.app/Contents/MacOS/Cursor';
            case 'linux':
                return '/usr/bin/cursor';
            default:
                throw new Error('Unsupported platform');
        }
    }
    async executeCommand(command) {
        return new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error && !error.message.includes('exit code 1')) { // Ignore expected exit code 1
                    reject(error);
                }
                else {
                    resolve({ stdout, stderr });
                }
            });
        });
    }
    async updateGeneratedCode(workspaceId, filename, newCode) {
        try {
            const filePath = path.join(this.workspaceBaseDir, workspaceId, filename);
            await fs.writeFile(filePath, newCode, 'utf-8');
            // Force a reload of the file in Cursor
            const cursorPath = this.getCursorExecutablePath();
            const command = `"${cursorPath}" --reuse-window --disable-extensions "${filePath}"`;
            await this.executeCommand(command);
        }
        catch (error) {
            console.error('Error updating generated code:', error);
            throw error;
        }
    }
    async cleanup(workspaceId) {
        try {
            const workspacePath = path.join(this.workspaceBaseDir, workspaceId);
            await fs.rm(workspacePath, { recursive: true, force: true });
        }
        catch (error) {
            console.error('Error cleaning up workspace:', error);
            throw error;
        }
    }
}
