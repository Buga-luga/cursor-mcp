import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const USER_AGENT = "cursor/1.0";

const OpenCursorSchema = z.object({
    path: z.string(),
});

const IndexCodebaseSchema = z.object({
    directory: z.string(),
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

// Handler for tool calls
server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    if (request.params.name === "open-cursor") {
        try {
            const { path } = request.params.arguments as { path: string };
            const command = `Start-Process "C:\\Users\\${process.env.USERNAME}\\AppData\\Local\\Programs\\Cursor\\Cursor.exe" -ArgumentList "--new-instance","${path}"`;
            
            await execAsync(command, { shell: 'powershell' });
            
            return {
                _meta: {},
                content: [{
                    type: "text",
                    text: `Opened ${path} in new Cursor instance`
                }]
            };
        } catch (err) {
            const error = err as Error;
            console.error('Error:', error);
            return {
                _meta: {},
                error: {
                    code: "EXECUTION_ERROR",
                    message: `Failed to open Cursor: ${error.message}`
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
        name: "open-cursor",
        description: "Opens Cursor editor at a specific file or directory",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string", 
              description: "Path to file or directory to open in Cursor",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "index-codebase",
        description: "Indexes a codebase directory for analysis",
        inputSchema: {
          type: "object", 
          properties: {
            directory: {
              type: "string",
              description: "Directory path to index",
            },
          },
          required: ["directory"],
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