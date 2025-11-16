---
name: h-implement-ai-handoff-process
branch: feature/h-implement-ai-handoff-process
status: pending
created: 2025-11-15
priority: high
---

# Initialize AI Handoff Process

## Problem/Goal

Implement a lightweight handoff and shared-context layer between Cursor-based agents and Claude Code to enable structured collaboration without disrupting the existing cc-sessions framework.

Currently, there is no standardized mechanism for:
- Recording handoffs between AI agents (Cursor ↔ Claude)
- Tracking completed work and next steps across agent transitions
- Maintaining shared context about repo state, files changed, and work in progress
- Coordinating who owns git truth (Cursor) vs. execution (Claude)

This task creates the infrastructure for agent coordination following the principles defined in `claude.md` Section 5.3, with these key constraints:
- **Additive only**: Do not override existing framework configuration
- **Merge-friendly**: Adapt to existing schemas and paths rather than forcing migration
- **Conflict-aware**: Surface path/schema mismatches rather than auto-fixing
- **cc-sessions compliant**: Respect DAIC modes and write-gating rules

## Success Criteria

### Core Implementation

**1. File Structure & Path Resolution**
- [ ] **Single canonical log path established**
  - Detect if both `/logs/ai-handoffs.md` and `docs/ai_handoffs.md` exist
  - Prefer path defined in `claude.md` Section 5.3 or actual usage
  - Document path decision in task file
  - **No split logs or divergent files**
  - Migration plan documented if multiple paths found

- [ ] **Supporting documentation created/updated**
  - `docs/agent_bridge_protocol.md` created or safely extended
  - `docs/tiers_of_context.md` created or safely extended
  - All updates are additive (append/merge, not replace)
  - Existing semantics preserved

**2. Schema Alignment & Migration**
- [ ] **Canonical schema matches `claude.md` Section 5.3**
  - Fields: `timestamp`, `from`, `to`, `issue_id`, `branch`, `completed`, `next`, `context_files`
  - Optional: `repo_state` field documented as extension

- [ ] **Legacy entry handling strategy defined**
  - If existing entries use different schema (`from_agent`/`to_agent`/`needed`), document how to:
    - Read and update legacy entries safely
    - Apply migration plan (or keep dual-format with clear rules)
  - **No historical entries lost, truncated, or overwritten**

**3. End-to-End Behavioral Validation**
- [ ] **Scenario A: Cursor → Claude (RECEIVE handoff)**
  - Example YAML provided in task file or bridge docs
  - Shows Claude: parsing → validating → executing → updating `completed`
  - Concrete file paths and acceptance criteria

- [ ] **Scenario B: Claude → Cursor (SEND handoff)**
  - Example of Claude creating new handoff YAML
  - Shows populated `completed`, `needed`, `context_files` fields
  - Future agents can follow as contract

**4. SoT Precedence & Drift Handling**
- [ ] **Source of truth precedence documented**
  1. Root config (`claude.md` / framework config)
  2. Existing on-disk docs (actual files)
  3. This implementation spec

- [ ] **Drift scenarios documented with behavior**
  - Configured path ≠ actual log path → Surface conflict, propose options
  - Schema in `claude.md` ≠ on-disk schema → Surface conflict, propose migration
  - **Claude does NOT auto-fix; it surfaces and proposes**

**5. Integration with cc-sessions**
- [ ] **Handoff behavior integrated**
  - RECEIVE: parse → validate acceptance criteria → execute → update
  - SEND: create YAML → populate fields → append to log
  - Write-gating rules respected (handoff writes only in IMPLEMENT or explicit context)

**6. Idempotency & Safety**
- [ ] **Running task twice is safe**
  - No duplicate directories/files created
  - No duplicate example handoffs
  - No unexpected content wipes or reformatting

- [ ] **Minimal intrusion guarantee**
  - Additions clearly labeled
  - Existing semantics not overridden
  - Appends/merges only, not replacements

