#!/usr/bin/env node

/**
 * Dependency Graph Module
 *
 * Builds and analyzes task dependencies from frontmatter `depends_on` fields.
 * Provides topological sort, circular dependency detection, and dependency satisfaction checks.
 *
 * @module dependency-graph
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { detectProjectRoot } = require('./utils');

const PROJECT_ROOT = detectProjectRoot();
const TASKS_DIR = path.join(PROJECT_ROOT, 'sessions', 'tasks');

/**
 * Parse frontmatter from a markdown file
 * @param {string} filePath - Path to the markdown file
 * @returns {Object|null} - Parsed frontmatter or null if invalid
 */
function parseFrontmatter(filePath) {
    if (!fs.existsSync(filePath)) {
        return null;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

    if (!frontmatterMatch) {
        return null;
    }

    try {
        return yaml.load(frontmatterMatch[1]);
    } catch (error) {
        console.error(`Failed to parse frontmatter in ${filePath}: ${error.message}`);
        return null;
    }
}

/**
 * Normalize task name to file path
 * @param {string} taskName - Task name or file path
 * @returns {string} - Normalized file path
 */
function normalizeTaskName(taskName) {
    // If already ends with .md, return as-is
    if (taskName.endsWith('.md')) {
        return taskName;
    }
    // Otherwise append .md
    return `${taskName}.md`;
}

/**
 * DependencyGraph class
 * Manages task dependencies and provides graph algorithms
 */
class DependencyGraph {
    constructor() {
        this.adjacencyList = new Map(); // task -> [dependencies]
        this.reverseList = new Map();   // task -> [dependents]
        this.taskMetadata = new Map();  // task -> {priority, leverage, status, etc.}
    }

    /**
     * Add a task node to the graph
     * @param {string} taskName - Task file name
     * @param {Array<string>} dependencies - Array of dependency task names
     * @param {Object} metadata - Task metadata (priority, leverage, status, etc.)
     */
    addTask(taskName, dependencies = [], metadata = {}) {
        const normalizedTask = normalizeTaskName(taskName);

        if (!this.adjacencyList.has(normalizedTask)) {
            this.adjacencyList.set(normalizedTask, []);
            this.reverseList.set(normalizedTask, []);
        }

        // Normalize and add dependencies
        const normalizedDeps = dependencies.map(dep => normalizeTaskName(dep));
        this.adjacencyList.set(normalizedTask, normalizedDeps);

        // Update reverse edges (who depends on this task)
        normalizedDeps.forEach(dep => {
            if (!this.reverseList.has(dep)) {
                this.reverseList.set(dep, []);
            }
            if (!this.reverseList.get(dep).includes(normalizedTask)) {
                this.reverseList.get(dep).push(normalizedTask);
            }
        });

        // Store metadata
        this.taskMetadata.set(normalizedTask, {
            priority: metadata.priority || 'medium',
            leverage: metadata.leverage || 'medium',
            status: metadata.status || 'pending',
            created: metadata.created || new Date().toISOString().split('T')[0],
            ...metadata
        });
    }

    /**
     * Build graph from all tasks in sessions/tasks directory
     * @param {Array<string>} excludePatterns - Patterns to exclude (e.g., 'TEMPLATE.md', 'done/', etc.)
     * @returns {Object} - Build result with stats
     */
    buildFromDirectory(excludePatterns = ['TEMPLATE.md', 'done/', 'archive/', 'indexes/']) {
        const stats = {
            tasksScanned: 0,
            tasksAdded: 0,
            invalidFrontmatter: 0,
            errors: []
        };

        if (!fs.existsSync(TASKS_DIR)) {
            stats.errors.push(`Tasks directory not found: ${TASKS_DIR}`);
            return stats;
        }

        const files = fs.readdirSync(TASKS_DIR);

        files.forEach(file => {
            // Skip excluded patterns
            if (excludePatterns.some(pattern => file.includes(pattern))) {
                return;
            }

            // Only process .md files
            if (!file.endsWith('.md')) {
                return;
            }

            stats.tasksScanned++;

            const filePath = path.join(TASKS_DIR, file);
            const frontmatter = parseFrontmatter(filePath);

            if (!frontmatter) {
                stats.invalidFrontmatter++;
                stats.errors.push(`Invalid frontmatter: ${file}`);
                return;
            }

            const dependencies = frontmatter.depends_on || [];
            const metadata = {
                priority: frontmatter.priority,
                leverage: frontmatter.leverage,
                status: frontmatter.status,
                created: frontmatter.created,
                branch: frontmatter.branch
            };

            this.addTask(file, dependencies, metadata);
            stats.tasksAdded++;
        });

        return stats;
    }

    /**
     * Perform topological sort using Kahn's algorithm
     * @returns {Object} - {sorted: Array<string>, hasCycle: boolean, cycleNodes: Array<string>}
     */
    topologicalSort() {
        const inDegree = new Map();
        const queue = [];
        const sorted = [];

        // Initialize in-degree for all nodes
        for (const task of this.adjacencyList.keys()) {
            inDegree.set(task, 0);
        }

        // Calculate in-degrees (count dependencies)
        // In-degree = number of tasks this task depends on
        for (const [task, deps] of this.adjacencyList.entries()) {
            const validDeps = deps.filter(dep => this.adjacencyList.has(dep));
            inDegree.set(task, validDeps.length);
        }

        // Find nodes with no dependencies (in-degree 0)
        for (const [task, degree] of inDegree.entries()) {
            if (degree === 0) {
                queue.push(task);
            }
        }

        // Process queue
        while (queue.length > 0) {
            const task = queue.shift();
            sorted.push(task);

            // For each task that depends on this one, decrement its in-degree
            const dependents = this.reverseList.get(task) || [];
            dependents.forEach(dependent => {
                const currentDegree = inDegree.get(dependent);
                inDegree.set(dependent, currentDegree - 1);

                if (inDegree.get(dependent) === 0) {
                    queue.push(dependent);
                }
            });
        }

        // Check for cycle
        const hasCycle = sorted.length !== this.adjacencyList.size;
        const cycleNodes = hasCycle
            ? Array.from(this.adjacencyList.keys()).filter(task => !sorted.includes(task))
            : [];

        return {
            sorted,
            hasCycle,
            cycleNodes
        };
    }

    /**
     * Detect circular dependencies using DFS
     * @returns {Object} - {hasCycle: boolean, cycle: Array<string>}
     */
    detectCircularDependencies() {
        const visited = new Set();
        const recStack = new Set();
        let cycle = [];

        const dfs = (task, path = []) => {
            visited.add(task);
            recStack.add(task);
            path.push(task);

            const deps = this.adjacencyList.get(task) || [];
            for (const dep of deps) {
                if (!this.adjacencyList.has(dep)) {
                    // External dependency - skip
                    continue;
                }

                if (!visited.has(dep)) {
                    if (dfs(dep, [...path])) {
                        return true;
                    }
                } else if (recStack.has(dep)) {
                    // Found cycle
                    const cycleStart = path.indexOf(dep);
                    cycle = path.slice(cycleStart);
                    cycle.push(dep); // Close the cycle
                    return true;
                }
            }

            recStack.delete(task);
            return false;
        };

        for (const task of this.adjacencyList.keys()) {
            if (!visited.has(task)) {
                if (dfs(task)) {
                    return { hasCycle: true, cycle };
                }
            }
        }

        return { hasCycle: false, cycle: [] };
    }

    /**
     * Check if all dependencies for a task are satisfied
     * @param {string} taskName - Task to check
     * @param {Set<string>} completedTasks - Set of completed task names
     * @param {string} tasksDir - Optional tasks directory for file existence checks
     * @returns {Object} - {satisfied: boolean, blocking: Array<string>}
     */
    checkDependenciesSatisfied(taskName, completedTasks = new Set(), tasksDir = null) {
        const normalizedTask = normalizeTaskName(taskName);
        const deps = this.adjacencyList.get(normalizedTask) || [];

        const blocking = deps.filter(dep => {
            // If dependency is not in graph, check file existence if tasksDir provided
            if (!this.adjacencyList.has(dep)) {
                // If tasksDir provided, verify the dependency file exists
                if (tasksDir) {
                    const depPath = path.join(tasksDir, dep);
                    if (!fs.existsSync(depPath)) {
                        // Dependency file doesn't exist - this is blocking
                        return true;
                    }
                }
                // Either no tasksDir provided, or file exists - consider it external/satisfied
                return false;
            }

            // Check if dependency is completed
            const depMetadata = this.taskMetadata.get(dep);
            if (depMetadata && depMetadata.status === 'completed') {
                return false;
            }

            // Check against provided completed set
            if (completedTasks.has(dep)) {
                return false;
            }

            return true;
        });

        return {
            satisfied: blocking.length === 0,
            blocking
        };
    }

    /**
     * Get all tasks that have no dependencies (ready to execute)
     * @param {Set<string>} completedTasks - Set of completed task names
     * @returns {Array<string>} - Tasks with no blocking dependencies
     */
    getReadyTasks(completedTasks = new Set()) {
        const ready = [];

        for (const task of this.adjacencyList.keys()) {
            const { satisfied } = this.checkDependenciesSatisfied(task, completedTasks);
            const metadata = this.taskMetadata.get(task);

            if (satisfied && metadata.status !== 'completed') {
                ready.push(task);
            }
        }

        return ready;
    }

    /**
     * Get graph statistics
     * @returns {Object} - Graph statistics
     */
    getStats() {
        const totalTasks = this.adjacencyList.size;
        let totalDependencies = 0;
        let tasksWithNoDeps = 0;
        let tasksWithDeps = 0;

        for (const [task, deps] of this.adjacencyList.entries()) {
            totalDependencies += deps.length;
            if (deps.length === 0) {
                tasksWithNoDeps++;
            } else {
                tasksWithDeps++;
            }
        }

        return {
            totalTasks,
            totalDependencies,
            tasksWithNoDeps,
            tasksWithDeps,
            avgDependenciesPerTask: totalTasks > 0 ? (totalDependencies / totalTasks).toFixed(2) : 0
        };
    }

    /**
     * Export graph to JSON
     * @returns {Object} - Graph data
     */
    toJSON() {
        return {
            adjacencyList: Array.from(this.adjacencyList.entries()).map(([task, deps]) => ({
                task,
                dependencies: deps
            })),
            metadata: Array.from(this.taskMetadata.entries()).map(([task, meta]) => ({
                task,
                ...meta
            }))
        };
    }

    /**
     * Import graph from JSON
     * @param {Object} data - Graph data
     */
    fromJSON(data) {
        this.adjacencyList.clear();
        this.reverseList.clear();
        this.taskMetadata.clear();

        if (data.adjacencyList) {
            data.adjacencyList.forEach(({ task, dependencies }) => {
                this.addTask(task, dependencies, {});
            });
        }

        if (data.metadata) {
            data.metadata.forEach(({ task, ...meta }) => {
                this.taskMetadata.set(task, meta);
            });
        }
    }
}

// CLI usage
if (require.main === module) {
    const graph = new DependencyGraph();

    console.log('\n🔍 Building dependency graph from sessions/tasks/...\n');

    const buildStats = graph.buildFromDirectory();
    console.log('Build Statistics:');
    console.log(`  Tasks scanned: ${buildStats.tasksScanned}`);
    console.log(`  Tasks added: ${buildStats.tasksAdded}`);
    console.log(`  Invalid frontmatter: ${buildStats.invalidFrontmatter}`);

    if (buildStats.errors.length > 0) {
        console.log('\n⚠️  Errors:');
        buildStats.errors.forEach(err => console.log(`  - ${err}`));
    }

    const stats = graph.getStats();
    console.log('\n📊 Graph Statistics:');
    console.log(`  Total tasks: ${stats.totalTasks}`);
    console.log(`  Total dependencies: ${stats.totalDependencies}`);
    console.log(`  Tasks with no deps: ${stats.tasksWithNoDeps}`);
    console.log(`  Tasks with deps: ${stats.tasksWithDeps}`);
    console.log(`  Avg deps per task: ${stats.avgDependenciesPerTask}`);

    console.log('\n🔄 Checking for circular dependencies...');
    const cycleCheck = graph.detectCircularDependencies();
    if (cycleCheck.hasCycle) {
        console.log('❌ Circular dependency detected!');
        console.log(`   Cycle: ${cycleCheck.cycle.join(' → ')}`);
    } else {
        console.log('✅ No circular dependencies found');
    }

    console.log('\n📋 Topological sort...');
    const topoSort = graph.topologicalSort();
    if (topoSort.hasCycle) {
        console.log('❌ Cannot produce topological sort (cycle detected)');
        console.log(`   Nodes in cycle: ${topoSort.cycleNodes.join(', ')}`);
    } else {
        console.log('✅ Topological order:');
        topoSort.sorted.forEach((task, idx) => {
            console.log(`   ${idx + 1}. ${task}`);
        });
    }

    console.log('\n🎯 Ready tasks (no blocking dependencies):');
    const readyTasks = graph.getReadyTasks();
    if (readyTasks.length === 0) {
        console.log('   (none)');
    } else {
        readyTasks.forEach(task => {
            const metadata = graph.taskMetadata.get(task);
            console.log(`   - ${task} [${metadata.status}] (priority: ${metadata.priority}, leverage: ${metadata.leverage})`);
        });
    }

    console.log('\n');
}

module.exports = DependencyGraph;
