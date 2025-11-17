#!/bin/bash

echo "Getting status..."
echo ""
echo ""

epic_name="$1"

if [ -z "$epic_name" ]; then
  echo "❌ Please specify an epic name"
  echo "Usage: /pm:epic-status <epic-name>"
  echo ""
  echo "Available epics:"
  for dir in .claude/epics/*/; do
    [ -d "$dir" ] && echo "  • $(basename "$dir")"
  done
  exit 1
fi

epic_dir=".claude/epics/$epic_name"
epic_json="$epic_dir/epic.json"

if [ ! -f "$epic_json" ]; then
  echo "❌ Epic not found: $epic_name"
  echo ""
  echo "Available epics:"
  for dir in .claude/epics/*/; do
    [ -d "$dir" ] && echo "  • $(basename "$dir")"
  done
  exit 1
fi

echo "📚 Epic Status: $epic_name"
echo "================================"
echo ""

# Function to parse frontmatter value
parse_frontmatter() {
  local file="$1"
  local key="$2"
  grep "^${key}:" "$file" | head -1 | sed "s/^${key}: *//" | sed 's/^"//' | sed 's/"$//'
}

# Read epic.json (requires jq or manual parsing)
# For simplicity, we'll use a Node.js one-liner or manual JSON parsing
if command -v jq &> /dev/null; then
  epic_status=$(jq -r '.status // "open"' "$epic_json")
  epic_progress=$(jq -r '.progress // 0' "$epic_json")
  epic_github=$(jq -r '.github_issue // ""' "$epic_json")
  epic_created=$(jq -r '.created // ""' "$epic_json")
  epic_updated=$(jq -r '.updated // ""' "$epic_json")
else
  # Fallback: manual parsing (basic)
  epic_status=$(grep -o '"status"[[:space:]]*:[[:space:]]*"[^"]*"' "$epic_json" | sed 's/.*"status"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "open")
  epic_progress=$(grep -o '"progress"[[:space:]]*:[[:space:]]*[0-9]*' "$epic_json" | sed 's/.*"progress"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/' || echo "0")
  epic_github=$(grep -o '"github_issue"[[:space:]]*:[[:space:]]*"[^"]*"' "$epic_json" | sed 's/.*"github_issue"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "")
fi

# Query cc-sessions tasks for this epic
total=0
completed=0
in_progress=0
pending=0
blocked=0

# Get task list from epic.json or scan sessions/tasks/
if command -v jq &> /dev/null; then
  # Use jq to extract task files
  task_files=$(jq -r '.tasks[]?.task_file // empty' "$epic_json" 2>/dev/null)
else
  # Fallback: scan sessions/tasks/ for tasks with this epic
  task_files=""
  for task_file in sessions/tasks/*.md; do
    [ -f "$task_file" ] || continue
    task_epic=$(parse_frontmatter "$task_file" "epic")
    if [ "$task_epic" = "$epic_name" ]; then
      task_files="${task_files}$(basename "$task_file")\n"
    fi
  done
fi

# Count tasks by status
while IFS= read -r task_file; do
  [ -z "$task_file" ] && continue
  task_path="sessions/tasks/$task_file"
  [ ! -f "$task_path" ] && continue
  
  ((total++))
  task_status=$(parse_frontmatter "$task_path" "status")
  
  case "$task_status" in
    "completed")
      ((completed++))
      ;;
    "in-progress")
      ((in_progress++))
      ;;
    "pending")
      # Check if blocked by dependencies
      deps=$(parse_frontmatter "$task_path" "depends_on")
      if [ -n "$deps" ] && [ "$deps" != "[]" ] && [ "$deps" != "null" ]; then
        # Check if any dependency is not completed
        deps_clean=$(echo "$deps" | sed 's/^\[//' | sed 's/\]$//' | sed 's/"//g' | sed 's/ //g')
        IFS=',' read -ra DEP_ARRAY <<< "$deps_clean"
        is_blocked=false
        for dep in "${DEP_ARRAY[@]}"; do
          dep=$(echo "$dep" | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//')
          if [ -n "$dep" ]; then
            dep_file="sessions/tasks/$dep"
            if [ -f "$dep_file" ]; then
              dep_status=$(parse_frontmatter "$dep_file" "status")
              if [ "$dep_status" != "completed" ]; then
                is_blocked=true
                break
              fi
            fi
          fi
        done
        if [ "$is_blocked" = true ]; then
          ((blocked++))
        else
          ((pending++))
        fi
      else
        ((pending++))
      fi
      ;;
    "blocked")
      ((blocked++))
      ;;
  esac
done <<< "$task_files"

# Display progress
echo "Status: $epic_status"
echo "Progress: $epic_progress%"
[ -n "$epic_github" ] && echo "GitHub: $epic_github"
echo ""

# Display progress bar
if [ $total -gt 0 ]; then
  filled=$((epic_progress * 20 / 100))
  empty=$((20 - filled))

  echo -n "Progress: ["
  [ $filled -gt 0 ] && printf '%0.s█' $(seq 1 $filled)
  [ $empty -gt 0 ] && printf '%0.s░' $(seq 1 $empty)
  echo "] $epic_progress%"
else
  echo "Progress: No tasks found"
fi

echo ""
echo "📊 Breakdown:"
echo "  Total tasks: $total"
echo "  ✅ Completed: $completed"
echo "  🔄 In Progress: $in_progress"
echo "  ⏳ Pending: $pending"
echo "  ⏸️ Blocked: $blocked"

[ -n "$epic_github" ] && echo ""
[ -n "$epic_github" ] && echo "🔗 GitHub: $epic_github"

exit 0