**7. Backward Compatibility & Migration Notes**
- [ ] **No silent breaking changes**
  - Any changes that could break existing workflows are documented in task file under "Breaking Changes / Migration Notes"
  - Each breaking change paired with "how to update" guidance

**8. Health-Check / Validation Hook**
- [ ] **Manual validation documented**
  - Script stub or command to validate handoff YAML blocks
  - Flags obvious issues:
    - Missing required fields (`from`, `to`, `completed`, `next`)
    - Invalid YAML syntax
    - Invalid `context_files` paths
  - Documented as "here's how to check correctness" even if not automated

**9. Framework Health Check Integration**
- [ ] **Version sync verified**
  - `claude.md` and `claude-reference.md` versions checked
  - Handoff log schema matches framework version

- [ ] **Framework health check guidelines updated** (if needed)
  - Add handoff log validation to Section 8 checklist in `claude.md`

### Sanity Check
**One-liner test:** "After this task, we have ONE canonical handoff log, a clear schema matching `claude.md`, concrete examples showing both directions of handoff, documented drift handling, and a way to validate correctness. Running the task again doesn't break anything, and existing workflows aren't silently broken."

## Context Manifest

### How the AI Handoff System Currently Works

The repository already has a **partially implemented AI handoff infrastructure** for coordination between Cursor (local editor agent) and Claude Code (terminal orchestrator). The system is documented in three existing files but has **schema mismatches** and **path conflicts** that this task must resolve.

**Current State - Existing Files:**

The handoff system has three core documentation files that already exist:
- `/Users/grandinharrison/Desktop/claude-code-projects/claude-chaos-express/docs/ai_handoffs.md` - The actual handoff log file with schema definition and empty entries section
- `/Users/grandinharrison/Desktop/claude-code-projects/claude-chaos-express/docs/agent_bridge_protocol.md` - Coordination protocol between Cursor and Claude
- `/Users/grandinharrison/Desktop/claude-code-projects/claude-chaos-express/docs/tiers_of_context.md` - File hierarchy and protection rules

**The Schema Conflict:**

There is a critical mismatch between what `claude.md` (the framework spec) defines versus what the actual `ai_handoffs.md` file implements:

**Framework Spec (`claude.md` Section 5.3):**
```yaml
timestamp: ISO-8601
from: claude|cursor           # Simple field name
to: claude|cursor             # Simple field name
issue_id: <GitHub Issue number or "none">
branch: <feature branch name>
completed:
  - <completed item with file paths>
next:                         # Called "next" in framework
  - <specific tasks for receiving agent>
  - <with clear acceptance criteria>
context_files:
  - <paths to relevant Tier-1/2 docs>
```

**Actual Implementation (`docs/ai_handoffs.md`):**
```yaml
timestamp: ISO-8601
from_agent: claude|cursor     # Different field name (from_agent vs from)
to_agent: claude|cursor       # Different field name (to_agent vs to)
issue_id: <GitHub Issue number or "none">
branch: <current branch>
repo_state:                   # Additional field not in framework spec
  branch: <branch>
  last_commit: <hash>
  dirty_files: [...]
  changed_files: [...]
completed:
  - <completed task with file paths>
needed:                       # Different field name (needed vs next)
  - <specific next actions with acceptance criteria>
context_files:
  - <paths to Tier-2 docs>
```

**The Path Conflict:**

There is a path mismatch between framework specification and actual implementation:
- **Framework Location:** `claude.md` Section 5.3 specifies `/logs/ai-handoffs.md` as the canonical path
- **Actual Location:** The file exists at `docs/ai_handoffs.md` (note: different directory, different filename casing)
- **Search Results:** No `/logs/` directory exists in the repository at all

**Current Framework Architecture - cc-sessions:**

The AI operator framework uses **cc-sessions** as the execution spine with strict DAIC (Discuss-Align-Implement-Check) workflow enforcement:

1. **DAIC Modes:**
   - `DISCUSS` - Clarify intent, no writes allowed
   - `ALIGN` - Design plan, create manifests, no writes
   - `IMPLEMENT` - Execute with write tools allowed
   - `CHECK` - Test, verify, minimal updates

