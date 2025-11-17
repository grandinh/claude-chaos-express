# Agent Registry Scripts

Management scripts for the agent registry system.

## Quick Start

```bash
# Bootstrap registry (first-time setup or recovery)
node scripts/agent-registry.js init

# Validate registry integrity
node scripts/agent-registry.js validate

# Sync registry with current agents
node scripts/agent-registry.js sync

# Check for duplicates before creating agent
node scripts/agent-registry.js check <agent-name>

# Create new Claude agent
node scripts/agent-registry.js create claude --name <name> --category <category>

# Create new Cloud Agent
node scripts/agent-registry.js create cloud --name <name> --trigger <scheduled|webhook|manual>

# Link Claude agent to Cloud agent
node scripts/agent-registry.js link <claude-agent> <cloud-agent>

# Deprecate an agent (30-day grace period)
node scripts/agent-registry.js warn <agent> --reason <reason>

# Archive an agent (after grace period)
node scripts/agent-registry.js archive <agent>

# Generate documentation
node scripts/agent-registry.js generate-docs
```

## Command Reference

### Init Command

**Purpose:** Bootstrap the registry system by creating schema and initial registry if missing.

**Usage:** `node scripts/agent-registry.js init`

**When to use:**
- First-time repository setup
- Recovery after schema deletion or corruption
- Verifying registry system integrity

**What it does:**
1. Verifies schema validator is loaded (reports error if not)
2. Checks if registry exists
   - If exists: Validates registry and suggests `sync`
   - If missing: Runs `sync` to generate from agent files
3. Reports status and suggests next steps

**Safe to run multiple times:** Yes, idempotent operation.

### Validate Command

**Purpose:** Verify registry structure against JSON schema.

**Usage:** `node scripts/agent-registry.js validate`

**When to use:**
- After manual registry edits
- Before committing registry changes
- Diagnosing validation errors
- In CI/CD pipelines

**What it does:**
1. Loads schema and registry
2. Validates registry using `ajv`
3. Reports validation status and agent counts
4. Shows detailed errors if validation fails

**Exit codes:**
- 0: Registry is valid
- 1: Validation failed or files missing

### Schema Requirements

**Write operations require schema:**
- sync, create, link, warn, archive, generate-docs

**Read operations work without schema:**
- check (requires registry only)
- validate (reports error if schema missing)
- init (bootstraps schema if missing)

**If schema is missing during write operation:**

```bash
✗ Schema validation unavailable
ℹ The registry schema could not be loaded. This is required for write operations.

ℹ To fix this:
  1. Check that repo_state/agent-registry-schema.json exists
  2. Run: node scripts/agent-registry.js validate --schema
  3. If schema is missing, restore it from version control
```

## Generate-Docs Command

The `generate-docs` command auto-generates documentation blocks in two files from the agent registry. It uses **sentinel markers** to identify which sections to update while preserving all manual content.

### Auto-Generated Documentation Blocks

**In `docs/agent-system-audit.md` (3 blocks):**
1. `agent-count` - Total agent count with breakdown by type
2. `agent-catalog` - Full agent table (ID, name, type, category, description)
3. `automation-candidates` - List of agents eligible for Cloud Agent automation

**In `docs/claude-cursor-agent-alignment.md` (2 blocks):**
1. `agent-mapping` - Claude ↔ Cloud Agent equivalency table
2. `registry-reference` - Link to registry as single source of truth

### Sentinel Marker System

Each auto-generated block is wrapped in sentinel markers:

```markdown
<!-- AUTO-GENERATED:block-name:START -->
...generated content...
<!-- AUTO-GENERATED:block-name:END -->
```

**Rules:**
- Content between markers is **completely replaced** on each run
- Content outside markers is **never modified**
- Missing markers = no update (command skips that block)
- Unpaired markers (START without END or vice versa) = error with helpful message
- Duplicate markers in same file = error

### Idempotent Operation Guarantee

