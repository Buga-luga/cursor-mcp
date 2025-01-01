import { MCPTool, createSuccessResponse, createErrorResponse } from './tool-framework.js'
import { z } from 'zod'
import { readFileSync, statSync } from 'fs'
import { join, relative, resolve } from 'path'
import pkg from 'glob'
const { glob } = pkg
import { computeEmbeddingsTool } from './compute-embeddings.js'
import { promisify } from 'util'

const globAsync = promisify(glob)

// Schema for the indexing parameters
const IndexParamsSchema = z.object({
  rootDir: z.string(),
  include: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
  maxFileSizeBytes: z.number().optional(),
  chunkSize: z.number().optional(),
  overlapSize: z.number().optional()
})

type IndexParams = z.infer<typeof IndexParamsSchema>

type CodeChunk = {
  content: string
  startLine: number
  endLine: number
  embedding: number[]
}

type FileIndex = {
  content: string
  path: string
  metadata: {
    lastModified: number
    size: number
    type: string
  }
  chunks: CodeChunk[]
}

type CodebaseIndex = {
  files: FileIndex[]
  structure: Record<string, any>
  symbols: Record<string, any>
}

export const indexBuilderTool: MCPTool<IndexParams> = {
  name: 'build_codebase_index',
  description: 'Build a searchable index of the codebase that can be used by Claude',
  inputSchema: IndexParamsSchema,
  handler: async (params: IndexParams) => {
    try {
      const {
        rootDir,
        include = ['**/*.{js,jsx,ts,tsx,py,java,cpp,c,h,hpp}'],
        exclude = ['**/node_modules/**', '**/dist/**', '**/.git/**'],
        maxFileSizeBytes = 1024 * 1024, // 1MB default max file size
        chunkSize = 1000,
        overlapSize = 100
      } = params

      // Get all matching files
      const files = await Promise.all(
        include.map(pattern => 
          globAsync(pattern, {
            cwd: rootDir,
            ignore: exclude,
            absolute: true,
            nodir: true
          })
        )
      ).then(results => results.flat())

      const fileIndices: FileIndex[] = []
      const structure: Record<string, any> = {}
      const symbols: Record<string, any> = {}

      // Process each file
      for (const filePath of files) {
        try {
          const resolvedPath = resolve(filePath)
          const stats = statSync(resolvedPath)
          
          // Skip files that are too large
          if (stats.size > maxFileSizeBytes) {
            console.warn(`Skipping ${filePath} - file too large (${stats.size} bytes)`)
            continue
          }

          // Read file content
          const content = readFileSync(resolvedPath, 'utf-8')
          const relativePath = relative(rootDir, resolvedPath)

          // Compute embeddings for the file content
          const result = await computeEmbeddingsTool.handler({
            content,
            chunkSize,
            overlapSize
          })

          if (result.isError) {
            console.warn(`Error computing embeddings for ${filePath}:`, result.content[0].text)
            continue
          }

          const chunks = result.content[0].text as unknown as CodeChunk[]

          // Build file index
          fileIndices.push({
            content,
            path: relativePath,
            metadata: {
              lastModified: stats.mtimeMs,
              size: stats.size,
              type: relativePath.split('.').pop() || ''
            },
            chunks
          })

          // Build directory structure
          let current = structure
          const parts = relativePath.split('/')
          for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i]
            if (!current[part]) {
              current[part] = {}
            }
            current = current[part]
          }
          current[parts[parts.length - 1]] = null

          // TODO: Add symbol extraction for different file types
          // This would involve parsing the code to extract functions, classes, etc.
          
        } catch (error) {
          console.error(`Error processing ${filePath}:`, error)
        }
      }

      const index = {
        files: fileIndices,
        structure,
        symbols
      }

      return createSuccessResponse(index)
    } catch (error) {
      return createErrorResponse(error as Error)
    }
  }
} 