2. **Write Gating Enforcement:**
   - Implemented in `sessions/hooks/sessions_enforce.js` (554 lines)
   - Blocks Write/Edit/MultiEdit tools outside IMPLEMENT mode
   - Validates Bash commands for read-only vs write operations
   - Enforces git branch consistency with task requirements
   - Has extensive command categorization (READONLY_FIRST set with 100+ commands, WRITE_FIRST set with 50+ commands)

3. **State Persistence:**
   - Session state stored in `sessions/sessions-state.json`
   - Includes: mode, current_task, todos, flags, metadata
   - State managed via `sessions/hooks/shared_state.js`
   - Protected from direct modification - only updateable through TodoWrite tool and approved commands

4. **Post-Tool Execution:**
   - Handled by `sessions/hooks/post_tool_use.js` (247 lines)
   - Auto-returns to discussion mode when todos complete
   - Cleans up subagent context after Task tool completion
   - Provides directory navigation feedback after cd commands

**Source of Truth Tiers:**

The framework defines a strict 3-tier documentation hierarchy (from `claude.md` Section 2.1 and `docs/tiers_of_context.md`):

**Tier-0 (Protected Framework Core) - Read-Only Unless REPAIR Task:**
- `CLAUDE.md` (Framework Version: 2.0, Last Updated: 2025-11-15)
- `claude-reference.md` (Framework Version: 2.0, Last Updated: 2025-11-15)
- `CURSOR.md` (Cursor agent operating spec)
- `.claude/AGENTS.md`, `.claude/METASTRATEGY.md` (if present)
- `sessions/CLAUDE.sessions.md`

**Tier-1 (Project Intent) - Careful Edits Only:**
- `docs/original_vision.md`, `docs/project_goals.md`
- `Context/Features/*.md`
- LCMP files: `Context/decisions.md`, `Context/insights.md`, `Context/gotchas.md`, `Context/progress.md`

**Tier-2 (Operational Context) - Safe for Agent Read/Write:**
- `docs/ai_handoffs.md` ← THE HANDOFF LOG IS TIER-2
- `docs/agent_bridge_protocol.md`
- `docs/tiers_of_context.md`
- `docs/**/*.md` (task-specific docs)
- `sessions/tasks/**/*.md` (cc-sessions manifests)
- `repo_state/metadata.json`

**Tier-3 (Scratch/Temporary) - Fully Mutable:**
- `scratch/**`, `notes/**`, `tmp/**`

**Critical Insight:** The handoff log is **Tier-2**, meaning both agents can safely read/write it as part of normal workflows without requiring REPAIR tasks or special permissions.

**Existing Agent Bridge Protocol:**

The `docs/agent_bridge_protocol.md` file already defines coordination rules:

**Cursor Responsibilities:**
- Maintain `/repo_state/metadata.json` before ANY handoff
- Auto-create missing infrastructure files using templates
- Always update `ai_handoffs.md` with structured YAML entries
- Enforce handoff completeness (never partial or ambiguous)
- Never modify Tier-0 files unless directly instructed
- Treat Cursor as ground truth for filesystem state

**Claude Code Responsibilities:**
- Read `/repo_state/metadata.json` at task start
- Validate repo state matches expectations before writing
- Append completion entries to `ai_handoffs.md` after work
- Respect file tier protections
- Coordinate via structured handoff protocol

**Repo State Mechanism:**

The `repo_state/metadata.json` file exists and contains:
```json
{
  "repo": "https://github.com/grandinh/claude-chaos-express.git",
  "path": "/Users/grandinharrison/Desktop/claude-code-projects/claude-chaos-express",
  "branch": "main",
  "last_commit": "5a813b7283bbd9d9d3e087f04b10520d5c83cf12",
  "dirty_files": [],
  "changed_files": [],
  "timestamp": "2025-11-16T16:05:00-08:00"
}
```

This file is maintained by Cursor and represents the **ground truth** for git repository state that Claude should validate against before making changes.

**Skills System Integration:**

