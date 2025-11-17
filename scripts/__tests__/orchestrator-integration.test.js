/**
 * Integration tests for the multi-agent orchestration system
 *
 * Tests the complete workflow from task detection through queue management
 * to agent assignment and execution (with simulated agents).
 *
 * Run with: npm test orchestrator-integration.test.js
 */

const fs = require('fs');
const path = require('path');
const TaskQueueManager = require('../task-queue-manager');
const DependencyGraph = require('../dependency-graph');

// Test fixtures
const TEMP_DIR = path.join(__dirname, 'temp-integration');
const TASKS_DIR = path.join(TEMP_DIR, 'sessions', 'tasks');
const TASK_LOG = path.join(TASKS_DIR, '.new-tasks.log');
const QUEUE_STATE = path.join(TASKS_DIR, '.task-queues.json');
const ORCHESTRATOR_STATE = path.join(TASKS_DIR, '.orchestrator-state.json');

describe('Orchestrator Integration Tests', () => {
    let queueManager;

    beforeEach(() => {
        // Create temp directory structure
        fs.mkdirSync(TASKS_DIR, { recursive: true });

        // Initialize queue manager with test paths
        queueManager = new TaskQueueManager({
            tasksDir: TASKS_DIR
        });
    });

    afterEach(() => {
        // Cleanup temp files
        if (fs.existsSync(TEMP_DIR)) {
            fs.rmSync(TEMP_DIR, { recursive: true, force: true });
        }
    });

    describe('End-to-End Workflow', () => {
        test('should process task from detection to queue assignment', () => {
            // 1. Create a task file
            const taskContent = `---
name: test-task
priority: high
leverage: medium
context_gathered: false
depends_on: []
---

# Test Task

This is a test task for integration testing.
`;
            const taskPath = path.join(TASKS_DIR, 'test-task.md');
            fs.writeFileSync(taskPath, taskContent);

            // 2. Simulate watcher detection (write to log)
            const logEntry = `[${new Date().toISOString()}] New task detected: test-task.md\n`;
            fs.writeFileSync(TASK_LOG, logEntry);

            // 3. Process the log
            queueManager.processNewTasks();

            // 4. Verify task was routed to context queue
            const state = queueManager.getQueueState();
            expect(state.contextQueue.length).toBe(1);
            expect(state.implementationQueue.length).toBe(0);
            expect(state.contextQueue[0].relativePath).toBe('test-task.md');
            expect(state.contextQueue[0].contextGathered).toBe(false);
        });

        test('should route task to context queue when context_gathered is true but Context Manifest is missing', () => {
            // Create task with context_gathered=true but no Context Manifest section
            // This should trigger validation and route to context queue
            const taskContent = `---
name: ready-task
priority: medium
leverage: high
context_gathered: true
depends_on: []
---

# Ready Task

This task has context_gathered=true but no Context Manifest section.
`;
            const taskPath = path.join(TASKS_DIR, 'ready-task.md');
            fs.writeFileSync(taskPath, taskContent);

            // Simulate detection
            const logEntry = `[${new Date().toISOString()}] New task detected: ready-task.md\n`;
            fs.writeFileSync(TASK_LOG, logEntry);

            // Process
            queueManager.processNewTasks();

            // Verify routing - should be forced to context queue due to missing Context Manifest
            const state = queueManager.getQueueState();
            expect(state.contextQueue.length).toBe(1);
            expect(state.implementationQueue.length).toBe(0);
            expect(state.contextQueue[0].relativePath).toBe('ready-task.md');
            expect(state.contextQueue[0].contextGathered).toBe(false); // Overridden by validation
            expect(state.contextQueue[0].validationIssue).toBe('missing_context_manifest');
        });

        test('should handle queue transition from context to implementation', () => {
            // 1. Create context task
            const taskContent = `---
name: transition-task
priority: high
leverage: high
context_gathered: false
depends_on: []
---

# Transition Task
`;
            const taskPath = path.join(TASKS_DIR, 'transition-task.md');
            fs.writeFileSync(taskPath, taskContent);

            // 2. Add to context queue
            const logEntry = `[${new Date().toISOString()}] New task detected: transition-task.md\n`;
            fs.writeFileSync(TASK_LOG, logEntry);
            queueManager.processNewTasks();

            // Verify in context queue
            let state = queueManager.getQueueState();
            expect(state.contextQueue.length).toBe(1);
            expect(state.implementationQueue.length).toBe(0);

            // 3. Simulate context gathering completion (update flag)
            const updatedContent = taskContent.replace(
                'context_gathered: false',
                'context_gathered: true'
            );
            fs.writeFileSync(taskPath, updatedContent);

            // 4. Move task to implementation queue
            const task = queueManager.getNextTask('context');
            expect(task).not.toBeNull();

            // Simulate agent completion and queue transition
            queueManager.moveToImplementationQueue(task.relativePath);

            // 5. Verify transition
            state = queueManager.getQueueState();
            expect(state.contextQueue.length).toBe(0);
            expect(state.implementationQueue.length).toBe(1);
            expect(state.implementationQueue[0].relativePath).toBe('transition-task.md');
        });
    });

    describe('Priority-Based Assignment', () => {
        test('should assign highest priority task first', () => {
            // Create tasks with different priorities
            const tasks = [
                { name: 'low-task', priority: 'low', leverage: 'low' },
                { name: 'high-task', priority: 'high', leverage: 'high' },
                { name: 'medium-task', priority: 'medium', leverage: 'medium' }
            ];

            tasks.forEach(({ name, priority, leverage }) => {
                const content = `---
name: ${name}
priority: ${priority}
leverage: ${leverage}
context_gathered: true
depends_on: []
---

# ${name}
`;
                fs.writeFileSync(path.join(TASKS_DIR, `${name}.md`), content);
                fs.appendFileSync(TASK_LOG, `[${new Date().toISOString()}] New task detected: ${name}.md\n`);
            });

            // Process all tasks
            queueManager.processNewTasks();

            // Get highest priority task
            const nextTask = queueManager.getNextTask('implementation');

            // Should get high-task (priority: high × leverage: high = 4 × 4 = 16)
            expect(nextTask.relativePath).toBe('high-task.md');
        });

        test('should respect dependencies when assigning tasks', () => {
            // Create dependency chain: task-c depends on task-b depends on task-a
            const taskA = `---
name: task-a
priority: low
leverage: low
context_gathered: true
depends_on: []
---

# Task A
`;
            const taskB = `---
name: task-b
priority: high
leverage: high
context_gathered: true
depends_on: [task-a.md]
---

# Task B
`;
            const taskC = `---
name: task-c
priority: ultra-high
leverage: ultra-high
context_gathered: true
depends_on: [task-b.md]
---

# Task C
`;

            fs.writeFileSync(path.join(TASKS_DIR, 'task-a.md'), taskA);
            fs.writeFileSync(path.join(TASKS_DIR, 'task-b.md'), taskB);
            fs.writeFileSync(path.join(TASKS_DIR, 'task-c.md'), taskC);

            fs.appendFileSync(TASK_LOG, `[${new Date().toISOString()}] New task detected: task-a.md\n`);
            fs.appendFileSync(TASK_LOG, `[${new Date().toISOString()}] New task detected: task-b.md\n`);
            fs.appendFileSync(TASK_LOG, `[${new Date().toISOString()}] New task detected: task-c.md\n`);

            // Process tasks
            queueManager.processNewTasks();

            // Get next task - should be task-a (only one with no dependencies)
            const completedTasks = new Set();
            const nextTask = queueManager.getNextTask('implementation', completedTasks);
            expect(nextTask.relativePath).toBe('task-a.md');

            // Mark task-a as completed and remove from queue
            queueManager.removeTask('task-a.md');
            completedTasks.add('task-a.md');

            // Now task-b should be assignable (its dependency is completed)
            const nextTask2 = queueManager.getNextTask('implementation', completedTasks);
            expect(nextTask2).not.toBeNull();
            expect(nextTask2.relativePath).toBe('task-b.md');
        });
    });

    describe('State Persistence', () => {
        test('should persist queue state across restarts', () => {
            // Add tasks
            const taskContent = `---
name: persist-task
priority: high
leverage: medium
context_gathered: false
depends_on: []
---

# Persist Task
`;
            fs.writeFileSync(path.join(TASKS_DIR, 'persist-task.md'), taskContent);
            fs.writeFileSync(TASK_LOG, `[${new Date().toISOString()}] New task detected: persist-task.md\n`);

            // Process and save state
            queueManager.processNewTasks();
            queueManager.saveState();

            // Create new queue manager instance (simulates restart)
            const newQueueManager = new TaskQueueManager({
                tasksDir: TASKS_DIR
            });

            // Verify state was restored
            const state = newQueueManager.getQueueState();
            expect(state.contextQueue.length).toBe(1);
            expect(state.contextQueue[0].relativePath).toBe('persist-task.md');
        });

        test('should track processed tasks to avoid duplicates', () => {
            // Add task
            const taskContent = `---
name: duplicate-task
priority: high
leverage: medium
context_gathered: false
depends_on: []
---

# Duplicate Task
`;
            fs.writeFileSync(path.join(TASKS_DIR, 'duplicate-task.md'), taskContent);
            fs.writeFileSync(TASK_LOG, `[${new Date().toISOString()}] New task detected: duplicate-task.md\n`);

            // Process first time
            queueManager.processNewTasks();
            let state = queueManager.getQueueState();
            expect(state.contextQueue.length).toBe(1);

            // Try to process again (should not add duplicate)
            queueManager.processNewTasks();
            state = queueManager.getQueueState();
            expect(state.contextQueue.length).toBe(1); // Still just 1
            expect(state.processedTasks.length).toBe(1);
        });
    });

    describe('Load Balancing', () => {
        test('should calculate correct context ratio', () => {
            // Create mix of context and implementation tasks
            for (let i = 0; i < 6; i++) {
                const content = `---
name: context-task-${i}
priority: medium
leverage: medium
context_gathered: false
depends_on: []
---

# Context Task ${i}
`;
                fs.writeFileSync(path.join(TASKS_DIR, `context-task-${i}.md`), content);
                fs.appendFileSync(TASK_LOG, `[${new Date().toISOString()}] New task detected: context-task-${i}.md\n`);
            }

            for (let i = 0; i < 4; i++) {
                const content = `---
name: impl-task-${i}
priority: medium
leverage: medium
context_gathered: true
depends_on: []
---

# Implementation Task ${i}
`;
                fs.writeFileSync(path.join(TASKS_DIR, `impl-task-${i}.md`), content);
                fs.appendFileSync(TASK_LOG, `[${new Date().toISOString()}] New task detected: impl-task-${i}.md\n`);
            }

            queueManager.processNewTasks();

            const stats = queueManager.getQueueStats();
            expect(stats.contextQueue).toBe(6);
            expect(stats.implementationQueue).toBe(4);
            expect(stats.totalTasks).toBe(10);
            expect(stats.contextRatio).toBeCloseTo(0.6, 1); // 6/10 = 0.6
        });
    });

    describe('Error Handling', () => {
        test('should handle missing task files gracefully', () => {
            // Add non-existent task to log
            fs.writeFileSync(TASK_LOG, `[${new Date().toISOString()}] New task detected: nonexistent-task.md\n`);

            // Should not throw
            expect(() => queueManager.processNewTasks()).not.toThrow();

            // Should have empty queues
            const state = queueManager.getQueueState();
            expect(state.contextQueue.length).toBe(0);
            expect(state.implementationQueue.length).toBe(0);
        });

        test('should handle invalid frontmatter gracefully', () => {
            // Create task with invalid YAML
            const invalidContent = `---
name: broken-task
priority: high
this is not valid yaml: [[[
---

# Broken Task
`;
            fs.writeFileSync(path.join(TASKS_DIR, 'broken-task.md'), invalidContent);
            fs.writeFileSync(TASK_LOG, `[${new Date().toISOString()}] New task detected: broken-task.md\n`);

            // Should not throw
            expect(() => queueManager.processNewTasks()).not.toThrow();
        });

        test('should default to context queue when context_gathered flag is missing', () => {
            // Create task without context_gathered flag
            const taskContent = `---
name: no-flag-task
priority: high
leverage: medium
depends_on: []
---

# No Flag Task
`;
            fs.writeFileSync(path.join(TASKS_DIR, 'no-flag-task.md'), taskContent);
            fs.writeFileSync(TASK_LOG, `[${new Date().toISOString()}] New task detected: no-flag-task.md\n`);

            queueManager.processNewTasks();

            // Should default to context queue
            const state = queueManager.getQueueState();
            expect(state.contextQueue.length).toBe(1);
            expect(state.implementationQueue.length).toBe(0);
        });
    });

    describe('Dependency Graph Integration', () => {
        test('should detect circular dependencies', () => {
            // Create circular dependency: A -> B -> C -> A
            const taskA = `---
name: task-a
priority: high
leverage: medium
context_gathered: true
depends_on: [task-c.md]
---

# Task A
`;
            const taskB = `---
name: task-b
priority: high
leverage: medium
context_gathered: true
depends_on: [task-a.md]
---

# Task B
`;
            const taskC = `---
name: task-c
priority: high
leverage: medium
context_gathered: true
depends_on: [task-b.md]
---

# Task C
`;

            fs.writeFileSync(path.join(TASKS_DIR, 'task-a.md'), taskA);
            fs.writeFileSync(path.join(TASKS_DIR, 'task-b.md'), taskB);
            fs.writeFileSync(path.join(TASKS_DIR, 'task-c.md'), taskC);

            fs.appendFileSync(TASK_LOG, `[${new Date().toISOString()}] New task detected: task-a.md\n`);
            fs.appendFileSync(TASK_LOG, `[${new Date().toISOString()}] New task detected: task-b.md\n`);
            fs.appendFileSync(TASK_LOG, `[${new Date().toISOString()}] New task detected: task-c.md\n`);

            queueManager.processNewTasks();

            // Get dependency graph
            const graph = queueManager.dependencyGraph;
            const cycleResult = graph.detectCircularDependencies();

            expect(cycleResult.hasCycle).toBe(true);
            expect(cycleResult.cycle.length).toBeGreaterThan(0);
        });

        test('should block tasks with unsatisfied dependencies from assignment', () => {
            // Create task that depends on non-existent task
            const blockedTaskContent = `---
name: blocked-task
priority: ultra-high
leverage: ultra-high
context_gathered: true
depends_on: [missing-dependency.md]
---

# Blocked Task
`;
            // Create another unblocked task with lower priority
            const unblockedTaskContent = `---
name: unblocked-task
priority: low
leverage: low
context_gathered: true
depends_on: []
---

# Unblocked Task
`;
            fs.writeFileSync(path.join(TASKS_DIR, 'blocked-task.md'), blockedTaskContent);
            fs.writeFileSync(path.join(TASKS_DIR, 'unblocked-task.md'), unblockedTaskContent);
            fs.writeFileSync(TASK_LOG, `[${new Date().toISOString()}] New task detected: blocked-task.md\n`);
            fs.appendFileSync(TASK_LOG, `[${new Date().toISOString()}] New task detected: unblocked-task.md\n`);

            queueManager.processNewTasks();

            // Should return the unblocked task, not the blocked one (even though blocked has higher priority)
            // Pass empty completedTasks set to indicate no dependencies are satisfied
            const completedTasks = new Set();
            const nextTask = queueManager.getNextTask('implementation', completedTasks);

            expect(nextTask).not.toBeNull();
            expect(nextTask.relativePath).toBe('unblocked-task.md');
        });
    });
});
