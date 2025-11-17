#!/bin/bash

# Monitor for agent help requests and notify user
# Usage: ./scripts/agent-help-monitor.sh [check-interval]
# Run this in a terminal to see help requests in real-time

CHECK_INTERVAL=${1:-10}  # Default: check every 10 seconds
PROJECT_ROOT=${CLAUDE_PROJECT_DIR:-$(pwd)}
HELP_DIR="${PROJECT_ROOT}/sessions/tasks/help-requests"
PROGRESS_FILE="${PROJECT_ROOT}/sessions/tasks/agent-progress.json"

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create help directory if it doesn't exist
mkdir -p "$HELP_DIR"

# Track seen requests
SEEN_REQUESTS_FILE="${HELP_DIR}/.seen-requests.txt"
touch "$SEEN_REQUESTS_FILE"

# Function to check if request was already seen
is_seen() {
    local file=$1
    grep -q "^${file}$" "$SEEN_REQUESTS_FILE" 2>/dev/null
}

# Function to mark request as seen
mark_seen() {
    local file=$1
    echo "$file" >> "$SEEN_REQUESTS_FILE"
}

# Function to get status from frontmatter
get_status() {
    local file=$1
    grep "^status:" "$file" 2>/dev/null | cut -d: -f2 | tr -d ' ' || echo "unknown"
}

# Function to display help request
display_request() {
    local file=$1
    local basename=$(basename "$file")
    
    # Extract info from frontmatter
    local agent_id=$(grep "^agent_id:" "$file" 2>/dev/null | cut -d: -f2 | tr -d ' ' || echo "?")
    local task=$(grep "^current_task:" "$file" 2>/dev/null | cut -d: -f2 | tr -d ' ' || echo "unknown")
    local timestamp=$(grep "^timestamp:" "$file" 2>/dev/null | cut -d: -f2 | tr -d ' ' || echo "unknown")
    local status=$(get_status "$file")
    
    # Get message (content after frontmatter)
    local message=$(awk '/^---$/{p++; next} p==2{print}' "$file" | head -20)
    
    echo ""
    echo "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo "${YELLOW}🚨 HELP REQUEST FROM AGENT ${agent_id}${NC}"
    echo "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "${BLUE}📋 Task:${NC} ${task}"
    echo "${BLUE}🕐 Time:${NC} ${timestamp}"
    echo "${BLUE}📁 File:${NC} ${file}"
    echo ""
    echo "${YELLOW}Message:${NC}"
    echo "${message}"
    echo ""
    echo "${GREEN}💡 To respond:${NC}"
    echo "   1. Edit the file: ${file}"
    echo "   2. Add your response in the 'Response' section"
    echo "   3. Change status to 'resolved' in frontmatter"
    echo ""
    echo "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# Main monitoring loop
echo "${GREEN}🔍 Agent Help Request Monitor${NC}"
echo "Monitoring: ${HELP_DIR}"
echo "Check interval: ${CHECK_INTERVAL} seconds"
echo "Press Ctrl+C to stop"
echo ""

while true; do
    # Find all open help requests
    for file in "$HELP_DIR"/agent-*.md; do
        # Skip if file doesn't exist (no matches)
        [ ! -f "$file" ] && continue
        
        # Skip if already seen
        if is_seen "$file"; then
            continue
        fi
        
        # Check if status is open
        status=$(get_status "$file")
        if [ "$status" = "open" ]; then
            display_request "$file"
            mark_seen "$file"
        fi
    done
    
    # Check for blocked agents
    if [ -f "$PROGRESS_FILE" ]; then
        BLOCKED_AGENTS=$(cat "$PROGRESS_FILE" | jq -r 'to_entries[] | select(.value.status == "blocked") | "\(.key): \(.value.current_task)"' 2>/dev/null)
        if [ -n "$BLOCKED_AGENTS" ]; then
            echo "${YELLOW}⚠️  Blocked Agents:${NC}"
            echo "$BLOCKED_AGENTS" | while read line; do
                echo "   ${line}"
            done
            echo ""
        fi
    fi
    
    sleep "$CHECK_INTERVAL"
done