The framework has a sophisticated skills system defined in `.claude/skills/skill-rules.json` with:
- **ANALYSIS-ONLY skills:** Can run in any DAIC mode, never call write tools
- **WRITE-CAPABLE skills:** Only allowed in IMPLEMENT mode, must check CC_SESSION_MODE
- Skill precedence: Project skills → User/infra skills → Framework defaults

Relevant skills for handoff implementation:
- `framework_version_check` (ANALYSIS-ONLY) - Checks framework version sync
- `framework_health_check` (ANALYSIS-ONLY) - Validates framework health
- `daic_mode_guidance` (ANALYSIS-ONLY) - Guides on current DAIC mode

**Configuration Files:**

The `sessions/sessions-config.json` contains:
- Trigger phrases for mode transitions (e.g., "yert" for implementation, "SILENCE" for discussion)
- Blocked actions (implementation-only tools: Write, Edit, MultiEdit, NotebookEdit)
- Git preferences (add_pattern: all, auto_merge: true, auto_push: true)
- Features (branch_enforcement: true, task_detection: true, auto_ultrathink: true)

### What Needs to Be Implemented

This task must create a **lightweight coordination layer** without modifying the existing cc-sessions infrastructure. The implementation strategy:

**1. Path Conflict Resolution Strategy:**

Since `claude.md` specifies `/logs/ai-handoffs.md` but the actual file is at `docs/ai_handoffs.md`:
- **DO NOT create a `/logs/` directory** - this would create divergent logs
- **DO NOT move the existing file** - this could break Cursor workflows
- **Detect and document the mismatch** in the task file
- **Propose migration plan** for user approval
- **Use the existing `docs/ai_handoffs.md` path** as canonical until user decides

**2. Schema Alignment Strategy:**

Two schemas exist - framework spec vs actual implementation:
- **DO NOT silently rename fields** in existing entries (preserves history)
- **Document both schemas** as valid for reading
- **Propose normalization** for future entries (align with `claude.md` Section 5.3)
- **Support both `from_agent`/`to_agent` and `from`/`to`** when parsing
- **Support both `needed` and `next`** when parsing
- **Treat `repo_state` as optional extension** (not required, but useful)

**3. Bridge Documentation Updates:**

The existing bridge protocol and tiers docs are **mostly complete** but need minor updates:
- `docs/agent_bridge_protocol.md` - Already defines roles and workflows; may need schema clarification
- `docs/tiers_of_context.md` - Already defines tier structure; verify handoff log placement
- No new files needed unless gaps discovered

**4. Handoff Behavior Implementation:**

Claude Code needs to implement two handoff behaviors:

**RECEIVE Handoff (Cursor → Claude):**
1. Parse YAML from `docs/ai_handoffs.md`
2. Restate `next` (or `needed`) section for user confirmation
3. Check for clear acceptance criteria; propose concrete criteria if missing
4. Execute requested work in logical order (respecting DAIC, must be in IMPLEMENT mode)
5. Update corresponding YAML block's `completed` list with what was done + files touched
6. Keep YAML valid; avoid deleting historical entries

**SEND Handoff (Claude → Cursor):**
1. Create new YAML block using schema from current `docs/ai_handoffs.md` (preserves consistency)
2. Fill `completed` with what was done + file paths
3. Fill `next` (or `needed`) with specific tasks for Cursor + acceptance criteria
4. Include `context_files` pointing to relevant Tier-2 docs
5. Optional: Add `repo_state` if available and useful
6. Append to `docs/ai_handoffs.md`

**5. cc-sessions Integration Points:**

Within IMPLEMENT mode, Claude can:
- Read `docs/ai_handoffs.md` using Read tool
- Read `repo_state/metadata.json` using Read tool
- Append to `docs/ai_handoffs.md` using Edit tool (append pattern)
- Update YAML blocks using Edit tool (update specific block)

Write gating rules automatically enforce:
- No writes outside IMPLEMENT mode
- Bash commands are validated for read-only vs write
- State file (`sessions/sessions-state.json`) protected from direct modification

