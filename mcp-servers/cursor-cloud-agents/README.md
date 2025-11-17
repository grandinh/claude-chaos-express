# MCP Server for Cursor Cloud Agents

MCP (Model Context Protocol) server wrapper for the Cursor Cloud Agents API, enabling programmatic access to Cursor Cloud Agents from within Claude Code and other MCP-compatible tools.

## Features

Provides MCP tools for all major Cursor Cloud Agents API endpoints:

- **list_agents** - List all cloud agents
- **get_agent** - Get agent status and details
- **get_agent_conversation** - Get agent conversation history
- **launch_agent** - Launch a new cloud agent
- **add_followup** - Add follow-up instructions to an agent
- **delete_agent** - Delete an agent
- **get_api_key_info** - Get API key information
- **list_models** - List available models
- **list_repositories** - List accessible GitHub repositories

## Installation

```bash
cd mcp-servers/cursor-cloud-agents
npm install
npm run build
```

## Configuration

### 1. Set API Key

Set your Cursor API token as an environment variable:

```bash
export CURSOR_API_TOKEN=your_api_key_here
```

Or add it to your shell profile (`~/.zshrc`, `~/.bashrc`, etc.):

```bash
export CURSOR_API_TOKEN=your_api_key_here
```

**Get your API key:** [Cursor Dashboard](https://cursor.com/settings) → Integrations

### 2. Add to MCP Configuration

Add the server to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "cursor-cloud-agents": {
      "command": "node",
      "args": [
        "/absolute/path/to/claude-chaos-express/mcp-servers/cursor-cloud-agents/dist/index.js"
      ],
      "env": {
        "CURSOR_API_TOKEN": "your_api_key_here"
      }
    }
  }
}
```

**Note:** For security, you can also set `CURSOR_API_TOKEN` in your environment instead of in the config file.

## Usage

Once configured, the MCP tools will be available in Claude Code. You can invoke them directly:

```
Use the cursor-cloud-agents MCP to launch a new agent with the prompt "Add README documentation"
```

Or reference specific tools:

```
Use mcp__cursor-cloud-agents__launch_agent to create a new cloud agent
```

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run in development mode
npm run dev

# Type check
npm run typecheck
```

## API Reference

See `docs/api/cursor-cloud-agents-api.md` for complete API documentation.

## Related Documentation

- [Cursor Cloud Agents API](https://cursor.com/docs/cloud-agent/api/endpoints)
- [MCP Protocol](https://modelcontextprotocol.io)
- [Agent System Audit](./docs/agent-system-audit.md)

## License

MIT

