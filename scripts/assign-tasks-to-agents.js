#!/usr/bin/env node

/**
 * Assign tasks to multiple agents for parallel preparation
 * 
 * Usage:
 *   node scripts/assign-tasks-to-agents.js [num-agents]
 * 
 * Example:
 *   node scripts/assign-tasks-to-agents.js 3
 * 
 * This will:
 * 1. Use task-orchestrator.js to find parallelizable tasks
 * 2. Distribute tasks across the specified number of agents
 * 3. Create agent-assignments.json with task lists for each agent
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { findProjectRoot } = require('./utils');

const PROJECT_ROOT = findProjectRoot();
const TASKS_DIR = path.join(PROJECT_ROOT, 'sessions', 'tasks');
const NUM_AGENTS = parseInt(process.argv[2]) || 3;

console.log(`Assigning tasks to ${NUM_AGENTS} agents...`);

// Get parallel execution groups from task orchestrator
let taskData;
try {
    const output = execSync(
        `node scripts/task-orchestrator.js --filter-status pending --show-parallel --format json`,
        { cwd: PROJECT_ROOT, encoding: 'utf8' }
    );
    taskData = JSON.parse(output);
} catch (error) {
    console.error('Error running task orchestrator:', error.message);
    process.exit(1);
}

// Initialize assignments
const assignments = {};
for (let i = 1; i <= NUM_AGENTS; i++) {
    assignments[`agent-${i}`] = {
        tasks: [],
        status: 'pending'
    };
}

// Distribute tasks across agents
let agentId = 0;
const levels = taskData.levels || [];

if (levels.length === 0) {
    console.warn('No parallel execution levels found. Tasks may have dependencies.');
    // Fallback: distribute all tasks evenly
    const allTasks = taskData.tasks || [];
    for (let i = 0; i < allTasks.length; i++) {
        const agentKey = `agent-${(i % NUM_AGENTS) + 1}`;
        assignments[agentKey].tasks.push(allTasks[i].file);
    }
} else {
    // Distribute by level (respecting dependencies)
    for (const level of levels) {
        if (level.parallelizable && level.tasks) {
            for (const task of level.tasks) {
                const agentKey = `agent-${(agentId % NUM_AGENTS) + 1}`;
                assignments[agentKey].tasks.push(task.file);
                agentId++;
            }
        } else if (level.tasks && level.tasks.length > 0) {
            // Sequential task, assign to first agent
            assignments['agent-1'].tasks.push(level.tasks[0].file);
        }
    }
}

// Save assignments
const assignmentsFile = path.join(TASKS_DIR, 'agent-assignments.json');
fs.writeFileSync(assignmentsFile, JSON.stringify(assignments, null, 2));

// Print summary
console.log('\n=== Task Assignments ===\n');
for (const [agentKey, assignment] of Object.entries(assignments)) {
    console.log(`${agentKey}: ${assignment.tasks.length} tasks`);
    if (assignment.tasks.length > 0) {
        console.log(`  First: ${assignment.tasks[0]}`);
        if (assignment.tasks.length > 1) {
            console.log(`  Last: ${assignment.tasks[assignment.tasks.length - 1]}`);
        }
    }
}

console.log(`\n✅ Assignments saved to: ${assignmentsFile}`);
console.log(`\nNext steps:`);
console.log(`1. Each agent should open a separate Cursor window`);
console.log(`2. Run: ./scripts/assign-next-task.sh <AGENT_ID>`);
console.log(`3. Work on assigned tasks following TASK-PREPARATION-GUIDE.md`);

