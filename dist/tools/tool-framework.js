// Helper to create a success response
export function createSuccessResponse(message) {
    const text = typeof message === 'string' ? message : JSON.stringify(message, null, 2);
    return {
        content: [
            {
                type: 'text',
                text
            }
        ],
        isError: false
    };
}
// Helper to create an error response
export function createErrorResponse(error) {
    const errorMessage = error instanceof Error ? error.message : error;
    return {
        content: [
            {
                type: 'text',
                text: errorMessage
            }
        ],
        isError: true
    };
}
// Helper to create a new MCP tool
export function createMCPTool(config) {
    return {
        name: config.name,
        description: config.description,
        inputSchema: config.inputSchema,
        handler: async (input) => {
            try {
                return await config.handler(input);
            }
            catch (error) {
                return createErrorResponse(error);
            }
        }
    };
}
