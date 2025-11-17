---
name: cc-sessions-advanced
title: "cc-sessions: State, Hooks & Task Lifecycle"
duration: 20
prerequisites: ["cc-sessions-basics"]
next_module: pm-workflows
---

# Module 3: cc-sessions Advanced

**Duration:** 20 minutes
**Prerequisites:** cc-sessions basics completed

---

## Learning Objectives

By the end of this module, you will:

✅ Understand state management and session resumption
✅ Know how the hook system works
✅ Learn complete task lifecycle protocols
✅ Get introduced to multi-agent orchestration

---

## Part 1: State Management (6 minutes)

### The State File: `sessions/sessions-state.json`

This file is your framework's **memory checkpoint**. It tracks where you are and what you're doing.

**Purpose:**
- Remember current mode and task
- Enable work resumption after interruptions
- Provide crash recovery
- Support multi-session workflows

### State File Structure

```json
{
  "mode": "IMPLEMENT",
  "task_id": "add-jwt-auth",
  "last_todo_completed": 3,
  "timestamp": "2025-01-27T14:30:00Z",
  "last_file_modified": "src/middleware/jwt.ts"
}
```

**Fields:**
- `mode` - Current DAIC mode (DISCUSS, ALIGN, IMPLEMENT, CHECK)
- `task_id` - Active task manifest name
- `last_todo_completed` - Index of last completed todo (for resumption)
- `timestamp` - Last state update time
- `last_file_modified` - Most recent file changed (helpful context)

### When State Updates

State is automatically saved:
- ✅ On every DAIC mode transition
- ✅ After completing each todo item
- ✅ Before complex multi-step operations
- ✅ When context usage exceeds 50%
- ✅ On manual "save state" request

### Resumption Example

**Session 1 (interrupted):**
```
You: "start^ add-jwt-auth"
AI: Task started, entering DISCUSS...
AI: [Reads code, discusses approach]
You: "yert"
AI: Entering IMPLEMENT...
AI: [Completes todos 1-3 of 8]

[Session crashes / you close terminal]

State saved:
{
  "mode": "IMPLEMENT",
  "task_id": "add-jwt-auth",
  "last_todo_completed": 3,
  ...
}
```

**Session 2 (resume):**
```
You: "start^ add-jwt-auth"

AI: "Resuming task add-jwt-auth from state checkpoint.
     Last completed: Todo 3 (Create JWT middleware)
     Remaining: 5 todos
     Mode: IMPLEMENT

     Continue from todo 4?"

You: "yes"
AI: [Continues where it left off]
```

---

## Part 2: Hook System Internals (6 minutes)

### What Are Hooks?

**Hooks** are JavaScript scripts that run automatically at specific points in the Claude Code workflow.

**Purpose:**
- Enforce DAIC discipline (write-gating)
- Detect trigger phrases
- Update state automatically
- Validate operations
- Provide safety guardrails

### Hook Types

```
sessions/hooks/
├── session_start.js       # Runs on new Claude Code session
├── user_messages.js       # Runs after user sends message
├── post_tool_use.js       # Runs after every tool invocation
├── sessions_enforce.js    # Enforces DAIC rules
├── shared_state.js        # State management utilities
└── subagent_hooks.js      # Multi-agent coordination
```

### Hook Execution Flow

```
You: "yert"  (implementation trigger)
    │
    ▼
user_messages.js
    │ Detects "yert" in message
    │ Matches trigger_phrases.implementation_mode
    ▼
sessions_enforce.js
    │ Validates mode transition allowed
    │ Checks task manifest exists
    ▼
shared_state.js
    │ Updates sessions-state.json:
    │   mode: "DISCUSS" → "IMPLEMENT"
    │   timestamp: [now]
    ▼
Response to user:
"Entering IMPLEMENT mode. Write tools now active."
```

### Write-Gating Enforcement

**How write-gating works:**

