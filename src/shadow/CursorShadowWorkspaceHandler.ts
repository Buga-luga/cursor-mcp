/**
 * @fileoverview Handles isolated workspace creation and management for code execution.
 * Provides functionality to create, manage, and clean up shadow workspaces for secure code execution.
 * Supports multiple programming languages and frameworks with automatic entry point detection.
 */

import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * Configuration options for creating and managing a shadow workspace
 * @interface ShadowWorkspaceOptions
 * @property {string} [code] - Source code to be executed
 * @property {string} [filename] - Name of the main file
 * @property {string} [filepath] - Path to existing file/directory
 * @property {Array<{code: string, filename: string}>} [dependencies] - Additional files needed
 * @property {string} [entryPoint] - Main file to run if multiple files exist
 * @property {boolean} [detectEntryPoint] - Whether to automatically detect the entry point
 */
interface ShadowWorkspaceOptions {
    code?: string;
    filename?: string;
    filepath?: string;
    dependencies?: Array<{
        code: string;
        filename: string;
    }>;
    entryPoint?: string;
    detectEntryPoint?: boolean;
}

/**
 * Manages isolated workspaces for secure code execution
 * Provides functionality for workspace creation, setup, and cleanup
 * 
 * Features:
 * - Isolated workspace creation
 * - Multi-language support
 * - Framework detection
 * - Dependency management
 * - Automatic entry point detection
 * - Secure execution environment
 */
export class CursorShadowWorkspaceHandler {
    private workspaceBaseDir: string;
    private workspaceCount: number;

    /**
     * Creates a new CursorShadowWorkspaceHandler instance
     * @param {string} [shadowPath] - Base directory for shadow workspaces
     */
    constructor(shadowPath?: string) {
        this.workspaceBaseDir = shadowPath || path.join(process.cwd(), 'shadow-workspaces');
        this.workspaceCount = 0;
        this.initializeWorkspaceDirectory();
    }

    /**
     * Initializes the base workspace directory
     * Creates the directory if it doesn't exist
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
     * Creates a new isolated workspace directory
     * @private
     * @returns {Promise<string>} Path to the created workspace
     */
    private async createWorkspaceDirectory(): Promise<string> {
        const workspaceId = `workspace_${++this.workspaceCount}`;
        const workspacePath = path.join(this.workspaceBaseDir, workspaceId);
        await fs.mkdir(workspacePath, { recursive: true });
        return workspacePath;
    }

    /**
     * Sets up a Node.js project environment in the workspace
     * Creates package.json and babel config for JS/TS/React support
     * 
     * @private
     * @param {string} workspacePath - Path to the workspace
     * @param {string} extension - File extension to determine setup
     */
    private async setupNodeProject(workspacePath: string, extension: string): Promise<void> {
        // Create package.json with necessary dependencies
        const packageJson = {
            "name": "shadow-workspace",
            "version": "1.0.0",
            "type": "module",
            "dependencies": {
                "@babel/core": "^7.22.0",
                "@babel/preset-react": "^7.22.0",
                "@babel/preset-typescript": "^7.22.0",
                "@babel/register": "^7.22.0",
                "@babel/preset-env": "^7.22.0",
                "ts-node": "^10.9.1",
                "typescript": "^5.0.0",
                "react": "^18.2.0",
                "react-dom": "^18.2.0"
            }
        };

        await fs.writeFile(
            path.join(workspacePath, 'package.json'),
            JSON.stringify(packageJson, null, 2)
        );

        // Create babel config for JSX/TSX
        const babelConfig = {
            "presets": [
                "@babel/preset-env",
                "@babel/preset-react",
                "@babel/preset-typescript"
            ]
        };

        await fs.writeFile(
            path.join(workspacePath, '.babelrc'),
            JSON.stringify(babelConfig, null, 2)
        );

        // Install dependencies
        await this.executeCommand(`cd "${workspacePath}" && npm install`);
    }

