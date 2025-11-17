#!/usr/bin/env node

/**
 * Orchestrator Status Dashboard
 *
 * Displays real-time status of the multi-agent orchestrator system.
 *
 * @module orchestrator-status
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { detectProjectRoot } = require('./utils');

const PROJECT_ROOT = detectProjectRoot();
const ORCHESTRATOR_STATE = path.join(PROJECT_ROOT, 'sessions', 'tasks', '.orchestrator-state.json');
const QUEUE_STATE = path.join(PROJECT_ROOT, 'sessions', 'tasks', '.task-queues.json');

/**
 * Check if orchestrator process is running
 * @returns {boolean} - True if running
 */
function isOrchestratorRunning() {
    try {
        execSync('ps aux | grep "[a]gent-orchestrator.js"', { encoding: 'utf8', stdio: 'pipe' });
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Get orchestrator status
 */
function getOrchestratorStatus() {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🤖 Multi-Agent Orchestrator Status');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Check if orchestrator is running
    const running = isOrchestratorRunning();
    if (running) {
        console.log('✅ Orchestrator: RUNNING\n');
    } else {
        console.log('❌ Orchestrator: STOPPED');
        console.log('   Start with: npm run orchestrator\n');
    }

    // Read agent state
    let agents = [];
    if (fs.existsSync(ORCHESTRATOR_STATE)) {
        try {
            const state = JSON.parse(fs.readFileSync(ORCHESTRATOR_STATE, 'utf8'));
            agents = state.agents || [];
        } catch (error) {
            console.error(`⚠️  Failed to read orchestrator state: ${error.message}\n`);
        }
    }

    // Read queue state
    let queues = { contextQueue: [], implementationQueue: [] };
    if (fs.existsSync(QUEUE_STATE)) {
        try {
            queues = JSON.parse(fs.readFileSync(QUEUE_STATE, 'utf8'));
        } catch (error) {
            console.error(`⚠️  Failed to read queue state: ${error.message}\n`);
        }
    }

    // Display agent pool
    console.log('🤖 Agent Pool:');
    if (agents.length === 0) {
        console.log('   (no agents initialized)');
    } else {
        agents.forEach(agent => {
            const statusIcon = agent.status === 'working' ? '⚙️' : agent.status === 'failed' ? '❌' : '💤';
            const roleText = agent.role ? ` (${agent.role})` : '';
            const taskText = agent.currentTask ? ` - ${path.basename(agent.currentTask)}` : '';
            const pidText = agent.pid ? ` [PID: ${agent.pid}]` : '';
            const cloudText = agent.cloudAgentId ? ` [Cloud: ${agent.cloudAgentId}]` : '';
            
            console.log(`  ${statusIcon} ${agent.id}: ${agent.status}${roleText}${taskText}${pidText}${cloudText} [${agent.completedTasks} completed]`);
        });
    }

    // Display queue status
    console.log(`\n📊 Queue Status:`);
    console.log(`  📋 Context Queue: ${queues.contextQueue?.length || 0} task(s)`);
    if (queues.contextQueue && queues.contextQueue.length > 0) {
        queues.contextQueue.slice(0, 5).forEach((task, idx) => {
            const priority = task.priority || 'medium';
            const leverage = task.leverage || 'medium';
            console.log(`     ${idx + 1}. ${task.relativePath || task.name} [${priority}/${leverage}]`);
        });
        if (queues.contextQueue.length > 5) {
            console.log(`     ... and ${queues.contextQueue.length - 5} more`);
        }
    }

    console.log(`  🎯 Implementation Queue: ${queues.implementationQueue?.length || 0} task(s)`);
    if (queues.implementationQueue && queues.implementationQueue.length > 0) {
        queues.implementationQueue.slice(0, 5).forEach((task, idx) => {
            const priority = task.priority || 'medium';
            const leverage = task.leverage || 'medium';
            console.log(`     ${idx + 1}. ${task.relativePath || task.name} [${priority}/${leverage}]`);
        });
        if (queues.implementationQueue.length > 5) {
            console.log(`     ... and ${queues.implementationQueue.length - 5} more`);
        }
    }

    // Display statistics
    const totalProcessed = queues.processedTasks?.length || 0;
    const contextRatio = (queues.contextQueue?.length || 0) + (queues.implementationQueue?.length || 0) > 0
        ? ((queues.contextQueue?.length || 0) / ((queues.contextQueue?.length || 0) + (queues.implementationQueue?.length || 0))).toFixed(2)
        : '0.00';

    console.log(`\n📈 Statistics:`);
    console.log(`  Context Ratio: ${contextRatio}`);
    console.log(`  Total Processed: ${totalProcessed}`);

    const totalCompleted = agents.reduce((sum, a) => sum + (a.completedTasks || 0), 0);
    console.log(`  Total Completed: ${totalCompleted}`);

    // Display last update time
    if (fs.existsSync(ORCHESTRATOR_STATE)) {
        try {
            const state = JSON.parse(fs.readFileSync(ORCHESTRATOR_STATE, 'utf8'));
            if (state.lastUpdated) {
                const lastUpdate = new Date(state.lastUpdated);
                const now = new Date();
                const minutesAgo = Math.floor((now - lastUpdate) / 1000 / 60);
                console.log(`  Last Update: ${minutesAgo} minute(s) ago`);
            }
        } catch (e) {
            // Ignore
        }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Run if called directly
if (require.main === module) {
    getOrchestratorStatus();
}

module.exports = { getOrchestratorStatus, isOrchestratorRunning };

