#!/usr/bin/env node

/**
 * MCP Server for Cursor Cloud Agents API
 * 
 * Provides MCP tools for launching and managing Cursor Cloud Agents
 * via the Cursor Cloud Agents API (https://api.cursor.com/v0/agents)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import https from 'https';

const API_BASE_URL = 'api.cursor.com';
const API_VERSION = 'v0';

interface CursorAgent {
  id: string;
  name: string;
  status: 'CREATING' | 'RUNNING' | 'FINISHED' | 'FAILED' | 'CANCELLED';
  source?: {
    repository: string;
    ref: string;
  };
  target?: {
    branchName: string;
    url?: string;
    prUrl?: string;
    autoCreatePr?: boolean;
    openAsCursorGithubApp?: boolean;
    skipReviewerRequest?: boolean;
  };
  summary?: string;
  createdAt: string;
}

interface LaunchAgentParams {
  prompt: {
    text: string;
    images?: Array<{
      data: string;
      dimension: {
        width: number;
        height: number;
      };
    }>;
  };
  source: {
    repository: string;
    ref: string;
  };
  target: {
    branchName: string;
    autoCreatePr?: boolean;
    openAsCursorGithubApp?: boolean;
    skipReviewerRequest?: boolean;
  };
  model?: string;
  webhookUrl?: string;
}

class CursorCloudAgentsServer {
  private server: Server;
  private apiKey: string;

  constructor() {
    this.server = new Server(
      {
        name: 'cursor-cloud-agents',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Get API key from environment
    this.apiKey = process.env.CURSOR_API_TOKEN || process.env.CURSOR_API_KEY || '';
    
    if (!this.apiKey) {
      console.error('Warning: CURSOR_API_TOKEN or CURSOR_API_KEY not set');
    }

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'list_agents',
          description: 'List all Cursor Cloud Agents for the authenticated user',
          inputSchema: {
            type: 'object',
            properties: {
              limit: {
                type: 'number',
                description: 'Number of agents to return (default: 20, max: 100)',
                minimum: 1,
                maximum: 100,
              },
              cursor: {
                type: 'string',
                description: 'Pagination cursor from previous response',
              },
            },
          },
        },
        {
          name: 'get_agent',
          description: 'Get the status and details of a specific Cursor Cloud Agent',
          inputSchema: {
            type: 'object',
            properties: {
              agentId: {
                type: 'string',
                description: 'The unique identifier for the cloud agent (e.g., bc_abc123)',
              },
            },
            required: ['agentId'],
          },
        },
        {
          name: 'get_agent_conversation',
          description: 'Get the conversation history of a Cursor Cloud Agent',
          inputSchema: {
            type: 'object',
            properties: {
              agentId: {
                type: 'string',
                description: 'The unique identifier for the cloud agent',
              },
            },
            required: ['agentId'],
          },
        },
        {
          name: 'launch_agent',
          description: 'Launch a new Cursor Cloud Agent to work on a repository',
          inputSchema: {
            type: 'object',
            properties: {
              prompt: {
                type: 'object',
                properties: {
                  text: {
                    type: 'string',
                    description: 'The instruction text for the agent',
                  },
                  images: {
                    type: 'array',
                    description: 'Array of image objects (max 5) with base64 data and dimensions',
                    items: {
                      type: 'object',
                      properties: {
                        data: { type: 'string' },
                        dimension: {
                          type: 'object',
                          properties: {
                            width: { type: 'number' },
                            height: { type: 'number' },
                          },
                        },
                      },
                    },
                    maxItems: 5,
                  },
                },
                required: ['text'],
              },
              source: {
                type: 'object',
                properties: {
                  repository: {
                    type: 'string',
                    description: 'GitHub repository URL (e.g., https://github.com/org/repo)',
                  },
                  ref: {
                    type: 'string',
                    description: 'Git reference (branch, tag, or commit SHA)',
                  },
                },
                required: ['repository', 'ref'],
              },
              target: {
                type: 'object',
                properties: {
                  branchName: {
                    type: 'string',
                    description: 'Name for the branch to create',
                  },
                  autoCreatePr: {
                    type: 'boolean',
                    description: 'Automatically create PR when agent finishes (default: false)',
                  },
                  openAsCursorGithubApp: {
                    type: 'boolean',
                    description: 'Open PR in Cursor GitHub App (default: false)',
                  },
                  skipReviewerRequest: {
                    type: 'boolean',
                    description: 'Skip requesting reviewers on PR (default: false)',
                  },
                },
                required: ['branchName'],
              },
              model: {
                type: 'string',
                description: 'Model to use (e.g., claude-4-sonnet-thinking, o3). Omit for Auto selection',
              },
              webhookUrl: {
                type: 'string',
                description: 'Webhook URL to receive status change notifications',
              },
            },
            required: ['prompt', 'source', 'target'],
          },
        },
        {
          name: 'add_followup',
          description: 'Add a follow-up instruction to an existing Cursor Cloud Agent',
          inputSchema: {
            type: 'object',
            properties: {
              agentId: {
                type: 'string',
                description: 'The unique identifier for the cloud agent',
              },
              prompt: {
                type: 'object',
                properties: {
                  text: {
                    type: 'string',
                    description: 'The follow-up instruction text',
                  },
                  images: {
                    type: 'array',
                    description: 'Array of image objects (max 5)',
                    items: {
                      type: 'object',
                      properties: {
                        data: { type: 'string' },
                        dimension: {
                          type: 'object',
                          properties: {
                            width: { type: 'number' },
                            height: { type: 'number' },
                          },
                        },
                      },
                    },
                    maxItems: 5,
                  },
                },
                required: ['text'],
              },
            },
            required: ['agentId', 'prompt'],
          },
        },
        {
          name: 'delete_agent',
          description: 'Delete a Cursor Cloud Agent (permanent action)',
          inputSchema: {
            type: 'object',
            properties: {
              agentId: {
                type: 'string',
                description: 'The unique identifier for the cloud agent',
              },
            },
            required: ['agentId'],
          },
        },
        {
          name: 'get_api_key_info',
          description: 'Get information about the API key being used',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'list_models',
          description: 'List recommended models for cloud agents',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'list_repositories',
          description: 'List GitHub repositories accessible to the authenticated user (rate limited: 1/min, 30/hr)',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ] as Tool[],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'list_agents':
            return await this.listAgents(args as { limit?: number; cursor?: string });

          case 'get_agent':
            return await this.getAgent(args as { agentId: string });

          case 'get_agent_conversation':
            return await this.getAgentConversation(args as { agentId: string });

          case 'launch_agent':
            return await this.launchAgent(args as unknown as LaunchAgentParams);

          case 'add_followup':
            return await this.addFollowup(
              args as { agentId: string; prompt: { text: string; images?: any[] } }
            );

          case 'delete_agent':
            return await this.deleteAgent(args as { agentId: string });

          case 'get_api_key_info':
            return await this.getApiKeyInfo();

          case 'list_models':
            return await this.listModels();

          case 'list_repositories':
            return await this.listRepositories();

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private makeRequest(
    method: string,
    path: string,
    data?: any
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.apiKey) {
        reject(new Error('CURSOR_API_TOKEN or CURSOR_API_KEY environment variable not set'));
        return;
      }

      const headers: Record<string, string> = {
        'Authorization': `Basic ${Buffer.from(`${this.apiKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      };

      if (data) {
        const jsonData = JSON.stringify(data);
        headers['Content-Length'] = Buffer.byteLength(jsonData).toString();
      }

      const options = {
        hostname: API_BASE_URL,
        path: `/${API_VERSION}${path}`,
        method,
        headers,
      };

      const req = https.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsed = responseData ? JSON.parse(responseData) : {};
              resolve(parsed);
            } catch (e) {
              resolve({ raw: responseData });
            }
          } else {
            reject(
              new Error(
                `API error: ${res.statusCode} - ${responseData || res.statusMessage}`
              )
            );
          }
        });
      });

      req.on('error', reject);

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  private async listAgents(args: { limit?: number; cursor?: string }) {
    const queryParams = new URLSearchParams();
    if (args.limit) queryParams.set('limit', args.limit.toString());
    if (args.cursor) queryParams.set('cursor', args.cursor);

    const path = `/agents${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const result = await this.makeRequest('GET', path);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async getAgent(args: { agentId: string }) {
    const result = await this.makeRequest('GET', `/agents/${args.agentId}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async getAgentConversation(args: { agentId: string }) {
    const result = await this.makeRequest('GET', `/agents/${args.agentId}/conversation`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async launchAgent(args: LaunchAgentParams) {
    const result = await this.makeRequest('POST', '/agents', args);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async addFollowup(args: { agentId: string; prompt: { text: string; images?: any[] } }) {
    const result = await this.makeRequest('POST', `/agents/${args.agentId}/followup`, {
      prompt: args.prompt,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async deleteAgent(args: { agentId: string }) {
    const result = await this.makeRequest('DELETE', `/agents/${args.agentId}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async getApiKeyInfo() {
    const result = await this.makeRequest('GET', '/me');

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async listModels() {
    const result = await this.makeRequest('GET', '/models');

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async listRepositories() {
    const result = await this.makeRequest('GET', '/repositories');

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Cursor Cloud Agents MCP server running on stdio');
  }
}

const server = new CursorCloudAgentsServer();
server.run().catch(console.error);

