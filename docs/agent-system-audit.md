# Agent System Audit: Claude Code vs Cursor Cloud Agents

**Purpose:** Document both agent systems, their capabilities, and when to use each.

**Created:** 2025-01-20
**Task:** h-align-claude-cursor-systems

---

## Overview

The project uses TWO distinct agent systems:

1. **Claude Code Subagents** - Local, project-specific agents for specialized tasks
2. **Cursor Cloud Agents API** - Cloud-based programmatic agents for repository-wide automation

These systems are **complementary**, not competing. Each has its own strengths and use cases.

---

## Claude Code Subagents

### System Characteristics

- **Location:** `.claude/agents/*.md`
- **Count:** 51 agents organized across 12 categories
- **Execution:** Local, synchronous, part of cc-sessions workflow
- **Scope:** Project-specific, task-specific, highly specialized
- **Integration:** Deep integration with cc-sessions DAIC workflow
- **State:** Can access and maintain task state via `sessions/sessions-state.json`

### Agent Categories (51 Total)

#### 1. Build Tools (2)
- **vite-expert** - Vite build optimization, ESM, HMR, plugins
- **webpack-expert** - Webpack bundling, optimization, loaders/plugins

#### 2. Code Quality (1)
- **linting-expert** - Linting, formatting, static analysis

#### 3. Code Review & Analysis (4)
- **code-review-expert** - Comprehensive code review specialist
- **code-review** - Code review coordination
- **code-analyzer** - Deep-dive code analysis for bugs and logic flow
- **code-search** - Specialized codebase search agent

#### 4. Context & Workflow (3)
- **context-gathering** - Context manifest creation for tasks
- **context-refinement** - Update context manifests with discoveries
- **logging** - Work log management and documentation

#### 5. ContextKit (ctxk) Agents (9)
- **build-project** - Project builds with clean error reporting
- **check-accessibility** - Accessibility validation
- **check-code-debt** - Technical debt detection
- **check-error-handling** - Error handling compliance
- **check-localization** - Localization issue detection
- **check-modern-code** - Outdated API detection
- **commit-changes** - Git commit message generation
- **run-specific-test** - Single test execution
- **run-test-suite** - Complete test suite execution

#### 6. Database (3)
- **database-expert** - Cross-database optimization and design
- **mongodb-expert** - MongoDB-specific expertise
- **postgres-expert** - PostgreSQL-specific expertise

#### 7. DevOps & Infrastructure (3)
- **devops-expert** - CI/CD, deployment, infrastructure
- **docker-expert** - Docker containerization
- **github-actions-expert** - GitHub Actions workflows

#### 8. Documentation (2)
- **documentation-expert** - Documentation structure and quality
- **service-documentation** - CLAUDE.md and module documentation updates

#### 9. Frontend (4)
- **accessibility-expert** - WCAG compliance, ARIA
- **css-styling-expert** - CSS architecture and styling
- **react-expert** - React component patterns
- **react-performance-expert** - React performance optimization
- **nextjs-expert** - Next.js framework expertise

#### 10. Testing (5)
- **test-runner** - Test execution and analysis
- **testing-expert** - Cross-framework testing expertise
- **jest-testing-expert** - Jest framework specialization
- **vitest-testing-expert** - Vitest framework specialization
- **playwright-expert** - E2E testing with Playwright

#### 11. TypeScript (3)
- **typescript-expert** - General TypeScript expertise
- **typescript-build-expert** - Build configuration and optimization
- **typescript-type-expert** - Advanced type system specialist

#### 12. Specialized Domains (12)
- **ai-sdk-expert** - Vercel AI SDK v5 expertise
- **cli-expert** - CLI tool development
- **file-analyzer** - File analysis for context reduction
- **git-expert** - Git workflow and repository management
- **kafka-expert** - Apache Kafka streaming platform
- **loopback-expert** - LoopBack 4 framework
- **nestjs-expert** - Nest.js framework
- **nodejs-expert** - Node.js runtime and ecosystem
- **oracle** - Strategic meta-agent for complex decisions
- **parallel-worker** - Parallel work streams in git worktrees
- **refactoring-expert** - Systematic code refactoring
- **research-expert** - Parallel research with citations
- **triage-expert** - Problem diagnosis before specialized experts

### Use Cases for Claude Subagents

**When to use Claude Code subagents:**

1. **Deep Code Analysis**
   - Bug hunting across multiple files
   - Logic flow tracing
   - Performance bottleneck identification

