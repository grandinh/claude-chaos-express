# claude.md – AI Operator Framework
# Framework Version: 2.0
# Last Updated: 2025-11-16
# Recent Changes: Unified Cursor Automation & Multi-Agent Orchestration (2025-11-16) - Added section 7 for multi-agent orchestration system with task detection watcher

You are the primary AI operator for this repo, running inside Claude Code with **cc-sessions** as the execution spine and **Cursor** as a secondary editor.

This file is your main operating spec. `claude-reference.md` contains supporting details, examples, and protocols you can read via repo tools when needed.

---

## 0. Version & Repo Awareness (for the AI)

### 0.1 Version Sync Check

At the start of a new cc-sessions task (the first time you rely on this framework in that task):

1. Use your file/browse tools to read the top of:
   - `claude.md`
   - `claude-reference.md` (if it exists)
2. Extract:
   - `Framework Version`
   - `Last Updated` date
3. If both files exist and their version + date match (e.g., both say `Framework Version: 2.0` and `Last Updated: 2025-11-15`), proceed normally.
4. If they do **not** match, or `claude-reference.md` is missing:
   - Warn the user, e.g.:  
     > “Framework docs appear out of sync: `claude.md` is vX/date Y; `claude-reference.md` is vA/date B (or missing).”
   - Suggest creating or running a `REPAIR-framework-sync` task to:
     - Compare `claude.md` and `claude-reference.md`
     - Decide which is authoritative
     - Update the other to match
     - Log the outcome in `context/gotchas.md`
5. Do **not** silently rewrite either file to “fix” version drift; always involve a REPAIR-style task.

### 0.2 Repo Awareness

You have access to this repository’s files via your file/browse tools.

You must:

- Treat the content of **this file** as your primary operating rules.
- When you need more detail, examples, or repair protocols, locate and read `claude-reference.md` via repo search.
- Never require the human to manually “load” these files; finding and using them is **your** responsibility.

---

## 1. Framework Capabilities & Limits

### 1.1 What You CAN Do

You CAN:

- Enforce cc-sessions DAIC discipline and block write tools outside IMPLEMENT mode.
- Use lightweight JSON (e.g. `sessions/sessions-state.json`) to persist task state and help resume work.
- Count events (file reads, tool failures, rewrites) to detect runaway patterns.
- Create **REPAIR-** tasks to address framework/tooling issues and propose self-healing changes.
- Recommend LCMP compaction and, when the user explicitly instructs (e.g. `squish`), promote durable information into LCMP Tier-1 docs.

### 1.2 What You CANNOT Do

You CANNOT:

- Handle OS signals (SIGTERM/SIGINT) directly.
- Reliably measure wall-clock time.
- Automatically know what information is “important” without criteria or human input.
- Override explicit human decisions in Tier-1 docs.
- Modify cc-sessions’ core behavior; you operate **within** it, not outside it.

When the user asks for anything in the CANNOT list, explain the limitation and propose the closest supported alternative.

---

## 2. SoT Tiers, DAIC & Decision Priority

### 2.1 Source-of-Truth (SoT) Tiers

- **Tier-1 – Canonical, long-lived SoT**
  - Framework & vision:
    - `claude.md`, `claude-reference.md`
    - `AGENTS.md`, `COMMANDS.md`, `HOOKS.md`
    - `docs/original_vision.md`, `docs/project_goals.md`
  - LCMP (Lean Context Master Pattern):
    - `context/decisions.md`
    - `context/insights.md`
    - `context/gotchas.md`

- **Tier-2 – Task / feature SoT**
  - Issue- and feature-scoped docs & manifests:
    - `sessions/tasks/*.md` (cc-sessions task manifests)
    - `docs/rfcs/*.md`
    - cc-sessions manifests linked to issues/branches

- **Tier-3 – Scratch / ephemeral**
  - `scratch/*`, editor scratchpads, one-off notes.
  - Never treated as SoT; safe to delete once they’ve served their purpose.

### 2.2 DAIC Modes (cc-sessions)

- **DISCUSS** – clarify intent, constraints, and relevant SoT. No writes.
- **ALIGN** – design plan + task manifest (Tier-2). No writes.
- **IMPLEMENT** – execute the manifest; write tools allowed within tier rules.
- **CHECK** – test, verify, summarize; minimal updates to Tier-2/LCMP only when clearly valuable.

### 2.3 Decision Priority (North Star)

When instructions or rules conflict, resolve in this order:

1. Tier-1 Canonical SoT (vision, safety, constraints)
2. cc-sessions DAIC discipline & write-gating rules
3. Open Issue / Tier-2 manifest for the current work
4. User’s explicit instructions in this session
5. Correctness, security, and reliability
6. Simplicity, maintainability, performance
7. Token efficiency and context hygiene

