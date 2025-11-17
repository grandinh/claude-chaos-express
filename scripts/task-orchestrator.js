#!/usr/bin/env node

/**
 * Task Dependency Graph Orchestrator
 * 
 * Analyzes task dependencies to identify:
 * - Optimal execution order (topological sort)
 * - Parallelizable tasks
 * - Circular dependencies
 * - Worker assignment recommendations
 * 
 * Usage:
 *   node scripts/task-orchestrator.js [options]
 * 
 * Options:
 *   --tasks-dir <path>    Directory containing task files (default: sessions/tasks)
 *   --format <format>     Output format: text, json, dot (default: text)
 *   --output <file>       Output file path (default: stdout)
 *   --filter-status <status>  Filter tasks by status (pending, in-progress, completed)
 *   --show-parallel       Show parallel execution groups
 *   --show-cycles         Show circular dependencies (if any)
 *   --validate            Validate all dependencies exist
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { findProjectRoot } = require('./utils');

const PROJECT_ROOT = findProjectRoot();
const DEFAULT_TASKS_DIR = path.join(PROJECT_ROOT, 'sessions', 'tasks');
const DEFAULT_DEPS_FILE = path.join(PROJECT_ROOT, 'sessions', 'tasks', 'dependencies.yaml');

/**
 * Parse frontmatter from a task file
 */
function parseFrontmatter(content) {
    if (!content.startsWith('---')) {
        return null;
    }
    
    const fmEnd = content.indexOf('---', 3);
    if (fmEnd === -1) {
        return null;
    }
    
    const fmContent = content.substring(3, fmEnd).trim();
    const data = {};
    
    for (const line of fmContent.split('\n')) {
        if (!line.includes(':')) continue;
        const [key, ...valueParts] = line.split(':');
        const cleanKey = key.trim();
        const value = valueParts.join(':').trim();
        
        // Handle array fields
        if (cleanKey === 'depends_on' || cleanKey === 'dependencies') {
            const cleanValue = value.replace(/[\[\]]/g, '');
            data.depends_on = cleanValue.split(',')
                .map(s => s.trim())
                .filter(s => s);
        } else if (cleanKey === 'submodules' || cleanKey === 'modules') {
            const cleanValue = value.replace(/[\[\]]/g, '');
            data.submodules = cleanValue.split(',')
                .map(s => s.trim())
                .filter(s => s);
        } else {
            data[cleanKey] = value || null;
        }
    }
    
    return data;
}

/**
 * Load all tasks from a directory
 */
function loadTasks(tasksDir, filterStatus = null) {
    const tasks = [];
    
    if (!fs.existsSync(tasksDir)) {
        console.error(`Tasks directory not found: ${tasksDir}`);
        return tasks;
    }
    
    const files = fs.readdirSync(tasksDir);
    
    for (const file of files) {
        // Skip non-markdown files and special files
        if (!file.endsWith('.md') || file === 'TEMPLATE.md') {
            continue;
        }
        
        const filePath = path.join(tasksDir, file);
        const stats = fs.statSync(filePath);
        
        if (!stats.isFile()) {
            continue;
        }
        
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const frontmatter = parseFrontmatter(content);
            
            if (!frontmatter) {
                continue;
            }
            
            // Apply status filter
            if (filterStatus && frontmatter.status !== filterStatus) {
                continue;
            }
            
            const task = {
                file: file,
                name: frontmatter.name || file.replace('.md', ''),
                status: frontmatter.status || 'pending',
                priority: frontmatter.priority || 'medium',
                depends_on: frontmatter.depends_on || [],
                branch: frontmatter.branch || null,
                created: frontmatter.created || null,
                frontmatter: frontmatter
            };
            
            tasks.push(task);
        } catch (error) {
            console.warn(`Error reading task file ${file}: ${error.message}`);
        }
    }
    
    return tasks;
}

/**
 * Load manual dependencies from YAML file
 */
function loadManualDependencies(depsFile) {
    if (!fs.existsSync(depsFile)) {
        return {};
    }
    
    try {
        const content = fs.readFileSync(depsFile, 'utf8');
        const data = yaml.load(content);
        return data || {};
    } catch (error) {
        console.warn(`Error reading dependencies file ${depsFile}: ${error.message}`);
        return {};
    }
}

/**
 * Build dependency graph from tasks
 */
