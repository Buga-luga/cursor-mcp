/**
 * @fileoverview Handles Model Context Protocol (MCP) message validation and formatting.
 * Provides utilities for request/response handling in the MCP communication layer.
 * Implements standardized interfaces for type safety and validation.
 */

import { z } from 'zod';

/**
 * Standard response format for MCP (Model Context Protocol) messages
 * Defines the structure for all responses in the protocol
 * 
 * @interface MCPResponse
 * @property {Record<string, unknown>} _meta - Reserved for metadata about the response
 * @property {Array<{type: string, text: string}>} [content] - Success response content
 * @property {{code: string, message: string}} [error] - Error information if request failed
 */
export interface MCPResponse {
  /** Reserved for metadata about the response */
  _meta: Record<string, unknown>;

  /** Success response content, array of text blocks */
  content?: Array<{
    /** Type of content block (e.g., "text", "code", "error") */
    type: string;
    /** Content text */
    text: string;
  }>;

  /** Error information if the request failed */
  error?: {
    /** Error code for categorizing the error (e.g., "INVALID_INPUT", "FILE_NOT_FOUND") */
    code: string;
    /** Human-readable error message */
    message: string;
  };
}

/**
 * Standard request format for MCP (Model Context Protocol) messages
 * Defines the structure for all incoming requests in the protocol
 * 
 * @interface MCPRequest
 * @property {string} method - Method name for the request (e.g., "call_tool")
 * @property {object} params - Parameters for the request
 * @property {string} params.name - Name of the tool to call
 * @property {Record<string, unknown>} params.arguments - Tool-specific arguments
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
 * 
 * Features:
 * - Request validation using Zod schemas
 * - Standardized response formatting
 * - Error handling and response creation
 * - Type safety for MCP communication
 */
export class MCPMessageHandler {
  /**
   * Validates incoming request data against the MCP schema
   * Ensures type safety and data integrity for incoming requests
   * 
   * @param {unknown} data - Raw request data to validate
   * @returns {MCPRequest} Validated and typed request object
   * @throws {z.ZodError} If validation fails
   * 
   * Example valid request:
   * {
   *   method: "call_tool",
   *   params: {
   *     name: "run_cursor",
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
   * Handles both success and error cases with proper formatting
   * 
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
   * Utility method for quick error response creation
   * 
   * Common Error Codes:
   * - INVALID_INPUT: Request validation failed
   * - FILE_NOT_FOUND: Requested file doesn't exist
   * - EXECUTION_ERROR: Code execution failed
   * - UNKNOWN_TOOL: Requested tool not found
   * 
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