# Context Gotchas

This file documents pitfalls, failure modes, and edge cases discovered during framework development and usage.

---

## Converting Gotchas to REPAIR Tasks

**Process:** When a gotcha documents a framework or tooling issue that requires a fix, it should be converted to a REPAIR- task.

### When to Create a REPAIR Task

Create a REPAIR- task when a gotcha documents:
- **Framework misbehavior** (hooks not firing, write-gating bypassed, state corruption)
- **Tooling issues** (skills not working, commands failing, protocols broken)
- **Documentation drift** (version mismatches, inconsistent guidance)
- **Systemic problems** (recurring failures, design flaws)

### Process Steps

1. **Document the gotcha** in this file (if not already documented)
   - Problem description
   - Root cause analysis
   - Impact assessment
   - Prevention ideas

2. **Create REPAIR- task** in `sessions/tasks/`
   - Task ID format: `REPAIR-[issue-name]-[YYYY-MM-DD].md`
   - Include reference to the gotcha entry
   - Define clear success criteria
   - List files/components that need investigation/modification

3. **Link gotcha to REPAIR task**
   - Add "REPAIR Task" section to the gotcha entry
   - Include task file path and status
   - Update status when task is completed

4. **After REPAIR task completion**
   - Update gotcha entry with "The Fix" section
   - Document what was changed
   - Update "Prevention" section with implemented safeguards
   - Mark REPAIR task as done

### Example Gotcha Entry with REPAIR Task

See "Documentation Path Inconsistency" below for a complete real-world example.

**Template:**
```markdown
## Example Framework Issue

**Issue Discovered:** 2025-11-16

### The Problem
[Description of the issue]

### Root Cause
[Analysis of why it happened]

### REPAIR Task
- **Task ID:** REPAIR-example-issue-2025-11-16
- **File:** `sessions/tasks/REPAIR-example-issue-2025-11-16.md`
- **Status:** [pending | in-progress | done]

### The Fix
[To be filled in after REPAIR task completion]

### Prevention
[To be updated after REPAIR task completion]
```

---

## Todo Refinement vs Scope Change

**Issue Discovered:** 2025-11-16 during `m-implement-skill-prompts` task

### REPAIR Task
- **Task ID:** REPAIR-todo-refinement-vs-scope-change
- **File:** `sessions/tasks/REPAIR-todo-refinement-vs-scope-change.md`
- **Status:** in-progress

### The Problem

The cc-sessions enforcement hooks were blocking ALL todo list changes as potential scope violations, even when the changes were legitimate refinements (e.g., breaking down "Begin work on task" into specific implementation steps after gathering context).

This created unnecessary friction in the natural DAIC workflow:
1. Task startup gives generic todos including "Begin work on task"
2. After context gathering, AI breaks down generic todo into specific steps
3. Hook incorrectly triggered scope violation warning for legitimate planning refinement

### Root Cause

The hook logic didn't distinguish between:
- **Refinement**: Breaking generic placeholders into specific steps (legitimate)
- **Scope change**: Adding new features or changing task goals (violation)

### The Fix

**Documentation added:**
- Defined "todo refinement" vs "scope change" in `claude-reference.md` Section 2
- Added concrete examples of legitimate refinements vs violations
- Created decision framework with 4 questions to distinguish between them
- Clarified when shame ritual should trigger vs when it shouldn't

**Key insight:** Todo refinement is a natural part of the ALIGN phase. Generic todos like "Begin work on task" are EXPECTED to be broken down into specific implementation steps after context gathering.

### Prevention

**Future hook logic should:**
1. Allow todo expansion when todos are being made MORE specific (refinement)
2. Block todo changes that add fundamentally NEW work (scope change)
3. Check if changes maintain same success criteria (refinement) or alter them (scope change)
4. Distinguish between implementation detail (refinement) and new features (scope change)

**Indicators of legitimate refinement:**
- Same goal, more detailed steps
- Breaking file operations into per-file subtasks
- Expanding "Begin work" into concrete actions
- Reordering todos without changing what gets done

**Indicators of scope violation:**
- New features not in original task
- Fundamental change to task purpose
- Modified success criteria
- Work diverging from stated task description

### Example Comparison