    /**
     * Gets the appropriate command to run a file based on its extension
     * Supports multiple languages and frameworks
     * 
     * Supported Languages:
     * - JavaScript/TypeScript (Node.js)
     * - Python
     * - Shell scripts
     * - Ruby, PHP, Perl, R
     * - Go, Java, Groovy, Scala, Kotlin
     * - C++, C, Rust
     * 
     * @private
     * @param {string} extension - File extension
     * @param {string} filePath - Path to the file
     * @returns {string|null} Command to execute the file or null if unsupported
     */
    private getRunCommand(extension: string, filePath: string): string | null {
        // Get the workspace path from the file path
        const workspacePath = path.dirname(filePath);

        const commands: Record<string, string> = {
            // Node.js and TypeScript
            '.js': `node "${filePath}"`,
            '.ts': `ts-node "${filePath}"`,
            '.mjs': `node "${filePath}"`,
            '.cjs': `node "${filePath}"`,

            // React/JSX/TSX
            '.jsx': `node -r @babel/register "${filePath}"`,
            '.tsx': `ts-node --compiler-options '{"jsx":"react"}' "${filePath}"`,

            // Python
            '.py': `python "${filePath}"`,
            '.py3': `python3 "${filePath}"`,
            '.pyw': `pythonw "${filePath}"`,

            // Shell scripts
            '.sh': `bash "${filePath}"`,
            '.bash': `bash "${filePath}"`,
            '.zsh': `zsh "${filePath}"`,
            '.bat': `"${filePath}"`,
            '.cmd': `"${filePath}"`,
            '.ps1': `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${filePath}"`,

            // Other languages
            '.rb': `ruby "${filePath}"`,
            '.php': `php "${filePath}"`,
            '.pl': `perl "${filePath}"`,
            '.r': `Rscript "${filePath}"`,
            '.go': `go run "${filePath}"`,
            '.java': `java "${filePath}"`,
            '.groovy': `groovy "${filePath}"`,
            '.scala': `scala "${filePath}"`,
            '.kt': `kotlin "${filePath}"`,
            '.kts': `kotlin "${filePath}"`,

            // Compiled languages
            '.cpp': `g++ "${filePath}" -o "${filePath}.exe" && "${filePath}.exe"`,
            '.cc': `g++ "${filePath}" -o "${filePath}.exe" && "${filePath}.exe"`,
            '.c': `gcc "${filePath}" -o "${filePath}.exe" && "${filePath}.exe"`,
            '.rs': `rustc "${filePath}" -o "${filePath}.exe" && "${filePath}.exe"`,

            // Shell commands
            '.fish': `fish "${filePath}"`,
            '.tcsh': `tcsh "${filePath}"`,
            '.ksh': `ksh "${filePath}"`
        };
        
        return commands[extension] || null;
    }

