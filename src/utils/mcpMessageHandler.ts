import { z } from 'zod';

/**
 * Standard response format for MCP (Model Context Protocol) messages
 * @interface
 */
export interface MCPResponse {
  /** Reserved for metadata about the response */
  _meta: Record<string, unknown>;

  /** Success response content, array of text blocks */
  content?: Array<{
    /** Type of content block (e.g., "text") */
    type: string;
    /** Content text */
    text: string;
  }>;

  /** Error information if the request failed */
  error?: {
    /** Error code for categorizing the error */
    code: string;
    /** Human-readable error message */
    message: string;
  };
}

/**
 * Standard request format for MCP (Model Context Protocol) messages
 * @interface
 */
export interface MCPRequest {
  /** Method name for the request */
  method: string;
  /** Parameters for the request */
  params: {
    /** Name of the tool to call */
    name: string;
    /** Arguments for the tool call, key-value pairs */
    arguments: Record<string, unknown>;
  };
}

/**
 * Handles validation and formatting of MCP (Model Context Protocol) messages
 * Provides utilities for request validation and response creation
 */
export class MCPMessageHandler {
  /**
   * Validates incoming request data against the MCP schema
   * @param {unknown} data - Raw request data to validate
   * @returns {MCPRequest} Validated and typed request object
   * @throws {z.ZodError} If validation fails
   * 
   * Example valid request:
   * {
   *   method: "call_tool",
   *   params: {
   *     name: "open_cursor",
   *     arguments: {
   *       filename: "example.ts",
   *       code: "console.log('hello');"
   *     }
   *   }
   * }
   */
  static validateRequest(data: unknown): MCPRequest {
    // Define schema for request validation using Zod
    const schema = z.object({
      method: z.string(),
      params: z.object({
        name: z.string(),
        arguments: z.record(z.unknown())  // Accepts any key-value pairs
      })
    });

    return schema.parse(data);
  }

  /**
   * Creates a standardized MCP response object
   * @param {Array<{type: string; text: string}>} [content] - Success response content
   * @param {{code: string; message: string}} [error] - Error information
   * @returns {MCPResponse} Formatted response object
   * 
   * Example success response:
   * {
   *   _meta: {},
   *   content: [{ type: "text", text: "Operation successful" }]
   * }
   * 
   * Example error response:
   * {
   *   _meta: {},
   *   error: { code: "INVALID_INPUT", message: "Missing required field" }
   * }
   */
  static createResponse(
    content?: Array<{type: string; text: string}>, 
    error?: {code: string; message: string}
  ): MCPResponse {
    return {
      _meta: {},  // Reserved for future metadata
      ...(content && { content }),  // Only include content if provided
      ...(error && { error })       // Only include error if provided
    };
  }

  /**
   * Creates a standardized error response
   * @param {string} code - Error code for categorizing the error
   * @param {string} message - Human-readable error message
   * @returns {MCPResponse} Formatted error response
   * 
   * Example:
   * createErrorResponse("FILE_NOT_FOUND", "The specified file does not exist")
   * -> {
   *      _meta: {},
   *      error: { code: "FILE_NOT_FOUND", message: "The specified file does not exist" }
   *    }
   */
  static createErrorResponse(code: string, message: string): MCPResponse {
    return this.createResponse(undefined, { code, message });
  }
}