**✓ Legitimate Refinement:**
```markdown
Before: □ Fix path references
After:  □ Fix CLAUDE.md path references (4 locations)
        □ Fix claude-reference.md path references (1 location)
        □ Verify all corrections
```
*Same goal, just broken down by file*

**✗ Scope Violation:**
```markdown
Before: □ Fix login bug
After:  □ Fix login bug
        □ Rewrite entire auth system ← NEW SCOPE
        □ Add OAuth support ← NEW FEATURE
```
*Changed from bug fix to major architectural change*

### Related Files

- `CLAUDE.md` Section 6.3 - Now explicitly states REPAIR tasks ARE cc-sessions tasks
- `claude-reference.md` Section 2 - Comprehensive definitions and examples
- `sessions/hooks/user_messages.js` - Hook that needs smarter todo-change detection
- `sessions/tasks/REPAIR-todo-refinement-vs-scope-change.md` - Task that documented and fixed this issue

---

## Documentation Path Inconsistency

**Issue Discovered:** 2025-11-15 during REPAIR task investigation

### The Problem

Framework documentation inconsistently referenced `.cc-sessions/` paths instead of the canonical `sessions/` directory structure used by the official cc-sessions repo.

**7 files with incorrect paths:**
1. CLAUDE.md (4 occurrences)
2. claude-reference.md (1 occurrence)
3. .claude/skills/cc-sessions-core/SKILL.md (1 occurrence - now restructured)
4. .claude/skills/framework_health_check/SKILL.md (4 occurrences - now restructured)
5. Context/Features/001-CustomizeSkillRules.md (2 occurrences)
6. sessions/tasks/m-implement-custom-skill-rules.md (1 occurrence)
7. sessions/tasks/done/m-repo-initialization.md (1 occurrence)

### Root Cause

The framework docs were written before checking the canonical cc-sessions repository structure at https://github.com/GWUDCAP/cc-sessions. The actual implementation uses `sessions/` directory with `sessions/sessions-state.json` for state persistence.

### The Fix

Updated all 14 path references from `.cc-sessions/state.json` to `sessions/sessions-state.json` to match:
- The canonical cc-sessions repository structure
- The actual implementation in this project
- What the hooks and API actually use

### Prevention

**When documenting paths:**
1. Check the canonical upstream repository first
2. Verify what the actual implementation uses
3. Ensure consistency across all documentation
4. Run grep to find all path references before documenting

**When setting up new infrastructure:**
1. Follow canonical structure from official repo
2. Don't invent new directory structures without good reason
3. Document any deviations from upstream in CLAUDE.md

---

## Code Review Auto-Invocation Sensitivity

**Issue Discovered:** 2025-11-16

### The Problem

The `self-review` hook in `.claude/settings.json` Stop hooks automatically invokes `code-review-expert` agent when Stop hooks run, even when the user has asked a question that requires input. This can interrupt user interaction flow.

**Example:** User asks "Would you like me to commit these changes or test with a real skill assessment?" but before receiving an answer, the Stop hooks fire and `self-review` automatically invokes code-review-expert, bypassing the user's question.

### Root Cause

The Stop hooks run automatically on session end/pause, and `claudekit-hooks run self-review` doesn't check if there's pending user interaction or questions that need responses first.

### Current Status

**Note:** This behavior is acceptable for now, but may be too sensitive. The auto-invocation happens even when user input is expected.

### Future Consideration

If this becomes problematic:
- Make `self-review` conditional (only run when no pending user questions)
- Add user confirmation before auto-invoking code-review
- Adjust Stop hook timing to avoid interrupting user interaction flow

### Related Files

- `.claude/settings.json` - Stop hooks configuration (line 276)
- `sessions/tasks/REPAIR-code-review-findings-workflow.md` - Related issue about code-review workflow

---

## Claude-Cursor SoT Reference Alignment

**Audit Date:** 2025-01-20 (Task: h-align-claude-cursor-systems)

### The Audit

Comprehensive audit of all file references in Claude Code (`CLAUDE.md`) and Cursor Agent (`.cursor/rules/cursor-agent-operating-spec.mdc`) to verify alignment.

**Files Audited:**
- `CLAUDE.md` - 100+ file references
- `.cursor/rules/cursor-agent-operating-spec.mdc` - All @ file references
- `CURSOR.md` (legacy) - File references
- `docs/agent_bridge_protocol.md` - Protocol references