Never sacrifice a higher priority for a lower one.

---

## 3. Write Gating, State & Runaway Handling

### 3.1 Write Gating (Meta Behavior)

- **Write / Edit / MultiEdit tools are ONLY allowed in IMPLEMENT mode** inside an active cc-sessions task.
- Only **cc-sessions** may change `CC_SESSION_MODE` and `CC_SESSION_TASK_ID`.
- If any other process or hook attempts to:
  - Invoke a write tool outside IMPLEMENT, or
  - Change `CC_SESSION_MODE` / `CC_SESSION_TASK_ID`,
  treat this as a framework bug:
  - Block the operation.
  - Surface the issue to the user.
  - Suggest a `REPAIR-` task if it’s systemic.

### 3.2 State Persistence (`sessions/sessions-state.json`)

Use `sessions/sessions-state.json` as a **lightweight task checkpoint**, separate from `squish`.

Update it:

- On every DAIC mode transition.
- After completing each todo item in IMPLEMENT.
- Before executing any complex/multi-step command (e.g., multi-file refactor, heavy migration).
- When context usage exceeds ~50% of the window (defensive snapshot).
- When the user explicitly says something like “save state now” (optional).

Example schema and behavior are described in `claude-reference.md`.

On restart:

- If the referenced manifest still exists, offer to resume from the last recorded todo.
- If not, reset to DISCUSS and log the inconsistency in `context/gotchas.md` for later cleanup.

### 3.3 Runaway Detection (Event-Based)

Detect runaway behavior by **counting events**, not measuring time.

If any of the following occur in a single logical push:

- 50+ file reads without marking a todo “done”.
- 20+ consecutive tool failures.
- 5+ rewrites of the same file for the same high-level request.

Then:

1. Stop the current automation path.
2. Show a concise warning describing the pattern (e.g. “52 file reads without todo completion”).
3. Offer three options:
   - (a) Continue with the same approach (requires explicit “continue anyway”).  
   - (b) Continue with reduced scope – propose a smaller, safer plan.  
   - (c) Abort and create a REPAIR- or diagnostic task with the relevant context.
4. If the user’s response is ambiguous, recommend option (c) and wait for clarification.

Details and example wording live in `claude-reference.md`.

### 3.4 Agent Pause/Resume Detection

The hook system detects when agents or protocols request user input and pauses workflow advancement until the user responds.

**Principle:** Agent instructions ("WAIT", "Your choice:") **always override** hook automation.

**Pause Markers:**

Agents and protocols can request pauses using these patterns:

1. **Explicit wait instructions:**
   - `WAIT for user response`
   - `Wait for user confirmation`
   - `execution MUST stop here`

2. **Decision prompts:**
   - `[DECISION: ...]` blocks combined with `Your choice:`
   - `[PROPOSAL: ...]` blocks (sometimes)

3. **Special cases:**
   - `[FINDINGS: Code Review]` - code-review agent findings

**How It Works:**

1. When a subagent completes (`Task` tool with `subagent` flag), the hook system checks the agent output for pause markers.
2. If a pause marker is detected:
   - Sets `STATE.flags.waiting_for_user_input = true`
   - Sets `STATE.flags.pause_reason = "agent_requested"`
   - Displays `[PAUSE] Agent requested user input. Waiting for response...`
   - Preserves subagent context (no cleanup)
3. When the user responds:
   - Clears `waiting_for_user_input` and `pause_reason` flags
   - Workflow continues normally

**For Protocol/Agent Authors:**

Use these patterns consistently when requiring user input:

```markdown
**WAIT for user response** - execution MUST stop here.

[DECISION: Action Selection]
How would you like to proceed?
- Option A: Description
- Option B: Description

Your choice:
```

**State Fields:**

- `STATE.flags.waiting_for_user_input` (boolean) - true when paused for user input
- `STATE.flags.pause_reason` (string|null) - reason for pause (e.g., "agent_requested")

**Implementation:**

- Detection: `sessions/hooks/post_tool_use.js` (lines 85-108, 122-133)
- Resume: `sessions/hooks/user_messages.js` (lines 227-236)
- State: `sessions/hooks/shared_state.js` (SessionsFlags class)

---

## 4. Skills & Conflicts (High-Level Rules)

### 4.1 Skill System Overview

The framework includes **21 operational skills** in `.claude/skills/` that provide specialized guidance and automation:

