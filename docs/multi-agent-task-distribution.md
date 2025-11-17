# Multi-Agent Task Distribution Guide

**Purpose:** Load balance task preparation work across multiple Cursor agents

---

## Overview

This guide explains how to distribute the 33+ tasks that need preparation across multiple Cursor instances working in parallel.

---

## Prerequisites

1. **Task Orchestrator** - Already implemented (`scripts/task-orchestrator.js`)
2. **Task Dependencies** - Tracked in `sessions/tasks/dependencies.yaml`
3. **Multiple Cursor Instances** - Each agent runs in a separate Cursor window

---

## Step 1: Identify Parallelizable Tasks

Use the task orchestrator to find tasks that can run in parallel:

```bash
# Get parallel execution groups
node scripts/task-orchestrator.js \
  --filter-status pending \
  --show-parallel \
  --format json > task-groups.json
```

This will output:
- **Level 0:** Tasks with no dependencies (can all run in parallel)
- **Level 1:** Tasks that depend on Level 0 (can run in parallel after Level 0 completes)
- **Level 2+:** Subsequent dependency levels

---

## Step 2: Create Task Assignment Plan

### Option A: Manual Assignment (Recommended for Start)

Create a simple assignment file:

**File:** `sessions/tasks/agent-assignments.json`

```json
{
  "agent-1": {
    "tasks": [
      "h-implement-code-search-parallelization.md",
      "h-implement-parallel-agent-invocation.md",
      "h-implement-skill-validation-script.md"
    ],
    "status": "pending"
  },
  "agent-2": {
    "tasks": [
      "h-create-health-check-script.md",
      "h-create-quick-start-guide.md",
      "h-create-troubleshooting-guide.md"
    ],
    "status": "pending"
  },
  "agent-3": {
    "tasks": [
      "m-implement-task-registry.md",
      "m-implement-task-dependency-graph.md",
      "l-implement-context-caching.md"
    ],
    "status": "pending"
  }
}
```

### Option B: Automated Assignment Script

Create `scripts/assign-tasks-to-agents.js`:

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const TASKS_DIR = path.join(PROJECT_ROOT, 'sessions', 'tasks');
const NUM_AGENTS = parseInt(process.argv[2]) || 3;

// Get parallel execution groups
const output = execSync(
  `node scripts/task-orchestrator.js --filter-status pending --show-parallel --format json`,
  { cwd: PROJECT_ROOT, encoding: 'utf8' }
);

const data = JSON.parse(output);
const assignments = {};

// Distribute tasks across agents
let agentId = 0;
for (const level of data.levels || []) {
  if (level.parallelizable) {
    for (const task of level.tasks) {
      const agentKey = `agent-${(agentId % NUM_AGENTS) + 1}`;
      if (!assignments[agentKey]) {
        assignments[agentKey] = { tasks: [], status: 'pending' };
      }
      assignments[agentKey].tasks.push(task.file);
      agentId++;
    }
  }
}

// Save assignments
const assignmentsFile = path.join(TASKS_DIR, 'agent-assignments.json');
fs.writeFileSync(assignmentsFile, JSON.stringify(assignments, null, 2));
console.log(`Created assignments for ${NUM_AGENTS} agents`);
console.log(`Saved to: ${assignmentsFile}`);
```

---

## Step 3: Setup Each Cursor Agent

### For Each Agent (Agent 1, Agent 2, Agent 3, etc.)

1. **Open a separate Cursor window**
2. **Navigate to the project directory**
3. **Load your assigned tasks:**

```bash
# Agent 1
cat sessions/tasks/agent-assignments.json | jq '.["agent-1"].tasks[]'

# Agent 2  
cat sessions/tasks/agent-assignments.json | jq '.["agent-2"].tasks[]'

# Agent 3
cat sessions/tasks/agent-assignments.json | jq '.["agent-3"].tasks[]'
```

4. **Start working on your first task:**

Each agent should:
- Read the task file completely
- Follow `TASK-PREPARATION-GUIDE.md` requirements
- Add "## Complete Implementation Code" section
- Include complete, working code (not pseudocode)
- Update task status when done

---

## Step 4: Coordination Mechanisms

### File-Level Locking (Simple Approach)

Before editing a task file, check if it's locked:

```bash
# Check for lock file
if [ -f "sessions/tasks/.lock-${TASK_FILE}" ]; then
  echo "Task is locked by another agent"
  exit 1
fi

# Create lock
touch "sessions/tasks/.lock-${TASK_FILE}"

