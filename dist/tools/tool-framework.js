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
    const text = error instanceof Error ? error.message : error;
    return {
        content: [
            {
                type: 'text',
                text: `Error: ${text}`
            }
        ],
        isError: true
    };
}
// Helper to create a tool using the framework
export function createMCPTool(config) {
    return config;
}