2. **Specialized Technical Tasks**
   - TypeScript type system challenges
   - React performance optimization
   - Database query optimization
   - Kafka consumer management

3. **cc-sessions Integration**
   - Tasks that need DAIC workflow
   - Context-aware work with task manifests
   - State persistence across sessions

4. **Local Development Workflow**
   - Code review before commits
   - Test execution and analysis
   - Documentation updates
   - Refactoring operations

5. **Multi-Step Reasoning**
   - Research with cross-source validation
   - Strategic decision-making (oracle agent)
   - Triage and diagnosis

---

## Cursor Cloud Agents API

### System Characteristics

- **Location:** Cloud-based (cursor.com API)
- **Execution:** Asynchronous, webhook-driven
- **Scope:** Repository-wide, automation-focused
- **Integration:** Programmatic via REST API
- **State:** Conversation history accessible via API
- **Limitations:** MCP not yet supported

### API Capabilities

#### Launch Operations
```
POST /v0/agents
```
**Features:**
- Start agents with task prompts
- Optional images (max 5)
- Repository source and target branch configuration
- Auto-create pull requests upon completion
- Webhook notifications for status changes
- Model selection (e.g., "claude-4-sonnet")

#### Management Functions
```
GET /v0/agents - List all agents (paginated, default 20, max 100)
GET /v0/agents/{id} - Get agent status and results
GET /v0/agents/{id}/conversation - Access conversation history
POST /v0/agents/{id}/follow-up - Add follow-up instructions
DELETE /v0/agents/{id} - Permanently delete agent
```

#### Additional Endpoints
```
GET /v0/models - List available models
GET /v0/repos - List GitHub repositories (rate limited: 1/min, 30/hr)
GET /v0/user - Get API key information
```

### Authentication
- **Method:** Basic Authentication
- **Key Source:** Cursor Dashboard
- **Format:** `Authorization: Basic <base64(api_key:)>`

### Use Cases for Cursor Cloud Agents

**When to use Cursor Cloud Agents:**

1. **Repository-Wide Automation**
   - Scheduled refactoring tasks
   - Dependency updates across repos
   - Code modernization sweeps
   - Bulk documentation updates

2. **CI/CD Integration**
   - Automated code reviews on PR creation
   - Test result analysis
   - Build failure investigation
   - Performance regression detection

3. **Asynchronous Work**
   - Long-running tasks (migrations, large refactors)
   - Webhook-driven workflows
   - Background analysis and reporting

4. **Multi-Repository Operations**
   - Cross-repo consistency checks
   - Shared library updates
   - Organization-wide policy enforcement

5. **Programmatic Workflows**
   - API-driven automation
   - Integration with external systems
   - Scheduled agent runs (cron-like)

---

## System Comparison

| Aspect | Claude Code Subagents | Cursor Cloud Agents |
|--------|----------------------|---------------------|
| **Execution** | Local, synchronous | Cloud, asynchronous |
| **Scope** | Task-specific, specialized | Repository-wide, automation |
| **Integration** | cc-sessions DAIC workflow | REST API, webhooks |
| **State** | Task state via sessions-state.json | Conversation history via API |
| **Specialization** | 51 highly specialized agents | General-purpose with model selection |
| **Use Case** | Development workflow, deep analysis | CI/CD, automation, scheduled tasks |
| **MCP Support** | Full MCP support | Not yet supported |
| **Rate Limits** | None (local) | API rate limits apply |
| **PR Creation** | Manual via git/gh commands | Automatic via API parameter |
| **Webhooks** | Not supported | Status change notifications |

---

## Complementary Usage Patterns

### Pattern 1: Local Development → Cloud Automation

**Scenario:** Develop and test locally with Claude subagents, then automate deployment with Cloud Agents

**Example:**
1. Use **code-review-expert** (Claude) to review changes locally
2. Use **test-runner** (Claude) to validate tests pass
3. Launch Cloud Agent via API to create PR with automated checks
4. Cloud Agent monitors CI/CD and reports status via webhook

### Pattern 2: Specialized Analysis → Broad Application

**Scenario:** Use specialized Claude agent for deep analysis, then Cloud Agent for applying fixes

**Example:**
1. Use **typescript-type-expert** (Claude) to identify type system issues
2. Document the pattern and fix strategy
3. Launch Cloud Agent to apply the fix across multiple repos
4. Cloud Agent creates PRs for each repo

### Pattern 3: Research → Implementation