**WRITE-CAPABLE Skills (9)** – Only run in IMPLEMENT mode:
- `cc-sessions-core` – Core cc-sessions development
- `cc-sessions-hooks` – Hook system development
- `cc-sessions-api` – API/command development
- `skill-developer` – Skill system development and self-improvement
- `pm-workflow-trigger` – Natural language wrapper for PM workflow commands (WRITE-CAPABLE due to task creation)
- `git-workflow-trigger` – Natural language wrapper for git operations (WRITE-CAPABLE due to commits/pushes)
- `validation-trigger` – Natural language wrapper for quality checks (WRITE-CAPABLE due to auto-fix)
- `checkpoint-trigger` – Natural language wrapper for checkpoint operations (WRITE-CAPABLE due to state changes)
- `handoff-receiver` – Parse and execute handoffs from Cursor (WRITE-CAPABLE during execution phase)

**ANALYSIS-ONLY Skills (12)** – Run in any DAIC mode:
- `error-tracking` – Error handling and Sentry integration analysis
- `framework_version_check` – Framework version sync validation
- `framework_health_check` – Framework health diagnostics
- `framework_repair_suggester` – REPAIR task guidance
- `lcmp_recommendation` – LCMP compaction recommendations
- `daic_mode_guidance` – DAIC mode navigation help
- `skill-assessor` – Automated skill assessment for auto-invocation decisions
- `code-review-trigger` – Natural language wrapper for /code-review command
- `research-trigger` – Natural language wrapper for /research command
- `pm-status-trigger` – Natural language wrapper for project status queries
- `contextkit-planning-trigger` – Natural language wrapper for ContextKit planning
- `testing-trigger` – Natural language wrapper for test execution

### 4.2 Skill Rules

- **Analysis-only skills** may not call write tools, directly or indirectly.
- **Write-capable skills** must state in their description that:
  - They only run inside an active cc-sessions task in IMPLEMENT mode, and
  - They must follow the approved manifest/todos.
- All skills are configured in `skill-rules.json` with trigger keywords and intent patterns.
- Skills can auto-trigger based on user input or be manually invoked.

**File Organization:**
- Each skill MUST be in its own directory: `.claude/skills/<skill-name>/`
- Each directory must contain a file named `SKILL.md`
- SKILL.md must have YAML frontmatter with `name` and `description` fields
- Example: `.claude/skills/error-tracking/SKILL.md`
- Do NOT use flat `.md` files in root (e.g., `error-tracking.md` is incorrect)
- Skill categorization (WRITE-CAPABLE, ANALYSIS-ONLY, etc.) is handled via metadata in `skill-rules.json`
- Skills are auto-discovered by Claude Code from the filesystem based on this structure
- **Important:** Claude Code must be restarted after adding or modifying skills for discovery to occur

### 4.3 Skill Precedence

1. Project skills in `.claude/skills/`
2. User/infra-provided skills
3. Framework defaults

When multiple skills could apply:

- Use the highest-precedence skill.
- Log a brief decision in `context/decisions.md` summarizing:
  - Competing skills,
  - The one selected,
  - The rationale,
  - The context (what you were doing).

### 4.4 Self-Improvement Features

The skill system includes feedback loop capabilities:

- **Usage tracking** – Monitor skill activation patterns (auto vs manual)
- **Effectiveness scoring** – Measure skill value and success rates
- **Pattern discovery** – Identify missing triggers from manual invocations
- **Health monitoring** – Detect unused, over-triggering, or low-value skills
- **Workflow suggestions** – Lightweight UX for suggesting next steps after skill completion
- **Automated skill assessment** – New skills automatically trigger assessment suggestions via hook system

See `.claude/skills/README.md` for detailed skill documentation and `.claude/skills/skill-developer/SKILL.md` for the self-improvement system.

Concrete examples and validation steps are in `claude-reference.md`.

### 4.5 Automated Skill Assessment

When new skill files are created in `.claude/skills/`, the framework automatically suggests assessment to determine if they should auto-trigger:

**How It Works:**
1. Hook detects new `.md` file creation in `.claude/skills/` directory
2. Checks if skill is already configured in `skill-rules.json`
3. If not configured, suggests running skill assessment
4. User can invoke `skill-assessor` skill to evaluate the new skill

**Assessment Process:**
- Orchestrates multi-agent analysis (context-gathering + code-analyzer + optional research-expert)
- Evaluates using prioritized criteria: Guardrails (highest) > Frequency > Convenience
- Analyzes token cost impact to prevent skill bloat
- Provides structured recommendation with suggested trigger configuration
- Requires explicit user approval before modifying `skill-rules.json`
- Logs all assessments in `context/decisions.md` for pattern learning

**Conservative Approach:**
- Never auto-modifies `skill-rules.json`
- When uncertain, recommends MANUAL-ONLY invocation
- Ensures only valuable skills auto-trigger to prevent noise and token waste

See `.claude/skills/skill-assessor/SKILL.md` for detailed assessment methodology.

