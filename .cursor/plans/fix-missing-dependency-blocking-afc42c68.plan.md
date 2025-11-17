<!-- afc42c68-d746-45cf-b688-d1b4a47b86aa 72799365-c173-49f4-9a2f-a68c7af5f653 -->
# Fix Missing Dependency Blocking

## Problem

The test `should block tasks with unsatisfied dependencies from assignment` is failing. When a task depends on a file that doesn't exist (e.g., `missing-dependency.md`), the system incorrectly treats it as satisfied and assigns the blocked task instead of the lower-priority unblocked task.

**Current behavior:** Tasks with missing dependencies are assigned because dependencies not in the graph are treated as "external/satisfied".

**Expected behavior:** Tasks with missing dependency files should be blocked from assignment.

## Root Cause

In `scripts/dependency-graph.js`, the `checkDependenciesSatisfied` method (lines 280-308) has this logic:

```285:288:scripts/dependency-graph.js
// If dependency is not in graph, consider it external/satisfied
if (!this.adjacencyList.has(dep)) {
    return false;
}
```

This assumes dependencies not in the graph are external and satisfied. However, if the dependency file doesn't exist on disk, it should block the task.

## Solution

Update `checkDependenciesSatisfied` to check file existence when a dependency is not in the graph:

1. **Add optional `tasksDir` parameter** to `checkDependenciesSatisfied` method in `scripts/dependency-graph.js`

   - When `tasksDir` is provided and dependency is not in graph, check if the dependency file exists
   - If file doesn't exist, return `true` (blocking)
   - If file exists or `tasksDir` not provided, maintain current behavior (external/satisfied)

2. **Update call site** in `scripts/task-queue-manager.js` (line 323)

   - Pass `this.tasksDir` as third argument to `checkDependenciesSatisfied`

3. **Verify fix** by running the test:
   ```bash
   npm test -- orchestrator-integration.test.js
   ```


## Files to Modify

- `scripts/dependency-graph.js` - Update `checkDependenciesSatisfied` method signature and logic
- `scripts/task-queue-manager.js` - Pass `tasksDir` parameter when calling `checkDependenciesSatisfied`

## Testing

The existing test at `scripts/__tests__/orchestrator-integration.test.js:456-493` validates this behavior. After the fix, all 13 integration tests should pass.

### To-dos

- [ ] Update checkDependenciesSatisfied in dependency-graph.js to accept tasksDir parameter and check file existence for dependencies not in graph
- [ ] Update task-queue-manager.js to pass this.tasksDir when calling checkDependenciesSatisfied
- [ ] Run orchestrator-integration.test.js to verify all 13 tests pass