function buildDependencyGraph(tasks, manualDeps = {}) {
    const graph = {
        nodes: new Map(),
        edges: [],
        inDegree: new Map()
    };
    
    // Initialize nodes
    for (const task of tasks) {
        const taskId = task.file.replace('.md', '');
        graph.nodes.set(taskId, task);
        graph.inDegree.set(taskId, 0);
    }
    
    // Build edges from task dependencies
    for (const task of tasks) {
        const taskId = task.file.replace('.md', '');
        const dependencies = task.depends_on || [];
        
        // Also check manual dependencies
        const manualDepsForTask = manualDeps[taskId] || manualDeps[task.name] || [];
        const allDeps = [...new Set([...dependencies, ...manualDepsForTask])];
        
        for (const dep of allDeps) {
            // Normalize dependency name (remove @, .md, etc.)
            const depId = dep.replace(/^@/, '').replace(/\.md$/, '');
            
            if (graph.nodes.has(depId)) {
                graph.edges.push({
                    from: depId,
                    to: taskId,
                    source: 'task_frontmatter'
                });
                graph.inDegree.set(taskId, (graph.inDegree.get(taskId) || 0) + 1);
            }
        }
    }
    
    return graph;
}

/**
 * Detect cycles in the dependency graph
 */
function detectCycles(graph) {
    const visited = new Set();
    const recStack = new Set();
    const cycles = [];
    
    function dfs(node, path = []) {
        if (recStack.has(node)) {
            // Found a cycle
            const cycleStart = path.indexOf(node);
            const cycle = path.slice(cycleStart).concat([node]);
            cycles.push(cycle);
            return;
        }
        
        if (visited.has(node)) {
            return;
        }
        
        visited.add(node);
        recStack.add(node);
        path.push(node);
        
        // Visit all outgoing edges
        for (const edge of graph.edges) {
            if (edge.from === node) {
                dfs(edge.to, [...path]);
            }
        }
        
        recStack.delete(node);
    }
    
    for (const nodeId of graph.nodes.keys()) {
        if (!visited.has(nodeId)) {
            dfs(nodeId);
        }
    }
    
    return cycles;
}

/**
 * Topological sort to determine execution order
 */
function topologicalSort(graph) {
    const inDegree = new Map(graph.inDegree);
    const queue = [];
    const result = [];
    const levels = [];
    
    // Find all nodes with no incoming edges
    for (const [nodeId, degree] of inDegree.entries()) {
        if (degree === 0) {
            queue.push(nodeId);
        }
    }
    
    let currentLevel = 0;
    
    while (queue.length > 0) {
        const levelSize = queue.length;
        const currentLevelNodes = [];
        
        // Process all nodes at the current level (parallelizable)
        for (let i = 0; i < levelSize; i++) {
            const nodeId = queue.shift();
            currentLevelNodes.push(nodeId);
            result.push(nodeId);
            
            // Decrease in-degree for all neighbors
            for (const edge of graph.edges) {
                if (edge.from === nodeId) {
                    const neighbor = edge.to;
                    inDegree.set(neighbor, inDegree.get(neighbor) - 1);
                    if (inDegree.get(neighbor) === 0) {
                        queue.push(neighbor);
                    }
                }
            }
        }
        
        if (currentLevelNodes.length > 0) {
            levels.push({
                level: currentLevel,
                tasks: currentLevelNodes,
                parallelizable: currentLevelNodes.length > 1
            });
            currentLevel++;
        }
    }
    
    // Check for remaining nodes (cycles)
    const remaining = [];
    for (const [nodeId, degree] of inDegree.entries()) {
        if (degree > 0) {
            remaining.push(nodeId);
        }
    }
    
    return {
        order: result,
        levels: levels,
        hasCycles: remaining.length > 0,
        remainingNodes: remaining
    };
}

/**
 * Generate worker assignment recommendations
 */
function generateWorkerAssignments(levels, maxWorkers = 4) {
    const assignments = [];
    let workerId = 0;
    
    for (const level of levels) {
        if (level.parallelizable) {
            // Distribute tasks across workers
            for (let i = 0; i < level.tasks.length; i++) {
                assignments.push({
                    task: level.tasks[i],
                    level: level.level,
                    worker: workerId % maxWorkers,
                    canParallelize: true
                });
                workerId++;
            }
        } else {
            // Sequential task, assign to worker 0
            assignments.push({
                task: level.tasks[0],
                level: level.level,
                worker: 0,
                canParallelize: false
            });
        }
    }
    
    return assignments;
}

/**
 * Validate all dependencies exist
 */
