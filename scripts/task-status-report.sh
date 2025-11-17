#!/bin/bash

# Generate status report for task preparation progress
# Usage: ./scripts/task-status-report.sh

PROJECT_ROOT=${CLAUDE_PROJECT_DIR:-$(pwd)}
TASKS_DIR="${PROJECT_ROOT}/sessions/tasks"
PROGRESS_FILE="${TASKS_DIR}/agent-progress.json"
READINESS_FILE="${TASKS_DIR}/IMPLEMENTATION-READINESS-STATUS.md"

echo "=== Task Preparation Status ==="
echo ""

# Count total task files (excluding special files)
TOTAL=$(find "$TASKS_DIR" -maxdepth 1 -name "*.md" -type f \
    ! -name "TEMPLATE.md" \
    ! -name "README*" \
    ! -name "PROMPT*" \
    ! -name "HANDOFF*" \
    ! -name "TASK*" \
    ! -name "IMPLEMENTATION*" \
    ! -name "DEPENDENCY*" \
    ! -name "ROADMAP*" \
    ! -name "PARALLEL*" \
    ! -name "AUDIT*" \
    2>/dev/null | wc -l | tr -d ' ')

# Count ready tasks (from IMPLEMENTATION-READINESS-STATUS.md)
if [ -f "$READINESS_FILE" ]; then
    READY=$(grep -c "✅" "$READINESS_FILE" 2>/dev/null || echo "0")
else
    READY="0"
fi

# Count in-progress tasks (from agent-progress.json)
if [ -f "$PROGRESS_FILE" ]; then
    IN_PROGRESS=$(cat "$PROGRESS_FILE" 2>/dev/null | jq '[.[] | select(.status == "in-progress")] | length' 2>/dev/null || echo "0")
else
    IN_PROGRESS="0"
fi

# Calculate remaining
REMAINING=$((TOTAL - READY - IN_PROGRESS))

echo "Total Tasks: $TOTAL"
echo "Fully Ready: $READY"
echo "In Progress: $IN_PROGRESS"
echo "Remaining: $REMAINING"
echo ""

# Progress percentage
if [ "$TOTAL" -gt 0 ]; then
    PERCENT=$((READY * 100 / TOTAL))
    echo "Progress: ${PERCENT}%"
    echo ""
fi

# Agent status
if [ -f "$PROGRESS_FILE" ]; then
    echo "=== Agent Status ==="
    cat "$PROGRESS_FILE" | jq -r 'to_entries[] | "\(.key): \(.value.status) - \(.value.current_task // "none")"' 2>/dev/null || echo "No agent activity"
    echo ""
    
    # Completed tasks per agent
    echo "=== Completed Tasks by Agent ==="
    cat "$PROGRESS_FILE" | jq -r 'to_entries[] | "\(.key): \(.value.completed | length) tasks"' 2>/dev/null || echo "No completions yet"
    echo ""
fi

# Locked tasks
LOCKED_TASKS=$(ls -1 "$TASKS_DIR"/.lock-* 2>/dev/null | sed 's/.*\.lock-//' | tr '\n' ' ')

if [ -n "$LOCKED_TASKS" ]; then
    echo "=== Currently Locked Tasks ==="
    echo "$LOCKED_TASKS"
    echo ""
fi

# Next steps
echo "=== Next Steps ==="
echo "1. Run: node scripts/assign-tasks-to-agents.js <NUM_AGENTS>"
echo "2. Each agent: ./scripts/assign-next-task.sh <AGENT_ID>"
echo "3. Work on assigned tasks following TASK-PREPARATION-GUIDE.md"

