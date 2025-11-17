#!/usr/bin/env node

/**
 * Task Queue Manager with Priority Scoring
 *
 * Manages dual queues (context + implementation) with priority-based task selection.
 * Integrates with dependency graph for dependency-aware scheduling.
 *
 * @module task-queue-manager
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const DependencyGraph = require('./dependency-graph');

const PROJECT_ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const TASKS_DIR = path.join(PROJECT_ROOT, 'sessions', 'tasks');
const TASK_LOG = path.join(TASKS_DIR, '.new-tasks.log');
const QUEUE_STATE = path.join(TASKS_DIR, '.task-queues.json');

/**
 * Priority levels mapping
 */
const PRIORITY_VALUES = {
    'ultra-high': 4,
    'high': 3,
    'medium': 2,
    'low': 1
};

/**
 * Leverage levels mapping
 */
const LEVERAGE_VALUES = {
    'ultra-high': 4,
    'high': 3,
    'medium': 2,
    'low': 1
};

/**
 * Calculate priority score for a task
 * Formula: (priority × leverage) + dependencyBonus + queueTimePenalty + contextBacklogBonus
 *
 * @param {Object} task - Task object
 * @param {Object} options - Scoring options
 * @param {number} options.contextRatio - Ratio of context tasks to total tasks
 * @param {boolean} options.dependenciesSatisfied - Whether all dependencies are satisfied
 * @returns {number} - Priority score
 */
function calculatePriorityScore(task, options = {}) {
    const {
        contextRatio = 0,
        dependenciesSatisfied = true
    } = options;

    // Base priority (1-4)
    const priorityValue = PRIORITY_VALUES[task.priority] || PRIORITY_VALUES.medium;

    // Leverage multiplier (1-4)
    const leverageValue = LEVERAGE_VALUES[task.leverage] || LEVERAGE_VALUES.medium;

    // Base score = priority × leverage
    let score = priorityValue * leverageValue;

    // Dependency bonus/penalty
    if (dependenciesSatisfied) {
        score += 10; // +10 if all dependencies satisfied
    } else {
        score -= 1000; // -1000 if blocked (effectively removes from consideration)
    }

    // Queue time penalty (-0.1 per minute waiting)
    if (task.addedAt) {
        const minutesWaiting = (Date.now() - new Date(task.addedAt).getTime()) / (1000 * 60);
        score -= minutesWaiting * 0.1;
    }

    // Context backlog bonus (+5 if context queue is overloaded)
    if (!task.contextGathered && contextRatio > 0.6) {
        score += 5;
    }

    return score;
}

/**
 * TaskQueueManager class
 * Manages context and implementation queues with priority-based selection
 */
class TaskQueueManager {
    constructor() {
        this.contextQueue = [];
        this.implementationQueue = [];
        this.processedTasks = new Set();
        this.dependencyGraph = new DependencyGraph();
        this.loadState();
    }

    /**
     * Load queue state from disk
     */
    loadState() {
        if (fs.existsSync(QUEUE_STATE)) {
            const state = JSON.parse(fs.readFileSync(QUEUE_STATE, 'utf8'));
            this.contextQueue = state.contextQueue || [];
            this.implementationQueue = state.implementationQueue || [];
            this.processedTasks = new Set(state.processedTasks || []);

            // Restore dependency graph if saved
            if (state.dependencyGraph) {
                this.dependencyGraph.fromJSON(state.dependencyGraph);
            }
        }
    }

    /**
     * Save queue state to disk
     */
    saveState() {
        const state = {
            contextQueue: this.contextQueue,
            implementationQueue: this.implementationQueue,
            processedTasks: Array.from(this.processedTasks),
            dependencyGraph: this.dependencyGraph.toJSON(),
            lastUpdated: new Date().toISOString()
        };
        fs.writeFileSync(QUEUE_STATE, JSON.stringify(state, null, 2), 'utf8');
    }

    /**
     * Rebuild dependency graph from all tasks
     */
    rebuildDependencyGraph() {
        this.dependencyGraph = new DependencyGraph();
        const stats = this.dependencyGraph.buildFromDirectory();
        return stats;
    }

