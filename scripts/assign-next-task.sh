#!/bin/bash

# Assign next available task to an agent
# Usage: ./scripts/assign-next-task.sh <AGENT_ID>
# Example: ./scripts/assign-next-task.sh 1

AGENT_ID=${1:-1}
AGENT_KEY="agent-${AGENT_ID}"
ASSIGNMENTS_FILE="sessions/tasks/agent-assignments.json"
PROGRESS_FILE="sessions/tasks/agent-progress.json"

# Check if assignments file exists
if [ ! -f "$ASSIGNMENTS_FILE" ]; then
    echo "Error: Assignments file not found. Run: node scripts/assign-tasks-to-agents.js <NUM_AGENTS>" >&2
    exit 1
fi

# Get assigned tasks for this agent
ASSIGNED_TASKS=$(cat "$ASSIGNMENTS_FILE" | jq -r ".[\"${AGENT_KEY}\"].tasks[]" 2>/dev/null)

if [ -z "$ASSIGNED_TASKS" ]; then
    echo "Error: No tasks assigned to ${AGENT_KEY}" >&2
    exit 1
fi

# Initialize progress file if it doesn't exist
if [ ! -f "$PROGRESS_FILE" ]; then
    echo "{}" > "$PROGRESS_FILE"
fi

# Find next uncompleted, unlocked task
for task in $ASSIGNED_TASKS; do
    # Check if task is completed
    COMPLETED=$(cat "$PROGRESS_FILE" 2>/dev/null | jq -r ".[\"${AGENT_KEY}\"].completed[]?" | grep -q "^${task}$" && echo "yes" || echo "no")
    
    # Check if task is locked by another agent
    LOCKED=$(test -f "sessions/tasks/.lock-${task}" && echo "yes" || echo "no")
    
    if [ "$COMPLETED" = "no" ] && [ "$LOCKED" = "no" ]; then
        echo "$task"
        exit 0
    fi
done

echo "No available tasks for ${AGENT_KEY}" >&2
exit 1