### Findings

**✅ All references are properly aligned:**

1. **Handoff Log Path** - All systems now reference `docs/ai_handoffs.md` (previously had mismatch with `/logs/ai-handoffs.md`)
2. **LCMP Files** - Both systems reference `context/decisions.md`, `context/insights.md`, `context/gotchas.md`
3. **Framework Core** - Both systems reference `CLAUDE.md` and `claude-reference.md` correctly
4. **Operational Context** - Both systems reference `docs/agent_bridge_protocol.md`, `docs/tiers_of_context.md`

**⚠️ Optional Files Referenced But Missing:**
- `AGENTS.md`, `COMMANDS.md`, `HOOKS.md` - Optional Claude framework docs
- `METASTRATEGY.md`, `IMPLEMENTATION_GUIDE.md` - Optional architecture docs
- `docs/ARCHITECTURE.md`, `docs/AI_WORKFLOWS.md` - Optional project docs
- `docs/original_vision.md`, `docs/project_goals.md` - Optional vision docs
- `context/progress.md` - Optional progress tracking

These are acceptable - files are documented as optional and can be created when needed.

### Documentation Created

**`docs/sot-reference-map.md`** - Comprehensive SoT reference map documenting:
- Shared SoT files (both systems reference)
- Claude-specific files
- Cursor-specific files
- Alignment verification status
- Maintenance rules for keeping systems aligned

### Prevention

**To maintain alignment going forward:**

1. **Use the SoT reference map** - Always consult `docs/sot-reference-map.md` when adding/moving/renaming files
2. **Update both systems** - When changing shared SoT, update CLAUDE.md AND Cursor rule
3. **Verify paths match** - Paths must match exactly (case-sensitive) between systems
4. **Run drift detection** - Use drift detection mechanism (to be created) to catch misalignments
5. **Document changes** - Log significant alignment changes in `context/decisions.md`

### Related Files

- `docs/sot-reference-map.md` - Comprehensive reference map
- `CLAUDE.md` Section 5 - Claude Code vs Cursor coordination
- `.cursor/rules/cursor-agent-operating-spec.mdc` - Active Cursor spec
- `docs/agent_bridge_protocol.md` - Inter-agent coordination protocol
- `sessions/tasks/h-align-claude-cursor-systems.md` - Alignment task

---

## Hook System: Claude Code Tool Response Field Name

**Issue Discovered:** 2025-11-16 during REPAIR-hook-system-agent-conflicts task

### The Problem

Initial pause detection implementation used incorrect field name `tool_result` when extracting tool output from hook input. The correct field name is `tool_response` per Claude Code hooks reference documentation.

**Impact:** Pause detection silently failed because it was reading from a non-existent field. Agent pause requests were never detected, causing the hook system to auto-advance despite explicit "WAIT for user response" instructions.

### Root Cause

1. **Undocumented field names** - Hook input structure isn't immediately obvious; requires consulting official Claude Code hooks reference
2. **No validation** - Hooks run silently without errors if accessing undefined fields
3. **Format variation** - `tool_response` can be either string or object, requiring defensive extraction

### The Fix

**Field Name Correction:**
```javascript
// ❌ INCORRECT
const toolResult = hookInput.tool_result;  // undefined!

// ✅ CORRECT
const toolResponse = hookInput.tool_response;
```

**Defensive Extraction:**
```javascript
let toolOutput = "";
if (typeof toolResponse === "string") {
    toolOutput = toolResponse;
} else if (toolResponse && typeof toolResponse === "object") {
    toolOutput = toolResponse.output || toolResponse.content || "";
}
```

### Prevention

**When working with Claude Code hook inputs:**

1. **Always check official docs** - Don't assume field names, verify against Claude Code hooks reference
2. **Add debug logging** - Use environment-gated debug logs to verify data extraction:
   ```javascript
   if (process.env.DEBUG_HOOKS) {
       console.error("[DEBUG] hookInput keys:", Object.keys(hookInput));
       console.error("[DEBUG] tool_response type:", typeof toolResponse);
   }
   ```
3. **Handle format variations** - Tool responses vary by tool type (string vs object), always extract defensively
4. **Test with real hook events** - Don't assume extraction works; test with actual Claude Code tool executions

