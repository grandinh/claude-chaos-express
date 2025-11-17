#!/bin/bash

# Continuous Agent Worker
# Monitors agents and automatically assigns next tasks when they complete
# Usage: ./scripts/agent-continuous-worker.sh [check-interval-seconds]
# Example: ./scripts/agent-continuous-worker.sh 30

CHECK_INTERVAL=${1:-30}  # Default: check every 30 seconds
PROJECT_ROOT=${CLAUDE_PROJECT_DIR:-$(pwd)}
TASKS_DIR="${PROJECT_ROOT}/sessions/tasks"
PROGRESS_FILE="${TASKS_DIR}/agent-progress.json"
LOG_FILE="${PROJECT_ROOT}/sessions/tasks/agent-worker.log"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Check if agent has completed current task (ready for next)
check_agent_ready() {
    local AGENT_ID=$1
    local AGENT_KEY="agent-${AGENT_ID}"
    
    # Check if agent exists in progress
    local CURRENT_TASK=$(cat "$PROGRESS_FILE" 2>/dev/null | jq -r ".[\"${AGENT_KEY}\"].current_task // empty")
    local STATUS=$(cat "$PROGRESS_FILE" 2>/dev/null | jq -r ".[\"${AGENT_KEY}\"].status // empty")
    
    # Agent is ready if:
    # 1. Status is "idle" (task completed)
    # 2. Current task is null/empty
    # 3. Task file has been committed (lock removed but task marked complete)
    
    if [ "$STATUS" = "idle" ] || [ -z "$CURRENT_TASK" ]; then
        return 0  # Ready
    fi
    
    # Check if task lock is gone but task not marked complete (agent finished but didn't run complete command)
    if [ -n "$CURRENT_TASK" ] && [ ! -f "${TASKS_DIR}/.lock-${CURRENT_TASK}" ]; then
        # Task lock removed - assume agent is done, mark as ready
        log "${YELLOW}Agent ${AGENT_ID}: Task ${CURRENT_TASK} lock removed, marking as ready${NC}"
        cat "$PROGRESS_FILE" | jq ".[\"${AGENT_KEY}\"].status = \"idle\" | .[\"${AGENT_KEY}\"].current_task = null" > "${PROGRESS_FILE}.tmp" && mv "${PROGRESS_FILE}.tmp" "$PROGRESS_FILE"
        return 0
    fi
    
    return 1  # Not ready
}

# Assign next task to agent
assign_next_task() {
    local AGENT_ID=$1
    local AGENT_KEY="agent-${AGENT_ID}"
    
    log "${GREEN}🔄 Assigning next task to Agent ${AGENT_ID}...${NC}"
    
    # Use the agent workflow script to get next task
    local NEXT_TASK=$(./scripts/assign-next-task.sh "$AGENT_ID" 2>/dev/null)
    
    if [ -z "$NEXT_TASK" ]; then
        log "${YELLOW}⚠️  No more tasks available for ${AGENT_KEY}${NC}"
        return 1
    fi
    
    # Lock the task
    touch "${TASKS_DIR}/.lock-${NEXT_TASK}"
    
    # Update progress
    cat "$PROGRESS_FILE" | jq ".[\"${AGENT_KEY}\"] = {
        current_task: \"${NEXT_TASK}\",
        status: \"in-progress\",
        started: \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
        completed: (.[\"${AGENT_KEY}\"].completed // []),
        blocked: (.[\"${AGENT_KEY}\"].blocked // [])
    }" > "${PROGRESS_FILE}.tmp" && mv "${PROGRESS_FILE}.tmp" "$PROGRESS_FILE"
    
    log "${GREEN}✅ Agent ${AGENT_ID} assigned: ${NEXT_TASK}${NC}"
    
    # Create a notification file for the agent
    NOTIFICATION_FILE="${TASKS_DIR}/.agent-${AGENT_ID}-next-task.txt"
    cat > "$NOTIFICATION_FILE" <<EOF
Agent ${AGENT_ID}: Next Task Assigned

📋 Task: ${NEXT_TASK}
🕐 Assigned: $(date)

📝 Instructions:
Prepare the task in sessions/tasks/${NEXT_TASK} following TASK-PREPARATION-GUIDE.md.
Add complete implementation code (not pseudocode).
Include file paths, error handling, dependencies, and testing steps.

Run this in your Cursor window:
  git checkout agent-${AGENT_ID}/task-preparation
  # Then tell Cursor to prepare the task
EOF
    
    return 0
}

# Main monitoring loop
main() {
    log "${GREEN}🚀 Starting Continuous Agent Worker${NC}"
    log "Check interval: ${CHECK_INTERVAL} seconds"
    log "Monitoring agents: 1, 2, 3"
    log ""
    
    # Initialize progress file if needed
    if [ ! -f "$PROGRESS_FILE" ]; then
        echo "{}" > "$PROGRESS_FILE"
    fi
    
    # Main loop
    while true; do
        # Check each agent
        for AGENT_ID in 1 2 3; do
            if check_agent_ready "$AGENT_ID"; then
                assign_next_task "$AGENT_ID"
            fi
        done
        
        # Sleep before next check
        sleep "$CHECK_INTERVAL"
    done
}

# Handle signals gracefully
trap 'log "${YELLOW}🛑 Shutting down agent worker...${NC}"; exit 0' SIGINT SIGTERM

# Run main function
main