The `generate-docs` command is **safe to run multiple times**:
- Generates identical output given identical registry state
- Never modifies manual content outside sentinel markers
- No side effects (doesn't modify registry, create files, etc.)
- Exit code 0 on success, 1 on error (empty registry, marker issues, file not found)

You can run it after every `sync` or agent change without risk.

### Example Output

```bash
$ node scripts/agent-registry.js generate-docs

Generating documentation blocks from registry...

✓ docs/agent-system-audit.md
  - agent-count (4 lines)
  - agent-catalog (20 lines)
  - automation-candidates (8 lines)

✓ docs/claude-cursor-agent-alignment.md
  - agent-mapping (12 lines)
  - registry-reference (3 lines)

Successfully generated 5 documentation blocks.
```

### Edge Cases

**Empty registry:**
```bash
$ node scripts/agent-registry.js generate-docs
[generate-docs] Error: No agents found in registry. Run 'sync' first.
```

**Missing markers:**
- Command skips blocks with missing markers (no error)
- Logs which blocks were skipped

**Unpaired markers:**
```bash
[generate-docs] Error: Found END marker for 'agent-count' without matching START marker in docs/agent-system-audit.md
```

## Running Tests

```bash
# Install dependencies (first time only)
cd scripts
npm install

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Registry Structure

The registry is located at `repo_state/agent-registry.json` and tracks:

- **Claude Code subagents** - Local agents in `.claude/agents/`
- **Cursor Cloud Agents** - Cloud-based automation agents in `.cursor/cloud-agents/`

### Schema

See `repo_state/agent-registry-schema.json` for the complete JSON schema.

**Required fields:**
- `id` - Unique identifier (kebab-case)
- `name` - Display name
- `type` - `claude` or `cloud`
- `filePath` - Relative path to agent definition
- `category` - Agent category
- `description` - Brief description

**Optional fields:**
- `tools` - Available tools (Claude agents)
- `model` - Model preference (Claude agents)
- `cloudAgentId` / `claudeAgentId` - Linkage between agents
- `automationCandidate` - Whether eligible for Cloud Agent automation
- `deprecated` - Deprecation status
- `trigger`, `schedule`, `webhookEvent` - Cloud Agent trigger config
- `lastRunAt`, `runCount`, `recentRuns` - Cloud Agent run tracking

## Automation Candidates

The sync command automatically marks these agents as `automationCandidate: true`:

1. **service-documentation** - Automated doc sync
2. **check-code-debt** - Scheduled technical debt reports
3. **check-accessibility** - PR-triggered accessibility audits
4. **check-modern-code** - Automated API modernization detection
5. **commit-changes** - Automated commit message generation
6. **code-review-expert** - Automated code review on PRs

Only agents that exist in `.claude/agents/` are marked.

## Error Handling

The sync command continues past invalid agents but reports all errors at the end. Common issues:

- **Missing frontmatter** - Agent file has no `---` delimited frontmatter
- **Missing name field** - Frontmatter doesn't include `name:` field
- **Invalid YAML** - Frontmatter is malformed

## Concurrency and Safety

⚠️ **Important:** The agent registry does not support concurrent modifications. Running multiple registry commands simultaneously can result in registry corruption.

**Safe Usage:**
- ✅ Run commands sequentially (wait for each to complete)
- ✅ Coordinate with team members before running registry modifications
- ❌ Do NOT run registry commands in parallel scripts/CI jobs
- ❌ Do NOT have multiple developers modify registry simultaneously

**Why this matters:**
Registry commands follow a read-modify-write pattern without file locking:
1. Command reads `agent-registry.json`
2. Command modifies registry data in memory
3. Command writes entire registry back to disk

If two commands overlap, the second write will overwrite the first command's changes.

**Example of what to avoid:**
```bash
# ❌ BAD: Parallel execution
node scripts/agent-registry.js create claude --name agent-a --category tools &
node scripts/agent-registry.js create claude --name agent-b --category tools &
wait  # One agent will be lost!

# ✅ GOOD: Sequential execution
node scripts/agent-registry.js create claude --name agent-a --category tools
node scripts/agent-registry.js create claude --name agent-b --category tools
```

**Impact:**
- **Solo developers:** Low risk (natural workflow is sequential)
- **Teams:** Medium risk (coordinate large changes via PR reviews)
- **CI/CD:** Medium risk (avoid parallel registry modification jobs)

**Future enhancement:** A file locking mechanism or timestamp-based conflict detection could be added if concurrent usage becomes necessary.

## Workflow

### Creating a new agent

```bash
# 1. Check for duplicates
node scripts/agent-registry.js check my-new-agent

# 2. Create the agent (file + registry entry)
node scripts/agent-registry.js create claude --name my-new-agent --category tools

# 3. Edit the generated file
vim .claude/agents/my-new-agent.md

# 4. Re-sync to update description from file
node scripts/agent-registry.js sync

# 5. Generate documentation (Phase 3)
node scripts/agent-registry.js generate-docs
```

### Creating a Cloud Agent

```bash
# 1. Check for duplicates
node scripts/agent-registry.js check doc-sync-bot

# 2. Create Cloud Agent config
node scripts/agent-registry.js create cloud --name doc-sync-bot --trigger scheduled

# 3. Edit the generated config
vim .cursor/cloud-agents/doc-sync-bot.json

# 4. Link to Claude agent (optional)
node scripts/agent-registry.js link service-documentation doc-sync-bot
```

### Deprecating and archiving an agent

```bash
# 1. Start deprecation (30-day grace period)
node scripts/agent-registry.js warn old-agent --reason "Replaced by new-agent"
# Sets deprecated_until to 30 days from now
# Agent still works but shows warnings

# 2. Wait for grace period to expire (30 days)
# Users have time to migrate to replacement

# 3. Archive the agent (after deprecated_until date)
node scripts/agent-registry.js archive old-agent
# Validates grace period has passed
# Removes from registry
# Moves file to .claude/agents/archive/old-agent-deprecated-YYYY-MM-DD.md

# 4. Update documentation
node scripts/agent-registry.js generate-docs
```

**Note:** The `deprecate` command is still supported but deprecated. It's now an alias for `warn`.

## Development

### Adding new commands

1. Add command function in `agent-registry.js` (e.g., `cmdMyCommand()`)
2. Add case in the main switch statement
3. Add tests in `__tests__/agent-registry.test.js`
4. Update this README

### Running tests during development

```bash
cd scripts
npm run test:watch
```

Tests use Jest and cover:
- Valid agent parsing
- Invalid frontmatter handling
- Duplicate detection
- Partial sync failures
- All CLI commands
- Schema validation

## Related Files

- `repo_state/agent-registry.json` - The registry database
- `repo_state/agent-registry-schema.json` - JSON schema for validation
- `.claude/agents/` - Claude agent definitions
- `.cursor/cloud-agents/` - Cloud Agent configs
- `docs/agent-system-audit.md` - Agent documentation (auto-generated in Phase 3)
- `docs/claude-cursor-agent-alignment.md` - Agent alignment strategy

## Roadmap

- **Phase 1: Registry Foundation** ✓ (complete)
  - Registry file and schema
  - Management CLI with sync, check, create, link, deprecate commands
  - Unit tests (31/31 passing)
- **Phase 3: Documentation Automation** ✓ (complete)
  - `generate-docs` command with 5 block generators
  - Sentinel marker system for safe auto-generation
  - Auto-updates to agent-system-audit.md (3 blocks)
  - Auto-updates to claude-cursor-agent-alignment.md (2 blocks)
  - Idempotent operation with comprehensive tests
- **Phase 2: Cloud Agent Infrastructure** (next)
  - Create 6 Cloud Agent configs
  - Webhook setup documentation
  - GitHub Actions workflows (optional)
- **Phase 4: Lifecycle Management** (planned)
  - Enhanced duplicate detection (semantic similarity)
  - Agent usage analytics
  - Automated archival process

---

## Task Detection & Orchestration Scripts

The multi-agent orchestration system includes automated task detection and distribution scripts.

### Task Detection Watcher

**Script:** `watch-cursor-automation.js`

**Purpose:** Automatically detect new task files and feed them into the queue system.

**Usage:**
```bash
# Start watcher (foreground)
npm run watch-automation

# Start watcher (background with pm2)
pm2 start scripts/watch-cursor-automation.js --name task-watcher
pm2 save

# Check watcher status
npm run automation-status

# Stop watcher
pm2 stop task-watcher
```

**Features:**
- Monitors `sessions/tasks/` directory for new `.md` files
- Desktop notifications on task detection
- Logs to `sessions/tasks/.new-tasks.log`
- Excludes TEMPLATE.md, done/, indexes/, archive/
- Three log files in `.cursor/automation-logs/`:
  - `watch.log` - General watcher activity
  - `detection.log` - Task detection events
  - `errors.log` - Error messages and stack traces

**Environment:**
- **CLAUDE_PROJECT_DIR**: Project root (auto-detected if not set)

### Agent Orchestrator

**Script:** `agent-orchestrator.js`

**Purpose:** Distribute tasks across a pool of 3 Claude Code agents.

**Usage:**
```bash
# Start orchestrator (foreground)
npm run orchestrator

# Start orchestrator (background with pm2)
pm2 start scripts/agent-orchestrator.js --name orchestrator
pm2 save

# Check orchestrator status
npm run orchestrator-status

# Stop orchestrator
pm2 stop orchestrator
```

**Features:**
- 3-agent pool with concurrent execution
- Local (Claude CLI) and cloud (Cursor Cloud Agent API) modes
- Dual-queue routing (context vs implementation)
- Dependency resolution and topological sort
- Multi-factor priority scoring

**Environment Variables:**
- **AGENT_MODE**: `local` (Claude CLI, default) or `cloud` (Cursor Cloud Agent API)
- **CLAUDE_CMD**: Path to Claude CLI (default: `claude` in PATH)
- **CURSOR_API_TOKEN**: Required for cloud mode
- **GITHUB_REPO**: Required for cloud mode (e.g., `username/repo`)
- **GITHUB_REF**: Branch/tag for cloud mode (default: `main`)

### Task Queue Manager

**Script:** `task-queue-manager.js`

**Purpose:** Manage dual queues for context gathering and implementation.

**Usage:**
```bash
# View queue state
node scripts/task-queue-manager.js

# Manual queue operations (advanced)
node scripts/task-queue-manager.js --add <task-file>
node scripts/task-queue-manager.js --remove <task-file>
```

**Features:**
- Routes tasks based on `context_gathered` frontmatter flag
- Validates context manifest exists before implementation routing
- Priority scoring with multi-factor algorithm
- Dependency tracking and circular dependency detection

### Dependency Graph

**Script:** `dependency-graph.js`

**Purpose:** Visualize and validate task dependencies.

**Usage:**
```bash
# View dependency graph
node scripts/dependency-graph.js

# Check for circular dependencies
node scripts/dependency-graph.js --check-cycles
```

**Features:**
- Builds dependency graph from `depends_on` frontmatter fields
- Topological sort for execution order
- Circular dependency detection
- Visual ASCII graph output

### State Files

**`.new-tasks.log`** (`sessions/tasks/`)
- Task detection log (written by file watcher)
- One entry per new task file

**`.orchestrator-state.json`** (`sessions/tasks/`)
- Agent pool state (status, current task, completed count)
- Completed tasks set
- Last updated timestamp

**`.task-queues.json`** (`sessions/tasks/`)
- Context queue tasks
- Implementation queue tasks
- Processed tasks set
- Dependency graph data

### Documentation

- **Task Detection Guide**: `docs/task-detection-guide.md`
- **Orchestrator Config**: `scripts/ORCHESTRATOR_CONFIG.md`
- **Orchestrator Testing**: `scripts/ORCHESTRATOR_TESTING.md`
- **Operator Manual**: `docs/multi-agent-orchestration-operator-guide.md`
- **Framework Integration**: `CLAUDE.md` Section 7

### Integration with cc-sessions

The orchestration system respects cc-sessions framework rules:
- **Write Gating**: Agents only write during IMPLEMENT mode
- **DAIC Discipline**: Each agent follows DISCUSS → ALIGN → IMPLEMENT → CHECK
- **State Persistence**: Uses `sessions/sessions-state.json` for task resumption
- **LCMP Logging**: Agent failures logged to `context/gotchas.md`