### Related Files

- `sessions/hooks/post_tool_use.js` - Pause detection implementation (lines 61, 129)
- `sessions/hooks/shared_state.js` - SessionsFlags class with pause state
- `sessions/tasks/REPAIR-hook-system-agent-conflicts.md` - Task that discovered and fixed this

---

## Multi-Agent Orchestrator: Task Assignment Race Condition

**Date Discovered:** 2025-11-16
**Context:** Phase 3 runtime testing with real Claude CLI agents
**Severity:** Critical - Causes multiple agents to work on same task simultaneously

### The Problem

When multiple agents are available (idle), the orchestrator's assignment loop assigns the **same task to multiple agents** instead of assigning different tasks to each agent.

### Root Cause

Tasks are removed from queue **only after agent completion**, not at assignment time. This creates a race condition:

```javascript
// Buggy flow in agent-orchestrator.js:
1. assignNextTask() finds idle agent
2. getNextTask() returns task from queue
3. Task is NOT removed from queue yet
4. assignTaskToAgent() spawns agent process
5. saveState() persists assignment
6. Loop continues to next idle agent
7. getNextTask() returns SAME task (still in queue!)
8. Second agent gets same task
9. Process repeats for all idle agents
```

**Location:** `scripts/agent-orchestrator.js`
- Line 457: `removeFromQueue()` called in `handleAgentCompletion()`
- Should be called in `assignTaskToAgent()` instead

### Impact

**Observed Behavior:**
- All 3 agents assigned `orchestrator-test-impl.md` simultaneously
- PIDs: 70487, 70572, 70679 (all working on same task)
- Implementation queue still contained task after assignments
- Orchestrator state showed identical `currentTask` for all agents

**Consequences:**
- Wasted compute resources (3x agent spawns for 1 task)
- File conflict potential (multiple agents editing same files)
- Queue starvation (other tasks not assigned)
- Role separation violation (if context task skipped)

### The Fix (Completed 2025-11-16)

**Primary Fix:** Moved `removeFromQueue()` call from `handleAgentCompletion()` to `assignTaskToAgent()` (line 243):

```javascript
// In assignTaskToAgent():
assignTaskToAgent(agent, task, queueName) {
    // ... validation checks ...

    agent.status = 'working';
    agent.currentTask = task.path;
    agent.role = queueName;
    agent.startedAt = new Date().toISOString();

    // FIX: Remove from queue immediately upon assignment (prevents race condition)
    this.queueManager.removeFromQueue(task.path, queueName);

    console.log(`\n🎯 Assigning Task to ${agent.id}`);
    this.saveState();

    // Spawn agent based on mode (local or cloud)
    // ... rest of method
}

// In handleAgentCompletion():
handleAgentCompletion(agent, task, queueName) {
    console.log(`\n✅ ${agent.id} completed task: ${task.relativePath}`);

    // Update agent state
    agent.status = 'idle';
    agent.currentTask = null;
    agent.completedTasks++;

    // Mark task as completed (no longer in queue, already removed at assignment)
    this.completedTasks.add(task.relativePath);

    // If context gathering, move to implementation queue
    if (queueName === 'context') {
        this.updateTaskFlag(task.path, 'context_gathered', true);
        this.queueManager.moveToImplementationQueue(task.path);
    }

    this.saveState();
}
```

**Defensive Check:** Added duplicate assignment check as belt-and-suspenders (lines 164-171):
```javascript
// In assignNextTask():
const alreadyAssigned = this.agents.some(a =>
    a.currentTask === task.path && a.status === 'working'
);
if (alreadyAssigned) {
    console.warn(`⚠️  Task ${task.relativePath} already assigned to another agent, skipping`);
    return false;
}
```

**Result:** Tasks removed from queue atomically with assignment, preventing race condition in concurrent assignment loops.

### Prevention

**Design Principle:** Remove from queue at assignment, not at completion.

**Why This Matters:**
- Assignment is the point of commitment
- Queue represents **available** work, not **all** work
- Completed tasks tracked separately (`completedTasks` Set)
- Prevents race conditions in concurrent assignment loops

**Testing Strategy:**
- Always test with multiple idle agents
- Verify queue state after each assignment (should be empty or reduced by 1)
- Check agent states for duplicate `currentTask` values
- Integration tests should cover rapid successive assignments

