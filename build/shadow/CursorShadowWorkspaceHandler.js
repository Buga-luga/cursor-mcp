import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
export class CursorShadowWorkspaceHandler {
    workspaceBaseDir;
    workspaceCount;
    constructor(shadowPath) {
        this.workspaceBaseDir = shadowPath || path.join(process.cwd(), 'shadow-workspaces');
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
        return workspacePath;
    }
    async setupNodeProject(workspacePath, extension) {
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
        await fs.writeFile(path.join(workspacePath, 'package.json'), JSON.stringify(packageJson, null, 2));
        // Create babel config for JSX/TSX
        const babelConfig = {
            "presets": [
                "@babel/preset-env",
                "@babel/preset-react",
                "@babel/preset-typescript"
            ]
        };
        await fs.writeFile(path.join(workspacePath, '.babelrc'), JSON.stringify(babelConfig, null, 2));
        // Install dependencies
        await this.executeCommand(`cd "${workspacePath}" && npm install`);
    }
    getRunCommand(extension, filePath) {
        // Get the workspace path from the file path
        const workspacePath = path.dirname(filePath);
        const commands = {
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
    async runCode(options) {
        try {
            const workspacePath = await this.createWorkspaceDirectory();
            let mainFilePath;
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
            }
            else if (options.filepath) {
                mainFilePath = options.filepath;
            }
            else {
                throw new Error('Either code and filename or filepath must be provided');
            }
            // Determine which file to run
            const fileToRun = options.entryPoint ?
                path.join(workspacePath, options.entryPoint) :
                mainFilePath;
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
            // Clean up the workspace immediately after execution
            await this.cleanup(path.basename(workspacePath));
            return {
                output: stdout,
                error: stderr,
                success: !stderr
            };
        }
        catch (error) {
            console.error('Error in runCode:', error);
            throw error;
        }
    }
    async executeCommand(command) {
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
                }
                else {
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
                }
                catch (e) {
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
