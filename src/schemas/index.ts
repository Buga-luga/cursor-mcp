import { z } from 'zod';

export const TaskCreateSchema = z.object({
    title: z.string(),
    description: z.string(),
    files: z.array(z.object({
        path: z.string(),
        content: z.string().optional(),
        changes: z.array(z.object({
            type: z.enum(['add', 'modify', 'delete']),
            location: z.string(),
            content: z.string().optional()
        })).optional()
    })),
    assignTo: z.enum(['cline', 'claude']).optional()
});

export const TaskUpdateSchema = z.object({
    taskId: z.string(),
    status: z.enum(['pending', 'in_progress', 'completed', 'failed']).optional(),
    files: z.array(z.object({
        path: z.string(),
        content: z.string().optional(),
        changes: z.array(z.object({
            type: z.enum(['add', 'modify', 'delete']),
            location: z.string(),
            content: z.string().optional()
        })).optional()
    })).optional(),
    assignTo: z.enum(['cline', 'claude']).optional()
});

export const CursorRunSchema = z.object({
    path: z.string().optional(),
    code: z.string().optional(),
    language: z.string().optional(),
    filename: z.string().optional(),
    dependencies: z.array(z.object({
        code: z.string(),
        filename: z.string()
    })).optional(),
    entryPoint: z.string().optional()
});

export const ClaudeMessageSchema = z.object({
    conversationId: z.string().optional(),
    message: z.string(),
    title: z.string().optional()
}); 