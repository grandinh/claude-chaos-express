/**
 * Unit tests for dependency-graph.js
 *
 * Run with: npm test or jest dependency-graph.test.js
 */

const fs = require('fs');
const path = require('path');
const DependencyGraph = require('../dependency-graph');

// Test fixtures
const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const TEMP_DIR = path.join(__dirname, 'temp');

describe('DependencyGraph', () => {
    let graph;

    beforeEach(() => {
        graph = new DependencyGraph();
    });

    afterEach(() => {
        // Cleanup temp files if any
        if (fs.existsSync(TEMP_DIR)) {
            fs.rmSync(TEMP_DIR, { recursive: true, force: true });
        }
    });

    describe('Basic Graph Operations', () => {
        test('should create empty graph', () => {
            expect(graph.adjacencyList.size).toBe(0);
            expect(graph.reverseList.size).toBe(0);
            expect(graph.taskMetadata.size).toBe(0);
        });

        test('should add task without dependencies', () => {
            graph.addTask('task-a.md', [], { priority: 'high' });

            expect(graph.adjacencyList.has('task-a.md')).toBe(true);
            expect(graph.adjacencyList.get('task-a.md')).toEqual([]);
            expect(graph.taskMetadata.get('task-a.md').priority).toBe('high');
        });

        test('should add task with dependencies', () => {
            graph.addTask('task-a.md');
            graph.addTask('task-b.md', ['task-a.md']);

            expect(graph.adjacencyList.get('task-b.md')).toEqual(['task-a.md']);
            expect(graph.reverseList.get('task-a.md')).toContain('task-b.md');
        });

        test('should normalize task names (add .md extension)', () => {
            graph.addTask('task-a', [], { priority: 'medium' });

            expect(graph.adjacencyList.has('task-a.md')).toBe(true);
            expect(graph.taskMetadata.get('task-a.md').priority).toBe('medium');
        });

        test('should handle multiple dependencies', () => {
            graph.addTask('task-a.md');
            graph.addTask('task-b.md');
            graph.addTask('task-c.md', ['task-a.md', 'task-b.md']);

            expect(graph.adjacencyList.get('task-c.md')).toEqual(['task-a.md', 'task-b.md']);
            expect(graph.reverseList.get('task-a.md')).toContain('task-c.md');
            expect(graph.reverseList.get('task-b.md')).toContain('task-c.md');
        });
    });

    describe('Circular Dependency Detection', () => {
        test('should detect no cycles in simple chain', () => {
            graph.addTask('task-a.md');
            graph.addTask('task-b.md', ['task-a.md']);
            graph.addTask('task-c.md', ['task-b.md']);

            const result = graph.detectCircularDependencies();
            expect(result.hasCycle).toBe(false);
            expect(result.cycle).toEqual([]);
        });

        test('should detect simple cycle', () => {
            graph.addTask('task-a.md', ['task-b.md']);
            graph.addTask('task-b.md', ['task-a.md']);

            const result = graph.detectCircularDependencies();
            expect(result.hasCycle).toBe(true);
            expect(result.cycle.length).toBeGreaterThan(0);
        });

        test('should detect cycle in longer chain', () => {
            graph.addTask('task-a.md', ['task-b.md']);
            graph.addTask('task-b.md', ['task-c.md']);
            graph.addTask('task-c.md', ['task-a.md']); // Cycle: a -> b -> c -> a

            const result = graph.detectCircularDependencies();
            expect(result.hasCycle).toBe(true);
            expect(result.cycle).toContain('task-a.md');
        });

        test('should not detect cycle with external dependencies', () => {
            graph.addTask('task-a.md', ['external-task.md']);
            graph.addTask('task-b.md', ['task-a.md']);

            const result = graph.detectCircularDependencies();
            expect(result.hasCycle).toBe(false);
        });

        test('should handle self-loop as cycle', () => {
            graph.addTask('task-a.md', ['task-a.md']);

            const result = graph.detectCircularDependencies();
            expect(result.hasCycle).toBe(true);
        });
    });

    describe('Topological Sort', () => {
        test('should sort simple chain correctly', () => {
            graph.addTask('task-a.md');
            graph.addTask('task-b.md', ['task-a.md']);
            graph.addTask('task-c.md', ['task-b.md']);

            const result = graph.topologicalSort();
            expect(result.hasCycle).toBe(false);
            expect(result.sorted.length).toBe(3);

            // task-a should come before task-b, task-b before task-c
            const indexA = result.sorted.indexOf('task-a.md');
            const indexB = result.sorted.indexOf('task-b.md');
            const indexC = result.sorted.indexOf('task-c.md');

            expect(indexA).toBeLessThan(indexB);
            expect(indexB).toBeLessThan(indexC);
        });

        test('should handle multiple independent tasks', () => {
            graph.addTask('task-a.md');
            graph.addTask('task-b.md');
            graph.addTask('task-c.md');

            const result = graph.topologicalSort();
            expect(result.hasCycle).toBe(false);
            expect(result.sorted.length).toBe(3);
        });

        test('should handle diamond dependency', () => {
            //     a
            //    / \
            //   b   c
            //    \ /
            //     d
            graph.addTask('task-a.md');
            graph.addTask('task-b.md', ['task-a.md']);
            graph.addTask('task-c.md', ['task-a.md']);
            graph.addTask('task-d.md', ['task-b.md', 'task-c.md']);

            const result = graph.topologicalSort();
            expect(result.hasCycle).toBe(false);
            expect(result.sorted.length).toBe(4);

            const indexA = result.sorted.indexOf('task-a.md');
            const indexB = result.sorted.indexOf('task-b.md');
            const indexC = result.sorted.indexOf('task-c.md');
            const indexD = result.sorted.indexOf('task-d.md');

            // a must come before b and c
            expect(indexA).toBeLessThan(indexB);
            expect(indexA).toBeLessThan(indexC);

            // b and c must come before d
            expect(indexB).toBeLessThan(indexD);
            expect(indexC).toBeLessThan(indexD);
        });

        test('should ignore external dependencies', () => {
            graph.addTask('task-a.md', ['external-task.md']);
            graph.addTask('task-b.md', ['task-a.md']);

            const result = graph.topologicalSort();
            expect(result.hasCycle).toBe(false);
            expect(result.sorted.length).toBe(2);
        });
    });

    describe('Dependency Satisfaction', () => {
        beforeEach(() => {
            graph.addTask('task-a.md', [], { status: 'pending' });
            graph.addTask('task-b.md', [], { status: 'completed' });
            graph.addTask('task-c.md', ['task-a.md', 'task-b.md']);
        });

        test('should check dependencies not satisfied', () => {
            const result = graph.checkDependenciesSatisfied('task-c.md', new Set());

            expect(result.satisfied).toBe(false);
            expect(result.blocking).toContain('task-a.md');
            expect(result.blocking).not.toContain('task-b.md'); // task-b is completed
        });

        test('should check dependencies satisfied via status', () => {
            graph.taskMetadata.get('task-a.md').status = 'completed';

            const result = graph.checkDependenciesSatisfied('task-c.md', new Set());

            expect(result.satisfied).toBe(true);
            expect(result.blocking).toEqual([]);
        });

        test('should check dependencies satisfied via completedTasks set', () => {
            const completedTasks = new Set(['task-a.md', 'task-b.md']);
            const result = graph.checkDependenciesSatisfied('task-c.md', completedTasks);

            expect(result.satisfied).toBe(true);
            expect(result.blocking).toEqual([]);
        });

        test('should handle task with no dependencies', () => {
            const result = graph.checkDependenciesSatisfied('task-a.md', new Set());

            expect(result.satisfied).toBe(true);
            expect(result.blocking).toEqual([]);
        });

        test('should handle external dependencies as satisfied', () => {
            graph.addTask('task-d.md', ['external-task.md']);

            const result = graph.checkDependenciesSatisfied('task-d.md', new Set());

            expect(result.satisfied).toBe(true);
            expect(result.blocking).toEqual([]);
        });
    });

    describe('Ready Tasks', () => {
        beforeEach(() => {
            graph.addTask('task-a.md', [], { status: 'pending' });
            graph.addTask('task-b.md', [], { status: 'completed' });
            graph.addTask('task-c.md', ['task-a.md'], { status: 'pending' });
            graph.addTask('task-d.md', ['task-b.md'], { status: 'pending' });
        });

        test('should get ready tasks (no blocking dependencies)', () => {
            const ready = graph.getReadyTasks();

            expect(ready).toContain('task-a.md'); // No dependencies
            expect(ready).toContain('task-d.md'); // Dependency (task-b) completed
            expect(ready).not.toContain('task-b.md'); // Already completed
            expect(ready).not.toContain('task-c.md'); // Blocked by task-a
        });

        test('should update ready tasks after completion', () => {
            const completedTasks = new Set(['task-a.md']);
            const ready = graph.getReadyTasks(completedTasks);

            expect(ready).toContain('task-c.md'); // Unblocked by task-a completion
            expect(ready).toContain('task-d.md');
        });

        test('should handle empty graph', () => {
            const emptyGraph = new DependencyGraph();
            const ready = emptyGraph.getReadyTasks();

            expect(ready).toEqual([]);
        });
    });

    describe('Graph Statistics', () => {
        test('should calculate stats for empty graph', () => {
            const stats = graph.getStats();

            expect(stats.totalTasks).toBe(0);
            expect(stats.totalDependencies).toBe(0);
            expect(stats.tasksWithNoDeps).toBe(0);
            expect(stats.tasksWithDeps).toBe(0);
        });

        test('should calculate stats correctly', () => {
            graph.addTask('task-a.md');
            graph.addTask('task-b.md', ['task-a.md']);
            graph.addTask('task-c.md', ['task-a.md', 'task-b.md']);

            const stats = graph.getStats();

            expect(stats.totalTasks).toBe(3);
            expect(stats.totalDependencies).toBe(3); // 0 + 1 + 2
            expect(stats.tasksWithNoDeps).toBe(1); // task-a
            expect(stats.tasksWithDeps).toBe(2); // task-b, task-c
            expect(parseFloat(stats.avgDependenciesPerTask)).toBe(1.0); // 3 deps / 3 tasks
        });
    });

    describe('JSON Serialization', () => {
        beforeEach(() => {
            graph.addTask('task-a.md', [], { priority: 'high', status: 'pending' });
            graph.addTask('task-b.md', ['task-a.md'], { priority: 'medium', status: 'pending' });
        });

        test('should export graph to JSON', () => {
            const json = graph.toJSON();

            expect(json.adjacencyList).toBeDefined();
            expect(json.metadata).toBeDefined();
            expect(json.adjacencyList.length).toBe(2);
            expect(json.metadata.length).toBe(2);
        });

        test('should import graph from JSON', () => {
            const json = graph.toJSON();

            const newGraph = new DependencyGraph();
            newGraph.fromJSON(json);

            expect(newGraph.adjacencyList.size).toBe(2);
            expect(newGraph.taskMetadata.size).toBe(2);
            expect(newGraph.taskMetadata.get('task-a.md').priority).toBe('high');
        });

        test('should preserve graph structure after round-trip', () => {
            const json = graph.toJSON();
            const newGraph = new DependencyGraph();
            newGraph.fromJSON(json);

            expect(newGraph.adjacencyList.get('task-b.md')).toEqual(['task-a.md']);
            expect(newGraph.taskMetadata.get('task-b.md').priority).toBe('medium');
        });
    });

    describe('Edge Cases', () => {
        test('should handle task with .md extension already', () => {
            graph.addTask('task-a.md');

            expect(graph.adjacencyList.has('task-a.md')).toBe(true);
            expect(graph.adjacencyList.has('task-a.md.md')).toBe(false);
        });

        test('should handle dependencies with mixed extensions', () => {
            graph.addTask('task-a');
            graph.addTask('task-b.md', ['task-a']);

            expect(graph.adjacencyList.get('task-b.md')).toEqual(['task-a.md']);
        });

        test('should handle duplicate task additions', () => {
            graph.addTask('task-a.md', [], { priority: 'low' });
            graph.addTask('task-a.md', [], { priority: 'high' });

            // Should overwrite metadata
            expect(graph.taskMetadata.get('task-a.md').priority).toBe('high');
        });

        test('should handle empty metadata gracefully', () => {
            graph.addTask('task-a.md', [], {});

            const metadata = graph.taskMetadata.get('task-a.md');
            expect(metadata.priority).toBe('medium'); // default
            expect(metadata.leverage).toBe('medium'); // default
            expect(metadata.status).toBe('pending'); // default
        });
    });

    describe('Complex Scenarios', () => {
        test('should handle complex dependency graph', () => {
            // Build a complex graph:
            //     a
            //    / \
            //   b   c
            //   |   |
            //   d   e
            //    \ /
            //     f

            graph.addTask('task-a.md');
            graph.addTask('task-b.md', ['task-a.md']);
            graph.addTask('task-c.md', ['task-a.md']);
            graph.addTask('task-d.md', ['task-b.md']);
            graph.addTask('task-e.md', ['task-c.md']);
            graph.addTask('task-f.md', ['task-d.md', 'task-e.md']);

            const stats = graph.getStats();
            expect(stats.totalTasks).toBe(6);

            const topoSort = graph.topologicalSort();
            expect(topoSort.hasCycle).toBe(false);
            expect(topoSort.sorted.length).toBe(6);

            const cycleCheck = graph.detectCircularDependencies();
            expect(cycleCheck.hasCycle).toBe(false);
        });

        test('should identify multiple independent subgraphs', () => {
            // Graph 1: a -> b -> c
            graph.addTask('task-a.md');
            graph.addTask('task-b.md', ['task-a.md']);
            graph.addTask('task-c.md', ['task-b.md']);

            // Graph 2: x -> y
            graph.addTask('task-x.md');
            graph.addTask('task-y.md', ['task-x.md']);

            const stats = graph.getStats();
            expect(stats.totalTasks).toBe(5);

            const ready = graph.getReadyTasks();
            expect(ready).toContain('task-a.md');
            expect(ready).toContain('task-x.md');
        });
    });
});