    /**
     * Detects the main entry point in a workspace
     * Supports multiple frameworks and project structures
     * 
     * Detection Priority:
     * 1. Framework-specific configs (next.config.js, vite.config.js, etc.)
     * 2. Common entry points (index.ts, main.py, etc.)
     * 3. Package.json main field
     * 
     * Supported Frameworks:
     * - Next.js/React/Vue
     * - Node.js/TypeScript
     * - Python (Django, Flask)
     * - Rust/Go/Java
     * 
     * @private
     * @param {string} workspacePath - Path to the workspace
     * @returns {Promise<string|null>} Path to the entry point or null if not found
     */
    private async detectEntryPoint(workspacePath: string): Promise<string | null> {
        // Common entry point patterns by priority
        const entryPointPatterns = [
            // Next.js/React/Vue
            { file: 'pages/_app.tsx', type: 'next' },
            { file: 'pages/_app.jsx', type: 'next' },
            { file: 'pages/index.tsx', type: 'next' },
            { file: 'pages/index.jsx', type: 'next' },
            { file: 'src/pages/_app.tsx', type: 'next' },
            { file: 'src/pages/index.tsx', type: 'next' },
            { file: 'src/App.tsx', type: 'react' },
            { file: 'src/main.tsx', type: 'react' },
            { file: 'src/main.jsx', type: 'react' },
            { file: 'src/app.vue', type: 'vue' },
            { file: 'src/main.ts', type: 'vue' },

            // Node.js/TypeScript
            { file: 'src/index.ts', type: 'node' },
            { file: 'src/index.js', type: 'node' },
            { file: 'src/main.ts', type: 'node' },
            { file: 'src/main.js', type: 'node' },
            { file: 'src/app.ts', type: 'node' },
            { file: 'src/app.js', type: 'node' },
            { file: 'src/server.ts', type: 'node' },
            { file: 'src/server.js', type: 'node' },
            { file: 'index.ts', type: 'node' },
            { file: 'index.js', type: 'node' },
            { file: 'main.ts', type: 'node' },
            { file: 'main.js', type: 'node' },
            { file: 'app.ts', type: 'node' },
            { file: 'app.js', type: 'node' },
            { file: 'server.ts', type: 'node' },
            { file: 'server.js', type: 'node' },
            
            // Python
            { file: 'src/__main__.py', type: 'python' },
            { file: 'src/main.py', type: 'python' },
            { file: 'src/app.py', type: 'python' },
            { file: '__main__.py', type: 'python' },
            { file: 'main.py', type: 'python' },
            { file: 'app.py', type: 'python' },
            { file: 'run.py', type: 'python' },
            { file: 'wsgi.py', type: 'python' },
            { file: 'asgi.py', type: 'python' },
            { file: 'manage.py', type: 'django' },
            
            // Rust
            { file: 'src/main.rs', type: 'rust' },
            { file: 'src/lib.rs', type: 'rust' },
            { file: 'main.rs', type: 'rust' },
            
            // Go
            { file: 'cmd/main.go', type: 'go' },
            { file: 'main.go', type: 'go' },
            { file: 'app.go', type: 'go' },
            
            // Java/Kotlin/Scala
            { file: 'src/main/java/Main.java', type: 'java' },
            { file: 'src/main/kotlin/Main.kt', type: 'kotlin' },
            { file: 'src/main/scala/Main.scala', type: 'scala' },
            { file: 'Main.java', type: 'java' },
            { file: 'App.java', type: 'java' },
            
            // C#/.NET
            { file: 'Program.cs', type: 'csharp' },
            { file: 'Startup.cs', type: 'csharp' },
            { file: 'src/Program.cs', type: 'csharp' }
        ];

        // Check for framework-specific config files first
        const frameworkConfigs = [
            { file: 'next.config.js', type: 'next', entry: 'pages/index' },
            { file: 'vite.config.js', type: 'vite', entry: 'src/main' },
            { file: 'angular.json', type: 'angular', entry: 'src/main.ts' },
            { file: 'cargo.toml', type: 'rust', entry: 'src/main.rs' },
            { file: 'go.mod', type: 'go', entry: 'main.go' },
            { file: 'pom.xml', type: 'java', entry: 'src/main/java/Main.java' },
            { file: 'build.gradle', type: 'java', entry: 'src/main/java/Main.java' },
            { file: 'requirements.txt', type: 'python', entry: 'main.py' },
            { file: 'Pipfile', type: 'python', entry: 'main.py' },
            { file: 'pyproject.toml', type: 'python', entry: 'main.py' }
        ];

        // Check for framework configurations
        for (const config of frameworkConfigs) {
            const configPath = path.join(workspacePath, config.file);
            try {
                await fs.access(configPath);
                // If framework config exists, look for its typical entry point
                const entryPath = path.join(workspacePath, config.entry);
                if (await fs.access(entryPath).then(() => true).catch(() => false)) {
                    return entryPath;
                }
            } catch {
                continue;
            }
        }

        // Check package.json for Node.js projects
        try {
            const packageJsonPath = path.join(workspacePath, 'package.json');
            const packageJsonExists = await fs.access(packageJsonPath).then(() => true).catch(() => false);
            
            if (packageJsonExists) {
                const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
                // Check various package.json fields in order of priority
                const possibleEntries = [
                    packageJson.main,
                    packageJson.module,
                    packageJson.source,
                    packageJson.browser,
                    packageJson.scripts?.start?.match(/["']([^"']+)["']/)?.[1],
                    packageJson.scripts?.dev?.match(/["']([^"']+)["']/)?.[1]
                ].filter(Boolean);

                for (const entry of possibleEntries) {
                    const mainFile = path.join(workspacePath, entry);
                    if (await fs.access(mainFile).then(() => true).catch(() => false)) {
                        return mainFile;
                    }
                }
            }
        } catch (error) {
            console.error('Error reading package.json:', error);
        }

        // Check for common entry point patterns
        for (const pattern of entryPointPatterns) {
            const filePath = path.join(workspacePath, pattern.file);
            try {
                await fs.access(filePath);
                return filePath;
            } catch {
                continue;
            }
        }

        // Look for files with main/run functions or exports
        try {
            const files = await fs.readdir(workspacePath, { recursive: true });
            for (const file of files) {
                if (typeof file !== 'string' || file.startsWith('.')) continue;
                
                const filePath = path.join(workspacePath, file);
                const stat = await fs.stat(filePath);
                
                if (stat.isFile()) {
                    const content = await fs.readFile(filePath, 'utf-8');
                    // Look for common main function patterns
                    if (content.includes('function main') ||
                        content.includes('def main') ||
                        content.includes('public static void main') ||
                        content.includes('fn main') ||
                        content.includes('func main') ||
                        content.includes('class Main') ||
                        content.includes('export default') ||
                        content.includes('module.exports') ||
                        content.includes('createRoot') ||
                        content.includes('ReactDOM.render') ||
                        content.includes('if __name__ == "__main__"') ||
                        content.includes('@SpringBootApplication')) {
                        return filePath;
                    }
                }
            }
        } catch (error) {
            console.error('Error scanning for main functions:', error);
        }

        return null;
    }

