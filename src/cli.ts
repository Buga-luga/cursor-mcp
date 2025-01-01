#!/usr/bin/env node

import { startServer } from './index.js'

// Get the base path from command line arguments
const basePath = process.argv[2]

if (!basePath) {
  console.error('Error: Base path argument is required')
  console.error('Usage: cursor-mcp <base-path>')
  process.exit(1)
}

// Start the MCP server
startServer(basePath).catch((error: Error) => {
  console.error('Unhandled error:', error)
  process.exit(1)
}) 