function validateDependencies(tasks, graph) {
    const errors = [];
    const taskIds = new Set(tasks.map(t => t.file.replace('.md', '')));
    const taskNames = new Set(tasks.map(t => t.name));
    
    for (const task of tasks) {
        const dependencies = task.depends_on || [];
        
        for (const dep of dependencies) {
            const depId = dep.replace(/^@/, '').replace(/\.md$/, '');
            
            if (!taskIds.has(depId) && !taskNames.has(dep)) {
                errors.push({
                    task: task.file,
                    dependency: dep,
                    error: 'Dependency not found'
                });
            }
        }
    }
    
    return errors;
}

/**
 * Format output as text
 */
function formatTextOutput(graph, sortResult, cycles, assignments, validationErrors) {
    const lines = [];
    
    lines.push('='.repeat(80));
    lines.push('TASK DEPENDENCY GRAPH ANALYSIS');
    lines.push('='.repeat(80));
    lines.push('');
    
    // Summary
    lines.push(`Total Tasks: ${graph.nodes.size}`);
    lines.push(`Total Dependencies: ${graph.edges.length}`);
    lines.push(`Execution Levels: ${sortResult.levels.length}`);
    lines.push(`Parallelizable Levels: ${sortResult.levels.filter(l => l.parallelizable).length}`);
    lines.push('');
    
    // Validation errors
    if (validationErrors.length > 0) {
        lines.push('⚠️  VALIDATION ERRORS:');
        for (const error of validationErrors) {
            lines.push(`  - Task "${error.task}": dependency "${error.dependency}" not found`);
        }
        lines.push('');
    }
    
    // Cycles
    if (cycles.length > 0) {
        lines.push('⚠️  CIRCULAR DEPENDENCIES DETECTED:');
        for (const cycle of cycles) {
            lines.push(`  ${cycle.join(' → ')}`);
        }
        lines.push('');
    }
    
    // Execution order by level
    lines.push('EXECUTION ORDER (by level):');
    lines.push('-'.repeat(80));
    for (const level of sortResult.levels) {
        const parallel = level.parallelizable ? ' [PARALLEL]' : '';
        lines.push(`Level ${level.level}${parallel}:`);
        for (const taskId of level.tasks) {
            const task = graph.nodes.get(taskId);
            const status = task.status || 'pending';
            const priority = task.priority || 'medium';
            lines.push(`  - ${taskId} (${status}, ${priority})`);
        }
        lines.push('');
    }
    
    // Worker assignments
    if (assignments.length > 0) {
        lines.push('WORKER ASSIGNMENT RECOMMENDATIONS:');
        lines.push('-'.repeat(80));
        const byWorker = {};
        for (const assignment of assignments) {
            if (!byWorker[assignment.worker]) {
                byWorker[assignment.worker] = [];
            }
            byWorker[assignment.worker].push(assignment);
        }
        
        for (const [worker, tasks] of Object.entries(byWorker)) {
            lines.push(`Worker ${worker}:`);
            for (const assignment of tasks) {
                const task = graph.nodes.get(assignment.task);
                const parallel = assignment.canParallelize ? ' [parallel]' : '';
                lines.push(`  Level ${assignment.level}: ${assignment.task}${parallel}`);
            }
            lines.push('');
        }
    }
    
    // Dependency graph visualization
    lines.push('DEPENDENCY GRAPH:');
    lines.push('-'.repeat(80));
    for (const [taskId, task] of graph.nodes.entries()) {
        const deps = graph.edges
            .filter(e => e.to === taskId)
            .map(e => e.from);
        
        if (deps.length > 0) {
            lines.push(`${taskId} depends on: ${deps.join(', ')}`);
        } else {
            lines.push(`${taskId} (no dependencies)`);
        }
    }
    
    return lines.join('\n');
}

/**
 * Format output as JSON
 */
function formatJsonOutput(graph, sortResult, cycles, assignments, validationErrors) {
    return JSON.stringify({
        summary: {
            totalTasks: graph.nodes.size,
            totalDependencies: graph.edges.length,
            executionLevels: sortResult.levels.length,
            parallelizableLevels: sortResult.levels.filter(l => l.parallelizable).length,
            hasCycles: cycles.length > 0
        },
        tasks: Array.from(graph.nodes.entries()).map(([id, task]) => ({
            id: id,
            name: task.name,
            file: task.file,
            status: task.status,
            priority: task.priority,
            dependencies: task.depends_on || []
        })),
        executionOrder: {
            levels: sortResult.levels.map(l => ({
                level: l.level,
                tasks: l.tasks,
                parallelizable: l.parallelizable
            })),
            flatOrder: sortResult.order
        },
        cycles: cycles,
        workerAssignments: assignments,
        validationErrors: validationErrors
    }, null, 2);
}