**6. Version Sync Awareness:**

Both `claude.md` and `claude-reference.md` are version 2.0, dated 2025-11-15, so framework is in sync. However:
- Handoff schema mismatch between framework spec and implementation needs resolution
- Framework health check (Section 8 in `claude.md`) should validate handoff log schema

**7. Idempotency and Safety:**

Running this task multiple times must be safe:
- **Check if files exist** before creating
- **Preserve existing content** when updating
- **Append or merge**, never replace
- **Document any conflicts** detected
- **No duplicate infrastructure** created

**8. Drift Detection and Surfacing:**

When implementing, detect and surface these drift scenarios to user:
- **Path mismatch:** Framework says `/logs/ai-handoffs.md`, actual is `docs/ai_handoffs.md` → Propose migration options
- **Schema mismatch:** Framework says `from`/`to`/`next`, actual uses `from_agent`/`to_agent`/`needed` → Propose normalization plan
- **Multiple logs:** If both paths exist → Treat one as canonical, warn about divergence
- **Legacy entries:** If existing entries use different schema → Document how to read/update safely

**9. Manual Validation Approach:**

Since this is a Tier-2 file update (not framework code), validation can be manual:
- After implementation, manually inspect YAML blocks for syntax
- Check required fields present: `from` (or `from_agent`), `to` (or `to_agent`), `completed`, `next` (or `needed`)
- Verify `context_files` paths are valid
- Optionally: Create simple bash script to validate YAML syntax using `yq` or `python -c "import yaml"`

### Technical Reference Details

#### File Locations

**Existing Infrastructure (DO NOT CREATE):**
- Handoff log: `/Users/grandinharrison/Desktop/claude-code-projects/claude-chaos-express/docs/ai_handoffs.md`
- Bridge protocol: `/Users/grandinharrison/Desktop/claude-code-projects/claude-chaos-express/docs/agent_bridge_protocol.md`
- Context tiers: `/Users/grandinharrison/Desktop/claude-code-projects/claude-chaos-express/docs/tiers_of_context.md`
- Repo state: `/Users/grandinharrison/Desktop/claude-code-projects/claude-chaos-express/repo_state/metadata.json`

**Framework Specs (READ-ONLY):**
- Main spec: `/Users/grandinharrison/Desktop/claude-code-projects/claude-chaos-express/claude.md`
- Reference: `/Users/grandinharrison/Desktop/claude-code-projects/claude-chaos-express/claude-reference.md`
- Cursor spec: `/Users/grandinharrison/Desktop/claude-code-projects/claude-chaos-express/CURSOR.md`

**cc-sessions Hooks (READ-ONLY - Understanding Only):**
- Write gating: `/Users/grandinharrison/Desktop/claude-code-projects/claude-chaos-express/sessions/hooks/sessions_enforce.js`
- Post-tool use: `/Users/grandinharrison/Desktop/claude-code-projects/claude-chaos-express/sessions/hooks/post_tool_use.js`
- Shared state: `/Users/grandinharrison/Desktop/claude-code-projects/claude-chaos-express/sessions/hooks/shared_state.js`

**Session State (PROTECTED - No Direct Edits):**
- State file: `/Users/grandinharrison/Desktop/claude-code-projects/claude-chaos-express/sessions/sessions-state.json`
- Config file: `/Users/grandinharrison/Desktop/claude-code-projects/claude-chaos-express/sessions/sessions-config.json`

**Task Manifest (THIS FILE):**
- Location: `/Users/grandinharrison/Desktop/claude-code-projects/claude-chaos-express/sessions/tasks/m-implement-ai-handoff-process.md`

#### Schema Definitions

**Current Implementation Schema (from `docs/ai_handoffs.md`):**
```yaml
timestamp: ISO-8601 string           # When handoff created
from_agent: "claude" | "cursor"      # Source agent
to_agent: "claude" | "cursor"        # Target agent
issue_id: string                     # GitHub Issue ID or "none"
branch: string                       # Git branch name
repo_state:                          # Optional - git repository state
  branch: string
  last_commit: string                # Git commit hash
  dirty_files: string[]              # Uncommitted changes
  changed_files: string[]            # Staged changes
completed:                           # What was done
  - string                           # Bullet with file paths
needed:                              # What's next
  - string                           # Task with acceptance criteria
context_files:                       # Relevant docs
  - string                           # Paths to Tier-1/2 files
```

