import { createSuccessResponse, createErrorResponse } from './tool-framework.js';
import { z } from 'zod';
import { watch, readFileSync, existsSync } from 'fs';
import { join, relative, resolve } from 'path';
import { homedir } from 'os';
import { indexBuilderTool } from './index-builder.js';
// Schema for the watcher parameters
const WatcherParamsSchema = z.object({
    basePath: z.string(), // Base programming directory
    projectPaths: z.array(z.string()).optional() // Specific project directories to watch
});
// Get Cursor's config directory based on OS
function getCursorConfigPath() {
    const home = homedir();
    switch (process.platform) {
        case 'win32':
            return join(home, 'AppData', 'Roaming', 'Cursor', 'User');
        case 'darwin':
            return join(home, 'Library', 'Application Support', 'Cursor', 'User');
        default:
            return join(home, '.config', 'Cursor', 'User');
    }
}
// Get the project directory that Cursor is currently indexing
function getCurrentIndexingProject(cursorConfigPath, basePath) {
    try {
        // Read Cursor's current workspace state
        const workspaceStatePath = join(cursorConfigPath, 'workspace-state.json');
        if (!existsSync(workspaceStatePath))
            return null;
        const workspaceState = JSON.parse(readFileSync(workspaceStatePath, 'utf-8'));
        const currentWorkspace = workspaceState?.currentWorkspace;
        if (!currentWorkspace)
            return null;
        // Convert the workspace path to be relative to basePath
        const relativePath = relative(basePath, currentWorkspace);
        if (relativePath.startsWith('..'))
            return null; // Path is outside basePath
        return currentWorkspace;
    }
    catch (error) {
        console.error('Error reading Cursor workspace state:', error);
        return null;
    }
}
export const cursorIndexWatcherTool = {
    name: 'watch_cursor_index',
    description: 'Watch Cursor\'s indexing system and sync with our own indexing for specific projects',
    inputSchema: WatcherParamsSchema,
    handler: async (params) => {
        try {
            const { basePath, projectPaths = [] } = params;
            const cursorConfigPath = getCursorConfigPath();
            // Resolve all project paths
            const resolvedProjectPaths = projectPaths.map(p => resolve(basePath, p));
            // Watch Cursor's config directory for changes
            const watcher = watch(cursorConfigPath, { recursive: true }, async (eventType, filename) => {
                // Look for changes to indexing status files
                if (filename && (filename.includes('indexing-status') || filename.includes('workspace-state'))) {
                    try {
                        // Get the project being indexed
                        const currentProject = getCurrentIndexingProject(cursorConfigPath, basePath);
                        if (!currentProject) {
                            console.log('No relevant project being indexed');
                            return;
                        }
                        // Check if this project is in our watch list
                        if (projectPaths.length > 0 && !resolvedProjectPaths.includes(currentProject)) {
                            console.log('Project not in watch list:', currentProject);
                            return;
                        }
                        // When Cursor starts indexing, trigger our indexing
                        console.log(`Cursor indexing detected for project: ${currentProject}`);
                        await indexBuilderTool.handler({
                            rootDir: currentProject,
                            // Use the same ignore patterns as Cursor
                            exclude: [
                                '**/node_modules/**',
                                '**/dist/**',
                                '**/.git/**',
                                // Add any patterns from Cursor's .cursorignore
                                ...(await getCursorIgnorePatterns(currentProject))
                            ]
                        });
                        console.log('Indexing completed for:', currentProject);
                    }
                    catch (error) {
                        console.error('Error during indexing:', error);
                    }
                }
            });
            console.log('Watching for Cursor indexing in projects:', projectPaths.length > 0 ? projectPaths : ['all under ' + basePath]);
            // Keep the watcher alive
            process.on('SIGINT', () => {
                watcher.close();
                process.exit(0);
            });
            return createSuccessResponse('Started watching Cursor indexing');
        }
        catch (error) {
            return createErrorResponse(error);
        }
    }
};
// Get ignore patterns from Cursor's .cursorignore file
async function getCursorIgnorePatterns(projectDir) {
    try {
        const cursorIgnorePath = join(projectDir, '.cursorignore');
        const content = await import('fs').then(fs => fs.readFileSync(cursorIgnorePath, 'utf-8'));
        return content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'));
    }
    catch {
        return []; // Return empty array if .cursorignore doesn't exist
    }
}
