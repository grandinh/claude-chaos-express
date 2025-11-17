# Task Dependency Graph Orchestrator

A comprehensive tool for analyzing task dependencies, identifying optimal execution order, and recommending parallel execution strategies for the cc-sessions task system.

## Features

- **Dependency Analysis**: Parses task files and extracts dependencies from frontmatter
- **Cycle Detection**: Identifies circular dependencies that would prevent execution
- **Topological Sorting**: Determines optimal execution order respecting dependencies
- **Parallel Execution Recommendations**: Groups tasks that can be executed in parallel
- **Worker Assignment**: Suggests how to distribute tasks across multiple workers
- **Validation**: Verifies that all declared dependencies exist
- **Multiple Output Formats**: Text, JSON, and Graphviz DOT formats

## Usage

### Basic Usage

```bash
# Analyze all tasks
node scripts/task-orchestrator.js

# Filter by status
node scripts/task-orchestrator.js --filter-status pending

# Output to file
node scripts/task-orchestrator.js --output analysis.txt

# JSON output
node scripts/task-orchestrator.js --format json

# Graphviz DOT format (for visualization)
node scripts/task-orchestrator.js --format dot --output graph.dot
```

### Command-Line Options

- `--tasks-dir <path>` - Directory containing task files (default: `sessions/tasks`)
- `--format <format>` - Output format: `text`, `json`, or `dot` (default: `text`)
- `--output <file>` - Output file path (default: stdout)
- `--filter-status <status>` - Filter tasks by status (`pending`, `in-progress`, `completed`)
- `--validate` - Validate all dependencies exist
- `--deps-file <file>` - Path to manual dependencies YAML file (default: `sessions/tasks/dependencies.yaml`)
- `--help, -h` - Show help message

## Task Dependency Declaration

### In Task Frontmatter

Add a `depends_on` field to your task frontmatter:

```yaml
---
name: m-implement-feature-x
status: pending
depends_on: [l-setup-base, h-design-api]
---
```

Dependencies can be specified as:
- Task filenames (without `.md`): `l-setup-base`
- Task names: `Setup Base Infrastructure`
- With `@` prefix: `@l-setup-base`

### Manual Dependencies (YAML)

For dependencies that can't be expressed in frontmatter, use `sessions/tasks/dependencies.yaml`:

```yaml
m-implement-feature-x:
  - l-setup-base-infrastructure
  - h-design-api-contract

h-implement-api:
  - l-setup-base-infrastructure
```

## Output Formats

### Text Format (Default)

Human-readable analysis including:
- Summary statistics
- Execution order by level
- Parallel execution groups
- Worker assignment recommendations
- Dependency graph visualization
- Validation errors and cycles

### JSON Format

Structured data for programmatic use:

```json
{
  "summary": {
    "totalTasks": 45,
    "totalDependencies": 12,
    "executionLevels": 5,
    "parallelizableLevels": 3,
    "hasCycles": false
  },
  "tasks": [...],
  "executionOrder": {
    "levels": [...],
    "flatOrder": [...]
  },
  "cycles": [],
  "workerAssignments": [...],
  "validationErrors": []
}
```

### Graphviz DOT Format

For generating visual dependency graphs:

```bash
node scripts/task-orchestrator.js --format dot --output graph.dot
dot -Tpng graph.dot -o graph.png
```

## Example Workflow

1. **Analyze current task dependencies**:
   ```bash
   node scripts/task-orchestrator.js --filter-status pending
   ```

2. **Validate dependencies**:
   ```bash
   node scripts/task-orchestrator.js --validate
   ```

3. **Generate execution plan**:
   ```bash
   node scripts/task-orchestrator.js --format json --output execution-plan.json
   ```

4. **Visualize dependencies**:
   ```bash
   node scripts/task-orchestrator.js --format dot --output graph.dot
   dot -Tsvg graph.dot -o dependencies.svg
   ```

## Integration with cc-sessions

The orchestrator integrates with the existing cc-sessions infrastructure:

- Reads task files from `sessions/tasks/`
- Parses frontmatter using the same format as `TaskState.loadTask()`
- Respects task status and priority
- Can be used in CI/CD pipelines to validate task dependencies

## Use Cases

1. **Multi-Agent Orchestration**: Determine which tasks can be assigned to different agents simultaneously
2. **Workflow Optimization**: Identify bottlenecks and parallelization opportunities
3. **Dependency Validation**: Ensure all task dependencies are valid before execution
4. **Planning**: Visualize task relationships for project planning
5. **Race Condition Prevention**: Ensure proper sequencing of dependent tasks

## Algorithm Details

### Topological Sort

Uses Kahn's algorithm for topological sorting:
1. Identify all tasks with no dependencies (in-degree = 0)
2. Process these tasks in parallel (same level)
3. Remove completed tasks and update dependencies
4. Repeat until all tasks are processed

### Cycle Detection

Uses depth-first search (DFS) to detect cycles:
- Maintains a recursion stack during traversal
- Detects back edges that indicate cycles
- Reports all cycles found in the graph

### Worker Assignment

Distributes tasks across workers:
- Tasks at the same level can be parallelized
- Sequential tasks (single task per level) assigned to worker 0
- Parallel tasks distributed round-robin across available workers

## Limitations

- Currently only supports task file dependencies (not code-level dependencies)
- Manual dependency declarations require maintenance
- No automatic dependency inference from code analysis
- Graph visualization requires Graphviz to be installed

## Future Enhancements

- Auto-detect dependencies from task content analysis
- Integration with GitHub Issues for cross-repo dependencies
- Real-time dependency updates during task execution
- Web-based visualization dashboard
- Dependency impact analysis (what breaks if a task is delayed)