**Framework Specification Schema (from `claude.md` Section 5.3):**
```yaml
timestamp: ISO-8601 string           # When handoff created
from: "claude" | "cursor"            # Source agent (simpler field name)
to: "claude" | "cursor"              # Target agent (simpler field name)
issue_id: string                     # GitHub Issue ID or equivalent
branch: string                       # Feature branch name
completed:                           # Bullets with file paths and actions
  - string
next:                                # Concrete tasks with acceptance criteria
  - string
context_files:                       # Relevant Tier-1/2 docs
  - string
```

**Dual-Schema Support Pattern:**
```javascript
// When parsing handoff entries, support both schemas:
const from = entry.from || entry.from_agent;
const to = entry.to || entry.to_agent;
const nextTasks = entry.next || entry.needed;
const repoState = entry.repo_state; // Optional

// When creating new entries, use framework schema:
const newEntry = {
  timestamp: new Date().toISOString(),
  from: "claude",
  to: "cursor",
  issue_id: "12345",
  branch: "feature/handoff-process",
  completed: [
    "Created handoff infrastructure docs",
    "Updated docs/ai_handoffs.md schema"
  ],
  next: [
    "Review schema alignment proposal",
    "Approve or reject path migration plan"
  ],
  context_files: [
    "docs/agent_bridge_protocol.md",
    "docs/tiers_of_context.md"
  ]
};
```

#### Repo State Structure

**File:** `repo_state/metadata.json`
**Purpose:** Git repository state maintained by Cursor as ground truth
**Schema:**
```json
{
  "repo": "string",           // Git remote URL
  "path": "string",           // Absolute filesystem path
  "branch": "string",         // Current branch name
  "last_commit": "string",    // Latest commit hash
  "dirty_files": ["string"],  // Uncommitted changes
  "changed_files": ["string"],// Staged changes
  "timestamp": "ISO-8601"     // When state was captured
}
```

**Usage Pattern:**
1. Cursor maintains this file automatically before handoffs
2. Claude reads at task start to validate git state
3. Claude validates `branch` matches `CC_SESSION_TASK_ID` branch expectation
4. Claude warns if dirty_files/changed_files exist when expecting clean state

#### DAIC Mode Integration

**Read Operations (Allowed in All Modes):**
- Read `docs/ai_handoffs.md` - Any DAIC mode
- Read `repo_state/metadata.json` - Any DAIC mode
- Read Tier-1/Tier-2 docs - Any DAIC mode
- Parse YAML handoff entries - Any DAIC mode

**Write Operations (IMPLEMENT Mode Only):**
- Append new handoff entry to `docs/ai_handoffs.md` - IMPLEMENT only
- Update existing handoff entry's `completed` field - IMPLEMENT only
- Create/update bridge protocol docs - IMPLEMENT only
- Modify any Tier-2 documentation - IMPLEMENT only

**Validation at Write Time:**
- `sessions/hooks/sessions_enforce.js` automatically blocks writes outside IMPLEMENT
- No special handling needed for handoff files - standard gating applies
- If write attempted in DISCUSS/ALIGN/CHECK, hook returns exit code 2 with error message

#### Health Check Integration

**Framework Health Checks (Section 8 in `claude.md`):**

Add to health check routine:
- **Handoff log validation:**
  - Confirm `docs/ai_handoffs.md` (actual location) exists
  - Validate YAML structure in recent entries
  - Check required fields present (from/to/completed/next or needed)
  - Note: Framework specifies `/logs/ai-handoffs.md` - document mismatch

- **Schema consistency check:**
  - Compare schema in `docs/ai_handoffs.md` header vs `claude.md` Section 5.3
  - Flag mismatches: `from_agent` vs `from`, `needed` vs `next`
  - Report but don't auto-fix

