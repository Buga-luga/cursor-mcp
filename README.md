# Cursor MCP - Claude Desktop Integration

[![smithery badge](https://smithery.ai/badge/cursor-mcp-tool)](https://smithery.ai/server/cursor-mcp-tool)

A Model Context Protocol implementation for Claude Desktop using the MCP TypeScript SDK.

## Features

- Model Context Protocol integration
- TypeScript-first development
- Next.js 14 App Router
- Modern UI with Radix UI components
- Type-safe API interactions

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
cursor-mcp/
├── app/                 # Next.js App Router
├── components/         # Shared components
├── lib/               # Utility functions and MCP implementation
├── types/             # TypeScript type definitions
└── public/            # Static assets
```

## Development Guidelines

- Follow TypeScript best practices
- Use React Server Components by default
- Implement proper error handling with Zod
- Follow the Model Context Protocol specifications 
