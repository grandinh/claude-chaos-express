# Task Orchestrator Example

This document demonstrates how to use the task dependency graph orchestrator with example scenarios.

## Example 1: Basic Analysis

Analyze all pending tasks:

```bash
node scripts/task-orchestrator.js --filter-status pending
```

Output shows:
- Total tasks and dependencies
- Execution order by level
- Parallelizable task groups
- Worker assignment recommendations

## Example 2: Creating Task Dependencies

### Step 1: Add dependencies to task frontmatter

Edit a task file to add dependencies:

```yaml
---
name: m-implement-feature-x
status: pending
priority: high
depends_on: [l-setup-base, h-design-api]
---
```

### Step 2: Analyze the dependency graph

```bash
node scripts/task-orchestrator.js --filter-status pending
```

The output will show:
- `l-setup-base` and `h-design-api` at Level 0 (can run in parallel)
- `m-implement-feature-x` at Level 1 (waits for dependencies)

## Example 3: Manual Dependencies

For dependencies that can't be expressed in frontmatter, use `sessions/tasks/dependencies.yaml`:

```yaml
m-implement-feature-x:
  - l-setup-base-infrastructure
  - h-design-api-contract

h-implement-api:
  - l-setup-base-infrastructure
```

Then analyze:

```bash
node scripts/task-orchestrator.js --validate
```

## Example 4: JSON Output for Automation

Get structured output for programmatic use:

```bash
node scripts/task-orchestrator.js --format json --output execution-plan.json
```

Use the JSON in scripts:

```javascript
const plan = require('./execution-plan.json');

// Get tasks that can run in parallel
const parallelTasks = plan.executionOrder.levels
  .filter(level => level.parallelizable)
  .flatMap(level => level.tasks);

console.log('Tasks that can run in parallel:', parallelTasks);
```

## Example 5: Visual Graph Generation

Generate a Graphviz DOT file and visualize:

```bash
# Generate DOT file
node scripts/task-orchestrator.js --format dot --output graph.dot

# Convert to PNG (requires Graphviz)
dot -Tpng graph.dot -o dependencies.png

# Convert to SVG
dot -Tsvg graph.dot -o dependencies.svg
```

## Example 6: Validation

Check for missing dependencies:

```bash
node scripts/task-orchestrator.js --validate
```

This will report:
- Tasks with dependencies that don't exist
- Circular dependencies
- Orphaned tasks

## Example 7: Multi-Worker Assignment

The orchestrator automatically suggests worker assignments:

```bash
node scripts/task-orchestrator.js --filter-status pending
```

Look for the "WORKER ASSIGNMENT RECOMMENDATIONS" section:

```
Worker 0:
  Level 0: l-setup-base [parallel]
  Level 0: h-design-api [parallel]
  Level 1: m-implement-feature-x

Worker 1:
  Level 0: l-setup-database [parallel]
  Level 0: l-setup-cache [parallel]
```

## Example 8: Integration with CI/CD

Use in GitHub Actions or similar:

```yaml
- name: Validate Task Dependencies
  run: |
    node scripts/task-orchestrator.js --validate
    if [ $? -ne 0 ]; then
      echo "Task dependency validation failed"
      exit 1
    fi
```

## Example 9: Finding Unblocked Tasks

Tasks with no dependencies or all dependencies completed are "unblocked":

```bash
# Get JSON output
node scripts/task-orchestrator.js --format json > plan.json

# Extract unblocked tasks (Level 0)
node -e "
const plan = require('./plan.json');
const unblocked = plan.executionOrder.levels[0].tasks;
console.log('Unblocked tasks:', unblocked.join(', '));
"
```

## Example 10: Critical Path Analysis

Identify the longest path through dependencies:

```bash
node scripts/task-orchestrator.js --format json > plan.json

node -e "
const plan = require('./plan.json');
const levels = plan.executionOrder.levels;
const criticalPath = levels.map(l => l.tasks[0]).filter(Boolean);
console.log('Critical path:', criticalPath.join(' → '));
console.log('Estimated levels:', levels.length);
"
```