- **Bridge protocol freshness:**
  - Verify `docs/agent_bridge_protocol.md` exists
  - Check for obvious staleness (last modified > 90 days)

**Health Check Invocation:**
- Only on explicit user request or during REPAIR- tasks
- Never automatic
- Results logged to `context/gotchas.md` if failures found

### Implementation Gotchas

**1. Path Conflict (Critical):**
- Framework says `/logs/ai-handoffs.md`
- Actual file at `docs/ai_handoffs.md`
- `/logs/` directory does not exist
- **DO NOT** create both paths - this causes divergence
- **Surface conflict** to user with migration options

**2. Schema Evolution:**
- Existing entries may use `from_agent`/`to_agent`/`needed`
- Framework spec uses `from`/`to`/`next`
- **Support both** when reading
- **Use framework schema** for new entries (after user approval)
- **Never silently rewrite** existing entries

**3. YAML Formatting:**
- Entries must be valid YAML blocks separated by `---`
- Use proper indentation (2 spaces)
- Quote strings with special characters
- Use ISO-8601 for timestamps: `2025-11-15T10:30:00-08:00`

**4. Write Gating Compliance:**
- All handoff file updates must occur in IMPLEMENT mode
- If attempted in DISCUSS/ALIGN, will be blocked with helpful error
- User must approve with trigger phrase (e.g., "yert") to enable writes

**5. File Tier Boundaries:**
- Handoff log is Tier-2 (safe for agent modification)
- Bridge protocol is Tier-2 (safe for agent modification)
- `claude.md` is Tier-0 (read-only unless REPAIR task)
- Do not propose Tier-0 changes in normal implementation task

**6. Repo State Validation:**
- Always read `repo_state/metadata.json` before writes
- Warn if `dirty_files` non-empty when expecting clean state
- Validate `branch` matches task expectation
- Treat as **informational** - Cursor is ground truth

**7. Idempotency:**
- Check file existence before creating
- Preserve existing content structure
- Use append/merge patterns, not replacements
- Document if infrastructure already complete

**8. Version Sync:**
- Both `claude.md` and `claude-reference.md` at version 2.0, dated 2025-11-15
- Framework is in sync - no version drift
- Handoff schema mismatch is separate issue (spec vs implementation)

**9. Context Files References:**
- Always use **relative paths** from repo root in `context_files` field
- Example: `docs/agent_bridge_protocol.md` not `/Users/.../docs/agent_bridge_protocol.md`
- Makes handoffs portable across developer machines

**10. Task-Specific Constraints:**
- This is a **FILE** structure task (< 3 days)
- Scope: Infrastructure creation, not feature implementation
- Deliverable: Handoff coordination layer ready for use
- Success: Both agents can handoff work using structured YAML entries

## User Notes

### Full Implementation Specification

This task implements a lightweight handoff + shared-context layer between Cursor agents and Claude Code, following these principles:

#### Overall Behavior

1. Continue using existing cc-sessions workflow, tools, and plugins as defined by the environment
2. Add a **thin coordination layer** on top:
   - A shared `ai_handoffs.md` log of structured handoffs
   - A small set of "bridge" docs explaining protocols and context tiers
   - Optional awareness of repo-state file provided by Cursor, while treating Cursor/local agents as authority on git state

#### Conflict Resolution Priority

When instructions conflict between:
1. `claude.md` / root config
2. Actual contents of `docs/*.md` on disk
3. This implementation spec

Behavior:
- Prefer **(1) root config**, then **(2) existing docs**, then **(3) this spec**
- Explicitly call out conflicts to user and propose migration/merge plan
- **Never auto-fix conflicts**

#### File Locations and Path Handling

**Preferred location:** `docs/ai_handoffs.md` (per this spec)
**Framework location:** `/logs/ai-handoffs.md` (per `claude.md` Section 5.3)

