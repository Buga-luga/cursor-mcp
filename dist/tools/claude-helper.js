import { createSuccessResponse, createErrorResponse } from './tool-framework.js';
import { z } from 'zod';
import { getCurrentContext, contextManagerTool } from './context-manager.js';
import { codebaseSearchTool } from './codebase-search.js';
import { manualIndexerTool } from './manual-indexer.js';
// Schema for Claude's natural language interactions
const ClaudeHelperParamsSchema = z.object({
    intent: z.enum([
        'understand_context', // Get current context info
        'switch_context', // Change to different project/path
        'search_code', // Search within current context
        'index_new', // Index a new path
        'check_indexed' // Check if a path is indexed
    ]),
    path: z.string().optional(),
    query: z.string().optional()
});
export const claudeHelperTool = {
    name: 'claude_helper',
    description: 'Natural language interface for Claude to interact with the codebase tools',
    inputSchema: ClaudeHelperParamsSchema,
    handler: async (params) => {
        const { intent } = params;
        const context = getCurrentContext();
        try {
            let response;
            switch (intent) {
                case 'understand_context': {
                    if (!context) {
                        response = `No active context. You can:
1. Sync with Cursor's indexing using 'switch_context' with type 'cursor'
2. Index a specific path using 'index_new' with a path`;
                    }
                    else {
                        response = `Current Context:
Type: ${context.type}
${context.type === 'cursor' ? `Base Path: ${context.path}
Watching Projects: ${context.projectPaths?.join(', ') || 'all'}` : `Path: ${context.path}`}
Last Indexed: ${context.lastIndexed?.toISOString() || 'Never'}
Format: ${context.format}

You can:
1. Search this context using 'search_code'
2. Switch context using 'switch_context'
3. Index new paths using 'index_new'`;
                    }
                    return createSuccessResponse(response);
                }
                case 'switch_context': {
                    if (!params.path) {
                        return createErrorResponse('Path is required for switching context');
                    }
                    // Determine if this should be a cursor sync or manual index
                    if (params.path.toLowerCase().includes('cursor')) {
                        return await contextManagerTool.handler({
                            action: 'sync_with_cursor',
                            basePath: params.path.replace(/cursor[:/\\]?/i, '').trim()
                        });
                    }
                    else {
                        return await contextManagerTool.handler({
                            action: 'manual_index',
                            manualPath: params.path
                        });
                    }
                }
                case 'search_code': {
                    if (!context) {
                        return createSuccessResponse('No active context. Please set up a context first using switch_context or index_new.');
                    }
                    if (!params.query) {
                        return createErrorResponse('Query is required for searching code');
                    }
                    const searchResult = await codebaseSearchTool.handler({
                        query: params.query,
                        targetDirectories: context.type === 'cursor' ? context.projectPaths : [context.path]
                    });
                    return createSuccessResponse(`Search Results for "${params.query}":
${JSON.stringify(searchResult, null, 2)}`);
                }
                case 'index_new': {
                    if (!params.path) {
                        return createErrorResponse('Path is required for indexing');
                    }
                    const result = await manualIndexerTool.handler({
                        path: params.path,
                        sendToClaudeFormat: 'markdown'
                    });
                    return createSuccessResponse(`Successfully indexed new path: ${params.path}
${result}`);
                }
                case 'check_indexed': {
                    if (!params.path) {
                        return createErrorResponse('Path is required for checking index status');
                    }
                    const isIndexed = context && (context.path === params.path ||
                        context.projectPaths?.some(p => params.path.startsWith(p)));
                    return createSuccessResponse(isIndexed
                        ? `Yes, ${params.path} is currently indexed and available for searching.`
                        : `No, ${params.path} is not currently indexed. Use 'index_new' to index it.`);
                }
                default:
                    return createErrorResponse(`Unknown intent: ${intent}`);
            }
        }
        catch (error) {
            console.error('Error in Claude helper:', error);
            return createErrorResponse(error);
        }
    }
};