# Work on task...

# Remove lock when done
rm "sessions/tasks/.lock-${TASK_FILE}"
```

### Progress Tracking

Each agent updates a progress file:

**File:** `sessions/tasks/agent-progress.json`

```json
{
  "agent-1": {
    "current_task": "h-implement-code-search-parallelization.md",
    "status": "in-progress",
    "started": "2025-01-27T10:00:00Z",
    "completed": [],
    "blocked": []
  },
  "agent-2": {
    "current_task": "h-create-health-check-script.md",
    "status": "in-progress",
    "started": "2025-01-27T10:00:00Z",
    "completed": [],
    "blocked": []
  }
}
```

### Git Coordination

**CRITICAL:** Each agent should work on a separate branch:

```bash
# Agent 1
git checkout -b agent-1/task-preparation
git add sessions/tasks/h-implement-code-search-parallelization.md
git commit -m "Agent 1: Prepare h-implement-code-search-parallelization"

# Agent 2
git checkout -b agent-2/task-preparation
git add sessions/tasks/h-create-health-check-script.md
git commit -m "Agent 2: Prepare h-create-health-check-script"

# Agent 3
git checkout -b agent-3/task-preparation
git add sessions/tasks/m-implement-task-registry.md
git commit -m "Agent 3: Prepare m-implement-task-registry"
```

**Merge Strategy:**
- Each agent commits to their own branch
- Human reviews and merges when ready
- Resolve conflicts manually if multiple agents touch same file

---

## Step 5: Task Assignment Script

Create a helper script for easy task assignment:

**File:** `scripts/assign-next-task.sh`

```bash
#!/bin/bash

AGENT_ID=${1:-1}
AGENT_KEY="agent-${AGENT_ID}"
ASSIGNMENTS_FILE="sessions/tasks/agent-assignments.json"
PROGRESS_FILE="sessions/tasks/agent-progress.json"

# Load assignments
ASSIGNED_TASKS=$(cat "$ASSIGNMENTS_FILE" | jq -r ".[\"${AGENT_KEY}\"].tasks[]")

# Find next uncompleted task
for task in $ASSIGNED_TASKS; do
  # Check if task is completed
  COMPLETED=$(cat "$PROGRESS_FILE" 2>/dev/null | jq -r ".[\"${AGENT_KEY}\"].completed[]" | grep -q "$task" && echo "yes" || echo "no")
  
  # Check if task is locked
  LOCKED=$(test -f "sessions/tasks/.lock-${task}" && echo "yes" || echo "no")
  
  if [ "$COMPLETED" = "no" ] && [ "$LOCKED" = "no" ]; then
    echo "$task"
    exit 0
  fi
done

echo "No available tasks for $AGENT_KEY"
exit 1
```

**Usage:**
```bash
# Agent 1 gets next task
NEXT_TASK=$(./scripts/assign-next-task.sh 1)
echo "Agent 1: Work on $NEXT_TASK"

# Agent 2 gets next task
NEXT_TASK=$(./scripts/assign-next-task.sh 2)
echo "Agent 2: Work on $NEXT_TASK"
```

---

## Step 6: Workflow for Each Agent

### Agent Workflow

1. **Get your next task:**
   ```bash
   NEXT_TASK=$(./scripts/assign-next-task.sh <AGENT_ID>)
   ```

2. **Lock the task:**
   ```bash
   touch "sessions/tasks/.lock-${NEXT_TASK}"
   ```

3. **Read the task file:**
   ```bash
   cat "sessions/tasks/${NEXT_TASK}"
   ```

4. **Follow TASK-PREPARATION-GUIDE.md:**
   - Add complete implementation code
   - Include all file paths
   - Add error handling
   - Document dependencies
   - Add testing steps

5. **Update progress:**
   ```bash
   # Update agent-progress.json
   # Mark task as completed
   ```

6. **Commit to your branch:**
   ```bash
   git add "sessions/tasks/${NEXT_TASK}"
   git commit -m "Agent <ID>: Prepare ${NEXT_TASK}"
   ```

7. **Unlock the task:**
   ```bash
   rm "sessions/tasks/.lock-${NEXT_TASK}"
   ```

8. **Repeat** until all assigned tasks are done

---

## Step 7: Monitoring Progress

### Check Overall Progress

```bash
# Count completed tasks
cat sessions/tasks/agent-progress.json | jq '.[] | .completed | length' | awk '{sum+=$1} END {print sum}'