**Path conflict resolution:**
- If both paths exist, do NOT create new file or split log
- Read both, treat the one actually being used as canonical
- Surface mismatch to user and propose migration plan
- Do NOT edit `claude.md` unless explicitly instructed

**If no handoff log exists:**
- Create at path specified in `claude.md` (prefer framework config)
- Use schema from `claude.md` Section 5.3 as canonical

#### Handoff Entry Schema

**Canonical schema** (from `claude.md` Section 5.3):

```yaml
timestamp: ISO-8601
from: claude|cursor
to: claude|cursor
issue_id: <GitHub Issue number or "none">
branch: <feature branch name>
completed:
  - <completed item with file paths>
next:
  - <specific tasks for receiving agent>
  - <with clear acceptance criteria>
context_files:
  - <paths to relevant Tier-2 docs>
```

**Optional extension:**
```yaml
repo_state:  # Optional addition
  repo: <string>
  path: <absolute or canonical path>
  branch: <string>
  last_commit: <string>
  dirty_files: ["relative/path.ext"]
  changed_files: ["relative/path.ext"]
  timestamp: ISO-8601
```

**Legacy schema handling:**
- If existing entries use `from_agent`/`to_agent`/`needed` instead of `from`/`to`/`next`, adapt to existing schema
- Do NOT silently remove or rename core keys in existing entries
- Prefer on-disk schema for updates to existing entries
- Only propose schema normalization if differences cause confusion/errors

#### Handoff Behavior

**RECEIVING a handoff:**
1. Parse YAML and restate `next` section for user confirmation
2. Check for clear acceptance criteria; call out if missing and propose concrete criteria
3. Execute requested work in logical order
4. Update corresponding block's `completed` list with:
   - What was done
   - Files touched (paths)
   - Caveats or partial completions
5. Keep YAML valid; avoid rewriting or deleting historical entries

**SENDING a handoff:**
- Create new YAML block using schema from `docs/ai_handoffs.md`
- Fill `completed` and `next` carefully
- Include `context_files` pointing to relevant Tier-2 docs
- Optional: Add `repo_state` if available and useful

#### Bridge Documentation

**`docs/agent_bridge_protocol.md`:**
- Human and AI-readable summary of Cursor ↔ Claude coordination
- If exists: read and follow; only append/refine if clearly beneficial
- If missing: create with minimal template defining roles, handoff rules

**`docs/tiers_of_context.md`:**
- Define tiers of context referenced by `context_files`
- If exists: respect as canonical; only modify if user asks or clear gap
- If missing: create with template (Tier-0: Protected Core, Tier-1: Project Intent, Tier-2: Operational Context)
- Align with framework's existing SoT tiers from `claude.md` Section 2.1

#### cc-sessions Integration

Within cc-sessions:
- Use appropriate file tools (read_file, write_file, apply_patch) to:
  - Create `docs/ai_handoffs.md` if missing and safe
  - Append or update handoff blocks
  - Create/update bridge protocol and tiers docs only when requested or required

**Respect write-gating:**
- Handoff file operations respect DAIC modes
- No writes outside IMPLEMENT unless explicitly allowed by framework

#### Repo State Handling

- Do NOT fabricate real git state
- If `repo_state/metadata.json` exists, read via cc-sessions tools when needed
- If missing and user asks to scaffold: create stub with placeholder values and tell user it needs refresh by Cursor/local agent
- Treat Cursor/local agents as ultimate authority on git state

#### Interaction Style

- Be explicit about files read and changed (with paths)
- When detecting drift (schema mismatch, path mismatch, multiple logs), optionally summarize in "Priority Fix Table"
- End handoff explanations with direct question: "Do you want me to create or update any of these coordination files now, or just follow the existing ones going forward?"

## Work Log

### 2025-11-15

#### Task Creation
- Task created following Task Creation Protocol
- Priority: high (h-) - infrastructure for agent collaboration
- Type: implement - new functionality for handoff tracking
- Structure: FILE - focused deliverable, < 3 days estimated
- Success criteria defined with 9 major categories covering implementation, safety, and validation
- Full specification captured in User Notes section