```javascript
// In post_tool_use.js (simplified)
if (tool === 'Write' || tool === 'Edit' || tool === 'MultiEdit') {
  const state = loadState();

  if (state.mode !== 'IMPLEMENT') {
    throw new Error(`
      🚫 Write blocked: You are in ${state.mode} mode.
      Use trigger phrase '${config.trigger_phrases.implementation_mode}'
      to enter IMPLEMENT mode.
    `);
  }

  if (!state.task_id) {
    throw new Error(`
      🚫 Write blocked: No active task manifest.
      Create a task in ALIGN mode first.
    `);
  }
}
```

**Result:** Write tools physically cannot execute outside IMPLEMENT mode. The framework blocks them before they run.

### Custom Hook Development (Overview)

You can create custom hooks for project-specific needs:

**Example: Custom validation hook**
```javascript
// sessions/hooks/custom_validation.js
module.exports = async function() {
  const state = loadState();

  // Custom rule: Block Friday deployments
  if (state.task_id.includes('deploy') && isFriday()) {
    return {
      allow: false,
      message: "🚫 No Friday deploys! (team policy)"
    };
  }

  return { allow: true };
};
```

**Note:** Advanced topic - see `claude-reference.md` for full hook development guide.

---

## Part 3: Task Lifecycle Protocols (5 minutes)

### Complete Task Journey

```
1. Creation → 2. Startup → 3. Execution → 4. Completion
```

### 1. Task Creation (ALIGN mode)

**Manual creation:**
```markdown
sessions/tasks/my-feature.md

---
name: my-feature
branch: feature/my-feature
status: pending
priority: medium
---

# My Feature

## Success Criteria
- [ ] Criteria 1
- [ ] Criteria 2

## Todos
- [ ] Todo 1
- [ ] Todo 2
```

**Or via CCPM:**
```
You: "parse PRD my-feature"
AI: [Generates task manifest automatically]
```

### 2. Task Startup

**Protocol:**
```
You: "start^ my-feature"

AI performs:
1. Validates task manifest exists
2. Creates git branch (if branch_enforcement enabled)
3. Loads task into sessions-state.json
4. Enters DISCUSS mode
5. Confirms startup successful

State after startup:
{
  "mode": "DISCUSS",
  "task_id": "my-feature",
  "last_todo_completed": 0,
  ...
}
```

### 3. Task Execution (DAIC cycle)

**Normal flow:**
```
DISCUSS (read, understand)
    ↓
ALIGN (refine plan, update manifest if needed)
    ↓
IMPLEMENT (execute todos one-by-one)
    ↓ [Complete all todos]
    ↓
CHECK (verify, test, document)
```

**State updates during execution:**
```
After todo 1 complete:
{
  "mode": "IMPLEMENT",
  "task_id": "my-feature",
  "last_todo_completed": 1,  ← incremented
  "last_file_modified": "src/app.ts",
  ...
}

After todo 2 complete:
{
  ...
  "last_todo_completed": 2,  ← incremented
  "last_file_modified": "src/tests/app.test.ts",
  ...
}
```

### 4. Task Completion

**Protocol:**
```
You: "finito"  (completion trigger)

AI performs:
1. Verifies all todos complete
2. Checks success criteria met
3. Runs final tests (if configured)
4. Updates LCMP files (if needed)
5. Commits changes (per git preferences)
6. Merges branch (if auto_merge enabled)
7. Pushes to remote (if auto_push enabled)
8. Marks task status: "completed"
9. Resets state to DISCUSS with no task

State after completion:
{
  "mode": "DISCUSS",
  "task_id": null,  ← cleared
  "last_todo_completed": 0,  ← reset
  ...
}
```

---

## Part 4: Multi-Agent Orchestration (Overview, 3 minutes)

### The Multi-Agent System

The framework includes an **automated task distribution system** that runs multiple Claude Code agents in parallel.

**Components:**
1. **File Watcher** - Monitors `sessions/tasks/` for new task files
2. **Task Queue Manager** - Maintains context & implementation queues
3. **Agent Orchestrator** - Manages pool of 3 agents
4. **Dependency Graph** - Resolves task dependencies

### How It Works