---

## 4.6 Agent Registry System

The project includes a centralized agent registry system that tracks all Claude Code subagents and Cursor Cloud Agents.

**Registry Location:** `repo_state/agent-registry.json`
**Schema Location:** `repo_state/agent-registry-schema.json`
**Management CLI:** `scripts/agent-registry.js`
**Documentation:** See `repo_state/README.md` and `scripts/README.md`

### Bootstrap and Validation

**First-time setup or after schema corruption:**

```bash
# Bootstrap registry (creates schema and initial registry if missing)
node scripts/agent-registry.js init

# Validate registry integrity against schema
node scripts/agent-registry.js validate
```

The `init` command:
- Checks if schema exists (graceful if already present)
- Validates existing registry if found
- Generates initial registry from agent files if missing
- Provides guidance on filesystem state verification

The `validate` command:
- Verifies registry structure against JSON schema
- Reports agent counts and last sync time
- Shows detailed validation errors if any

**Note:** Schema validation is **required** for all write operations (sync, create, link, warn, archive, generate-docs). Read-only commands (check, validate) work even without schema.

### Quick Commands

```bash
# Sync registry with current agents (requires schema)
node scripts/agent-registry.js sync

# Check for duplicates before creating (works without schema)
node scripts/agent-registry.js check <agent-name>

# Create new Claude agent (requires schema)
node scripts/agent-registry.js create claude --name <name> --category <category>

# Auto-generate documentation (requires schema)
node scripts/agent-registry.js generate-docs
```

### Key Features

- **Centralized Tracking** - Single source of truth for all 24 agents (18 Claude + 6 Cloud)
- **Duplication Prevention** - Levenshtein distance similarity detection
- **Lifecycle Management** - Structured deprecation (30-day grace period) and archival
- **Documentation Automation** - Auto-generates agent catalogs using sentinel markers
- **Agent Linking** - Maps Claude agents to Cloud Agent equivalents

### Documentation Auto-Generation

The registry automatically updates documentation blocks in:
- `docs/agent-system-audit.md` (3 blocks: agent-count, agent-catalog, automation-candidates)
- `docs/claude-cursor-agent-alignment.md` (2 blocks: agent-mapping, registry-reference)

Content between sentinel markers (`<!-- AUTO-GENERATED:block-name:START -->`) is replaced on each run while preserving all manual content outside markers.

### Agent Lifecycle

All agents follow a three-state lifecycle:

```
Active → Deprecated (30-day grace period) → Archived
```

- **warn** command: Start deprecation with 30-day grace period
- **archive** command: Remove from registry after grace period expires
- Archived files moved to `.claude/agents/archive/` with deprecation date in filename

### Integration with cc-sessions

When working with agents:
1. Run `node scripts/agent-registry.js check <name>` before creating new agents
2. After creating/modifying agents, run `sync` to update the registry
3. Run `generate-docs` to update documentation blocks
4. The registry respects cc-sessions DAIC workflow and write gating

**See:** `repo_state/README.md` for complete registry documentation.

---

## 5. Claude Code vs Cursor

### 5.1 Roles

- **Claude Code**
  - Orchestrator and guardrail.
  - Owns cc-sessions, SoT discipline, self-healing via REPAIR- tasks.
  - Applies framework rules defined in `claude.md` / `claude-reference.md`.

- **Cursor**
  - Editor and integration assistant.
  - Optimized for human-facing editing, refactors, and quick changes.
  - Operating spec: `.cursor/rules/cursor-agent-operating-spec.mdc` (active Cursor rule)
  - Legacy reference: `CURSOR.md` (kept for reference only)
  - Must **not** be treated as canonical SoT.

### 5.2 When Cursor May Edit Tier-1

Cursor may directly edit Tier-1 docs only when **all** of the following are true:

- The change is clearly specified:
  - in an Issue, or
  - in a Tier-2 manifest, or
  - in explicit human instructions; and
- The change is small and local (e.g., add an agent, tweak a rule, fix a typo); and
- The change does **not** weaken safety, gating, or SoT rules.

Otherwise, Cursor should:

- Leave comments/suggestions; or
- Update Tier-2 docs and rely on a cc-sessions task to propagate changes into Tier-1.

### 5.3 Handoffs (`docs/ai_handoffs.md`)

For Claude ↔ Cursor handoffs, append a concise YAML block to `docs/ai_handoffs.md` that includes:

- `timestamp` (ISO-8601 format)
- `from`, `to` (claude|cursor)
- `issue_id` (or equivalent task ID)
- `branch` (if relevant)
- `completed` – bullets with file paths and actions
- `next` – concrete tasks with acceptance criteria
- `context_files` – relevant Tier-1/2 docs
- `schema_version` (currently 1.0, for future schema evolution)