# Count in-progress tasks
cat sessions/tasks/agent-progress.json | jq '.[] | select(.status == "in-progress") | .current_task'

# List all locked tasks
ls -1 sessions/tasks/.lock-* 2>/dev/null | sed 's/.*\.lock-//'
```

### Generate Status Report

**File:** `scripts/task-status-report.sh`

```bash
#!/bin/bash

echo "=== Task Preparation Status ==="
echo ""

# Total tasks
TOTAL=$(find sessions/tasks -name "*.md" -type f ! -name "TEMPLATE.md" ! -name "README*" ! -name "PROMPT*" ! -name "HANDOFF*" ! -name "TASK*" ! -name "IMPLEMENTATION*" ! -name "DEPENDENCY*" ! -name "ROADMAP*" ! -name "PARALLEL*" | wc -l | tr -d ' ')

# Completed tasks (from IMPLEMENTATION-READINESS-STATUS.md)
READY=$(grep -c "✅" sessions/tasks/IMPLEMENTATION-READINESS-STATUS.md || echo "0")

# In progress (from agent-progress.json)
IN_PROGRESS=$(cat sessions/tasks/agent-progress.json 2>/dev/null | jq '[.[] | select(.status == "in-progress")] | length' || echo "0")

# Remaining
REMAINING=$((TOTAL - READY - IN_PROGRESS))

echo "Total Tasks: $TOTAL"
echo "Fully Ready: $READY"
echo "In Progress: $IN_PROGRESS"
echo "Remaining: $REMAINING"
echo ""

# Agent status
echo "=== Agent Status ==="
cat sessions/tasks/agent-progress.json 2>/dev/null | jq -r 'to_entries[] | "\(.key): \(.value.status) - \(.value.current_task // "none")"' || echo "No agent progress file"
```

---

## Best Practices

### 1. **Avoid File Conflicts**
- Each agent works on different tasks
- Use lock files to prevent simultaneous edits
- Work on separate git branches

### 2. **Respect Dependencies**
- Don't start a task until its dependencies are complete
- Check `dependencies.yaml` before starting
- Use task orchestrator to verify execution order

### 3. **Communication**
- Update progress files regularly
- Note blockers in agent-progress.json
- Commit frequently to your branch

### 4. **Quality Standards**
- Follow `TASK-PREPARATION-GUIDE.md` requirements
- Include complete code (not pseudocode)
- Add testing steps
- Document dependencies

### 5. **Coordination**
- Check for lock files before starting
- Update progress after each task
- Merge branches carefully (human review)

---

## Example: 3-Agent Setup

### Initial Setup

```bash
# Step 1: Generate task assignments
node scripts/assign-tasks-to-agents.js 3

# Step 2: Each agent opens Cursor and runs:
# Agent 1:
git checkout -b agent-1/task-preparation
NEXT_TASK=$(./scripts/assign-next-task.sh 1)
echo "Agent 1: Work on $NEXT_TASK"

# Agent 2:
git checkout -b agent-2/task-preparation
NEXT_TASK=$(./scripts/assign-next-task.sh 2)
echo "Agent 2: Work on $NEXT_TASK"

# Agent 3:
git checkout -b agent-3/task-preparation
NEXT_TASK=$(./scripts/assign-next-task.sh 3)
echo "Agent 3: Work on $NEXT_TASK"
```

### During Work

Each agent:
1. Locks their task
2. Adds complete implementation code
3. Commits to their branch
4. Unlocks task
5. Gets next task

### Monitoring

```bash
# Check progress
./scripts/task-status-report.sh

# See what each agent is working on
cat sessions/tasks/agent-progress.json | jq '.'
```

---

## Troubleshooting

### Task is Locked
- Wait for the locking agent to finish
- Check `agent-progress.json` for status
- If lock is stale (>1 hour), manually remove it

### Git Conflicts
- Each agent should work on separate branches
- Merge conflicts resolved by human
- Don't force push to main branch

### Dependencies Not Met
- Check `dependencies.yaml`
- Verify dependency tasks are completed
- Use task orchestrator to verify order

---

## Next Steps

1. **Create assignment script** (`scripts/assign-tasks-to-agents.js`)
2. **Create helper scripts** (`assign-next-task.sh`, `task-status-report.sh`)
3. **Initialize agent assignments** (run assignment script)
4. **Start agents** (each in separate Cursor window)
5. **Monitor progress** (use status report script)

---

**Last Updated:** 2025-01-27