### Related Files

- `scripts/agent-orchestrator.js` - Orchestrator implementation (lines 175-194, 442-470)
- `scripts/task-queue-manager.js` - Queue management (removeFromQueue method)
- `sessions/tasks/h-multi-agent-orchestration.md` - Task documentation with bug details
- `scripts/ORCHESTRATOR_TESTING.md` - Testing guide with reproduction steps

### REPAIR Task

**Status:** Completed 2025-11-17
**Task:** `sessions/tasks/h-fix-orchestrator-task-assignment-race.md`

**Fix Applied:**
- Line 182 of `agent-orchestrator.js`: Added `removeFromQueue()` in `assignTaskToAgent()`
- Line 460 (removed): Deleted redundant `removeFromQueue()` in `handleAgentCompletion()`
- Lines 164-171: Added defensive duplicate assignment check in `assignNextTask()`

**Verification:**
- Runtime test: 2 tasks assigned to 2 different agents, no duplicates
- Test suite: 152/152 tests passing
- Queue state: Both queues empty after assignment (tasks properly removed)

---

## Continuous Worker Appears Active But Does Nothing

**Issue Discovered:** 2025-11-16
**Context:** Multi-agent task distribution testing

### The Problem

The `agent-continuous-worker.sh` system tracked task progress correctly but produced zero actual work output after 4+ hours of operation.

**Symptom:**
- 3 agents showing "in-progress" status for 4+ hours
- `agent-progress.json` updating correctly
- Lock files created properly
- Task assignments correct in `agent-assignments.json`
- **Zero commits from agents**
- **Zero file modifications**
- **Zero evidence of actual work**

**What It Looked Like:**
```bash
$ cat sessions/tasks/agent-progress.json
{
  "agent-1": {
    "current_task": "h-implement-code-search.md",
    "status": "in-progress",
    "started": "2025-11-16T10:00:00Z"
  },
  "agent-2": { "status": "in-progress", ... },
  "agent-3": { "status": "in-progress", ... }
}

$ git log --since="4 hours ago" --oneline
# Empty - no commits!

$ ls -lt sessions/tasks/*.md | head -5
# No recent modifications except one manually prepared task
```

### Root Cause

**The continuous worker only manages task assignment, not task execution:**

```javascript
// What the worker DID:
function assignNextTask(agentId) {
    const task = getNextAvailableTask();

    // Create lock file
    fs.writeFileSync(`.lock-${task}`, agentId);

    // Update progress tracking
    updateProgressJson(agentId, task, 'in-progress');

    // Create notification file
    fs.writeFileSync(`.agent-${agentId}-next-task.txt`, task);

    // ❌ MISSING: Actually start Cursor or trigger implementation!
}
```

**What agents were expected to do manually:**
1. Check for `.agent-N-next-task.txt` notification file
2. Open Cursor manually
3. Start chat manually
4. Reference task file manually
5. Actually work on task manually
6. Run `agent-workflow.sh complete` when done manually

**None of this manual workflow happened**, so the agents appeared assigned but did nothing.

### The Fix

**Deprecated continuous worker entirely, replaced with unified automation:**

```javascript
// New unified automation DOES:
function handleTrigger(triggerFile) {
    // Read trigger → extract task ID
    const { taskId, handoff } = parseTrigger(triggerFile);

    // ✅ Actually trigger Cursor to start work:
    // Cursor rules detect trigger file → auto-start Composer
    // (No manual intervention needed)

    // Archive trigger after detection
    archiveTrigger(triggerFile);
}
```

**Key Difference:**
- Old system: Track assignment, **hope** agents work manually
- New system: Detect trigger → **actually start** Cursor implementation

### Prevention

**1. Demand Evidence-Based Verification**
```bash
# Don't trust status files - verify actual output
git log --since="1 hour ago" --oneline
# Should show commits if work is happening

ls -lt <work-directory> | head -5
# Should show recent file modifications
```

**2. Time-Box Verification**
- If >1 hour "in-progress" with no commits → system is broken
- Real automation produces evidence quickly
- Silence is failure, not success

**3. Distinguish Mechanism from Outcome**
```
❌ Mechanism metrics: "Task assigned", "Agent working", "In progress"
✅ Outcome metrics: Commits, PRs, file changes, tests passing
```