```
New task file created
    │
    ▼
File Watcher detects it
    │ Logs to .new-tasks.log
    ▼
Queue Manager picks it up
    │ Routes to context or implementation queue
    ▼
Orchestrator assigns to idle agent
    │ Agent 1, 2, or 3
    ▼
Agent executes using DAIC workflow
    │ DISCUSS → ALIGN → IMPLEMENT → CHECK
    ▼
Agent completes and returns to idle
```

### Queue Routing Logic

**Context Queue** (context_gathered: false)
- Tasks need research/exploration first
- Agent reads code, gathers requirements
- Updates task with "Context Manifest" section
- Moves to implementation queue when done

**Implementation Queue** (context_gathered: true)
- Context already gathered
- Ready for IMPLEMENT execution
- Agent follows approved plan

### Operating the Orchestrator

**Start orchestrator:**
```bash
npm run orchestrator
```

**Monitor status:**
```bash
npm run orchestrator-status

Output:
╔═══════════════════════════════════════════╗
║    Multi-Agent Orchestrator Status        ║
╠═══════════════════════════════════════════╣
║ Agent 1: [IDLE]                           ║
║ Agent 2: [WORKING] jwt-middleware (45%)   ║
║ Agent 3: [WORKING] oauth-strategy (20%)   ║
║                                           ║
║ Context Queue: 2 tasks                    ║
║ Implementation Queue: 3 tasks             ║
║ Completed: 12 tasks                       ║
╚═══════════════════════════════════════════╝
```

**Note:** This is an advanced feature. For hands-on practice, see `docs/multi-agent-orchestration-operator-guide.md`.

---

## Part 5: Hands-On Exercise (Optional, bonus time)

### Exercise: State Inspection

Let's examine the real state file:

```bash
# View current state
cat sessions/sessions-state.json | jq

# Watch state updates in real-time
watch -n 1 'cat sessions/sessions-state.json | jq'
```

**Tasks:**
1. Start a task and observe state change
2. Enter IMPLEMENT mode and observe mode change
3. Complete a todo and observe last_todo_completed increment
4. Complete task and observe state reset

---

## Key Takeaways

✅ **State file** - Checkpoint system for resumption (`sessions-state.json`)
✅ **Hooks** - Automatic enforcement of DAIC discipline
✅ **Task lifecycle** - Creation → Startup → Execution → Completion
✅ **Write-gating** - Hooks physically block write tools outside IMPLEMENT
✅ **Multi-agent** - Parallel task execution across agent pool (overview)

### Why Advanced Features Matter

**State Management:**
- Work interrupted? Resume exactly where you left off
- No lost progress
- Safe crash recovery

**Hook System:**
- Mistakes prevented automatically
- No accidental file modifications
- Consistent DAIC enforcement

**Task Lifecycle:**
- Structured workflows
- Git automation
- Repeatable processes

**Multi-Agent Orchestration:**
- Parallel execution (3x speedup)
- Automatic task distribution
- Scale your workflow

---

## Module Summary

You've completed cc-sessions advanced! You now understand:

✅ State management and resumption
✅ Hook system internals
✅ Complete task lifecycle
✅ Multi-agent orchestration overview

### What's Next

You can now:

**Option A: Continue Core Path**
- Module 4: PM Workflows (CCPM)
- Module 5: ContextKit Intro
- Module 6: Unified Workflow
- Module 7: Configuration

**Option B: Deep Dive (Optional)**
- Custom hook development
- Multi-agent orchestrator setup
- Agent registry management
- Advanced LCMP patterns

---

## Navigation

**Current Module:** cc-sessions Advanced (3/7)
**Progress:** 28% → 42% (after completion)

**Actions:**
- Type `[Next]` to continue to Module 4: PM Workflows
- Type `[Skip]` to skip PM/ContextKit and go to Configuration
- Type `[Back]` to review cc-sessions Basics
- Type `[Help]` for all navigation commands
- Type `[Quit]` to save progress and exit

---

**Pro Tip:** After completing onboarding, try running the multi-agent orchestrator for a real task. The parallel execution is impressive to watch!

**Module Complete!** 🎉
You understand the advanced cc-sessions features.

→ **Type `[Next]` to continue to PM Workflows**
