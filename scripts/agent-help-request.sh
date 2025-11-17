#!/bin/bash

# Agent Help Request System
# Allows agents to request help when they encounter problems
# Usage: ./scripts/agent-help-request.sh <AGENT_ID> "<message>"
# Example: ./scripts/agent-help-request.sh 1 "Need clarification on task requirements"

AGENT_ID=${1:-1}
MESSAGE=${2:-"Agent needs assistance"}
PROJECT_ROOT=${CLAUDE_PROJECT_DIR:-$(pwd)}
HELP_DIR="${PROJECT_ROOT}/sessions/tasks/help-requests"
PROGRESS_FILE="${PROJECT_ROOT}/sessions/tasks/agent-progress.json"

# Create help requests directory
mkdir -p "$HELP_DIR"

# Get current task info
AGENT_KEY="agent-${AGENT_ID}"
CURRENT_TASK=$(cat "$PROGRESS_FILE" 2>/dev/null | jq -r ".[\"${AGENT_KEY}\"].current_task // \"unknown\"")

# Create help request file
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
REQUEST_FILE="${HELP_DIR}/agent-${AGENT_ID}-$(date +%Y%m%d-%H%M%S).md"

cat > "$REQUEST_FILE" <<EOF
---
agent_id: ${AGENT_ID}
current_task: ${CURRENT_TASK}
timestamp: ${TIMESTAMP}
status: open
---

# Help Request from Agent ${AGENT_ID}

## Current Task
${CURRENT_TASK}

## Issue/Question
${MESSAGE}

## Status
🟡 **OPEN** - Waiting for response

## Response
_(Add your response here when addressing this request)_

---

*Created: ${TIMESTAMP}*
*To mark as resolved, change status to "resolved" in the frontmatter*
EOF

# Mark agent as blocked in progress
cat "$PROGRESS_FILE" | jq ".[\"${AGENT_KEY}\"].status = \"blocked\" | .[\"${AGENT_KEY}\"].blocked += [\"${REQUEST_FILE}\"]" > "${PROGRESS_FILE}.tmp" && mv "${PROGRESS_FILE}.tmp" "$PROGRESS_FILE"

echo "✅ Help request created: ${REQUEST_FILE}"
echo ""
echo "📋 Request Details:"
echo "   Agent: ${AGENT_ID}"
echo "   Task: ${CURRENT_TASK}"
echo "   Message: ${MESSAGE}"
echo ""
echo "💡 The user will be notified. Check ${HELP_DIR}/ for all help requests."