**4. Test End-to-End Before Trusting**
```bash
# Create test task
touch sessions/tasks/test-automation.md

# Wait 5-10 minutes
# Check for actual work output
git log | grep "test-automation"

# If nothing → automation is broken
```

**5. Trace Execution Path**
```bash
# Follow the code: Where does work actually happen?
# If answer is "manually by human" → not automation!
```

### Evidence of Broken System

**After 4+ hours:**
```bash
# Agent status
Agent 1: 0 tasks completed (working on first task)
Agent 2: 0 tasks completed (working on first task)
Agent 3: 0 tasks completed (working on first task)

# Git log
$ git log --since="4 hours ago" --oneline
# (empty)

# File modifications
$ find sessions/tasks -type f -mmin -240
# Only files: agent-assignments.json, agent-progress.json, lock files
# NO task file modifications

# Commits from agents
$ git log --all --author="Agent" --since="4 hours ago"
# (empty)
```

### Replacement System

**New unified automation (`m-unified-cursor-automation.md`):**
- **Actually triggers work** via Cursor rules
- **Evidence-based** - produces commits, file changes, PRs
- **Verified working** - tested end-to-end before deployment

**Migration:**
```bash
# Archive broken system
mkdir -p scripts/archive/continuous-worker
mv scripts/agent-continuous-worker.sh scripts/archive/
mv scripts/agent-workflow.sh scripts/archive/
mv sessions/tasks/agent-assignments.json sessions/tasks/archive/
mv sessions/tasks/agent-progress.json sessions/tasks/archive/

# Start fresh with unified automation (no data migration)
```

### Related Files

- `sessions/tasks/m-unified-cursor-automation.md` - Replacement system
- `context/decisions.md` - "Deprecate Continuous Worker System" decision
- `context/insights.md` - "Continuous Worker False Positive Pattern"
- `docs/automation-strategy.md` - Automated task pickup strategies

---

## File Watcher Partial Read Race Condition

**Issue Discovered:** 2025-11-16
**Context:** Unified cursor automation implementation

### The Problem

File watchers can detect new files before they're fully written to disk, leading to partial reads and processing failures.

**Symptom:**
- File watcher detects new `.md` file
- Immediately reads file → empty content or partial content
- Processing fails due to incomplete frontmatter/data
- Works inconsistently (race condition)

**Example:**
```javascript
// Watcher detects file creation
watcher.on('add', (filePath) => {
    // ❌ RACE CONDITION: File may not be fully written yet
    const content = fs.readFileSync(filePath, 'utf8');
    // content might be "" or partial!

    processTrigger(content);  // Fails on incomplete data
});
```

### Root Cause

**Filesystem I/O buffering creates timing gap:**
1. File creation event fires (filesystem reports file exists)
2. Node.js/OS buffered I/O still writing content
3. `fs.readFileSync` reads before buffer flushes
4. Result: Partial or empty content

**Timing:**
- Large files: >100ms write time
- Small files: 10-50ms write time
- Race window: 10-100ms depending on file size and disk speed

### The Fix

**Use chokidar with `awaitWriteFinish`:**

```javascript
const chokidar = require('chokidar');

const watcher = chokidar.watch(path, {
    awaitWriteFinish: {
        stabilityThreshold: 500,  // Wait 500ms after last change
        pollInterval: 100          // Check every 100ms
    }
});

watcher.on('add', (filePath) => {
    // ✅ File is guaranteed to be fully written
    const content = fs.readFileSync(filePath, 'utf8');
    processTrigger(content);  // Always complete data
});
```

**How `awaitWriteFinish` works:**
1. File creation detected
2. chokidar polls file size every 100ms
3. When size stable for 500ms → triggers 'add' event
4. File is fully written by the time event fires

**Alternative (manual delay):**
```javascript
watcher.on('add', (filePath) => {
    // Wait 500ms before reading
    setTimeout(() => {
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            processTrigger(content);
        }
    }, 500);
});
```

### Prevention

**1. Always use `awaitWriteFinish` for file watchers**
```javascript
// ✅ CORRECT - Safe for all file sizes
chokidar.watch(path, {
    awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100
    }
});

// ❌ WRONG - Race condition risk
fs.watch(path, (event, filename) => {
    // Immediately reads - unsafe!
});
```

