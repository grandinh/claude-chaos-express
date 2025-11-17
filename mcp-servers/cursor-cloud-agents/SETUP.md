# Setup Guide: Cursor Cloud Agents MCP Server

## Quick Start

1. **Install dependencies:**
   ```bash
   cd mcp-servers/cursor-cloud-agents
   npm install
   npm run build
   ```

2. **Set your API key:**
   ```bash
   export CURSOR_API_TOKEN=your_api_key_here
   ```
   
   Get your API key from: [Cursor Dashboard](https://cursor.com/settings) → Integrations

3. **Verify MCP configuration:**
   
   The server is already configured in `.cursor/mcp.json`. Verify it points to the correct path:
   
   ```json
   {
     "mcpServers": {
       "cursor-cloud-agents": {
         "command": "node",
         "args": [
           "/absolute/path/to/claude-chaos-express/mcp-servers/cursor-cloud-agents/dist/index.js"
         ]
       }
     }
   }
   ```

4. **Restart Cursor/Claude Code:**
   
   After adding the MCP server, restart Cursor or Claude Code to load the new MCP configuration.

## Testing

To test the MCP server manually:

```bash
# Set API key
export CURSOR_API_TOKEN=your_key

# Run the server (it will communicate via stdio)
node dist/index.js
```

The server communicates via stdio, so it's designed to be invoked by MCP clients, not run directly.

## Available Tools

Once configured, these tools will be available in Claude Code:

- `mcp__cursor-cloud-agents__list_agents` - List all agents
- `mcp__cursor-cloud-agents__get_agent` - Get agent details
- `mcp__cursor-cloud-agents__get_agent_conversation` - Get conversation history
- `mcp__cursor-cloud-agents__launch_agent` - Launch a new agent
- `mcp__cursor-cloud-agents__add_followup` - Add follow-up instructions
- `mcp__cursor-cloud-agents__delete_agent` - Delete an agent
- `mcp__cursor-cloud-agents__get_api_key_info` - Get API key info
- `mcp__cursor-cloud-agents__list_models` - List available models
- `mcp__cursor-cloud-agents__list_repositories` - List repositories

## Usage Examples

### Launch an Agent

```
Use the cursor-cloud-agents MCP to launch a new agent with:
- Prompt: "Add comprehensive README documentation"
- Repository: https://github.com/org/repo
- Branch: main
- Target branch: feature/add-readme
- Auto-create PR: true
```

### List Agents

```
List all my Cursor Cloud Agents using the MCP
```

### Check Agent Status

```
Get the status of agent bc_abc123 using the cursor-cloud-agents MCP
```

## Troubleshooting

### "CURSOR_API_TOKEN not set" error

Make sure you've set the environment variable:
```bash
export CURSOR_API_TOKEN=your_key_here
```

Or add it to your MCP config:
```json
{
  "mcpServers": {
    "cursor-cloud-agents": {
      "command": "node",
      "args": ["..."],
      "env": {
        "CURSOR_API_TOKEN": "your_key_here"
      }
    }
  }
}
```

### MCP server not appearing

1. Verify the path in `.cursor/mcp.json` is absolute and correct
2. Restart Cursor/Claude Code
3. Check that `dist/index.js` exists (run `npm run build` if not)

### Build errors

If you see TypeScript errors:
```bash
npm install
npm run build
```

## Security Notes

- **Never commit your API key** to version control
- Use environment variables or secure credential storage
- The API key has full access to your Cursor Cloud Agents

## Related Documentation

- [Cursor Cloud Agents API Reference](../../docs/api/cursor-cloud-agents-api.md)
- [MCP Protocol Documentation](https://modelcontextprotocol.io)
- [Agent System Audit](../../docs/agent-system-audit.md)

