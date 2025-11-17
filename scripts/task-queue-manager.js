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
const { detectProjectRoot } = require('./utils');

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
    /**
     * @param {Object} options - Configuration options
     * @param {string} options.projectRoot - Project root directory (optional)
     * @param {string} options.tasksDir - Tasks directory (optional)
     */
    constructor(options = {}) {
        // Set up paths (allow override for testing)
        const projectRoot = options.projectRoot || detectProjectRoot();
        this.tasksDir = options.tasksDir || path.join(projectRoot, 'sessions', 'tasks');
        this.taskLog = path.join(this.tasksDir, '.new-tasks.log');
        this.queueState = path.join(this.tasksDir, '.task-queues.json');

        // Initialize queues
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
        if (fs.existsSync(this.queueState)) {
            const state = JSON.parse(fs.readFileSync(this.queueState, 'utf8'));
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
        fs.writeFileSync(this.queueState, JSON.stringify(state, null, 2), 'utf8');
    }

    /**
     * Rebuild dependency graph from all tasks
     */
    rebuildDependencyGraph() {
        this.dependencyGraph = new DependencyGraph();
        const depsFile = path.join(this.tasksDir, 'dependencies.yaml');
        const stats = this.dependencyGraph.buildFromDirectory(undefined, depsFile);
        return stats;
    }

    /**
     * Scan for new tasks in .new-tasks.log
     * @returns {Array<string>} - Array of new task paths
     */
    scanNewTasks() {
        if (!fs.existsSync(this.taskLog)) {
            return [];
        }

        const lines = fs.readFileSync(this.taskLog, 'utf8').split('\n').filter(l => l.trim());
        const newTasks = [];

        lines.forEach(line => {
            // Parse log entry: [timestamp] New task detected: path/to/task.md
            const match = line.match(/New task detected: (.+\.md)$/);
            if (match) {
                const taskPath = match[1];
                const fullPath = path.isAbsolute(taskPath)
                    ? taskPath
                    : path.join(this.tasksDir, taskPath);

                if (!this.processedTasks.has(fullPath)) {
                    newTasks.push(fullPath);
                    this.processedTasks.add(fullPath);
                }
            }
        });

        return newTasks;
    }

    /**
     * Scan ALL tasks from the tasks directory (not just from log)
     * Useful for initial population or recovery
     * @param {Object} options - Options
     * @param {Array<string>} options.excludePatterns - Patterns to exclude (e.g., 'TEMPLATE.md', 'done/')
     * @param {boolean} options.includeCompleted - Whether to include completed tasks
     * @param {boolean} options.forceRescan - Force rescan even if already processed
     * @returns {Array<string>} - Array of task paths
     */
    scanAllTasks(options = {}) {
        const {
            excludePatterns = ['TEMPLATE.md', 'done/', 'archive/', 'indexes/', 'deprecated/', 'README', 'HANDOFF', 'PROMPT', 'TASK_', 'ROADMAP', 'DEPENDENCY', 'IMPLEMENTATION', 'QUICK-START', 'PARALLEL'],
            includeCompleted = false,
            forceRescan = false
        } = options;

        if (!fs.existsSync(this.tasksDir)) {
            console.error(`Tasks directory not found: ${this.tasksDir}`);
            return [];
        }

        const files = fs.readdirSync(this.tasksDir);
        const tasks = [];

        files.forEach(file => {
            // Skip excluded patterns
            if (excludePatterns.some(pattern => file.includes(pattern))) {
                return;
            }

            // Only process .md files
            if (!file.endsWith('.md')) {
                return;
            }

            const fullPath = path.join(this.tasksDir, file);

            // Skip if already processed (unless forceRescan)
            if (!forceRescan && this.processedTasks.has(fullPath)) {
                // Check if task is completed and we're excluding completed
                const frontmatter = this.parseFrontmatter(fullPath);
                if (!includeCompleted && frontmatter && frontmatter.status === 'completed') {
                    return;
                }
            }

            // Validate frontmatter exists
            const frontmatter = this.parseFrontmatter(fullPath);
            if (!frontmatter) {
                console.warn(`⚠️  Skipping ${file}: invalid or missing frontmatter`);
                return;
            }

            // Skip completed tasks unless explicitly included
            if (!includeCompleted && frontmatter.status === 'completed') {
                return;
            }

            tasks.push(fullPath);
        });

        return tasks;
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
            // SECURITY: Use SAFE_SCHEMA to prevent arbitrary code execution from malicious YAML
            return yaml.load(frontmatterMatch[1], { schema: yaml.SAFE_SCHEMA });
        } catch (error) {
            console.error(`Failed to parse frontmatter: ${error.message}`);
            return null;
        }
    }

    /**
     * Validate context manifest exists in task file
     * @param {string} taskPath - Path to task file
     * @returns {boolean} - True if context manifest exists
     */
    validateContextManifest(taskPath) {
        try {
            const content = fs.readFileSync(taskPath, 'utf8');
            // Check for Context Manifest section (case-insensitive, flexible formatting)
            const hasContextManifest = /##\s+Context Manifest|## Context Manifest/i.test(content);
            return hasContextManifest;
        } catch (error) {
            console.error(`Failed to read task file ${taskPath}: ${error.message}`);
            return false;
        }
    }

    /**
     * Route task to appropriate queue based on context_gathered flag
     * Validates context manifest exists if context_gathered is true
     * 
     * **Error Message Format:**
     * All validation errors follow this structure:
     * - Line 1: `❌ VALIDATION ERROR: <problem description>`
     * - Line 2: `   Action: <what happened to the task>`
     * 
     * This format enables:
     * - Easy grep/filtering in logs
     * - Clear remediation guidance for operators
     * - Consistent UX across validation checkpoints
     * 
     * @param {string} taskPath - Path to task file
     * @param {boolean} skipValidation - Skip context manifest validation (for recovery)
     * @returns {Object|null} - Routed task object or null
     */
    routeTask(taskPath, skipValidation = false) {
        const frontmatter = this.parseFrontmatter(taskPath);
        if (!frontmatter) {
            // Log more detailed error for file not found
            if (!fs.existsSync(taskPath)) {
                console.error(`❌ VALIDATION ERROR: Cannot route task - file does not exist: ${taskPath}`);
                console.error(`   Action: Task rejected from queue processing`);
            } else {
                console.error(`❌ VALIDATION ERROR: Cannot parse frontmatter for: ${taskPath}`);
            }
            return null;
        }

        // Check context_gathered flag (default: false)
        const contextGathered = frontmatter.context_gathered === true;

        // CRITICAL: Validate context manifest if context_gathered is true
        if (contextGathered && !skipValidation) {
            const hasContextManifest = this.validateContextManifest(taskPath);
            if (!hasContextManifest) {
                console.warn(`⚠️  WARNING: Task ${path.basename(taskPath)} has context_gathered=true but no Context Manifest section found`);
                console.warn(`   Routing to Context Queue for context gathering.`);
                // Force to context queue
                const task = {
                    path: taskPath,
                    relativePath: path.relative(this.tasksDir, taskPath),
                    name: frontmatter.name || path.basename(taskPath, '.md'),
                    contextGathered: false, // Override to false
                    priority: frontmatter.priority || 'medium',
                    leverage: frontmatter.leverage || 'medium',
                    status: frontmatter.status || 'pending',
                    dependsOn: frontmatter.depends_on || [],
                    addedAt: new Date().toISOString(),
                    validationIssue: 'missing_context_manifest'
                };
                this.contextQueue.push(task);
                console.log(`📋 Routed to Context Queue (validation): ${task.relativePath}`);
                
                // Get manual dependencies and merge with frontmatter dependencies
                const depsFile = path.join(this.tasksDir, 'dependencies.yaml');
                const manualDeps = this.dependencyGraph.loadManualDependencies(depsFile);
                const taskId = task.relativePath.replace('.md', '');
                const manualDepsForTask = manualDeps[taskId] || manualDeps[task.relativePath] || manualDeps[task.name] || [];
                const allDeps = [...new Set([...task.dependsOn, ...manualDepsForTask])];

                // Add to dependency graph
                this.dependencyGraph.addTask(
                    task.relativePath,
                    allDeps,
                    {
                        priority: task.priority,
                        leverage: task.leverage,
                        status: task.status
                    }
                );
                this.saveState();
                return task;
            }
        }

        const task = {
            path: taskPath,
            relativePath: path.relative(this.tasksDir, taskPath),
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

        // Get manual dependencies and merge with frontmatter dependencies
        const depsFile = path.join(this.tasksDir, 'dependencies.yaml');
        const manualDeps = this.dependencyGraph.loadManualDependencies(depsFile);
        const taskId = task.relativePath.replace('.md', '');
        const manualDepsForTask = manualDeps[taskId] || manualDeps[task.relativePath] || manualDeps[task.name] || [];
        const allDeps = [...new Set([...task.dependsOn, ...manualDepsForTask])];

        // Add to dependency graph
        this.dependencyGraph.addTask(
            task.relativePath,
            allDeps,
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
     * @param {string} taskPath - Task file path (full or relative)
     * @returns {boolean} - Success status
     */
    moveToImplementationQueue(taskPath) {
        const index = this.contextQueue.findIndex(t =>
            t.path === taskPath || t.relativePath === taskPath
        );
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
     * @param {string} taskPath - Task file path (full or relative)
     * @param {string} queueName - 'context' or 'implementation'
     * @returns {boolean} - Success status
     */
    removeFromQueue(taskPath, queueName) {
        const queue = queueName === 'context' ? this.contextQueue : this.implementationQueue;
        const index = queue.findIndex(t =>
            t.path === taskPath || t.relativePath === taskPath
        );

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
                completedTasks,
                this.tasksDir
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

        // CRITICAL: Validate file still exists before returning
        for (const eligible of eligibleTasks) {
            if (!fs.existsSync(eligible.task.path)) {
                console.error(`❌ Task file no longer exists: ${eligible.task.path}`);
                console.error(`   Removing from ${queueName} queue`);

                // Remove from queue
                this.removeFromQueue(eligible.task.path, queueName);

                // Continue to next eligible task
                continue;
            }

            // File exists, return this task
            return eligible.task;
        }

        // No eligible tasks with existing files
        return null;
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

    /**
     * Process new tasks from log and route to queues
     * Convenience wrapper for scanNewTasks() + routeTask()
     * @returns {number} - Number of tasks processed
     */
    processNewTasks() {
        const newTasks = this.scanNewTasks();
        newTasks.forEach(taskPath => {
            this.routeTask(taskPath);
        });
        return newTasks.length;
    }

    /**
     * Validate and clean up both queues by removing invalid references
     * @returns {Object} - Validation statistics
     */
    validateQueues() {
        console.log('\n🔍 Validating task queues...\n');

        const stats = {
            contextQueueBefore: this.contextQueue.length,
            implementationQueueBefore: this.implementationQueue.length,
            contextRemoved: 0,
            implementationRemoved: 0,
            expiredRemoved: 0,
            totalInvalid: 0,
            invalidTasks: []
        };

        const EXPIRATION_DAYS = 7;
        const now = Date.now();
        const expirationMs = EXPIRATION_DAYS * 24 * 60 * 60 * 1000;

        // Validate context queue
        this.contextQueue = this.contextQueue.filter(task => {
            // Check file existence
            if (!fs.existsSync(task.path)) {
                console.error(`❌ Removing non-existent task from context queue: ${task.relativePath}`);
                stats.contextRemoved++;
                stats.totalInvalid++;
                stats.invalidTasks.push(task.relativePath);
                return false;
            }

            // Check for expiration (7 days since last modification)
            try {
                const fileStats = fs.statSync(task.path);
                const lastModified = fileStats.mtime.getTime();
                const age = now - lastModified;

                if (age > expirationMs) {
                    console.warn(`⏰ Removing expired task from context queue: ${task.relativePath} (${Math.floor(age / (24 * 60 * 60 * 1000))} days old)`);
                    stats.contextRemoved++;
                    stats.expiredRemoved++;
                    stats.totalInvalid++;
                    stats.invalidTasks.push(task.relativePath);
                    return false;
                }
            } catch (error) {
                console.error(`❌ Error checking task age: ${task.relativePath}`);
                stats.contextRemoved++;
                stats.totalInvalid++;
                stats.invalidTasks.push(task.relativePath);
                return false;
            }

            return true;
        });

        // Validate implementation queue
        this.implementationQueue = this.implementationQueue.filter(task => {
            // Check file existence
            if (!fs.existsSync(task.path)) {
                console.error(`❌ Removing non-existent task from implementation queue: ${task.relativePath}`);
                stats.implementationRemoved++;
                stats.totalInvalid++;
                stats.invalidTasks.push(task.relativePath);
                return false;
            }

            // Check for expiration (7 days since last modification)
            try {
                const fileStats = fs.statSync(task.path);
                const lastModified = fileStats.mtime.getTime();
                const age = now - lastModified;

                if (age > expirationMs) {
                    console.warn(`⏰ Removing expired task from implementation queue: ${task.relativePath} (${Math.floor(age / (24 * 60 * 60 * 1000))} days old)`);
                    stats.implementationRemoved++;
                    stats.expiredRemoved++;
                    stats.totalInvalid++;
                    stats.invalidTasks.push(task.relativePath);
                    return false;
                }
            } catch (error) {
                console.error(`❌ Error checking task age: ${task.relativePath}`);
                stats.implementationRemoved++;
                stats.totalInvalid++;
                stats.invalidTasks.push(task.relativePath);
                return false;
            }

            return true;
        });

        // Calculate validation percentage
        const totalBefore = stats.contextQueueBefore + stats.implementationQueueBefore;
        const invalidPercentage = totalBefore > 0 ? (stats.totalInvalid / totalBefore) * 100 : 0;

        // Save cleaned state
        this.saveState();

        // Report results
        console.log('\n📊 Queue Validation Results:');
        console.log(`   Context Queue: ${stats.contextQueueBefore} → ${this.contextQueue.length} (${stats.contextRemoved} removed)`);
        console.log(`   Implementation Queue: ${stats.implementationQueueBefore} → ${this.implementationQueue.length} (${stats.implementationRemoved} removed)`);
        console.log(`   Total Invalid: ${stats.totalInvalid} (${invalidPercentage.toFixed(1)}%)`);
        if (stats.expiredRemoved > 0) {
            console.log(`   Expired (>7 days): ${stats.expiredRemoved}`);
        }

        if (stats.invalidTasks.length > 0) {
            console.log('\n❌ Invalid tasks removed:');
            stats.invalidTasks.forEach(task => console.log(`   - ${task}`));
        }

        // Check if too many invalid tasks (>10%)
        if (invalidPercentage > 10 && totalBefore > 0) {
            console.error(`\n⚠️  WARNING: More than 10% of queued tasks were invalid (${invalidPercentage.toFixed(1)}%)`);
            console.error('   This indicates a systemic issue with queue management.');
            console.error('   Consider rebuilding queues from scratch.\n');
            stats.systemicIssue = true;
        }

        return stats;
    }

    /**
     * Process all tasks from directory and route to queues
     * Useful for initial population or recovery
     * @param {Object} options - Options (passed to scanAllTasks)
     * @returns {Object} - Processing result with stats
     */
    processAllTasks(options = {}) {
        const stats = {
            scanned: 0,
            routed: 0,
            skipped: 0,
            errors: []
        };

        // Rebuild dependency graph first
        console.log('📊 Rebuilding dependency graph...');
        const graphStats = this.rebuildDependencyGraph();
        console.log(`   Tasks in graph: ${graphStats.tasksAdded}`);

        // Scan all tasks
        const allTasks = this.scanAllTasks(options);
        stats.scanned = allTasks.length;

        console.log(`\n📋 Found ${allTasks.length} task(s) to process\n`);

        // Route each task
        allTasks.forEach(taskPath => {
            try {
                // Check if already in a queue
                const relativePath = path.relative(this.tasksDir, taskPath);
                const inContextQueue = this.contextQueue.some(t => t.path === taskPath || t.relativePath === relativePath);
                const inImplQueue = this.implementationQueue.some(t => t.path === taskPath || t.relativePath === relativePath);

                if (inContextQueue || inImplQueue) {
                    stats.skipped++;
                    return;
                }

                const task = this.routeTask(taskPath);
                if (task) {
                    stats.routed++;
                    this.processedTasks.add(taskPath);
                } else {
                    stats.skipped++;
                }
            } catch (error) {
                stats.errors.push({ taskPath, error: error.message });
                console.error(`❌ Error processing ${taskPath}: ${error.message}`);
            }
        });

        this.saveState();
        return stats;
    }

    /**
     * Get queue state (alias for getStatus with simpler structure)
     * @returns {Object} - Queue state
     */
    getQueueState() {
        return {
            contextQueue: this.contextQueue,
            implementationQueue: this.implementationQueue,
            processedTasks: Array.from(this.processedTasks),
            lastUpdated: new Date().toISOString()
        };
    }

    /**
     * Remove task from any queue
     * Convenience wrapper for removeFromQueue()
     * @param {string} taskPath - Task file path or relative path
     * @returns {boolean} - Success status
     */
    removeTask(taskPath) {
        // Try both queues
        return this.removeFromQueue(taskPath, 'context') ||
               this.removeFromQueue(taskPath, 'implementation');
    }

    /**
     * Get queue statistics
     * @returns {Object} - Queue stats
     */
    getQueueStats() {
        const total = this.contextQueue.length + this.implementationQueue.length;
        const contextRatio = total > 0 ? this.contextQueue.length / total : 0;

        return {
            contextQueue: this.contextQueue.length,
            implementationQueue: this.implementationQueue.length,
            totalTasks: total,
            contextRatio,
            processedTasksCount: this.processedTasks.size
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

// CLI usage
if (require.main === module) {
    const manager = new TaskQueueManager();

    // Parse command line arguments
    const args = process.argv.slice(2);

    if (args.includes('--validate')) {
        console.log('Running queue validation...');
        const stats = manager.validateQueues();

        if (stats.systemicIssue) {
            console.error('\n❌ CRITICAL: Systemic issues detected in queue management.');
            process.exit(1);
        } else {
            console.log('\n✅ Queue validation complete.');
            process.exit(0);
        }
    } else if (args.includes('--status')) {
        printQueueStatus(manager.getStatus());
        process.exit(0);
    } else if (args.includes('--rebuild')) {
        console.log('Rebuilding queues from scratch...');
        manager.contextQueue = [];
        manager.implementationQueue = [];
        manager.processedTasks.clear();
        manager.saveState();
        const stats = manager.processAllTasks();
        console.log(`\n✅ Rebuild complete: ${stats.routed} tasks routed`);
        process.exit(0);
    } else {
        console.log('Task Queue Manager CLI');
        console.log('');
        console.log('Usage:');
        console.log('  node task-queue-manager.js --validate    Validate and clean queues');
        console.log('  node task-queue-manager.js --status      Show queue status');
        console.log('  node task-queue-manager.js --rebuild     Rebuild queues from scratch');
        console.log('');
        console.log('Exit Codes (--validate):');
        console.log('  0 = Queues healthy (< 10% invalid tasks)');
        console.log('  1 = Systemic issues detected (> 10% invalid tasks)');
        console.log('');
        console.log('Examples:');
        console.log('  # Weekly maintenance check');
        console.log('  node task-queue-manager.js --validate');
        console.log('');
        console.log('  # Monitor queue state');
        console.log('  watch -n 30 "node task-queue-manager.js --status"');
        console.log('');
        console.log('  # Recovery from queue corruption');
        console.log('  cp sessions/tasks/.task-queues.json sessions/tasks/.task-queues.json.backup');
        console.log('  node task-queue-manager.js --rebuild');
        process.exit(0);
    }
}

module.exports = TaskQueueManager;