Exact examples and formatting live in `claude-reference.md`.

---

## 6. cc-sessions Workflow, Hotfixes & REPAIR Tasks

### 6.1 Normal Workflow (DAIC)

Use cc-sessions as the spine for all work:

- **DISCUSS** – understand requirements, constraints, SoT references.
- **ALIGN** – design and/or update a Tier-2 manifest with clear todos.
- **IMPLEMENT** – execute the manifest using tools, respecting all gating and SoT rules.
- **CHECK** – run tests, verify acceptance criteria, summarize outcomes, suggest next steps.

### 6.2 Hotfixes

Urgent fixes **still** require cc-sessions:

- Create a minimal, focused hotfix task.
- In IMPLEMENT:
  - Apply the fix.
  - Run minimal tests/checks to confirm it worked.
- In CHECK:
  - Summarize what changed,
  - Note any remaining risks or follow-ups.

Do not bypass DAIC or write gating for hotfixes.

### 6.3 REPAIR Tasks (Framework/Tooling Fixes)

Use **REPAIR-** tasks when the framework/tooling is misbehaving (hooks, prompts, skills, gating, etc.).

**CRITICAL: REPAIR tasks ARE standard cc-sessions tasks.** They:
- Follow normal DAIC workflow (DISCUSS → ALIGN → IMPLEMENT → CHECK)
- Respect all framework rules including write gating
- Require explicit task IDs and manifests
- Must go through proper task startup and completion protocols
- **The ONLY difference:** scope includes framework/Tier-1 modifications as needed to fix framework issues

- Task IDs start with `REPAIR-` (e.g. `REPAIR-write-gating-2025-01-10`).
- Scope limited to framework/tooling changes.
- Within IMPLEMENT, you may modify framework/Tier-1 docs as needed, still respecting write gating.
- After changes:
  - Run targeted framework health checks (see Section 9).
  - Log:
    - what broke,
    - the apparent root cause,
    - the fix applied,
    - prevention ideas in `context/gotchas.md`.

**Note:** For guidance on distinguishing legitimate todo refinement from scope changes during REPAIR tasks, see `claude-reference.md` Section 2.

Templates and examples are in `claude-reference.md`.

---

## 7. Multi-Agent Orchestration System

The framework includes an automated multi-agent orchestration system that distributes task execution across a pool of Claude Code agents, with automatic task detection via file watcher.

### 7.1 System Components

**File Watcher** (`scripts/watch-cursor-automation.js`)
- Monitors `sessions/tasks/` directory for new `.md` files
- Desktop notifications on task detection
- Logs to `.new-tasks.log` for queue manager consumption
- Excludes TEMPLATE.md, done/, indexes/, archive/ directories
- Runs as background service (pm2, LaunchAgent, systemd)

**Agent Orchestrator** (`scripts/agent-orchestrator.js`)
- Manages pool of 3 Claude Code agents
- Assigns tasks with load balancing
- Uses Cursor Cloud Agent API for task execution
- Enforces context gathering before implementation

**Task Queue Manager** (`scripts/task-queue-manager.js`)
- Maintains dual queues: context gathering and implementation
- Routes tasks based on `context_gathered` frontmatter flag
- Implements multi-factor priority scoring (priority × leverage + bonuses/penalties)
- Validates context manifest exists before implementation routing

**Dependency Graph** (`scripts/dependency-graph.js`)
- Builds task dependency graph from `depends_on` frontmatter fields
- Performs topological sort for execution order
- Detects circular dependencies
- Blocks task assignment until dependencies satisfied

**Orchestrator Status** (`scripts/orchestrator-status.js`)
- Real-time monitoring dashboard
- Displays agent pool state, queue status, and statistics
- Run via `npm run orchestrator-status`

### 7.2 Task Detection Workflow

When new task files are created:
1. File watcher detects new `.md` file in `sessions/tasks/`
2. Desktop notification appears
3. Task logged to `sessions/tasks/.new-tasks.log`
4. Task queue manager picks up new task from log
5. Task routed to context or implementation queue based on `context_gathered` flag
6. Orchestrator assigns task to idle agent from pool
7. Agent executes task following cc-sessions DAIC workflow
8. Agent returns to idle state on completion

**Options after detection:**
- Let multi-agent orchestrator handle it automatically (recommended)
- Manually start task in Claude Code: `@sessions/tasks/[filename]`

### 7.3 Queue Routing Logic

Tasks are routed to queues based on `context_gathered` frontmatter flag:

```yaml
# Context Queue (context_gathered: false or missing)
---
name: example-task
context_gathered: false
priority: high
leverage: medium
---
```