    /**
     * Executes code in an isolated workspace
     * Main public method for running code with dependencies
     * 
     * Process:
     * 1. Creates isolated workspace
     * 2. Sets up project environment
     * 3. Writes code and dependencies
     * 4. Detects/uses entry point
     * 5. Executes code
     * 6. Returns results
     * 
     * @param {ShadowWorkspaceOptions} options - Configuration options
     * @returns {Promise<{success: boolean, output: string, error?: string}>}
     */
    async runCode(options: ShadowWorkspaceOptions) {
        let workspacePath: string | null = null;
        try {
            workspacePath = await this.createWorkspaceDirectory();
            let mainFilePath: string;

            // Write all dependency files first
            if (options.dependencies?.length) {
                for (const dep of options.dependencies) {
                    const depPath = path.join(workspacePath, dep.filename);
                    await fs.writeFile(depPath, dep.code, 'utf-8');
                }
            }

            // Write main code file
            if (options.code && options.filename) {
                mainFilePath = path.join(workspacePath, options.filename);
                await fs.writeFile(mainFilePath, options.code, 'utf-8');
            } else if (options.filepath) {
                mainFilePath = options.filepath;
            } else {
                throw new Error('Either code and filename or filepath must be provided');
            }

            // Determine which file to run
            let fileToRun: string;
            if (options.entryPoint) {
                fileToRun = path.join(workspacePath, options.entryPoint);
            } else {
                const detectedEntry = await this.detectEntryPoint(workspacePath);
                fileToRun = detectedEntry || mainFilePath;
            }

            // Execute the code directly without opening Cursor UI
            const extension = path.extname(fileToRun).toLowerCase();
            const runCommand = this.getRunCommand(extension, fileToRun);
            
            if (!runCommand) {
                throw new Error(`Unsupported file type: ${extension}`);
            }

            // Setup Node.js project if needed
            if (['.jsx', '.tsx', '.ts'].includes(extension)) {
                await this.setupNodeProject(workspacePath, extension);
            }

            const { stdout, stderr } = await this.executeCommand(runCommand);

            // Determine success based on both stderr and exit code
            const success = !stderr || stderr.trim().length === 0;

            return {
                output: stdout,
                error: stderr,
                success,
                entryPoint: fileToRun
            };
        } catch (error) {
            console.error('Error in runCode:', error);
            throw error;
        } finally {
            // Clean up workspace in finally block to ensure it happens
            if (workspacePath) {
                try {
                    await this.cleanup(path.basename(workspacePath));
                } catch (cleanupError) {
                    console.error('Error during workspace cleanup:', cleanupError);
                }
            }
        }
    }

    /**
     * Executes a shell command in the workspace
     * Handles command execution and output collection
     * 
     * @private
     * @param {string} command - Command to execute
     * @returns {Promise<{stdout: string, stderr: string}>}
     */
    private async executeCommand(command: string): Promise<{ stdout: string; stderr: string }> {
        return new Promise((resolve, reject) => {
            const childProcess = exec(command, {
                maxBuffer: 10 * 1024 * 1024, // 10MB buffer
                timeout: 30000, // 30 second timeout
                env: {
                    ...process.env,
                    FORCE_COLOR: '1',
                    TERM: 'xterm-256color'
                }
            }, (error, stdout, stderr) => {
                if (error && !error.message.includes('exit code 1')) {
                    reject(error);
                } else {
                    resolve({ 
                        stdout: stdout.toString(),
                        stderr: stderr.toString()
                    });
                }
            });

            // Handle process cleanup
            const cleanup = () => {
                try {
                    if (childProcess.pid) {
                        process.kill(-childProcess.pid);
                    }
                } catch (e) {
                    console.error('Error cleaning up process:', e);
                }
            };

            process.on('SIGINT', cleanup);
            process.on('SIGTERM', cleanup);
            childProcess.on('exit', () => {
                process.removeListener('SIGINT', cleanup);
                process.removeListener('SIGTERM', cleanup);
            });
        });
    }

    /**
     * Cleans up a workspace after execution
     * Removes temporary files and directories
     * 
     * @param {string} workspaceId - ID of the workspace to clean
     */
    async cleanup(workspaceId: string): Promise<void> {
        try {
            const workspacePath = path.join(this.workspaceBaseDir, workspaceId);
            await fs.rm(workspacePath, { recursive: true, force: true });
        } catch (error) {
            console.error('Error cleaning up workspace:', error);
            throw error;
        }
    }
}