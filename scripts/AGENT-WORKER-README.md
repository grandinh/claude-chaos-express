# Continuous Agent Worker

## Overview

The Continuous Agent Worker automatically monitors all agents and assigns new tasks when they complete their current work. This keeps agents working constantly without manual intervention.

## Status

**✅ Worker is RUNNING**

- Checks every 30 seconds for agent readiness
- Automatically assigns next tasks
- Logs all activity to `sessions/tasks/agent-worker.log`

## Quick Commands

### Check Status
```bash
./scripts/agent-status.sh
```

### Start Worker (if not running)
```bash
nohup ./scripts/agent-continuous-worker.sh 30 > /dev/null 2>&1 &
```

### Stop Worker
```bash
pkill -f agent-continuous-worker
```

### View Logs
```bash
tail -f sessions/tasks/agent-worker.log
```

## How It Works

1. **Monitoring**: Worker checks every 30 seconds if any agent is ready for a new task
2. **Detection**: An agent is "ready" when:
   - Status is "idle" (task completed)
   - Current task is null/empty
   - Task lock removed but not marked complete
3. **Assignment**: When ready, worker automatically:
   - Gets next available task from agent's assignment list
   - Locks the task
   - Updates progress file
   - Creates notification file: `.agent-<ID>-next-task.txt`

## Agent Workflow

### For Agents (in Cursor windows):

1. **Complete your current task:**
   ```bash
   ./scripts/agent-workflow.sh <AGENT_ID> complete
   ```
   This will:
   - Unlock the task
   - Commit changes
   - Mark task as complete in progress

2. **Worker automatically assigns next task** (within 30 seconds)

3. **Check for new task notification:**
   ```bash
   cat sessions/tasks/.agent-<AGENT_ID>-next-task.txt
   ```

4. **Or manually get next task:**
   ```bash
   ./scripts/agent-workflow.sh <AGENT_ID> next
   ```

## Current Agent Status

- **Agent 1**: `REPAIR-pause-detection-robustness.md` (in-progress)
- **Agent 2**: `REPAIR-code-review-findings-workflow.md` (in-progress)
- **Agent 3**: `REPAIR-context-lcmp-path-sync.md` (in-progress)

## Configuration

- **Check Interval**: 30 seconds (configurable via script argument)
- **Log File**: `sessions/tasks/agent-worker.log`
- **Progress File**: `sessions/tasks/agent-progress.json`

## Troubleshooting

### Worker not running?
```bash
# Check if process exists
ps aux | grep agent-continuous-worker

# Restart if needed
nohup ./scripts/agent-continuous-worker.sh 30 > /dev/null 2>&1 &
```

### Agent stuck?
```bash
# Check agent status
./scripts/agent-workflow.sh <AGENT_ID> status

# Manually assign next task
./scripts/agent-workflow.sh <AGENT_ID> next
```

### View all logs
```bash
tail -f sessions/tasks/agent-worker.log
```

