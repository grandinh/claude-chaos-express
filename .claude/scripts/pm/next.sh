#!/bin/bash
echo "Getting status..."
echo ""
echo ""

echo "📋 Next Available Tasks"
echo "======================="
echo ""

# Query cc-sessions tasks instead of PM tasks
found=0

# Check if epic filter is provided
EPIC_FILTER=""
if [ "$1" = "--epic" ] && [ -n "$2" ]; then
  EPIC_FILTER="$2"
fi

# Function to parse frontmatter value
parse_frontmatter() {
  local file="$1"
  local key="$2"
  grep "^${key}:" "$file" | head -1 | sed "s/^${key}: *//" | sed 's/^"//' | sed 's/"$//'
}

# Function to check if task dependencies are met
check_dependencies() {
  local task_file="$1"
  local deps_line=$(parse_frontmatter "$task_file" "depends_on")
  
  if [ -z "$deps_line" ] || [ "$deps_line" = "[]" ] || [ "$deps_line" = "null" ]; then
    return 0  # No dependencies
  fi
  
  # Parse array format: [task1.md, task2.md] or ["task1.md", "task2.md"]
  local deps=$(echo "$deps_line" | sed 's/^\[//' | sed 's/\]$//' | sed 's/"//g' | sed 's/ //g')
  
  if [ -z "$deps" ]; then
    return 0  # Empty dependencies
  fi
  
  # Check each dependency
  IFS=',' read -ra DEP_ARRAY <<< "$deps"
  for dep in "${DEP_ARRAY[@]}"; do
    dep=$(echo "$dep" | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//')
    if [ -n "$dep" ]; then
      local dep_file="sessions/tasks/$dep"
      if [ ! -f "$dep_file" ]; then
        return 1  # Dependency file not found
      fi
      
      local dep_status=$(parse_frontmatter "$dep_file" "status")
      if [ "$dep_status" != "completed" ]; then
        return 1  # Dependency not completed
      fi
    fi
  done
  
  return 0  # All dependencies met
}

# Scan sessions/tasks/ directory
for task_file in sessions/tasks/*.md; do
  [ -f "$task_file" ] || continue
  
  # Check if task is pending
  status=$(parse_frontmatter "$task_file" "status")
  if [ "$status" != "pending" ]; then
    continue
  fi
  
  # Check epic filter if provided
  if [ -n "$EPIC_FILTER" ]; then
    epic=$(parse_frontmatter "$task_file" "epic")
    if [ "$epic" != "$EPIC_FILTER" ]; then
      continue
    fi
  fi
  
  # Check dependencies
  if ! check_dependencies "$task_file"; then
    continue  # Dependencies not met
  fi
  
  # Task is ready
  task_name=$(parse_frontmatter "$task_file" "name")
  task_basename=$(basename "$task_file")
  epic=$(parse_frontmatter "$task_file" "epic")
  
  echo "✅ Ready: @sessions/tasks/$task_basename"
  echo "   Name: $task_name"
  [ -n "$epic" ] && echo "   Epic: $epic"
  echo ""
  ((found++))
done

if [ $found -eq 0 ]; then
  echo "No available tasks found."
  echo ""
  echo "💡 Suggestions:"
  echo "  • Check blocked tasks: /pm:blocked"
  echo "  • View all tasks: /pm:epic-list"
  [ -n "$EPIC_FILTER" ] && echo "  • Try without epic filter: /pm:next"
fi

echo ""
echo "📊 Summary: $found tasks ready to start"

exit 0
