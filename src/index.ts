/**
 * @fileoverview Main entry point for the MCP (Model Context Protocol) Cursor integration.
 * This file sets up a server that handles code execution requests in isolated workspaces.
 * It implements the MCP protocol for communication between Cursor IDE and the execution environment.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { CursorShadowWorkspaceHandler } from "./shadow/CursorShadowWorkspaceHandler.js";
import { ClaudeDesktopHandler } from "./handlers/ClaudeDesktopHandler.js";
import { CursorTaskHandler } from "./handlers/CursorTaskHandler.js";
import { OpenCursorTool, findClineExtension, findCursorExecutable, openClineNewTab } from "./handlers/OpenCursorHandler.js";
import { initializeWorkspacePaths, getWorkspaceConfig } from "./utils/workspaceConfig.js";
import { TaskCreateSchema, TaskUpdateSchema, CursorRunSchema, ClaudeMessageSchema } from "./schemas/index.js";
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Initialize handlers
const claudeHandler = new ClaudeDesktopHandler();
const taskHandler = new CursorTaskHandler();

const serverTools = {
  "open_cursor_with_cline": {
    name: "open_cursor_with_cline",
    description: "Opens Cursor IDE and launches Cline in a new tab",
    inputSchema: z.object({
      waitForStart: z.boolean().optional().default(true),
      args: z.array(z.string()).optional().default([]),
      waitTimeForCline: z.number().optional().default(1500),
      enableCline: z.boolean().optional().default(true)
    }),
    handler: async (params: z.infer<typeof OpenCursorTool.inputSchema>) => {
      try {
        // Check for Cline extension
        const cline = await findClineExtension();
        if (params.enableCline && !cline.exists) {
          return {
            _meta: {
              mcp_version: "1.0.1",
              tool_name: "open_cursor_with_cline",
              error: true
            },
            content: [{
              type: "text",
              text: "Cline extension not found. Please install Cline first."
            }]
          };
        }

        const cursorPath = await findCursorExecutable();
        
        // Add specific arguments to ensure Cline is activated
        const allArgs = [
          ...(params.enableCline ? [
            '--enable-proposed-api',
            'cursor.cline',
            '--load-extension',
            cline.path
          ] : []),
          ...(params.args || [])
        ];
            
        const command = `"${cursorPath}" ${allArgs.join(' ')}`;
        
        if (params.waitForStart) {
          await execAsync(command);
          // After Cursor launches, open Cline in new tab
          if (params.enableCline) {
            await openClineNewTab(params.waitTimeForCline);
          }
        } else {
          const { spawn } = require('child_process');
          const process = spawn(cursorPath, allArgs, {
            detached: true,
            stdio: 'ignore'
          });
          
          if (params.enableCline) {
            // Even in non-waiting mode, we need to wait to trigger Cline
            await openClineNewTab(params.waitTimeForCline);
          }
          
          process.unref();
        }
        
        return {
          _meta: {
            mcp_version: "1.0.1",
            tool_name: "open_cursor_with_cline"
          },
          content: [{
            type: "text",
            text: `Successfully launched Cursor${params.waitForStart ? ' and confirmed startup' : ''} ${params.enableCline ? 'and opened Cline in new tab' : ''}`
          }]
        };
      } catch (error) {
        console.error('Error in open_cursor_with_cline:', error);
        const err = error instanceof Error ? error : new Error('Unknown error occurred');
        return {
          _meta: {
            mcp_version: "1.0.1",
            tool_name: "open_cursor_with_cline",
            error: true
          },
          content: [{
            type: "text",
            text: `Failed to launch Cursor: ${err.message}`
          }]
        };
      }
    }
  },
  "run_cursor": {
    name: "run_cursor",
    description: "Executes code with support for multiple files and dependencies",
    inputSchema: CursorRunSchema,
    handler: async (params: z.infer<typeof CursorRunSchema>) => {
      let filepath = params.path;

      if (params.code && !filepath) {
        const filename = params.filename || `file.${params.language || 'txt'}`;
        filepath = path.join(process.cwd(), filename);
      }

      const result = await shadowHandler.runCode({
        code: params.code,
        filename: params.filename,
        filepath: filepath,
        dependencies: params.dependencies,
        entryPoint: params.entryPoint,
        detectEntryPoint: !params.entryPoint
      });
      
      return {
        _meta: {
          mcp_version: "1.0.1",
          tool_name: "run_cursor"
        },
        content: [{
          type: "text",
          text: result.success ? 
            `Execution successful:\nEntry point: ${result.entryPoint}\nOutput:\n${result.output}` :
            `Execution failed:\nEntry point: ${result.entryPoint}\nError:\n${result.error}\nOutput:\n${result.output}`
        }]
      };
    }
  },
  "claude_send_message": {
    name: "claude_send_message",
    description: "Send a message to Claude Desktop",
    inputSchema: ClaudeMessageSchema,
    handler: async (params: z.infer<typeof ClaudeMessageSchema>) => {
      let conversationId = params.conversationId;
      
      if (!conversationId) {
        conversationId = await claudeHandler.createConversation(params.title);
      }
      
      const messageId = await claudeHandler.sendMessage(conversationId, params.message);
      
      return {
        _meta: {
          mcp_version: "1.0.1",
          tool_name: "claude_send_message"
        },
        content: [{
          type: "text",
          text: JSON.stringify({ conversationId, messageId })
        }]
      };
    }
  },
  "claude_get_response": {
    name: "claude_get_response",
    description: "Get the latest response from Claude Desktop",
    inputSchema: z.object({
      conversationId: z.string()
    }),
    handler: async (params: { conversationId: string }) => {
      const response = await claudeHandler.getLatestResponse(params.conversationId);
      
      if (!response) {
        throw new McpError(404, "No response found");
      }
      
      return {
        _meta: {
          mcp_version: "1.0.1",
          tool_name: "claude_get_response"
        },
        content: [{
          type: "text",
          text: response.content
        }]
      };
    }
  },
  "task_create": {
    name: "task_create",
    description: "Create a new task",
    inputSchema: TaskCreateSchema,
    handler: async (params: z.infer<typeof TaskCreateSchema>) => {
      const taskId = await taskHandler.createTask(
        params.title,
        params.description,
        params.files,
        params.assignTo
      );
      
      return {
        _meta: {},
        content: [{
          type: "text",
          text: JSON.stringify({ taskId })
        }]
      };
    }
  },
  "task_update": {
    name: "task_update",
    description: "Update an existing task",
    inputSchema: TaskUpdateSchema,
    handler: async (params: z.infer<typeof TaskUpdateSchema>) => {
      if (params.status) {
        await taskHandler.updateTaskStatus(params.taskId, params.status);
      }
      if (params.files) {
        await taskHandler.updateTaskFiles(params.taskId, params.files);
      }
      if (params.assignTo) {
        await taskHandler.assignTask(params.taskId, params.assignTo);
      }
      
      return {
        _meta: {},
        content: [{
          type: "text",
          text: "Task updated successfully"
        }]
      };
    }
  },
  "task_list": {
    name: "task_list",
    description: "List tasks with optional filtering",
    inputSchema: z.object({
      status: z.enum(['pending', 'in_progress', 'completed', 'failed']).optional(),
      assignedTo: z.enum(['cline', 'claude']).optional()
    }),
    handler: async (params: { 
      status?: 'pending' | 'in_progress' | 'completed' | 'failed';
      assignedTo?: 'cline' | 'claude';
    }) => {
      const tasks = await taskHandler.listTasks(params);
      
      return {
        _meta: {},
        content: [{
          type: "text",
          text: JSON.stringify(tasks)
        }]
      };
    }
  }
};

const server = new Server(
  {
    name: "cursor",
    version: "1.0.0",
    port: 3010
  },
  {
    capabilities: {
      tools: serverTools
    }
  }
);

// Set up workspace infrastructure
initializeWorkspacePaths();
const workspaceConfig = getWorkspaceConfig();
const shadowHandler = new CursorShadowWorkspaceHandler(workspaceConfig.shadowStoragePath);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [{
      name: "open_cursor_with_cline",
      description: "Opens Cursor IDE and launches Cline in a new tab",
      inputSchema: {
        type: "object",
        properties: {
          waitForStart: { type: "boolean", description: "Whether to wait for Cursor to start", default: true },
          args: { type: "array", items: { type: "string" }, description: "Additional command-line arguments", default: [] },
          waitTimeForCline: { type: "number", description: "Time to wait before triggering Cline (ms)", default: 1500 },
          enableCline: { type: "boolean", description: "Whether to open Cline in a new tab", default: true }
        }
      }
    },
    {
      name: "run_cursor",
      description: "Executes code with support for multiple files and dependencies",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "Path to file or directory to run (optional)" },
          code: { type: "string", description: "Main code to execute (optional)" },
          language: { type: "string", description: "Programming language of the code" },
          filename: { type: "string", description: "Name for the main file" },
          dependencies: {
            type: "array",
            items: {
              type: "object",
              properties: {
                code: { type: "string", description: "Content of the dependency file" },
                filename: { type: "string", description: "Name of the dependency file" }
              },
              required: ["code", "filename"]
            },
            description: "Additional files needed for the code to run"
          },
          entryPoint: { type: "string", description: "Main file to run if different from the primary file" }
        }
      }
    },
    {
      name: "claude_send_message",
      description: "Send a message to Claude Desktop",
      inputSchema: {
        type: "object",
        properties: {
          conversationId: { type: "string", description: "ID of existing conversation (optional)" },
          message: { type: "string", description: "Message content to send" },
          title: { type: "string", description: "Title for new conversation (optional)" }
        },
        required: ["message"]
      }
    },
    {
      name: "claude_get_response",
      description: "Get the latest response from Claude Desktop",
      inputSchema: {
        type: "object",
        properties: {
          conversationId: { type: "string", description: "ID of the conversation" }
        },
        required: ["conversationId"]
      }
    }]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const tool = serverTools[request.params.name as keyof typeof serverTools];
    if (!tool) {
      throw new McpError(405, `Unknown tool: ${request.params.name}`);
    }

    const result = await tool.handler(request.params.arguments);
    return {
      _meta: {
        mcp_version: "1.0.1",
        tool_name: request.params.name
      },
      content: result.content
    };
  } catch (err) {
    console.error('Error handling tool call:', err);
    const error = err instanceof Error ? err : new Error('Unknown error occurred');
    return {
      _meta: {
        mcp_version: "1.0.1",
        tool_name: request.params.name,
        error: true
      },
      content: [{
        type: "text",
        text: `Failed to execute tool: ${error.message}`
      }]
    };
  }
});

async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("[MCP-Cursor] Server initialized and running");
  } catch (error) {
    console.error("[MCP-Cursor] Failed to start server:", error);
    process.exit(1);
  }
}

process.on('uncaughtException', (error) => {
  console.error('[MCP-Cursor] Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[MCP-Cursor] Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

main().catch((error) => {
  console.error("[MCP-Cursor] Fatal error in main():", error);
  process.exit(1);
});