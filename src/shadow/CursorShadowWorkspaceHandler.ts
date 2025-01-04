import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * Configuration options for shadow workspace creation
 * @interface
 */
interface ShadowWorkspaceOptions {
    /** Code content to be written to the workspace */
    code?: string;
    /** Programming language of the code */
    language?: string;
    /** Name of the file to create */
    filename?: string;
    /** Path to an existing file to open */
    filepath?: string;
    /** Isolation level for the workspace (currently only 'full' supported) */
    isolationLevel?: 'full';
}

/**
 * Configuration for the CursorShadowWorkspaceHandler
 * @interface
 */
interface CursorShadowWorkspaceConfig {
    /** Base directory for all workspaces */
    basePath?: string;
    /** Directory for shadow (isolated) workspaces */
    shadowPath?: string;
}

/**
 * Manages isolated Cursor IDE workspaces for safe code execution.
 * Creates and manages separate workspace environments to prevent interference
 * with the main workspace and ensure isolation between different sessions.
 */
export class CursorShadowWorkspaceHandler {
    /** Base directory where all shadow workspaces will be created */
    private workspaceBaseDir: string;
    
    /** Counter to generate unique workspace IDs */
    private workspaceCount: number;

    /**
     * Creates a new instance of CursorShadowWorkspaceHandler
     * @param {CursorShadowWorkspaceConfig} [config] - Configuration options
     */
    constructor(config?: CursorShadowWorkspaceConfig) {
        this.workspaceBaseDir = config?.shadowPath || path.join(process.cwd(), 'shadow-workspaces');
        this.workspaceCount = 0;
        this.initializeWorkspaceDirectory();
    }

    /**
     * Ensures the base workspace directory exists
     * @private
     */
    private async initializeWorkspaceDirectory(): Promise<void> {
        try {
            await fs.mkdir(this.workspaceBaseDir, { recursive: true });
        } catch (error) {
            console.error('Error creating workspace directory:', error);
        }
    }

    /**
     * Creates a new isolated workspace directory with Cursor IDE settings
     * @private
     * @returns {Promise<string>} Path to the created workspace
     */
    private async createWorkspaceDirectory(): Promise<string> {
        const workspaceId = `workspace_${++this.workspaceCount}`;
        const workspacePath = path.join(this.workspaceBaseDir, workspaceId);
        await fs.mkdir(workspacePath, { recursive: true });

        // Create workspace settings directory for Cursor IDE
        const settingsDir = path.join(workspacePath, '.cursor');
        await fs.mkdir(settingsDir, { recursive: true });

        // Create settings.json with security-focused settings
        // Disables various features to ensure isolation and security
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

        await fs.writeFile(
            path.join(settingsDir, 'settings.json'),
            JSON.stringify(settingsData, null, 2)
        );

        return workspacePath;
    }

    /**
     * Opens a new Cursor window with either generated code or an existing file
     * @param {ShadowWorkspaceOptions} options - Options for creating the workspace
     * @returns {Promise<{workspaceId: string, filePath: string, output: string, error: string}>} Workspace information
     * @throws {Error} If required parameters are missing or workspace creation fails
     */
    async openWithGeneratedCode(options: ShadowWorkspaceOptions) {
        try {
            const workspacePath = await this.createWorkspaceDirectory();
            let filePath: string;

            // Handle either new code creation or existing file opening
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

            // Get platform-specific Cursor executable path
            const cursorPath = this.getCursorExecutablePath();

            // Construct platform-specific launch command with security flags
            const command = process.platform === 'win32'
                ? `"${cursorPath}" --new-window --disable-extensions --disable-workspace-trust --no-sandbox --disable-gpu --disable-dev-shm-usage --user-data-dir="${workspacePath}" "${filePath}"`
                : `"${cursorPath}" --new-window --disable-extensions --disable-workspace-trust --user-data-dir="${workspacePath}" "${filePath}"`;

            const { stdout, stderr } = await this.executeCommand(command);

            // Ensure window has time to become visible
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

    /**
     * Gets the platform-specific path to the Cursor IDE executable
     * @private
     * @returns {string} Path to Cursor executable
     * @throws {Error} If platform is not supported
     */
    private getCursorExecutablePath(): string {
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

    /**
     * Executes a shell command and handles its output
     * @private
     * @param {string} command - Command to execute
     * @returns {Promise<{stdout: string, stderr: string}>} Command output
     */
    private async executeCommand(command: string): Promise<{ stdout: string; stderr: string }> {
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

    /**
     * Updates code in an existing workspace and reloads the Cursor window
     * @param {string} workspaceId - ID of the workspace to update
     * @param {string} filename - Name of the file to update
     * @param {string} newCode - New code content
     * @throws {Error} If update fails
     */
    async updateGeneratedCode(workspaceId: string, filename: string, newCode: string): Promise<void> {
        try {
            const filePath = path.join(this.workspaceBaseDir, workspaceId, filename);
            await fs.writeFile(filePath, newCode, 'utf-8');
            
            // Force Cursor to reload the updated file
            const cursorPath = this.getCursorExecutablePath();
            const command = `"${cursorPath}" --reuse-window --disable-extensions "${filePath}"`;
            await this.executeCommand(command);
        }
        catch (error) {
            console.error('Error updating generated code:', error);
            throw error;
        }
    }

    /**
     * Removes a workspace directory and all its contents
     * @param {string} workspaceId - ID of the workspace to clean up
     * @throws {Error} If cleanup fails
     */
    async cleanup(workspaceId: string): Promise<void> {
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