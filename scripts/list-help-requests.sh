#!/bin/bash

# List all help requests
# Usage: ./scripts/list-help-requests.sh [status]
# Status: open, resolved, all (default: open)

STATUS_FILTER=${1:-open}
PROJECT_ROOT=${CLAUDE_PROJECT_DIR:-$(pwd)}
HELP_DIR="${PROJECT_ROOT}/sessions/tasks/help-requests"

mkdir -p "$HELP_DIR"

echo "📋 Help Requests (${STATUS_FILTER})"
echo "===================================="
echo ""

count=0
for file in "$HELP_DIR"/agent-*.md; do
    [ ! -f "$file" ] && continue
    
    status=$(grep "^status:" "$file" 2>/dev/null | cut -d: -f2 | tr -d ' ' || echo "unknown")
    agent_id=$(grep "^agent_id:" "$file" 2>/dev/null | cut -d: -f2 | tr -d ' ' || echo "?")
    task=$(grep "^current_task:" "$file" 2>/dev/null | cut -d: -f2 | tr -d ' ' || echo "unknown")
    timestamp=$(grep "^timestamp:" "$file" 2>/dev/null | cut -d: -f2 | tr -d ' ' || echo "unknown")
    
    if [ "$STATUS_FILTER" = "all" ] || [ "$status" = "$STATUS_FILTER" ]; then
        count=$((count + 1))
        status_icon="🟡"
        [ "$status" = "resolved" ] && status_icon="✅"
        [ "$status" = "blocked" ] && status_icon="🔴"
        
        echo "${status_icon} Agent ${agent_id} - ${task}"
        echo "   File: $(basename "$file")"
        echo "   Time: ${timestamp}"
        echo "   Status: ${status}"
        echo ""
    fi
done

if [ $count -eq 0 ]; then
    echo "No ${STATUS_FILTER} help requests found."
fi

