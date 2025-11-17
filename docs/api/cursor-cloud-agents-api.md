---
title: Cursor Cloud Agents API Reference
summary: Complete API reference for Cursor Cloud Agents
tier: 2
tags: [api, cursor, cloud-agents, documentation]
last_updated: 2025-01-20
source: https://cursor.com/docs/cloud-agent/api/endpoints
---

# Cursor Cloud Agents API Reference

Complete API reference for programmatically launching and managing Cursor Cloud Agents.

**Source:** [Cursor Cloud Agents API Documentation](https://cursor.com/docs/cloud-agent/api/endpoints)

---

## Authentication

The Cloud Agents API uses **Basic Authentication**.

- **API Key Location:** [Cursor Dashboard](https://cursor.com/settings)
- **Format:** `Authorization: Basic <base64(api_key:)>`
- **Usage:** Include API key in curl requests with `-u YOUR_API_KEY:`

For details on authentication methods, rate limits, and best practices, see the [Cursor API Overview](https://cursor.com/docs/api).

---

## Base URL

```
https://api.cursor.com
```

---

## Important Notes

- **MCP Support:** Model Context Protocol (MCP) is **not yet supported** by the Cloud Agents API
- **OpenAPI Spec:** View the full [OpenAPI specification](https://cursor.com/docs-static/cloud-agents-openapi.yaml) for detailed schemas and examples
- **Rate Limits:** See individual endpoint documentation for specific rate limits

---

## Endpoints

### List Agents

**GET** `/v0/agents`

List all cloud agents for the authenticated user.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | number | No | Number of cloud agents to return. Default: 20, Max: 100 |
| `cursor` | string | No | Pagination cursor from the previous response |

#### Example Request

```bash
curl --request GET \
  --url https://api.cursor.com/v0/agents \
  -u YOUR_API_KEY:
```

#### Example Response

```json
{
  "agents": [
    {
      "id": "bc_abc123",
      "name": "Add README Documentation",
      "status": "FINISHED",
      "source": {
        "repository": "https://github.com/your-org/your-repo",
        "ref": "main"
      },
      "target": {
        "branchName": "cursor/add-readme-1234",
        "url": "https://cursor.com/agents?id=bc_abc123",
        "prUrl": "https://github.com/your-org/your-repo/pull/1234",
        "autoCreatePr": false,
        "openAsCursorGithubApp": false,
        "skipReviewerRequest": false
      },
      "summary": "Added README.md with installation instructions and usage examples",
      "createdAt": "2024-01-15T10:30:00Z"
    },
    {
      "id": "bc_def456",
      "name": "Fix authentication bug",
      "status": "RUNNING",
      "source": {
        "repository": "https://github.com/your-org/your-repo",
        "ref": "main"
      },
      "target": {
        "branchName": "cursor/fix-auth-5678",
        "url": "https://cursor.com/agents?id=bc_def456",
        "autoCreatePr": true,
        "openAsCursorGithubApp": true,
        "skipReviewerRequest": false
      },
      "createdAt": "2024-01-15T11:45:00Z"
    }
  ],
  "nextCursor": "bc_ghi789"
}
```

#### Status Values

- `CREATING` - Agent is being initialized
- `RUNNING` - Agent is actively working
- `FINISHED` - Agent completed successfully
- `FAILED` - Agent encountered an error
- `CANCELLED` - Agent was cancelled

---

### Get Agent Status

**GET** `/v0/agents/{id}`

Retrieve the current status and results of a cloud agent.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Unique identifier for the cloud agent (e.g., `bc_abc123`) |

#### Example Request

```bash
curl --request GET \
  --url https://api.cursor.com/v0/agents/bc_abc123 \
  -u YOUR_API_KEY:
```

#### Example Response

```json
{
  "id": "bc_abc123",
  "name": "Add README Documentation",
  "status": "FINISHED",
  "source": {
    "repository": "https://github.com/your-org/your-repo",
    "ref": "main"
  },
  "target": {
    "branchName": "cursor/add-readme-1234",
    "url": "https://cursor.com/agents?id=bc_abc123",
    "prUrl": "https://github.com/your-org/your-repo/pull/1234",
    "autoCreatePr": false,
    "openAsCursorGithubApp": false,
    "skipReviewerRequest": false
  },
  "summary": "Added README.md with installation instructions and usage examples",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

### Get Agent Conversation

**GET** `/v0/agents/{id}/conversation`

Retrieve the conversation history of a cloud agent, including all user prompts and assistant responses.

> **Note:** If the cloud agent has been deleted, you cannot access the conversation.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Unique identifier for the cloud agent (e.g., `bc_abc123`) |

#### Example Request

```bash
curl --request GET \
  --url https://api.cursor.com/v0/agents/bc_abc123/conversation \
  -u YOUR_API_KEY:
```

#### Example Response

```json
{
  "id": "bc_abc123",
  "messages": [
    {
      "id": "msg_001",
      "type": "user_message",
      "text": "Add a README.md file with installation instructions"
    },
    {
      "id": "msg_002",
      "type": "assistant_message",
      "text": "I'll help you create a comprehensive README.md file with installation instructions. Let me start by analyzing your project structure..."
    },
    {
      "id": "msg_003",
      "type": "assistant_message",
      "text": "I've created a README.md file with the following sections:\n- Project overview\n- Installation instructions\n- Usage examples\n- Configuration options"
    },
    {
      "id": "msg_004",
      "type": "user_message",
      "text": "Also add a section about troubleshooting"
    },
    {
      "id": "msg_005",
      "type": "assistant_message",
      "text": "I've added a troubleshooting section to the README with common issues and solutions."
    }
  ]
}
```

---

### Launch an Agent

**POST** `/v0/agents`

Start a new cloud agent to work on your repository.

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | object | Yes | The task prompt for the agent |
| `prompt.text` | string | Yes | The instruction text for the agent |
| `prompt.images` | array | No | Array of image objects (max 5) with base64 data and dimensions |
| `source` | object | Yes | Source repository configuration |
| `source.repository` | string | Yes | GitHub repository URL (e.g., `https://github.com/org/repo`) |
| `source.ref` | string | Yes | Git reference (branch, tag, or commit SHA) |
| `target` | object | Yes | Target branch configuration |
| `target.branchName` | string | Yes | Name for the branch to create |
| `target.autoCreatePr` | boolean | No | Automatically create PR when agent finishes (default: `false`) |
| `target.openAsCursorGithubApp` | boolean | No | Open PR in Cursor GitHub App (default: `false`) |
| `target.skipReviewerRequest` | boolean | No | Skip requesting reviewers on PR (default: `false`) |
| `model` | string | No | Model to use (e.g., `claude-4-sonnet-thinking`, `o3`). Recommended: omit for "Auto" selection |
| `webhookUrl` | string | No | Webhook URL to receive status change notifications |

#### Example Request

```bash
curl --request POST \
  --url https://api.cursor.com/v0/agents \
  -u YOUR_API_KEY: \
  --header 'Content-Type: application/json' \
  --data '{
  "prompt": {
    "text": "Add a README.md file with installation instructions",
    "images": [
      {
        "data": "iVBORw0KGgoAAAANSUhEUgAA...",
        "dimension": {
          "width": 1024,
          "height": 768
        }
      }
    ]
  },
  "source": {
    "repository": "https://github.com/your-org/your-repo",
    "ref": "main"
  },
  "target": {
    "autoCreatePr": true,
    "branchName": "feature/add-readme"
  }
}'
```

#### Example Response

```json
{
  "id": "bc_abc123",
  "name": "Add README Documentation",
  "status": "CREATING",
  "source": {
    "repository": "https://github.com/your-org/your-repo",
    "ref": "main"
  },
  "target": {
    "branchName": "feature/add-readme",
    "url": "https://cursor.com/agents?id=bc_abc123",
    "autoCreatePr": true,
    "openAsCursorGithubApp": false,
    "skipReviewerRequest": false
  },
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

### Add Follow-up

**POST** `/v0/agents/{id}/followup`

Add a follow-up instruction to an existing cloud agent.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Unique identifier for the cloud agent (e.g., `bc_abc123`) |

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | object | Yes | The follow-up prompt for the agent |
| `prompt.text` | string | Yes | The follow-up instruction text |
| `prompt.images` | array | No | Array of image objects (max 5) with base64 data and dimensions |

#### Example Request

```bash
curl --request POST \
  --url https://api.cursor.com/v0/agents/bc_abc123/followup \
  -u YOUR_API_KEY: \
  --header 'Content-Type: application/json' \
  --data '{
  "prompt": {
    "text": "Also add a section about troubleshooting",
    "images": [
      {
        "data": "iVBORw0KGgoAAAANSUhEUgAA...",
        "dimension": {
          "width": 1024,
          "height": 768
        }
      }
    ]
  }
}'
```

#### Example Response

```json
{
  "id": "bc_abc123"
}
```

---

### Delete an Agent

**DELETE** `/v0/agents/{id}`

Delete a cloud agent. This action is permanent and cannot be undone.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Unique identifier for the cloud agent (e.g., `bc_abc123`) |

#### Example Request

```bash
curl --request DELETE \
  --url https://api.cursor.com/v0/agents/bc_abc123 \
  -u YOUR_API_KEY:
```

#### Example Response

```json
{
  "id": "bc_abc123"
}
```

---

### Get API Key Info

**GET** `/v0/me`

Retrieve information about the API key being used for authentication.

#### Example Request

```bash
curl --request GET \
  --url https://api.cursor.com/v0/me \
  -u YOUR_API_KEY:
```

#### Example Response

```json
{
  "apiKeyName": "Production API Key",
  "createdAt": "2024-01-15T10:30:00Z",
  "userEmail": "developer@example.com"
}
```

---

### List Models

**GET** `/v0/models`

Retrieve a list of recommended models for cloud agents.

> **Note:** We recommend having an "Auto" option where you don't provide a model name to the creation endpoint, and we will pick the most appropriate model.

#### Example Request

```bash
curl --request GET \
  --url https://api.cursor.com/v0/models \
  -u YOUR_API_KEY:
```

#### Example Response

```json
{
  "models": [
    "claude-4-sonnet-thinking",
    "o3",
    "claude-4-opus-thinking"
  ]
}
```

---

### List GitHub Repositories

**GET** `/v0/repositories`

Retrieve a list of GitHub repositories accessible to the authenticated user.

> **⚠️ WARNING: This endpoint has very strict rate limits.**
>
> - Limit requests to **1 / user / minute**
> - Limit requests to **30 / user / hour**
> - This request can take tens of seconds to respond for users with access to many repositories
> - Make sure to handle this information not being available gracefully

#### Example Request

```bash
curl --request GET \
  --url https://api.cursor.com/v0/repositories \
  -u YOUR_API_KEY:
```

#### Example Response

```json
{
  "repositories": [
    {
      "owner": "your-org",
      "name": "your-repo",
      "repository": "https://github.com/your-org/your-repo"
    },
    {
      "owner": "your-org",
      "name": "another-repo",
      "repository": "https://github.com/your-org/another-repo"
    },
    {
      "owner": "your-username",
      "name": "personal-project",
      "repository": "https://github.com/your-username/personal-project"
    }
  ]
}
```

---

## Webhook Integration

### Webhook URL

When launching an agent, you can provide a `webhookUrl` in the request body. The webhook will be called with status change notifications.

**Webhook Endpoint:** `https://api.cursor.com/v0/agents/webhook`

For detailed webhook setup instructions, see:
- `.cursor/cloud-agents/webhooks/setup-guide.md` (in this repository)
- [Cursor Cloud Agents Webhook Documentation](https://cursor.com/docs/cloud-agent/webhooks)

### Webhook Payload

The webhook will receive POST requests with agent status updates:

```json
{
  "id": "bc_abc123",
  "status": "FINISHED",
  "name": "Add README Documentation",
  "source": {
    "repository": "https://github.com/your-org/your-repo",
    "ref": "main"
  },
  "target": {
    "branchName": "cursor/add-readme-1234",
    "prUrl": "https://github.com/your-org/your-repo/pull/1234"
  }
}
```

---

## Error Handling

### Common HTTP Status Codes

- `200 OK` - Request succeeded
- `201 Created` - Agent created successfully
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Invalid or missing API key
- `403 Forbidden` - API key lacks required permissions
- `404 Not Found` - Agent or resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

### Error Response Format

```json
{
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE"
  }
}
```

---

## Rate Limits

- **List Repositories:** 1 request per minute, 30 requests per hour per user
- **Other endpoints:** See [Cursor API Overview](https://cursor.com/docs/api) for general rate limits

Always implement exponential backoff and retry logic for production use.

---

## Best Practices

1. **Model Selection:** Omit the `model` field to use "Auto" selection (recommended)
2. **Branch Naming:** Use descriptive branch names (e.g., `cursor/add-readme-1234`)
3. **Webhooks:** Implement webhook endpoints to receive status updates asynchronously
4. **Error Handling:** Always handle rate limits and errors gracefully
5. **Repository Access:** Cache repository lists due to strict rate limits
6. **Conversation History:** Access conversation history before deleting agents (deleted agents lose conversation access)

---

## Related Documentation

- [Cursor API Overview](https://cursor.com/docs/api) - Authentication, rate limits, best practices
- [Cloud Agents Webhooks](https://cursor.com/docs/cloud-agent/webhooks) - Webhook setup and configuration
- [OpenAPI Specification](https://cursor.com/docs-static/cloud-agents-openapi.yaml) - Complete API schema
- `.cursor/cloud-agents/webhooks/setup-guide.md` - Webhook setup guide in this repository
- `docs/agent-system-audit.md` - Agent system overview and comparison

---

## Integration with This Project

This API is used for:

1. **Cloud Agent Management** - Launching and managing Cursor Cloud Agents
2. **Webhook Integration** - Receiving agent status updates via webhooks
3. **Repository Automation** - Programmatic agent launches for CI/CD workflows
4. **Agent Registry** - Tracking agent runs and configurations (see `repo_state/agent-registry.json`)

For examples of Cloud Agent configurations, see:
- `.cursor/cloud-agents/*.json` - Agent configuration files
- `schemas/cloud-agent-config.json` - Configuration schema