**2. Or add manual delay**
```javascript
// If not using chokidar, add delay
setTimeout(() => processFile(path), 500);
```

**3. Test with large files**
```bash
# Create 1MB test file to verify watcher waits
dd if=/dev/zero of=sessions/tasks/large-test.md bs=1M count=1

# Watcher should wait until fully written
# Verify by checking file size in logs
```

**4. Validate content before processing**
```javascript
function processTrigger(content) {
    // Defensive check
    if (!content || content.length < 10) {
        throw new Error('File appears incomplete');
    }

    // Validate frontmatter exists
    if (!content.startsWith('---')) {
        throw new Error('Invalid trigger file format');
    }

    // Process...
}
```

### Configuration Tuning

**Stability threshold vs. file size:**
```javascript
// Small files (< 10KB): 200-300ms sufficient
awaitWriteFinish: { stabilityThreshold: 200 }

// Medium files (10-100KB): 500ms safe default
awaitWriteFinish: { stabilityThreshold: 500 }

// Large files (> 100KB): 1000ms+ recommended
awaitWriteFinish: { stabilityThreshold: 1000 }
```

**Poll interval:**
```javascript
// Faster polling = quicker detection, higher CPU
pollInterval: 50   // Check every 50ms (more responsive)

// Slower polling = lower CPU, slightly slower detection
pollInterval: 200  // Check every 200ms (more efficient)
```

### Testing

**Verify `awaitWriteFinish` works:**
```bash
# Start watcher
npm run watch-automation

# In another terminal, create large file slowly
dd if=/dev/zero of=sessions/tasks/test.md bs=1K count=100

# Watcher should NOT trigger until write completes
# Check logs - should show ~500ms delay after creation
```

### Related Files

- `scripts/watch-cursor-automation.js` - Uses `awaitWriteFinish` (line 150-183)
- `sessions/tasks/m-unified-cursor-automation.md` - Implementation spec
- `context/insights.md` - "Trigger File Pattern for IDE Automation"

---

*More gotchas will be added as they are discovered during framework development and usage.*

## Orchestrator Agent Spawning Path Doubling Bug

**Issue Discovered:** 2025-11-17
**Severity:** Critical - All agents stuck, zero task completions

### The Problem

The multi-agent orchestrator was creating doubled paths when spawning Claude CLI agents, causing all agents to get stuck trying to open non-existent files:

```bash
# WRONG (bug):
claude @sessions/tasks/sessions/tasks/m-unified-cursor-automation.md

# RIGHT (expected):
claude @sessions/tasks/m-unified-cursor-automation.md
```

**Impact:** All 3 agents stuck for 5+ hours with zero task completions despite orchestrator showing "working" status.

### Root Cause

**File:** `scripts/agent-orchestrator.js`
**Lines:** 267, 274

```javascript
// Line 267: Compute relative path from PROJECT_ROOT
const taskPath = path.relative(PROJECT_ROOT, task.path);
// Result: "sessions/tasks/filename.md"

// Line 274: DOUBLED PATH BUG
const agentProcess = spawn(claudeCmd, [
    '--dangerously-skip-permissions',
    `@sessions/tasks/${taskPath}`  // BUG: Prepends "sessions/tasks/" again!
]);
// Result: "@sessions/tasks/sessions/tasks/filename.md"
```

**Why It Happened:**
1. Task queue stores both `path` (absolute) and `relativePath` (filename only)
2. Code computed relative path from absolute path → `sessions/tasks/filename.md`
3. Then prepended `sessions/tasks/` again → doubled path
4. Should have used `task.relativePath` (just the filename) instead

### The Fix

**Applied:** 2025-11-17 in REPAIR-orchestrator-queue-path-format task

```javascript
// BEFORE (wrong):
`@sessions/tasks/${taskPath}`

// AFTER (correct):
`@sessions/tasks/${task.relativePath}`
```

**Verification:**
```bash
# After fix, agents spawn with correct paths:
$ ps aux | grep "claude.*@sessions/tasks"
claude @sessions/tasks/m-fix-missing-ccpm-next-script.md  # ✅ Single prefix
```

### Prevention

