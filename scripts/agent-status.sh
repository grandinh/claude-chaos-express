#!/bin/bash

# Quick status check for all agents
# Usage: ./scripts/agent-status.sh

PROJECT_ROOT=${CLAUDE_PROJECT_DIR:-$(pwd)}
PROGRESS_FILE="${PROJECT_ROOT}/sessions/tasks/agent-progress.json"
LOG_FILE="${PROJECT_ROOT}/sessions/tasks/agent-worker.log"

echo "📊 Agent Status Report"
echo "======================"
echo ""

# Check if continuous worker is running
if pgrep -f "agent-continuous-worker" > /dev/null; then
    echo "✅ Continuous Worker: RUNNING"
else
    echo "❌ Continuous Worker: NOT RUNNING"
    echo "   Start with: nohup ./scripts/agent-continuous-worker.sh 30 > /dev/null 2>&1 &"
fi
echo ""

# Show agent progress
if [ -f "$PROGRESS_FILE" ]; then
    echo "Agent Progress:"
    cat "$PROGRESS_FILE" | jq '.' 2>/dev/null || echo "Error reading progress file"
else
    echo "No progress file found"
fi
echo ""

# Show recent worker activity
if [ -f "$LOG_FILE" ]; then
    echo "Recent Worker Activity (last 10 lines):"
    tail -10 "$LOG_FILE"
else
    echo "No worker log file yet"
fi
echo ""

# Show locked tasks
echo "Locked Tasks:"
ls -1 sessions/tasks/.lock-* 2>/dev/null | sed 's|.*/.lock-||' | while read task; do
    echo "  🔒 $task"
done || echo "  (none)"
echo ""

# Show notification files
echo "Agent Notifications:"
for i in 1 2 3; do
    NOTIF_FILE="sessions/tasks/.agent-${i}-next-task.txt"
    if [ -f "$NOTIF_FILE" ]; then
        echo "  Agent $i: $(head -1 "$NOTIF_FILE" | cut -d: -f2-)"
    fi
done

