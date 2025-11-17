#!/usr/bin/env node

/**
 * Populate Orchestration Queues
 *
 * Scans all tasks in sessions/tasks and routes them to appropriate queues
 * based on context_gathered flag and validates context manifests.
 *
 * Usage:
 *   node scripts/populate-queues.js [--force] [--include-completed]
 *
 * @module populate-queues
 */

const TaskQueueManager = require('./task-queue-manager');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const forceRescan = args.includes('--force');
const includeCompleted = args.includes('--include-completed');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📋 Populate Orchestration Queues');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const queueManager = new TaskQueueManager();

// Process all tasks
const stats = queueManager.processAllTasks({
    forceRescan,
    includeCompleted
});

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 Processing Summary');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log(`  Scanned: ${stats.scanned} task(s)`);
console.log(`  Routed: ${stats.routed} task(s)`);
console.log(`  Skipped: ${stats.skipped} task(s)`);
if (stats.errors.length > 0) {
    console.log(`  Errors: ${stats.errors.length}`);
    stats.errors.forEach(({ taskPath, error }) => {
        console.error(`    ❌ ${path.basename(taskPath)}: ${error}`);
    });
}

// Display queue status
const status = queueManager.getStatus();
console.log(`\n📊 Queue Status:`);
console.log(`  Context Ratio: ${status.contextRatio}`);
console.log(`  Completed Tasks: ${status.completedTasksCount}`);
console.log(`  Processed Total: ${status.processedCount}\n`);

console.log(`  📋 Context Queue: ${status.contextQueue.length} task(s)`);
if (status.contextQueue.tasks.length > 0) {
    console.log(`     Top 10 by priority score:`);
    status.contextQueue.tasks
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .forEach((t, i) => {
            console.log(`     ${i + 1}. ${t.name} (score: ${t.score.toFixed(1)}, priority: ${t.priority}, leverage: ${t.leverage})`);
        });
}

console.log(`\n  🎯 Implementation Queue: ${status.implementationQueue.length} task(s)`);
if (status.implementationQueue.tasks.length > 0) {
    console.log(`     Top 10 by priority score:`);
    status.implementationQueue.tasks
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .forEach((t, i) => {
            console.log(`     ${i + 1}. ${t.name} (score: ${t.score.toFixed(1)}, priority: ${t.priority}, leverage: ${t.leverage})`);
        });
}

console.log('\n✅ Queue population complete!\n');