**1. Use data structure fields directly**
```javascript
// ✅ CORRECT - Use existing relativePath field
`@sessions/tasks/${task.relativePath}`

// ❌ WRONG - Compute path that already includes directory
const taskPath = path.relative(PROJECT_ROOT, task.path);
`@sessions/tasks/${taskPath}`  // Doubles the prefix!
```

**2. Verify spawned process paths**
```bash
# After code changes, check actual process commands:
ps aux | grep "claude.*@sessions/tasks"

# Should show single prefix, not doubled
```

**3. Restart orchestrator after code changes**
- Code changes don't affect running Node.js processes
- Must kill and restart to pick up new code
- Also clear `.orchestrator-state.json` to avoid stale state

**4. Test with fresh state**
```bash
# Clear state before testing
rm sessions/tasks/.orchestrator-state.json

# Start orchestrator
npm run orchestrator

# Verify agents spawn correctly within 10 seconds
ps aux | grep claude
```

### Related Files

- `scripts/agent-orchestrator.js:274` - Fixed line
- `sessions/tasks/REPAIR-orchestrator-queue-path-format.md` - REPAIR task
- `sessions/tasks/.task-queues.json` - Queue data structure showing path/relativePath fields
- `context/gotchas.md` - This entry

## Task TEMPLATE YAML Parsing Failure: 2025-11-16 [RESOLVED]

**Problem:** Task template with `[placeholder]` syntax causes YAML parsing failures

**Symptom:**
- Agents crash when reading TEMPLATE.md
- Error: "bad indentation of a mapping entry"
- Template values like `name: [prefix]-[descriptive-name]` fail

**Root Cause:**
- Square brackets in YAML are array delimiters
- Unquoted `[placeholder]` values interpreted as malformed arrays
- YAML parser expects either quoted strings or valid array syntax

**Fix Applied (2025-11-16):**
```yaml
# ❌ WRONG - causes parsing error
name: [prefix]-[descriptive-name]
depends_on: [task-file-1, task-file-2]

# ✅ CORRECT - quoted template values
name: "[prefix]-[descriptive-name]"
depends_on: []  # Empty array with example in comment
```

**Prevention:**
- Always quote YAML values containing special characters
- Use empty arrays `[]` instead of inline placeholder arrays
- Validate frontmatter with YAML parser before committing templates
- Run `npm run validate-frontmatter` to catch issues early

**Resolution:**
- Fixed in REPAIR-orchestrator-health-2025-11-16 (completed 2025-11-16)
- TEMPLATE.md updated with quoted template values
- Agents now parse TEMPLATE.md without errors
- Documented in operator guide and CLAUDE.md troubleshooting section

---

## Task Dependency Circular References: 2025-11-16 [RESOLVED]

**Problem:** Circular `depends_on` relationships deadlock entire orchestrator

**Symptom:**
- Orchestrator shows "All tasks in context queue are blocked by dependencies"
- 100+ tasks processed, 0 completed (0% success rate)
- Agents stuck waiting indefinitely for blocker tasks
- No visible errors, just infinite waiting

**Root Cause:**
- Task A depends on Task B
- Task B depends on Task C
- Task C depends on Task A (circular loop)
- Orchestrator correctly respects dependencies but can't break circular chains
- No cycle detection at startup or runtime

**Fix Applied (2025-11-16):**
```bash
# Quick fix: Reset task queues (backup first)
cp sessions/tasks/.task-queues.json sessions/tasks/.task-queues.json.backup-$(date +%Y%m%d-%H%M%S)
rm sessions/tasks/.task-queues.json
pm2 restart orchestrator
```

**Prevention:**
- Run `node scripts/dependency-graph.js` before starting orchestrator
- Add circular dependency validation to queue manager startup (future enhancement)
- Document dependency relationships in task planning phase
- Use `depends_on` sparingly - prefer priority/leverage ordering

**Resolution:**
- Fixed in REPAIR-orchestrator-health-2025-11-16 (completed 2025-11-16)
- Task queues reset to clear circular dependency deadlock
- Orchestrator restarted cleanly with 101 context tasks, 1 implementation task
- Agents successfully assigned tasks after reset
- Documented recovery procedure in operator guide and CLAUDE.md troubleshooting section

**Context:** REPAIR-orchestrator-health-2025-11-16, affects h-multi-agent-orchestration.md
