import { createErrorResponse } from './tool-framework.js';
import { z } from 'zod';
import { indexBuilderTool } from './index-builder.js';
import { sendToClaudeTool } from './send-to-claude.js';
import { existsSync } from 'fs';
import { resolve } from 'path';
// Schema for manual indexing parameters
const ManualIndexParamsSchema = z.object({
    path: z.string(),
    exclude: z.array(z.string()).optional(),
    sendToClaudeFormat: z.enum(['json', 'markdown']).optional()
});
export const manualIndexerTool = {
    name: 'index_path',
    description: 'Manually index any directory path and optionally send it to Claude',
    inputSchema: ManualIndexParamsSchema,
    handler: async (params) => {
        try {
            const { path, exclude = ['**/node_modules/**', '**/dist/**', '**/.git/**'], sendToClaudeFormat = 'markdown' } = params;
            // Resolve and validate path
            const resolvedPath = resolve(path);
            if (!existsSync(resolvedPath)) {
                return createErrorResponse(`Path does not exist: ${resolvedPath}`);
            }
            console.log(`Starting manual indexing of: ${resolvedPath}`);
            // Build the index
            const indexResult = await indexBuilderTool.handler({
                rootDir: resolvedPath,
                exclude
            });
            if (indexResult.isError) {
                return indexResult;
            }
            console.log('Indexing completed, formatting for Claude...');
            // Format and return the index
            const formattedResult = await sendToClaudeTool.handler({
                index: indexResult.content[0].text,
                format: sendToClaudeFormat
            });
            console.log('Index ready for Claude');
            return formattedResult;
        }
        catch (error) {
            console.error('Error during manual indexing:', error);
            return createErrorResponse(error);
        }
    }
};
