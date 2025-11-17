# Implementation Notes: Cursor Cloud Agents MCP Server

## Overview

This MCP server provides a Model Context Protocol wrapper for the Cursor Cloud Agents API, enabling programmatic access to Cursor Cloud Agents from within Claude Code and other MCP-compatible tools.

## Architecture

### Components

1. **MCP Server** (`src/index.ts`)
   - Implements MCP protocol using `@modelcontextprotocol/sdk`
   - Communicates via stdio (standard input/output)
   - Provides 9 tools covering all major API endpoints

2. **API Client**
   - Uses Node.js `https` module for API requests
   - Basic Authentication with API key
   - Error handling and response parsing

3. **Type Definitions**
   - TypeScript interfaces for API requests/responses
   - Type-safe tool parameter validation

## Tools Implemented

| Tool | Endpoint | Description |
|------|----------|-------------|
| `list_agents` | `GET /v0/agents` | List all cloud agents with pagination |
| `get_agent` | `GET /v0/agents/{id}` | Get agent status and details |
| `get_agent_conversation` | `GET /v0/agents/{id}/conversation` | Get conversation history |
| `launch_agent` | `POST /v0/agents` | Launch a new cloud agent |
| `add_followup` | `POST /v0/agents/{id}/followup` | Add follow-up instructions |
| `delete_agent` | `DELETE /v0/agents/{id}` | Delete an agent |
| `get_api_key_info` | `GET /v0/me` | Get API key information |
| `list_models` | `GET /v0/models` | List available models |
| `list_repositories` | `GET /v0/repositories` | List accessible repositories |

## Authentication

- Uses Basic Authentication: `Authorization: Basic <base64(api_key:)>`
- API key from environment: `CURSOR_API_TOKEN` or `CURSOR_API_KEY`
- No API key validation on startup (fails gracefully on first request)

## Error Handling

- All API errors are caught and returned as error responses
- Missing API key returns clear error message
- HTTP errors include status code and response body
- Type errors are caught during tool invocation

## Configuration

### MCP Configuration (`.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "cursor-cloud-agents": {
      "command": "node",
      "args": [
        "/absolute/path/to/dist/index.js"
      ],
      "env": {
        "CURSOR_API_TOKEN": "optional_key_here"
      }
    }
  }
}
```

**Note:** Prefer environment variables over config file for API keys.

## Development

### Build Process

```bash
npm install          # Install dependencies
npm run build       # Compile TypeScript
npm run dev         # Run with tsx (development)
npm run typecheck   # Type check without building
```

### Testing

The server communicates via stdio, so testing requires an MCP client. For manual testing:

1. Set `CURSOR_API_TOKEN` environment variable
2. Use an MCP client tool or test framework
3. Or test API calls directly using curl/Postman

## Future Enhancements

Potential improvements:

1. **Caching** - Cache repository lists (rate limited: 1/min, 30/hr)
2. **Webhook Support** - Handle webhook callbacks for agent status updates
3. **Polling** - Automatic status polling for launched agents
4. **Batch Operations** - Support for bulk agent operations
5. **Streaming** - Support for streaming agent responses
6. **Retry Logic** - Exponential backoff for rate-limited requests

## Integration with Project

This MCP server complements:

- **Agent Orchestrator** (`scripts/agent-orchestrator.js`) - Can use MCP tools instead of direct API calls
- **Agent Registry** (`repo_state/agent-registry.json`) - Can track MCP-launched agents
- **Documentation** (`docs/api/cursor-cloud-agents-api.md`) - API reference

## Security Considerations

1. **API Key Storage**
   - Never commit API keys to version control
   - Use environment variables or secure credential storage
   - Consider using a secrets manager for production

2. **Rate Limits**
   - Repository list: 1 request/minute, 30/hour
   - Other endpoints: See Cursor API documentation
   - Implement rate limiting in production use

3. **Permissions**
   - API key has full access to user's Cursor Cloud Agents
   - Consider scoped API keys if/when available

## Related Files

- `docs/api/cursor-cloud-agents-api.md` - Complete API reference
- `scripts/agent-orchestrator.js` - Alternative implementation using direct API calls
- `docs/agent-system-audit.md` - Agent system comparison
- `.cursor/mcp.json` - MCP server configuration