    /**
     * Scan for new tasks in .new-tasks.log
     * @returns {Array<string>} - Array of new task paths
     */
    scanNewTasks() {
        if (!fs.existsSync(TASK_LOG)) {
            return [];
        }

        const lines = fs.readFileSync(TASK_LOG, 'utf8').split('\n').filter(l => l.trim());
        const newTasks = [];

        lines.forEach(line => {
            // Parse log entry: [timestamp] New task detected: path/to/task.md
            const match = line.match(/New task detected: (.+\.md)$/);
            if (match) {
                const taskPath = match[1];
                const fullPath = path.isAbsolute(taskPath)
                    ? taskPath
                    : path.join(TASKS_DIR, taskPath);

                if (!this.processedTasks.has(fullPath)) {
                    newTasks.push(fullPath);
                    this.processedTasks.add(fullPath);
                }
            }
        });

        return newTasks;
    }

    /**
     * Parse task frontmatter
     * @param {string} taskPath - Path to task file
     * @returns {Object|null} - Parsed frontmatter or null
     */
    parseFrontmatter(taskPath) {
        if (!fs.existsSync(taskPath)) {
            console.error(`Task file not found: ${taskPath}`);
            return null;
        }

        const content = fs.readFileSync(taskPath, 'utf8');
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

        if (!frontmatterMatch) {
            console.error(`No frontmatter found in ${taskPath}`);
            return null;
        }

        const yaml = require('js-yaml');
        try {
            return yaml.load(frontmatterMatch[1]);
        } catch (error) {
            console.error(`Failed to parse frontmatter: ${error.message}`);
            return null;
        }
    }

    /**
     * Route task to appropriate queue based on context_gathered flag
     * @param {string} taskPath - Path to task file
     * @returns {Object|null} - Routed task object or null
     */
    routeTask(taskPath) {
        const frontmatter = this.parseFrontmatter(taskPath);
        if (!frontmatter) {
            return null;
        }

        // Check context_gathered flag (default: false)
        const contextGathered = frontmatter.context_gathered === true;

        const task = {
            path: taskPath,
            relativePath: path.relative(TASKS_DIR, taskPath),
            name: frontmatter.name || path.basename(taskPath, '.md'),
            contextGathered,
            priority: frontmatter.priority || 'medium',
            leverage: frontmatter.leverage || 'medium',
            status: frontmatter.status || 'pending',
            dependsOn: frontmatter.depends_on || [],
            addedAt: new Date().toISOString()
        };

        if (contextGathered) {
            this.implementationQueue.push(task);
            console.log(`✅ Routed to Implementation Queue: ${task.relativePath}`);
        } else {
            this.contextQueue.push(task);
            console.log(`📋 Routed to Context Queue: ${task.relativePath}`);
        }

        // Add to dependency graph
        this.dependencyGraph.addTask(
            task.relativePath,
            task.dependsOn,
            {
                priority: task.priority,
                leverage: task.leverage,
                status: task.status
            }
        );

        this.saveState();
        return task;
    }

    /**
     * Move task from context queue to implementation queue
     * @param {string} taskPath - Task file path
     * @returns {boolean} - Success status
     */
    moveToImplementationQueue(taskPath) {
        const index = this.contextQueue.findIndex(t => t.path === taskPath);
        if (index === -1) {
            console.error(`Task not found in Context Queue: ${taskPath}`);
            return false;
        }

        const task = this.contextQueue.splice(index, 1)[0];
        task.contextGathered = true;
        task.movedAt = new Date().toISOString();

        this.implementationQueue.push(task);
        this.saveState();

        console.log(`🎯 Moved to Implementation Queue: ${task.relativePath}`);
        return true;
    }

    /**
     * Remove task from queue
     * @param {string} taskPath - Task file path
     * @param {string} queueName - 'context' or 'implementation'
     * @returns {boolean} - Success status
     */
    removeFromQueue(taskPath, queueName) {
        const queue = queueName === 'context' ? this.contextQueue : this.implementationQueue;
        const index = queue.findIndex(t => t.path === taskPath);

        if (index !== -1) {
            queue.splice(index, 1);
            this.saveState();
            return true;
        }

        return false;
    }

