import { z } from 'zod';

export interface MCPResponse {
  _meta: Record<string, unknown>;
  content?: Array<{
    type: string;
    text: string;
  }>;
  error?: {
    code: string;
    message: string;
  };
}

export interface MCPRequest {
  method: string;
  params: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

export class MCPMessageHandler {
  static validateRequest(data: unknown): MCPRequest {
    const schema = z.object({
      method: z.string(),
      params: z.object({
        name: z.string(),
        arguments: z.record(z.unknown())
      })
    });

    return schema.parse(data);
  }

  static createResponse(content?: Array<{type: string; text: string}>, error?: {code: string; message: string}): MCPResponse {
    return {
      _meta: {},
      ...(content && { content }),
      ...(error && { error })
    };
  }

  static createErrorResponse(code: string, message: string): MCPResponse {
    return this.createResponse(undefined, { code, message });
  }
}