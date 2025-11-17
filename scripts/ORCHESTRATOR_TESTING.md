# Orchestrator Runtime Testing Guide

## Overview

This guide covers end-to-end testing of the multi-agent orchestration system with real Claude CLI agents.

## Prerequisites

1. **Task Watcher NOT Required** - Test tasks are pre-logged in `.new-tasks.log`
2. **Claude CLI Available** - Ensure `claude` command is in PATH
3. **Node.js Dependencies Installed** - Run `npm install` in `scripts/`
4. **Test Tasks Created:**
   - `sessions/tasks/orchestrator-test-context.md` (context_gathered: false)
   - `sessions/tasks/orchestrator-test-impl.md` (context_gathered: true)

## Test Workflow

### 1. Start Orchestrator (Foreground Mode)

```bash
cd /Users/grandinharrison/Desktop/claude-code-projects/claude-chaos-express/scripts
node agent-orchestrator.js
```

**Expected Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 Agent Orchestrator Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 Initializing Agent Pool (3 agents, mode: local)

  💤 agent-1: idle (0 tasks completed)
  💤 agent-2: idle (0 tasks completed)
  💤 agent-3: idle (0 tasks completed)

📋 Scanned 2 new task(s)

🎯 Assigning Task to agent-1
  Role: Context Gathering
  Task: orchestrator-test-context.md
  Queue: context

⏱️  agent-1 starting work (local mode)
```

### 2. Monitor Agent Execution

Watch console output for:
- Agent spawning (`claude` process starts)
- Context gathering completion
- Flag update (`context_gathered: false` → `true`)
- Queue transition (context → implementation)
- Implementation agent assignment
- Task completion and agent cleanup

### 3. Verify Queue Transitions

Open a **second terminal** and monitor orchestrator status:

```bash
cd /Users/grandinharrison/Desktop/claude-code-projects/claude-chaos-express/scripts
node orchestrator-status.js
```

**Expected Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Orchestrator Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Running: ✅ Yes
Last Updated: 2025-11-16T...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👥 Agent Pool Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

agent-1    ⚙️  working    context    orchestrator-test-context.md    0
agent-2    💤  idle       -          -                               0
agent-3    💤  idle       -          -                               0

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Queue Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Context Queue:        1 task(s)
Implementation Queue: 1 task(s)

Tasks:
  📝 orchestrator-test-context.md (context queue)
  ✅ orchestrator-test-impl.md (implementation queue)
```

### 4. Verify Test Results

After both agents complete, check task files:

**Context Task** (`sessions/tasks/orchestrator-test-context.md`):
- Should have "Context Manifest" section filled by agent
- Frontmatter should show `context_gathered: true`

**Implementation Task** (`sessions/tasks/orchestrator-test-impl.md`):
- Should have "Implementation Results" section filled
- Frontmatter should show `status: completed`

### 5. Check State Files

Verify orchestrator state persistence:

```bash
# View orchestrator state
cat sessions/tasks/.orchestrator-state.json

# View queue state
cat sessions/tasks/.task-queues.json
```

## Expected End State

After successful test run:

**Orchestrator State:**
```json
{
  "agents": [
    {
      "id": "agent-1",
      "status": "idle",
      "currentTask": null,
      "role": null,
      "completedTasks": 1,
      "pid": null
    },
    {
      "id": "agent-2",
      "status": "idle",
      "currentTask": null,
      "role": null,
      "completedTasks": 1,
      "pid": null
    },
    {
      "id": "agent-3",
      "status": "idle",
      "currentTask": null,
      "role": null,
      "completedTasks": 0,
      "pid": null
    }
  ],
  "completedTasks": [
    "orchestrator-test-context.md",
    "orchestrator-test-impl.md"
  ]
}
```

**Queue State:**
```json
{
  "contextQueue": [],
  "implementationQueue": [],
  "processedTasks": [
    "orchestrator-test-context.md",
    "orchestrator-test-impl.md"
  ]
}
```

## Failure Testing

### Test Agent Crash Recovery

1. While an agent is running, manually kill the Claude process:

```bash
# Find Claude process PID
ps aux | grep "claude.*orchestrator-test"

# Kill process
kill -9 <PID>
```

2. Verify orchestrator detects failure and logs to `context/gotchas.md`
3. Verify task is NOT marked complete in queue
4. Verify agent is marked idle and available for reassignment

### Test Agent Timeout

Modify CONFIG in agent-orchestrator.js:
```javascript
contextTaskTimeout: 5000,  // 5 seconds for testing
```

Create a task that will exceed timeout and verify:
- Agent is killed after timeout
- SIGTERM sent first, SIGKILL after 5 seconds if still alive
- Failure logged to gotchas.md

### Test State Recovery

1. Stop orchestrator (Ctrl+C)
2. Restart orchestrator
3. Verify state loaded from `.orchestrator-state.json`
4. Verify queues loaded from `.task-queues.json`
5. Verify agents resume from saved state

## Cleanup

