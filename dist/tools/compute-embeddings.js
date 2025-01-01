import { createSuccessResponse, createErrorResponse } from './tool-framework.js';
import { z } from 'zod';
import { encoding_for_model } from '@dqbd/tiktoken';
// Schema for the embedding parameters
const EmbeddingParamsSchema = z.object({
    content: z.string(),
    chunkSize: z.number().optional(),
    overlapSize: z.number().optional(),
    model: z.enum(['text-embedding-ada-002']).optional()
});
// Split code into semantic chunks
function splitCodeIntoChunks(code, maxChunkSize = 1000, overlapSize = 100) {
    const lines = code.split('\n');
    const chunks = [];
    let currentChunk = [];
    let currentTokens = 0;
    let startLine = 1;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineTokens = encoding_for_model('text-embedding-ada-002').encode(line).length;
        // If adding this line would exceed maxChunkSize, create a new chunk
        if (currentTokens + lineTokens > maxChunkSize && currentChunk.length > 0) {
            chunks.push({
                content: currentChunk.join('\n'),
                startLine,
                endLine: i
            });
            // Start new chunk with overlap
            const overlapLines = currentChunk.slice(-overlapSize);
            currentChunk = overlapLines;
            currentTokens = encoding_for_model('text-embedding-ada-002').encode(overlapLines.join('\n')).length;
            startLine = Math.max(1, i - overlapSize + 1);
        }
        currentChunk.push(line);
        currentTokens += lineTokens;
    }
    // Add final chunk
    if (currentChunk.length > 0) {
        chunks.push({
            content: currentChunk.join('\n'),
            startLine,
            endLine: lines.length
        });
    }
    return chunks;
}
// Get embeddings from OpenAI
async function getEmbeddings(text, model = 'text-embedding-ada-002') {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            input: text,
            model
        })
    });
    if (!response.ok) {
        throw new Error(`Failed to get embeddings: ${response.statusText}`);
    }
    const data = await response.json();
    return data.data[0].embedding;
}
export const computeEmbeddingsTool = {
    name: 'compute_embeddings',
    description: 'Compute embeddings for code content by splitting it into semantic chunks',
    inputSchema: EmbeddingParamsSchema,
    handler: async (params) => {
        try {
            const { content, chunkSize = 1000, overlapSize = 100, model = 'text-embedding-ada-002' } = params;
            // Split code into chunks
            const chunks = splitCodeIntoChunks(content, chunkSize, overlapSize);
            // Get embeddings for each chunk
            const chunksWithEmbeddings = await Promise.all(chunks.map(async (chunk) => ({
                ...chunk,
                embedding: await getEmbeddings(chunk.content, model)
            })));
            return createSuccessResponse(chunksWithEmbeddings);
        }
        catch (error) {
            return createErrorResponse(error);
        }
    }
};
