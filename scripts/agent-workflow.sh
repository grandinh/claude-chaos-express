#!/bin/bash

# Agent workflow helper script
# Run this in each Cursor window to manage your task workflow
# Usage: ./scripts/agent-workflow.sh <AGENT_ID> [command]
# Commands: start, next, status, complete

AGENT_ID=${1:-1}
COMMAND=${2:-start}
AGENT_KEY="agent-${AGENT_ID}"
PROJECT_ROOT=${CLAUDE_PROJECT_DIR:-$(pwd)}
TASKS_DIR="${PROJECT_ROOT}/sessions/tasks"
PROGRESS_FILE="${TASKS_DIR}/agent-progress.json"

# Initialize progress file if needed
if [ ! -f "$PROGRESS_FILE" ]; then
    echo "{}" > "$PROGRESS_FILE"
fi

case "$COMMAND" in
    start)
        echo "🚀 Starting Agent ${AGENT_ID}..."
        
        # Get first task
        TASK=$(./scripts/assign-next-task.sh "$AGENT_ID")
        
        if [ -z "$TASK" ]; then
            echo "❌ No tasks available for ${AGENT_KEY}"
            exit 1
        fi
        
        # Create branch
        BRANCH="agent-${AGENT_ID}/task-preparation"
        git checkout -b "$BRANCH" 2>/dev/null || git checkout "$BRANCH" 2>/dev/null
        
        # Lock task
        touch "${TASKS_DIR}/.lock-${TASK}"
        
        # Update progress
        cat "$PROGRESS_FILE" | jq ".[\"${AGENT_KEY}\"] = {
            current_task: \"${TASK}\",
            status: \"in-progress\",
            started: \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
            completed: [],
            blocked: []
        }" > "${PROGRESS_FILE}.tmp" && mv "${PROGRESS_FILE}.tmp" "$PROGRESS_FILE"
        
        echo "✅ Agent ${AGENT_ID} started"
        echo "📋 Current task: ${TASK}"
        echo "🔒 Task locked"
        echo ""
        echo "📝 Tell Cursor:"
        echo "   \"Prepare the task in sessions/tasks/${TASK} following TASK-PREPARATION-GUIDE.md. Add complete implementation code (not pseudocode). Include file paths, error handling, dependencies, and testing steps.\""
        ;;
        
    next)
        echo "🔄 Getting next task for Agent ${AGENT_ID}..."
        
        # Get next task
        TASK=$(./scripts/assign-next-task.sh "$AGENT_ID")
        
        if [ -z "$TASK" ]; then
            echo "❌ No more tasks available for ${AGENT_KEY}"
            exit 1
        fi
        
        # Lock task
        touch "${TASKS_DIR}/.lock-${TASK}"
        
        # Update progress
        CURRENT_TASK=$(cat "$PROGRESS_FILE" | jq -r ".[\"${AGENT_KEY}\"].current_task // empty")
        if [ -n "$CURRENT_TASK" ]; then
            # Move current task to completed
            cat "$PROGRESS_FILE" | jq ".[\"${AGENT_KEY}\"].completed += [\"${CURRENT_TASK}\"] | .[\"${AGENT_KEY}\"].current_task = \"${TASK}\" | .[\"${AGENT_KEY}\"].status = \"in-progress\"" > "${PROGRESS_FILE}.tmp" && mv "${PROGRESS_FILE}.tmp" "$PROGRESS_FILE"
        else
            cat "$PROGRESS_FILE" | jq ".[\"${AGENT_KEY}\"] = {
                current_task: \"${TASK}\",
                status: \"in-progress\",
                started: \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
                completed: [],
                blocked: []
            }" > "${PROGRESS_FILE}.tmp" && mv "${PROGRESS_FILE}.tmp" "$PROGRESS_FILE"
        fi
        
        echo "✅ Next task: ${TASK}"
        echo "🔒 Task locked"
        echo ""
        echo "📝 Tell Cursor:"
        echo "   \"Prepare the task in sessions/tasks/${TASK} following TASK-PREPARATION-GUIDE.md. Add complete implementation code (not pseudocode). Include file paths, error handling, dependencies, and testing steps.\""
        ;;
        
    complete)
        echo "✅ Completing current task for Agent ${AGENT_ID}..."
        
        CURRENT_TASK=$(cat "$PROGRESS_FILE" | jq -r ".[\"${AGENT_KEY}\"].current_task // empty")
        
        if [ -z "$CURRENT_TASK" ]; then
            echo "❌ No current task to complete"
            exit 1
        fi
        
        # Unlock task
        rm -f "${TASKS_DIR}/.lock-${CURRENT_TASK}"
        
        # Commit changes
        git add "sessions/tasks/${CURRENT_TASK}" 2>/dev/null
        git commit -m "Agent ${AGENT_ID}: Prepare ${CURRENT_TASK}" 2>/dev/null
        
        # Update progress
        cat "$PROGRESS_FILE" | jq ".[\"${AGENT_KEY}\"].completed += [\"${CURRENT_TASK}\"] | .[\"${AGENT_KEY}\"].current_task = null | .[\"${AGENT_KEY}\"].status = \"idle\"" > "${PROGRESS_FILE}.tmp" && mv "${PROGRESS_FILE}.tmp" "$PROGRESS_FILE"
        
        echo "✅ Task completed: ${CURRENT_TASK}"
        echo "💾 Changes committed"
        echo "🔓 Task unlocked"
        echo ""
        echo "🔄 Run: ./scripts/agent-workflow.sh ${AGENT_ID} next"
        ;;
        
    status)
        echo "📊 Agent ${AGENT_ID} Status:"
        echo ""
        cat "$PROGRESS_FILE" | jq -r ".[\"${AGENT_KEY}\"] // \"Not started\"" 2>/dev/null || echo "Not started"
        ;;
        
    help)
        echo "🆘 Requesting help for Agent ${AGENT_ID}..."
        echo ""
        echo "Enter your question or issue (or press Enter to use default):"
        read -r HELP_MESSAGE
        if [ -z "$HELP_MESSAGE" ]; then
            HELP_MESSAGE="Agent ${AGENT_ID} needs assistance with current task"
        fi
        ./scripts/agent-help-request.sh "$AGENT_ID" "$HELP_MESSAGE"
        ;;
        
    *)
        echo "Usage: ./scripts/agent-workflow.sh <AGENT_ID> [command]"
        echo ""
        echo "Commands:"
        echo "  start    - Start agent and get first task"
        echo "  next     - Get next task"
        echo "  complete - Complete current task and commit"
        echo "  status   - Show agent status"
        echo "  help     - Request help (creates help request)"
        echo ""
        echo "Example:"
        echo "  ./scripts/agent-workflow.sh 1 start"
        echo "  ./scripts/agent-workflow.sh 1 help"
        exit 1
        ;;
esac

