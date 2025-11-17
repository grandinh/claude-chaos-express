# Agent Help Request System

## Overview

Agents can now request help when they encounter problems or need clarification. Help requests are automatically tracked and you can monitor them in real-time.

## For Agents: Requesting Help

When you encounter a problem or need clarification, simply run:

```bash
./scripts/agent-workflow.sh <AGENT_ID> help
```

Or directly:

```bash
./scripts/agent-help-request.sh <AGENT_ID> "Your question or issue here"
```

**Example:**
```bash
./scripts/agent-workflow.sh 1 help
# Then type: "Need clarification on the error handling requirements for this task"
```

This will:
- ✅ Create a help request file in `sessions/tasks/help-requests/`
- ✅ Mark you as "blocked" in the progress tracker
- ✅ Include your current task context
- ✅ Timestamp the request

## For You: Monitoring Help Requests

### Option 1: Real-time Monitor (Recommended)

Run this in a terminal to see help requests as they come in:

```bash
./scripts/agent-help-monitor.sh
```

This will:
- Check every 10 seconds for new help requests
- Display them prominently with all context
- Show blocked agents
- Alert you immediately when agents need help

### Option 2: List All Requests

```bash
# List open requests
./scripts/list-help-requests.sh open

# List resolved requests
./scripts/list-help-requests.sh resolved

# List all requests
./scripts/list-help-requests.sh all
```

### Option 3: Check Files Directly

All help requests are stored in:
```
sessions/tasks/help-requests/agent-<ID>-<timestamp>.md
```

Each file contains:
- Agent ID and current task
- The question/issue
- Timestamp
- Status (open/resolved)
- Space for your response

## Responding to Help Requests

1. **View the request:**
   ```bash
   cat sessions/tasks/help-requests/agent-1-*.md
   ```

2. **Edit the file and add your response:**
   ```bash
   # Open the file
   code sessions/tasks/help-requests/agent-1-20251116-171530.md
   
   # Add your response in the "Response" section
   # Change status from "open" to "resolved" in frontmatter
   ```

3. **Unblock the agent:**
   ```bash
   # The agent will see your response and can continue
   # Or manually unblock:
   cat sessions/tasks/agent-progress.json | jq '.["agent-1"].status = "in-progress"' > tmp && mv tmp sessions/tasks/agent-progress.json
   ```

## Integration with Continuous Worker

The continuous worker will:
- ✅ Detect when agents are blocked
- ✅ Pause task assignment for blocked agents
- ✅ Resume when status changes back to "in-progress"

## Quick Reference

### Agent Commands
```bash
# Request help
./scripts/agent-workflow.sh 1 help

# Check if you have help requests
ls sessions/tasks/help-requests/agent-1-*.md
```

### Your Commands
```bash
# Monitor in real-time
./scripts/agent-help-monitor.sh

# List all requests
./scripts/list-help-requests.sh

# View a specific request
cat sessions/tasks/help-requests/agent-1-*.md
```

## Example Help Request File

```markdown
---
agent_id: 1
current_task: REPAIR-pause-detection-robustness.md
timestamp: 2025-11-16T17:15:30Z
status: open
---

# Help Request from Agent 1

## Current Task
REPAIR-pause-detection-robustness.md

## Issue/Question
Need clarification on the error handling requirements for this task

## Status
🟡 **OPEN** - Waiting for response

## Response
_(Add your response here when addressing this request)_

---

*Created: 2025-11-16T17:15:30Z*
```

## Status Icons

- 🟡 **open** - Waiting for response
- ✅ **resolved** - Issue addressed
- 🔴 **blocked** - Agent is blocked

## Tips

1. **Run the monitor in a separate terminal** - Keep it running to catch requests immediately
2. **Agents auto-block** - When they request help, they're automatically marked as blocked
3. **Unblock after responding** - Change status to "resolved" and agent status back to "in-progress"
4. **All context included** - Each request includes the agent's current task for full context