**Scenario:** Research locally, implement at scale

**Example:**
1. Use **research-expert** (Claude) to investigate best practices
2. Use **context-gathering** (Claude) to build implementation plan
3. Launch Cloud Agent to implement across entire codebase
4. Cloud Agent creates single PR with all changes

### Pattern 4: CI/CD Trigger → Local Investigation

**Scenario:** Cloud Agent detects issue, Claude agent investigates

**Example:**
1. Cloud Agent monitors CI/CD via webhook
2. Detects test failure, triggers investigation workflow
3. Claude **triage-expert** analyzes failure locally
4. Claude **code-analyzer** traces root cause
5. Results inform next Cloud Agent run to fix issue

---

## Agent Selection Decision Tree

```
Does the task require...

│
├─ Deep specialized knowledge? (TypeScript types, React perf, etc.)
│  └─ ✓ Use Claude Subagent
│
├─ Local development workflow? (code review, tests, refactoring)
│  └─ ✓ Use Claude Subagent
│
├─ cc-sessions DAIC integration? (task manifests, state tracking)
│  └─ ✓ Use Claude Subagent
│
├─ Multi-step reasoning? (research, triage, strategic decisions)
│  └─ ✓ Use Claude Subagent
│
├─ Repository-wide changes? (bulk updates, migrations)
│  └─ ✓ Use Cursor Cloud Agent
│
├─ CI/CD integration? (automated PRs, webhook-driven)
│  └─ ✓ Use Cursor Cloud Agent
│
├─ Asynchronous execution? (scheduled tasks, background work)
│  └─ ✓ Use Cursor Cloud Agent
│
├─ Multi-repository operations? (org-wide updates)
│  └─ ✓ Use Cursor Cloud Agent
│
└─ Programmatic workflow? (API-driven automation)
   └─ ✓ Use Cursor Cloud Agent
```

---

## Future Integration Opportunities

### When Cursor Cloud Agents Add MCP Support

Once Cloud Agents support MCP, potential integrations:

1. **Shared Context** - Cloud Agents could access project-specific MCPs
2. **Tool Integration** - Cloud Agents could use same tools as Claude (GitHub, Postman, etc.)
3. **Hybrid Workflows** - Seamless handoff between local and cloud agents
4. **Knowledge Sharing** - Both systems could query same knowledge bases

### Potential Cloud Agent Equivalents

Some Claude agents could benefit from Cloud Agent equivalents for automation:

- **service-documentation** → Cloud Agent for automated doc updates
- **commit-changes** → Cloud Agent for automated commit message generation
- **check-code-debt** → Cloud Agent for scheduled debt detection
- **check-accessibility** → Cloud Agent for automated accessibility audits
- **check-modern-code** → Cloud Agent for automated API modernization

**Note:** These would be **complementary** (automation use case) not **replacements** (interactive use case remains with Claude).

---

## Maintenance & Synchronization

### Adding New Claude Agents

When adding a new Claude subagent:

1. **Document in `.claude/agents/`** with YAML frontmatter (name, description, tools)
2. **Update this audit** with agent category and purpose
3. **Evaluate automation potential** - Could it benefit from Cloud Agent equivalent?
4. **Document in agent mapping** (to be created in next task)

### Cursor Cloud Agent Usage

When using Cloud Agents:

1. **Document purpose** in task manifest or GitHub Issue
2. **Track via API** - Save agent IDs for monitoring
3. **Log outcomes** in appropriate location (PR comments, task work logs)
4. **Learn patterns** - Which tasks work well with Cloud Agents vs Claude?

### Keeping Documentation Aligned

- **This audit** - Update when agents are added/removed/changed
- **Agent mapping** (next task) - Maintain mapping of use cases
- **SoT reference map** - Ensure agent documentation is referenced correctly
- **Change propagation** - Agent changes should be documented per alignment process

---

## Related Documentation

- `docs/sot-reference-map.md` - SoT file references
- `.claude/agents/` - All Claude subagent definitions
- `sessions/tasks/h-align-claude-cursor-systems.md` - This alignment task
- Cursor Cloud Agents API: https://cursor.com/docs/cloud-agent/api/endpoints

---

## Changelog

### 2025-01-20
- Initial agent system audit created
- Cataloged 51 Claude subagents across 12 categories
- Documented Cursor Cloud Agents API capabilities
- Created system comparison and decision tree
- Identified complementary usage patterns
- Documented future integration opportunities
