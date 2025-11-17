#!/bin/bash

# Start multiple agents for task preparation
# Usage: ./scripts/start-agents.sh [num-agents]
# Example: ./scripts/start-agents.sh 3

NUM_AGENTS=${1:-3}
PROJECT_ROOT=${CLAUDE_PROJECT_DIR:-$(pwd)}
TASKS_DIR="${PROJECT_ROOT}/sessions/tasks"
ASSIGNMENTS_FILE="${TASKS_DIR}/agent-assignments.json"
PROGRESS_FILE="${TASKS_DIR}/agent-progress.json"

echo "🚀 Starting ${NUM_AGENTS} agents for task preparation..."
echo ""

# Check if assignments exist
if [ ! -f "$ASSIGNMENTS_FILE" ]; then
    echo "⚠️  No assignments found. Generating assignments..."
    node scripts/assign-tasks-to-agents.js "$NUM_AGENTS"
    echo ""
fi

# Initialize progress file
if [ ! -f "$PROGRESS_FILE" ]; then
    echo "{}" > "$PROGRESS_FILE"
fi

# Create agent startup instructions
AGENT_INSTRUCTIONS_DIR="${TASKS_DIR}/agent-instructions"
mkdir -p "$AGENT_INSTRUCTIONS_DIR"

echo "📋 Generating startup instructions for each agent..."
echo ""

for i in $(seq 1 $NUM_AGENTS); do
    AGENT_KEY="agent-${i}"
    
    # Get first task
    FIRST_TASK=$(./scripts/assign-next-task.sh "$i" 2>/dev/null)
    
    if [ -z "$FIRST_TASK" ]; then
        echo "⚠️  No tasks available for ${AGENT_KEY}"
        continue
    fi
    
    # Create branch name
    BRANCH_NAME="agent-${i}/task-preparation"
    
    # Create instruction file
    INSTRUCTION_FILE="${AGENT_INSTRUCTIONS_DIR}/agent-${i}.md"
    
    cat > "$INSTRUCTION_FILE" <<EOF
# Agent ${i} Startup Instructions

## Quick Start

1. **Open a new Cursor window** (separate from other agents)

2. **Navigate to project:**
   \`\`\`bash
   cd ${PROJECT_ROOT}
   \`\`\`

3. **Create your branch:**
   \`\`\`bash
   git checkout -b ${BRANCH_NAME}
   \`\`\`

4. **Lock and start your first task:**
   \`\`\`bash
   TASK="${FIRST_TASK}"
   touch "sessions/tasks/.lock-\${TASK}"
   echo "Agent ${i}: Working on \${TASK}"
   \`\`\`

5. **Tell Cursor to prepare this task:**
   > Prepare the task in \`sessions/tasks/\${TASK}\` following TASK-PREPARATION-GUIDE.md. Add complete implementation code (not pseudocode). Include file paths, error handling, dependencies, and testing steps.

6. **After completing the task:**
   \`\`\`bash
   git add "sessions/tasks/\${TASK}"
   git commit -m "Agent ${i}: Prepare \${TASK}"
   rm "sessions/tasks/.lock-\${TASK}"
   \`\`\`

7. **Get your next task:**
   \`\`\`bash
   NEXT_TASK=\$(./scripts/assign-next-task.sh ${i})
   echo "Agent ${i}: Next task is \${NEXT_TASK}"
   \`\`\`

8. **Repeat steps 4-7** until all tasks are done

## Your Assigned Tasks

EOF
    
    # Add task list
    cat "$ASSIGNMENTS_FILE" | jq -r ".[\"${AGENT_KEY}\"].tasks[]" >> "$INSTRUCTION_FILE"
    
    echo "✅ Created instructions for ${AGENT_KEY}"
    echo "   First task: ${FIRST_TASK}"
    echo "   Instructions: ${INSTRUCTION_FILE}"
    echo ""
done

# Create master startup script
MASTER_SCRIPT="${AGENT_INSTRUCTIONS_DIR}/start-all-agents.sh"
cat > "$MASTER_SCRIPT" <<'EOF'
#!/bin/bash
# Master script to start all agents
# This script shows commands for each agent

PROJECT_ROOT=$(pwd)
NUM_AGENTS=${1:-3}

echo "=== Agent Startup Commands ==="
echo ""
echo "Open ${NUM_AGENTS} separate Cursor windows and run these commands:"
echo ""

for i in $(seq 1 $NUM_AGENTS); do
    echo "--- Agent ${i} ---"
    echo "cd ${PROJECT_ROOT}"
    echo "git checkout -b agent-${i}/task-preparation"
    echo "TASK=\$(./scripts/assign-next-task.sh ${i})"
    echo "touch \"sessions/tasks/.lock-\${TASK}\""
    echo "echo \"Agent ${i}: Work on \${TASK}\""
    echo ""
done

echo "Then in each Cursor window, tell the agent:"
echo "\"Prepare the task in sessions/tasks/\${TASK} following TASK-PREPARATION-GUIDE.md\""
EOF

chmod +x "$MASTER_SCRIPT"

echo "📝 Summary:"
echo "   Instructions created in: ${AGENT_INSTRUCTIONS_DIR}/"
echo "   Master script: ${MASTER_SCRIPT}"
echo ""
echo "🎯 Next Steps:"
echo "   1. Open ${NUM_AGENTS} separate Cursor windows"
echo "   2. In each window, read: ${AGENT_INSTRUCTIONS_DIR}/agent-<N>.md"
echo "   3. Follow the instructions to start working"
echo ""
echo "   Or run: cat ${MASTER_SCRIPT} for quick commands"
echo ""