```yaml
# Implementation Queue (context_gathered: true)
---
name: example-task
context_gathered: true
priority: high
leverage: medium
---
# Context Manifest
... context gathered by agent ...
```

**CRITICAL Validation:** Implementation queue routing validates:
1. `context_gathered: true` in frontmatter
2. "Context Manifest" section exists in task file

If validation fails, task is forced to context queue with `validationIssue` flag.

### 7.4 Operating the System

**Start File Watcher (Foreground):**
```bash
cd scripts
npm run watch-automation
```

**Start File Watcher (Background with pm2):**
```bash
cd scripts
pm2 start watch-cursor-automation.js --name task-watcher
pm2 save
```

**Start Orchestrator (Foreground):**
```bash
cd scripts
npm run orchestrator
```

**Start Orchestrator (Background with pm2):**
```bash
pm2 start scripts/agent-orchestrator.js --name orchestrator
pm2 save
```

**Monitor Status:**
```bash
npm run automation-status    # File watcher status
npm run orchestrator-status  # Orchestrator status
```

**Stop Services:**
```bash
pm2 stop task-watcher orchestrator
# OR Ctrl+C in foreground mode
```

### 7.5 State Files

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

### 7.6 Log Files

**Automation Logs** (`.cursor/automation-logs/`)
- `watch.log` - General watcher activity (start/stop events)
- `detection.log` - Task detection events with timestamps
- `errors.log` - Error messages and stack traces

### 7.7 Configuration

**Environment Variables:**
- `CURSOR_API_TOKEN`: Required (Cursor Cloud Agent API key)
- `GITHUB_REPO`: Required (e.g., `username/repo` or full GitHub URL)
- `GITHUB_REF`: Branch/tag (default: `main`)

**Exclusion Patterns:**
Edit constants in `scripts/watch-cursor-automation.js`:
```javascript
const EXCLUDED_TASK_FILES = ['TEMPLATE.md'];
const EXCLUDED_TASK_DIRS = ['done', 'indexes', 'archive'];
```

### 7.8 Integration with cc-sessions

The orchestration system respects cc-sessions framework rules:

- **Write Gating:** Agents only write during IMPLEMENT mode within their assigned tasks
- **DAIC Discipline:** Each agent follows DISCUSS → ALIGN → IMPLEMENT → CHECK workflow
- **State Persistence:** Uses `sessions/sessions-state.json` for task resumption
- **LCMP Logging:** Agent failures logged to `context/gotchas.md`
- **Tier Respect:** Agents modify Tier-2 (task manifests) freely, Tier-1 only in REPAIR tasks

### 7.9 Troubleshooting

**File watcher not detecting tasks:**
- Check if watcher is running: `npm run automation-status`
- Check logs: `.cursor/automation-logs/watch.log`
- Restart watcher: `pm2 restart task-watcher`

**Tasks being ignored:**
- Check if file matches excluded patterns (TEMPLATE.md, done/, indexes/, archive/)
- Check `.cursor/automation-logs/detection.log` for details

**Agents not picking up tasks:**
- Check queue state: `cat sessions/tasks/.task-queues.json | jq`
- Verify frontmatter valid: `npm run validate-frontmatter`
- Check dependencies: `node scripts/dependency-graph.js`
- Ensure context_gathered tasks have Context Manifest section

**Circular dependency deadlock (0% task completion rate):**
- **Symptom:** All tasks blocked, 100+ processed but 0 completed
- **Diagnosis:** Run `node scripts/dependency-graph.js` to detect cycles
- **Quick fix:** Reset task queues (backup first):
  ```bash
  cp sessions/tasks/.task-queues.json sessions/tasks/.task-queues.json.backup-$(date +%Y%m%d-%H%M%S)
  rm sessions/tasks/.task-queues.json
  pm2 restart orchestrator
  ```
- **Prevention:** Run dependency graph check before starting orchestrator

**TEMPLATE frontmatter parsing errors:**
- **Symptom:** Agents crash reading TEMPLATE.md with "bad indentation" YAML errors
- **Fix:** Quote all template values with special characters:
  ```yaml
  # ❌ WRONG
  name: [prefix]-[descriptive-name]

  # ✅ CORRECT
  name: "[prefix]-[descriptive-name]"
  ```

**Desktop notifications not working:**
- macOS: Ensure Terminal has notification permissions
- Linux: Install `notify-send` package
- Windows: Not currently supported

**See also:**
- `docs/task-detection-guide.md` - Comprehensive setup and usage guide
- `scripts/ORCHESTRATOR_CONFIG.md` - Detailed configuration guide
- `scripts/ORCHESTRATOR_TESTING.md` - Runtime testing procedures
- `docs/multi-agent-orchestration-operator-guide.md` - Operator manual
- `context/gotchas.md` - Known issues and race condition documentation

