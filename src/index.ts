import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { CursorShadowWorkspaceHandler } from "./shadow/CursorShadowWorkspaceHandler.js";

const OpenCursorSchema = z.object({
  path: z.string().optional(),
  code: z.string().optional(),
  language: z.string().optional(),
  filename: z.string().optional(),
  isolationLevel: z.enum(['full', 'partial', 'shared']).optional(),
});

const server = new Server(
  {
    name: "cursor",
    version: "1.0.0",
    port: 3010
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Initialize shadow workspace handler
const shadowHandler = new CursorShadowWorkspaceHandler();

// Handler for tool calls
server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
  if (request.params.name === "open_cursor") {
    try {
      const params = OpenCursorSchema.parse(request.params.arguments);
      
      const result = await shadowHandler.openWithGeneratedCode({
        code: params.code,
        language: params.language,
        filename: params.filename,
        filepath: params.path,
        isolationLevel: params.isolationLevel
      });
      
      return {
        _meta: {},
        content: [{
          type: "text",
          text: `Opened ${params.filename || params.path} in shadow workspace (ID: ${result.workspaceId})`
        }]
      };
    } catch (err) {
      const error = err as Error;
      console.error('Error:', error);
      return {
        _meta: {},
        error: {
          code: "EXECUTION_ERROR",
          message: `Failed to open Cursor in shadow workspace: ${error.message}`
        }
      };
    }
  }
    
  return {
    _meta: {},
    error: {
      code: "UNKNOWN_TOOL",
      message: `Unknown tool: ${request.params.name}`
    }
  };
});

// Handler for tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "open_cursor",
        description: "Opens Cursor editor in a shadow workspace with optional code generation",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string", 
              description: "Path to file or directory to open in Cursor (optional)",
            },
            code: {
              type: "string",
              description: "Code to be generated in the workspace (optional)",
            },
            language: {
              type: "string",
              description: "Programming language of the generated code",
            },
            filename: {
              type: "string",
              description: "Name for the generated file",
            },
            isolationLevel: {
              type: "string",
              enum: ["full", "partial", "shared"],
              description: "Shadow workspace isolation level",
            },
          },
        },
      },
    ],
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Cursor MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});