After testing, clean up test files:

```bash
# Remove test tasks
rm sessions/tasks/orchestrator-test-*.md

# Remove test log entries
rm sessions/tasks/.new-tasks.log

# Reset orchestrator state
rm sessions/tasks/.orchestrator-state.json
rm sessions/tasks/.task-queues.json
```

## Critical: Race Condition Testing (Phase 3 Discovery)

### The Bug (Discovered 2025-11-16)

During Phase 3 runtime testing, we discovered a **critical race condition** where multiple agents were assigned the same task simultaneously. This bug was NOT caught by 152 passing unit/integration tests because it only manifests during actual concurrent agent execution with real process spawning.

**Symptoms:**
- All 3 agents assigned `orchestrator-test-impl.md` at the same time (PIDs: 70487, 70572, 70679)
- Implementation queue still contained the task after assignment
- Assignment loop repeatedly assigned the same task before any agent completed

**Root Cause:**
Tasks were removed from queue only AFTER agent completion (`handleAgentCompletion()`), not upon assignment. The timing gap between spawning an agent (milliseconds) and the agent completing work (minutes to hours) allowed the assignment loop to run multiple times and assign the same task repeatedly.

### Verifying the Fix

The fix moves `removeFromQueue()` from `handleAgentCompletion()` to `assignTaskToAgent()` (line 191), making assignment atomic with queue removal.

**To verify the fix is working:**

1. **Monitor queue state during assignment:**
   ```bash
   # Terminal 1: Run orchestrator
   node agent-orchestrator.js

   # Terminal 2: Watch queue file in real-time
   watch -n 0.5 'cat sessions/tasks/.task-queues.json | jq'
   ```

2. **Expected behavior:**
   - Task appears in queue BEFORE assignment
   - Task DISAPPEARS from queue IMMEDIATELY when agent assigned
   - Task does NOT reappear in queue (even though agent hasn't completed yet)
   - Queue remains empty until agent completes (no duplicate entries)

3. **Warning signs of regression:**
   - Multiple agents show same `currentTask` in orchestrator-status.js
   - Queue still contains task after "🎯 Assigning Task to..." message
   - Same task PID appears multiple times in process list: `ps aux | grep "claude.*orchestrator-test"`

### Testing for Duplicate Assignment

**Stress Test:**
```bash
# Create 10 identical implementation tasks
for i in {1..10}; do
  cp sessions/tasks/orchestrator-test-impl.md sessions/tasks/test-task-$i.md
  sed -i '' "s/orchestrator-test-impl/test-task-$i/" sessions/tasks/test-task-$i.md
  echo "[$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")] New task detected: test-task-$i.md" >> sessions/tasks/.new-tasks.log
done

# Run orchestrator and verify each task assigned to DIFFERENT agent
node agent-orchestrator.js
```

**Expected:**
- Each agent gets ONE unique task
- No agent has duplicate currentTask
- Queue empties as tasks are assigned (not after completion)

**Failure (if bug regresses):**
- Multiple agents assigned to same task
- Queue contains tasks already assigned to working agents

### Lessons Learned

**For queue-based assignment systems with long-running workers:**

1. **Always remove items from queue IMMEDIATELY upon assignment, not upon completion**
   - Assignment and queue removal must be atomic
   - The time gap between assignment and completion is where race conditions hide

2. **Unit/integration tests won't catch this:**
   - Requires runtime testing with real concurrent workers
   - Simulated/mocked agents complete too quickly to expose the race

3. **Defensive checks are not enough:**
   - Lines 164-171 in agent-orchestrator.js have a defensive check to prevent duplicate assignment
   - This is "belt-and-suspenders" - the real fix is atomic queue removal

4. **Consider optimistic locking for distributed systems:**
   - For multi-orchestrator setups, use database transactions or distributed locks
   - File-based queues work for single-process orchestrators only

## Success Criteria

- [x] Orchestrator spawns real Claude CLI agents
- [x] Context-gathering agent completes and updates flag
- [x] Task transitions from context → implementation queue
- [x] Implementation agent picks up and completes task
- [x] State persists across orchestrator restarts
- [x] **No duplicate task assignments** (race condition fix verified)
- [ ] Agent crash recovery works correctly
- [ ] Agent timeout handling works correctly
- [ ] All agents return to idle after completion

## Troubleshooting

**Orchestrator doesn't start:**
- Check `claude` is in PATH: `which claude`
- Verify Node.js dependencies: `npm install` in scripts/
- Check for port conflicts or locked state files

**Agents don't spawn:**
- Verify test tasks exist in `sessions/tasks/`
- Check `.new-tasks.log` has task entries
- Verify queue routing logic (check console output)

**Tasks stuck in queue:**
- Check agent status: `node orchestrator-status.js`
- Verify no agents in 'failed' state
- Check task frontmatter for dependency issues

**Context gathering doesn't update flag:**
- Manually verify agent actually runs
- Check agent stdout/stderr for errors
- Verify file permissions on task files