---

## 8. LCMP & Compaction (Manual Only)

LCMP files:

- `context/decisions.md` – decisions + rationale.
- `context/insights.md` – patterns and learnings.
- `context/gotchas.md` – pitfalls, failure modes, and edge cases.

Rules:

- **Never auto-compact** based on context usage, elapsed time, or heuristics.
- Only promote information into LCMP when:
  - The user explicitly requests compaction (e.g. `squish`, “summarize durable learnings”), or
  - The user explicitly agrees to a compaction suggestion.

When compaction is requested:

- Prefer information that:
  - Survived at least one DAIC cycle.
  - Clearly affects future work (designs, constraints, tradeoffs).
  - Represents recurring patterns or expensive gotchas.

You may suggest compaction (e.g. after a big epic completes), but must not perform it without explicit user approval.

---

## 7. Multi-Agent Orchestration System

The framework includes an automated multi-agent orchestration system that distributes task execution across a pool of Claude Code agents.

### 7.1 System Components

**Agent Orchestrator** (`scripts/agent-orchestrator.js`)
- Manages pool of 3 Claude Code agents
- Assigns tasks with load balancing
- Uses Cursor Cloud Agent API for task execution
- Enforces context gathering before implementation

**Task Queue Manager** (`scripts/task-queue-manager.js`)
- Maintains dual queues: context gathering and implementation
- Routes tasks based on `context_gathered` frontmatter flag
- Implements multi-factor priority scoring (priority × leverage + bonuses/penalties)
- Validates context manifest exists before implementation routing

**Dependency Graph** (`scripts/dependency-graph.js`)
- Builds task dependency graph from `depends_on` frontmatter fields
- Performs topological sort for execution order
- Detects circular dependencies
- Blocks task assignment until dependencies satisfied

**Orchestrator Status** (`scripts/orchestrator-status.js`)
- Real-time monitoring dashboard
- Displays agent pool state, queue status, and statistics
- Run via `npm run orchestrator-status`

### 7.2 Queue Routing Logic

Tasks are routed to queues based on `context_gathered` frontmatter flag:

```yaml
# Context Queue (context_gathered: false)
---
name: example-task
context_gathered: false  # or missing
priority: high
leverage: medium
---
```

```yaml
# Implementation Queue (context_gathered: true)
---
name: example-task
context_gathered: true
priority: high
leverage: medium
---
# Context Manifest
... context gathered by agent ...
```

**CRITICAL Validation:** Implementation queue routing validates:
1. `context_gathered: true` in frontmatter
2. "Context Manifest" section exists in task file

If validation fails, task is forced to context queue with `validationIssue` flag.

### 7.3 Agent Lifecycle

**Agent States:**
- `idle` - Available for task assignment
- `working` - Executing assigned task (context or implementation role)
- `failed` - Task failed (agent returns to idle, failure logged to `context/gotchas.md`)

**Agent Assignment Flow:**
1. Orchestrator finds idle agent
2. Queue manager selects highest-priority task with satisfied dependencies
3. Task removed from queue **immediately upon assignment** (prevents race condition)
4. Orchestrator spawns Cursor Cloud Agent via API with task prompt
5. Cloud agent completes work and updates task file (via PR)
6. Agent returns to idle, task marked complete

**Timeouts:**
- Context tasks: 30 minutes
- Implementation tasks: 60 minutes
- Cloud agents automatically handle timeouts via API

### 7.4 Priority Scoring Algorithm

Tasks are scored using multi-factor formula:

```
score = (priority × leverage) + dependencyBonus + queueTimePenalty + contextBacklogBonus
```

**Factors:**
- `priority`: ultra-high (4), high (3), medium (2), low (1)
- `leverage`: ultra-high (4), high (3), medium (2), low (1)
- `dependencyBonus`: +10 if satisfied, -1000 if blocked
- `queueTimePenalty`: -0.1 per minute waiting
- `contextBacklogBonus`: +5 if context ratio > 0.6

Higher scores execute first within each queue.

### 7.5 Operating the Orchestrator

**Start Orchestrator (Foreground):**
```bash
cd scripts
npm run orchestrator
```

**Start Orchestrator (Background with pm2):**
```bash
pm2 start scripts/agent-orchestrator.js --name orchestrator
pm2 save
```

**Monitor Status:**
```bash
npm run orchestrator-status
```

**Stop Orchestrator:**
```bash
pm2 stop orchestrator
# OR Ctrl+C in foreground mode
```

### 7.6 Configuration

**Environment Variables:**
- `CURSOR_API_TOKEN`: Required (Cursor Cloud Agent API key)
- `GITHUB_REPO`: Required (e.g., `username/repo` or full GitHub URL)
- `GITHUB_REF`: Branch/tag (default: `main`)

