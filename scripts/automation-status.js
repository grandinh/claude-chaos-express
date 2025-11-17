#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const TASKS_DIR = path.join(PROJECT_ROOT, 'sessions', 'tasks');

function getAutomationStatus() {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🤖 Task Detection Status');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Check if watcher is running
    try {
        const processes = execSync('ps aux | grep watch-cursor-automation | grep -v grep', { encoding: 'utf8' });
        console.log('✅ Watcher: RUNNING');
    } catch (e) {
        console.log('❌ Watcher: STOPPED');
        console.log('   Start with: npm run watch-automation\n');
    }

    // Check new tasks log
    const taskLogPath = path.join(TASKS_DIR, '.new-tasks.log');
    let newTasksCount = 0;
    let recentTasks = [];
    if (fs.existsSync(taskLogPath)) {
        const lines = fs.readFileSync(taskLogPath, 'utf8').split('\n').filter(l => l.trim());
        newTasksCount = lines.length;
        recentTasks = lines.slice(-5); // Last 5 tasks
    }

    console.log('\n📊 Detection Summary:');
    console.log(`  📋 Total tasks detected:  ${newTasksCount}`);
    console.log(`  📁 Tasks directory:       ${TASKS_DIR}`);
    console.log(`  📝 Queue log:             ${taskLogPath}`);

    if (recentTasks.length > 0) {
        console.log('\n📋 Recent Detections:');
        recentTasks.forEach(task => console.log(`  ${task}`));
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

getAutomationStatus();
