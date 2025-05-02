# Cursor MCP - Claude Desktop Integration

[![smithery badge](https://smithery.ai/badge/cursor-mcp-tool)](https://smithery.ai/server/cursor-mcp-tool)

A Model Context Protocol (MCP) implementation that enables seamless integration between Claude AI and desktop applications through Cursor IDE. This tool serves as a bridge between Claude's capabilities and desktop software, allowing for enhanced AI-powered development workflows.

<a href="https://glama.ai/mcp/servers/4fg1gxbcex"><img width="380" height="200" src="https://glama.ai/mcp/servers/4fg1gxbcex/badge" alt="Cursor Server MCP server" /></a>

## Quick Start (Windows)

### Installing via Smithery

To install Cursor for Claude Desktop automatically via [Smithery](https://smithery.ai/server/cursor-mcp-tool):

```bash
npx -y @smithery/cli install cursor-mcp-tool --client claude
```

### Installing Manually
1. **Prerequisites**
   - [Node.js](https://nodejs.org/) v18 or higher
   - [Cursor IDE](https://cursor.sh/)
   - Windows 10 or higher

2. **Installation**
   ```bash
   # Install globally
   npm install -g mcp-cursor

   # Or install locally
   git clone https://github.com/yourusername/cursor-mcp.git
   cd cursor-mcp
   npm install
   ```

3. **Configuration**
   - Create a `.env` file in your project root:
     ```bash
     # Windows path example
     DEFAULT_WORKSPACE_PATH=C:/Users/YourUsername/Documents/cursor-workspaces
     ```

4. **Add to Claude's MCP Configuration**
   Add the following to your Claude configuration:
   ```json
   {
     "name": "cursor",
     "type": "mcp",
     "config": {
       "server": "https://glama.ai/mcp/servers/4fg1gxbcex",
       "capabilities": ["cursor_control", "window_management"]
     }
   }
   ```

5. **Start the Server**
   ```bash
   # If installed globally
   mcp-cursor

   # If installed locally
   npm start
   ```

## Features
- Real-time AI assistance in your development workflow
- Context-aware code suggestions and completions
- Seamless integration with Cursor IDE
- Windows automation for enhanced productivity

## Detailed Setup

### Local Development Setup
1. Clone and install:
   ```bash
   git clone https://github.com/yourusername/cursor-mcp.git
   cd cursor-mcp
   npm install
   ```

2. Create environment config:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set your workspace path:
   ```bash
   DEFAULT_WORKSPACE_PATH=C:/Users/YourUsername/Documents/cursor-workspaces
   ```

3. Build and run:
   ```bash
   # Development mode with hot reload
   npm run dev

   # Production mode
   npm run build
   npm start
   ```

### Troubleshooting

1. **Window Detection Issues**
   - Ensure Cursor IDE is running
   - Try restarting the MCP server
   - Check if your workspace path is correct

2. **Permission Issues**
   - Run terminal as administrator for first-time setup
   - Ensure proper file permissions in workspace directory

3. **Node Version Issues**
   - Use `nvm` to switch to Node.js v18 or higher:
     ```bash
     nvm install 18
     nvm use 18
     ```

## Project Structure
```
cursor-mcp/
├── src/           # Source code
│   ├── services/  # Core services
│   ├── handlers/  # Event handlers
│   └── types/     # TypeScript definitions
├── build/         # Compiled JavaScript
└── .env          # Environment configuration
```

## Scripts
- `npm run build` - Compile TypeScript
- `npm start` - Run production server
- `npm run dev` - Start development server with hot-reload

## Contributing
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License
MIT License - see LICENSE file for details.



## Running evals

The evals package loads an mcp client that then runs the index.ts file, so there is no need to rebuild between tests. You can load environment variables by prefixing the npx command. Full documentation can be found [here](https://www.mcpevals.io/docs).

```bash
OPENAI_API_KEY=your-key  npx mcp-eval src/evals/evals.ts src/tools/cursor-tools.ts
```
## Support
For support:
- Open an issue in the GitHub repository
- Join our [Discord community](https://discord.gg/yourcommunity)
- Check the [FAQ](https://github.com/yourusername/cursor-mcp/wiki/FAQ)

