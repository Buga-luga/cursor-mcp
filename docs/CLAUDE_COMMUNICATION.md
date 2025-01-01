# Communicating with Claude through MCP

## Overview

The Model Context Protocol (MCP) is a standardized way for AI models like Claude to interact with services and applications. Think of it as a "USB-C port for AI applications" - providing a universal interface for AI models to communicate with different tools and data sources.

## Message Format Requirements

### Core Message Structure
Messages sent to Claude must follow this structure:
```typescript
{
  content: [
    {
      type: 'text',
      text: string
    }
  ],
  isError: boolean
}
```

### Key Points
1. All messages must be valid JSON
2. The `content` field must be an array of content objects
3. Each content object must have:
   - `type`: Currently only 'text' is supported
   - `text`: The actual message content as a string
4. The `isError` field indicates if this is an error response

### Common Mistakes to Avoid
1. Don't use 'success' or 'error' as content types - only use 'text'
2. Don't send raw strings or objects - always wrap them in the proper message structure
3. Don't include special formatting or control characters in the text
4. Always JSON.stringify objects before including them in the text field

## Example Messages

### Success Response
```typescript
{
  content: [
    {
      type: 'text',
      text: 'Operation completed successfully'
    }
  ],
  isError: false
}
```

### Error Response
```typescript
{
  content: [
    {
      type: 'text',
      text: 'Error: Invalid input provided'
    }
  ],
  isError: true
}
```

### Response with Data
```typescript
{
  content: [
    {
      type: 'text',
      text: JSON.stringify({
        data: {
          id: 123,
          name: 'Example'
        }
      }, null, 2)
    }
  ],
  isError: false
}
```

## Best Practices

1. **Message Formatting**
   - Always validate message structure before sending
   - Use proper JSON escaping for special characters
   - Format complex data using JSON.stringify with proper indentation

2. **Error Handling**
   - Always include descriptive error messages
   - Prefix error messages with "Error: "
   - Include relevant error details in a structured format

3. **Content Organization**
   - Keep messages concise and focused
   - Break down complex responses into logical sections
   - Use proper JSON formatting for nested data

4. **Response Types**
   - Use consistent response formats across your application
   - Document any custom message formats
   - Validate responses match expected schemas

## Implementation Example

```typescript
// Helper function to create properly formatted messages
function createMessage(text: string, isError: boolean = false): MCPResponse {
  return {
    content: [
      {
        type: 'text',
        text: isError ? `Error: ${text}` : text
      }
    ],
    isError
  }
}

// Example usage
async function handleRequest(data: any) {
  try {
    const result = await processData(data)
    return createMessage(JSON.stringify(result, null, 2))
  } catch (error) {
    return createMessage(error.message, true)
  }
}
```

## Debugging Tips

1. **Common Error Messages**
   - `SyntaxError: Unexpected token` - Usually indicates malformed JSON
   - `Invalid message format` - Message structure doesn't match required format
   - `Invalid content type` - Using unsupported content types

2. **Validation Steps**
   - Verify message is valid JSON
   - Check content array structure
   - Validate content type is 'text'
   - Ensure text field contains valid string

3. **Testing Tools**
   - Use JSON validators to check message format
   - Log messages before sending to Claude
   - Implement message validation in development

## Additional Resources

- [MCP Protocol Specification](https://docs.anthropic.com/claude/docs/model-context-protocol)
- [Claude API Documentation](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
- [JSON Schema Validation](https://json-schema.org/) 