    /**
     * Get next task from queue using priority scoring
     * @param {string} queueName - 'context' or 'implementation'
     * @param {Set<string>} completedTasks - Set of completed task names
     * @returns {Object|null} - Highest priority task or null
     */
    getNextTask(queueName, completedTasks = new Set()) {
        const queue = queueName === 'context' ? this.contextQueue : this.implementationQueue;

        if (queue.length === 0) {
            return null;
        }

        // Calculate context ratio for scoring
        const totalTasks = this.contextQueue.length + this.implementationQueue.length;
        const contextRatio = totalTasks > 0 ? this.contextQueue.length / totalTasks : 0;

        // Score all tasks in queue
        const scoredTasks = queue.map(task => {
            // Check if dependencies are satisfied
            const depCheck = this.dependencyGraph.checkDependenciesSatisfied(
                task.relativePath,
                completedTasks
            );

            const score = calculatePriorityScore(task, {
                contextRatio,
                dependenciesSatisfied: depCheck.satisfied
            });

            return {
                task,
                score,
                dependenciesSatisfied: depCheck.satisfied,
                blocking: depCheck.blocking
            };
        });

        // Filter out blocked tasks (score < 0)
        const eligibleTasks = scoredTasks.filter(st => st.dependenciesSatisfied);

        if (eligibleTasks.length === 0) {
            console.log(`⏸️  All tasks in ${queueName} queue are blocked by dependencies`);
            return null;
        }

        // Sort by score (descending)
        eligibleTasks.sort((a, b) => b.score - a.score);

        return eligibleTasks[0].task;
    }

    /**
     * Get queue status
     * @returns {Object} - Queue status
     */
    getStatus() {
        const completedTasks = new Set(
            Array.from(this.dependencyGraph.taskMetadata.entries())
                .filter(([_, meta]) => meta.status === 'completed')
                .map(([task, _]) => task)
        );

        const contextRatio = (this.contextQueue.length + this.implementationQueue.length) > 0
            ? this.contextQueue.length / (this.contextQueue.length + this.implementationQueue.length)
            : 0;

        return {
            contextQueue: {
                length: this.contextQueue.length,
                tasks: this.contextQueue.map(t => ({
                    name: t.relativePath,
                    priority: t.priority,
                    leverage: t.leverage,
                    score: calculatePriorityScore(t, { contextRatio })
                }))
            },
            implementationQueue: {
                length: this.implementationQueue.length,
                tasks: this.implementationQueue.map(t => ({
                    name: t.relativePath,
                    priority: t.priority,
                    leverage: t.leverage,
                    score: calculatePriorityScore(t, { contextRatio })
                }))
            },
            processedCount: this.processedTasks.size,
            contextRatio: contextRatio.toFixed(2),
            completedTasksCount: completedTasks.size
        };
    }
}

// CLI usage
if (require.main === module) {
    const queueManager = new TaskQueueManager();

    console.log('\n🔍 Scanning for new tasks...');

    // Rebuild dependency graph
    console.log('\n📊 Rebuilding dependency graph...');
    const graphStats = queueManager.rebuildDependencyGraph();
    console.log(`   Tasks in graph: ${graphStats.tasksAdded}`);

    // Scan for new tasks
    const newTasks = queueManager.scanNewTasks();
    console.log(`\nFound ${newTasks.length} new task(s)\n`);

    newTasks.forEach(taskPath => {
        queueManager.routeTask(taskPath);
    });

    // Display status
    const status = queueManager.getStatus();
    console.log(`\n📊 Queue Status:`);
    console.log(`  Context Ratio: ${status.contextRatio}`);
    console.log(`  Completed Tasks: ${status.completedTasksCount}`);
    console.log(`  Processed Total: ${status.processedCount}\n`);

    console.log(`  📋 Context Queue: ${status.contextQueue.length} task(s)`);
    if (status.contextQueue.tasks.length > 0) {
        console.log(`     Top 5 by priority:`);
        status.contextQueue.tasks
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .forEach((t, i) => {
                console.log(`     ${i + 1}. ${t.name} (score: ${t.score.toFixed(1)}, priority: ${t.priority}, leverage: ${t.leverage})`);
            });
    }

    console.log(`\n  🎯 Implementation Queue: ${status.implementationQueue.length} task(s)`);
    if (status.implementationQueue.tasks.length > 0) {
        console.log(`     Top 5 by priority:`);
        status.implementationQueue.tasks
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .forEach((t, i) => {
                console.log(`     ${i + 1}. ${t.name} (score: ${t.score.toFixed(1)}, priority: ${t.priority}, leverage: ${t.leverage})`);
            });
    }

    console.log('\n');
}

module.exports = TaskQueueManager;
