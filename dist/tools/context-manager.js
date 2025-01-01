import { z } from 'zod';
import { createErrorResponse } from './tool-framework.js';
import { cursorIndexWatcherTool } from './cursor-index-watcher.js';
import { manualIndexerTool } from './manual-indexer.js';
// Schema for context manager parameters
const ContextManagerParamsSchema = z.object({
    action: z.enum(['sync_with_cursor', 'manual_index']),
    basePath: z.string().optional(),
    projectPaths: z.array(z.string()).optional(),
    manualPath: z.string().optional(),
    format: z.enum(['json', 'markdown']).optional()
});
// Keep track of current context
let currentContext = null;
export const contextManagerTool = {
    name: 'manage_context',
    description: 'Manage codebase indexing context and orchestrate tool workflows',
    inputSchema: ContextManagerParamsSchema,
    handler: async (params) => {
        const { action, format = 'markdown' } = params;
        try {
            switch (action) {
                case 'sync_with_cursor': {
                    if (!params.basePath) {
                        return createErrorResponse('basePath is required for cursor sync');
                    }
                    console.log('Setting up Cursor sync context...');
                    // Start cursor watcher
                    await cursorIndexWatcherTool.handler({
                        basePath: params.basePath,
                        projectPaths: params.projectPaths
                    });
                    // Update context
                    currentContext = {
                        type: 'cursor',
                        path: params.basePath,
                        projectPaths: params.projectPaths,
                        lastIndexed: new Date(),
                        format
                    };
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `Context set to sync with Cursor:
Base Path: ${params.basePath}
Watching Projects: ${params.projectPaths?.join(', ') || 'all'}
Format: ${format}`
                            }
                        ],
                        isError: false
                    };
                }
                case 'manual_index': {
                    if (!params.manualPath) {
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: 'Error: manualPath is required for manual indexing'
                                }
                            ],
                            isError: true
                        };
                    }
                    console.log('Setting up manual indexing context...');
                    // Perform manual indexing
                    const result = await manualIndexerTool.handler({
                        path: params.manualPath,
                        sendToClaudeFormat: format
                    });
                    // Update context
                    currentContext = {
                        type: 'manual',
                        path: params.manualPath,
                        lastIndexed: new Date(),
                        format
                    };
                    return result;
                }
                default:
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `Error: Unknown action: ${action}`
                            }
                        ],
                        isError: true
                    };
            }
        }
        catch (error) {
            console.error('Error in context manager:', error);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error: ${error instanceof Error ? error.message : String(error)}`
                    }
                ],
                isError: true
            };
        }
    }
};
// Helper to get current context
export function getCurrentContext() {
    return currentContext;
}
// Helper to check if path is in current context
export function isPathInContext(path) {
    if (!currentContext)
        return false;
    if (currentContext.type === 'manual') {
        return path === currentContext.path;
    }
    // For cursor context
    if (currentContext.projectPaths?.length) {
        return currentContext.projectPaths.some(p => path.startsWith(p));
    }
    return path.startsWith(currentContext.path || '');
}