/**
 * Format output as Graphviz DOT
 */
function formatDotOutput(graph, sortResult) {
    const lines = [];
    lines.push('digraph TaskDependencies {');
    lines.push('  rankdir=TB;');
    lines.push('  node [shape=box, style=rounded];');
    lines.push('');
    
    // Add nodes with styling by status
    for (const [taskId, task] of graph.nodes.entries()) {
        const status = task.status || 'pending';
        let color = 'gray';
        if (status === 'completed') color = 'green';
        else if (status === 'in-progress') color = 'orange';
        else if (status === 'blocked') color = 'red';
        
        lines.push(`  "${taskId}" [label="${task.name || taskId}", color=${color}];`);
    }
    
    lines.push('');
    
    // Add edges
    for (const edge of graph.edges) {
        lines.push(`  "${edge.from}" -> "${edge.to}";`);
    }
    
    // Add level ranks
    for (const level of sortResult.levels) {
        if (level.tasks.length > 1) {
            const sameRank = level.tasks.map(t => `"${t}"`).join(' ');
            lines.push(`  { rank=same; ${sameRank} }`);
        }
    }
    
    lines.push('}');
    return lines.join('\n');
}

/**
 * Main function
 */
function main() {
    const args = process.argv.slice(2);
    
    // Parse arguments
    let tasksDir = DEFAULT_TASKS_DIR;
    let format = 'text';
    let outputFile = null;
    let filterStatus = null;
    let showParallel = true;
    let showCycles = true;
    let validate = false;
    let depsFile = DEFAULT_DEPS_FILE;
    
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--tasks-dir' && i + 1 < args.length) {
            tasksDir = args[++i];
        } else if (args[i] === '--format' && i + 1 < args.length) {
            format = args[++i];
        } else if (args[i] === '--output' && i + 1 < args.length) {
            outputFile = args[++i];
        } else if (args[i] === '--filter-status' && i + 1 < args.length) {
            filterStatus = args[++i];
        } else if (args[i] === '--show-parallel') {
            showParallel = true;
        } else if (args[i] === '--show-cycles') {
            showCycles = true;
        } else if (args[i] === '--validate') {
            validate = true;
        } else if (args[i] === '--deps-file' && i + 1 < args.length) {
            depsFile = args[++i];
        } else if (args[i] === '--help' || args[i] === '-h') {
            console.log(`
Usage: node scripts/task-orchestrator.js [options]

Options:
  --tasks-dir <path>      Directory containing task files (default: sessions/tasks)
  --format <format>       Output format: text, json, dot (default: text)
  --output <file>         Output file path (default: stdout)
  --filter-status <status> Filter tasks by status (pending, in-progress, completed)
  --show-parallel          Show parallel execution groups (default: true)
  --show-cycles            Show circular dependencies (default: true)
  --validate               Validate all dependencies exist
  --deps-file <file>      Path to manual dependencies YAML file
  --help, -h              Show this help message
            `);
            process.exit(0);
        }
    }
    
    try {
        // Load tasks
        const tasks = loadTasks(tasksDir, filterStatus);
        
        if (tasks.length === 0) {
            console.error('No tasks found');
            process.exit(1);
        }
        
        // Load manual dependencies
        const manualDeps = loadManualDependencies(depsFile);
        
        // Build graph
        const graph = buildDependencyGraph(tasks, manualDeps);
        
        // Detect cycles
        const cycles = detectCycles(graph);
        
        // Topological sort
        const sortResult = topologicalSort(graph);
        
        // Generate worker assignments
        const assignments = generateWorkerAssignments(sortResult.levels);
        
        // Validate dependencies
        const validationErrors = validate ? validateDependencies(tasks, graph) : [];
        
        // Format output
        let output;
        if (format === 'json') {
            output = formatJsonOutput(graph, sortResult, cycles, assignments, validationErrors);
        } else if (format === 'dot') {
            output = formatDotOutput(graph, sortResult);
        } else {
            output = formatTextOutput(graph, sortResult, cycles, assignments, validationErrors);
        }
        
        // Write output
        if (outputFile) {
            fs.writeFileSync(outputFile, output, 'utf8');
            console.log(`Output written to ${outputFile}`);
        } else {
            console.log(output);
        }
        
        // Exit with error code if there are issues
        if (cycles.length > 0 || validationErrors.length > 0) {
            process.exit(1);
        }
        
    } catch (error) {
        console.error(`Error: ${error.message}`);
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    loadTasks,
    buildDependencyGraph,
    detectCycles,
    topologicalSort,
    generateWorkerAssignments,
    validateDependencies
};