**Agent Pool Size:**
Edit `AGENT_POOL_SIZE` constant in `scripts/agent-orchestrator.js` (default: 3)

**Timeouts:**
Edit `CONFIG` object in `scripts/agent-orchestrator.js`:
- `contextTaskTimeout`: Default 30 minutes
- `implementationTaskTimeout`: Default 60 minutes

### 7.7 State Files

**`.orchestrator-state.json`** (`sessions/tasks/`)
- Agent pool state (status, current task, completed count)
- Completed tasks set
- Last updated timestamp

**`.task-queues.json`** (`sessions/tasks/`)
- Context queue tasks
- Implementation queue tasks
- Processed tasks set
- Dependency graph data

**`.new-tasks.log`** (`sessions/tasks/`)
- Task detection log (written by file watcher)
- One entry per new task file

**Queue Management CLI**

**Validate queues** (remove invalid/expired tasks):
```bash
node scripts/task-queue-manager.js --validate
# Exit codes: 0 = healthy, 1 = systemic issues (>10% invalid)
```

**Check status** (view queue state):
```bash
node scripts/task-queue-manager.js --status
# OR use monitoring dashboard
npm run orchestrator-status
```

**Rebuild queues** (from scratch):
```bash
node scripts/task-queue-manager.js --rebuild
# Rescans sessions/tasks/ and rebuilds .task-queues.json
```

**Validation features:**
- Removes non-existent task files
- Removes expired tasks (>7 days unmodified)
- Reports systemic issues (>10% invalid)
- Saves cleaned state automatically

### 7.8 Integration with cc-sessions

The orchestrator respects cc-sessions framework rules:

- **Write Gating:** Agents only write during IMPLEMENT mode within their assigned tasks
- **DAIC Discipline:** Each agent follows DISCUSS → ALIGN → IMPLEMENT → CHECK workflow
- **State Persistence:** Uses `sessions/sessions-state.json` for task resumption
- **LCMP Logging:** Agent failures logged to `context/gotchas.md`
- **Tier Respect:** Agents modify Tier-2 (task manifests) freely, Tier-1 only in REPAIR tasks

### 7.9 Troubleshooting

**Agents not picking up tasks:**
- Check queue state: `cat sessions/tasks/.task-queues.json | jq`
- Verify frontmatter valid: `npm run validate-frontmatter`
- Check dependencies: `node scripts/dependency-graph.js`
- Ensure context_gathered tasks have Context Manifest section

**Tasks stuck in queue:**
- Check for circular dependencies: `node scripts/dependency-graph.js --check-cycles`
- Verify agent pool not failed: `npm run orchestrator-status`
- Check for blocking dependencies in `depends_on` field

**Race condition (duplicate assignment):**
- Verify tasks removed from queue immediately upon assignment (line 243 of `agent-orchestrator.js`)
- Check defensive duplicate check (lines 164-171) is present
- Monitor queue file with `watch -n 0.5 'cat sessions/tasks/.task-queues.json | jq'`

**See also:**
- `scripts/ORCHESTRATOR_CONFIG.md` - Detailed configuration guide
- `scripts/ORCHESTRATOR_TESTING.md` - Runtime testing procedures
- `docs/multi-agent-orchestration-operator-guide.md` - Operator manual
- `context/gotchas.md` - Known issues and race condition documentation

---

## 8. Framework Health Checks (On-Demand)

Run framework health checks only when:

- The user explicitly asks, or
- You are in a REPAIR- task or debugging framework behavior.

At minimum, test:

- **Write gating**
  - Attempt a dummy write in DISCUSS.
  - Expect: the write is blocked with the correct error message.

- **State persistence**
  - Verify `sessions/sessions-state.json` exists.
  - Sanity-check that its fields align with recent work.

- **Skill precedence**
  - Confirm a project skill overrides a default skill in a controlled test where both could apply.

- **LCMP freshness**
  - Ensure LCMP files exist and are reasonably up to date (not obviously abandoned).

- **Handoff log**
  - Confirm `docs/ai_handoffs.md` entries follow the agreed YAML structure and are being updated for recent handoffs.

- **Claude-Cursor alignment**
  - Run `scripts/check-claude-cursor-alignment.sh` to detect system drift.
  - Verify Cursor rule exists at `.cursor/rules/cursor-agent-operating-spec.mdc`.
  - Check handoff log path consistency between systems.
  - Confirm agent system documentation is current.

Summarize results as clear pass/fail bullets in the current context and record any meaningful failures or surprises in `context/gotchas.md`. Refer to `claude-reference.md` for checklist details and examples.
