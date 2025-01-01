import { z } from 'zod';
import { createSuccessResponse, createErrorResponse } from './tool-framework.js';
// Schema for the parameters
const SendToClaudeParamsSchema = z.object({
    index: z.object({
        files: z.array(z.object({
            content: z.string(),
            path: z.string(),
            metadata: z.object({
                lastModified: z.number(),
                size: z.number(),
                type: z.string()
            }),
            chunks: z.array(z.object({
                content: z.string(),
                startLine: z.number(),
                endLine: z.number(),
                embedding: z.array(z.number())
            }))
        })),
        structure: z.record(z.any()),
        symbols: z.record(z.any())
    }),
    format: z.enum(['json', 'markdown']).optional()
});
export const sendToClaudeTool = {
    name: 'send_to_claude',
    description: 'Format and send the codebase index to Claude in a way it can understand',
    inputSchema: SendToClaudeParamsSchema,
    handler: async (params) => {
        try {
            const { index, format = 'markdown' } = params;
            if (format === 'json') {
                return createSuccessResponse(JSON.stringify(index, null, 2));
            }
            // Format as markdown for better readability
            let markdown = '# Codebase Index\n\n';
            // Add file structure
            markdown += '## Directory Structure\n\n```\n';
            markdown += formatStructure(index.structure);
            markdown += '\n```\n\n';
            // Add files with semantic chunks
            markdown += '## Files\n\n';
            for (const file of index.files) {
                markdown += `### ${file.path}\n\n`;
                markdown += `Type: ${file.metadata.type}\n`;
                markdown += `Size: ${file.metadata.size} bytes\n`;
                markdown += `Last Modified: ${new Date(file.metadata.lastModified).toISOString()}\n\n`;
                // Add semantic chunks
                markdown += '#### Semantic Chunks\n\n';
                for (const chunk of file.chunks) {
                    markdown += `Lines ${chunk.startLine}-${chunk.endLine}:\n`;
                    markdown += '```' + (file.metadata.type || '') + '\n';
                    markdown += chunk.content;
                    markdown += '\n```\n\n';
                    // Add embeddings in a collapsible section
                    markdown += '<details><summary>Chunk Embedding Vector</summary>\n\n';
                    markdown += '```json\n';
                    markdown += JSON.stringify(chunk.embedding);
                    markdown += '\n```\n</details>\n\n';
                }
            }
            // Add symbols if available
            if (Object.keys(index.symbols).length > 0) {
                markdown += '## Symbols\n\n';
                markdown += '```json\n';
                markdown += JSON.stringify(index.symbols, null, 2);
                markdown += '\n```\n';
            }
            return createSuccessResponse(markdown);
        }
        catch (error) {
            return createErrorResponse(error);
        }
    }
};
function formatStructure(obj, prefix = '') {
    let result = '';
    for (const [key, value] of Object.entries(obj)) {
        result += prefix + '├── ' + key + '\n';
        if (value && typeof value === 'object') {
            result += formatStructure(value, prefix + '│   ');
        }
    }
    return result;
}
