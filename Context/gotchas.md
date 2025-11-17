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

*More gotchas will be added as they are discovered during framework development and usage.*
