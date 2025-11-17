#!/usr/bin/env node

/**
 * PM Sync Hook Module
 * Automatically syncs cc-sessions tasks to PM epics via hooks
 * PM becomes a reporting/view layer on top of cc-sessions tasks
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { parseFrontmatter } = require('../lib/frontmatter-sync.js');

// Find project root
function findProjectRoot() {
    if (process.env.CLAUDE_PROJECT_DIR) {
        return process.env.CLAUDE_PROJECT_DIR;
    }
    let cur = process.cwd();
    while (cur !== path.dirname(cur)) {
        if (fs.existsSync(path.join(cur, '.claude'))) {
            return cur;
        }
        cur = path.dirname(cur);
    }
    throw new Error('Could not find project root (no .claude directory)');
}

const PROJECT_ROOT = findProjectRoot();
const EPICS_DIR = path.join(PROJECT_ROOT, '.claude', 'epics');

/**
 * Load epic.json file
 */
function loadEpic(epicName) {
    const epicDir = path.join(EPICS_DIR, epicName);
    const epicFile = path.join(epicDir, 'epic.json');
    
    if (!fs.existsSync(epicFile)) {
        // Create epic structure if it doesn't exist
        if (!fs.existsSync(epicDir)) {
            fs.mkdirSync(epicDir, { recursive: true });
        }
        return {
            name: epicName,
            github_issue: null,
            tasks: [],
            progress: 0,
            status: 'open',
            created: new Date().toISOString(),
            updated: new Date().toISOString()
        };
    }
    
    try {
        const content = fs.readFileSync(epicFile, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        console.error(`[PM Sync] Error loading epic ${epicName}:`, error.message);
        return null;
    }
}

/**
 * Save epic.json file
 */
function saveEpic(epic) {
    const epicDir = path.join(EPICS_DIR, epic.name);
    const epicFile = path.join(epicDir, 'epic.json');
    
    if (!fs.existsSync(epicDir)) {
        fs.mkdirSync(epicDir, { recursive: true });
    }
    
    epic.updated = new Date().toISOString();
    
    try {
        fs.writeFileSync(epicFile, JSON.stringify(epic, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(`[PM Sync] Error saving epic ${epic.name}:`, error.message);
        return false;
    }
}

/**
 * Get task status from task file
 * Checks both active (sessions/tasks/) and archived (sessions/tasks/done/) locations
 */
function getTaskStatus(taskFile) {
    // Check active location first
    const activePath = path.join(PROJECT_ROOT, 'sessions', 'tasks', taskFile);
    // Check archived location
    const archivedPath = path.join(PROJECT_ROOT, 'sessions', 'tasks', 'done', taskFile);
    
    // Try active location first, then archived
    const taskPath = fs.existsSync(activePath) ? activePath : (fs.existsSync(archivedPath) ? archivedPath : null);
    
    if (!taskPath) {
        return null;
    }
    
    try {
        const content = fs.readFileSync(taskPath, 'utf8');
        const { frontmatter } = parseFrontmatter(content);
        return frontmatter?.status || 'pending';
    } catch (error) {
        console.error(`[PM Sync] Error reading task ${taskFile}:`, error.message);
        return null;
    }
}

/**
 * Sync task to epic - register task with epic
 */
function syncTaskToEpic(taskFilePath, frontmatter) {
    const epicName = frontmatter?.epic;
    if (!epicName) {
        return false; // Not an epic task
    }
    
    const taskFile = path.basename(taskFilePath);
    const epic = loadEpic(epicName);
    if (!epic) {
        return false;
    }
    
    // Check if task already registered
    const existingTask = epic.tasks.find(t => t.task_file === taskFile);
    if (existingTask) {
        // Task already registered, just update metadata
        existingTask.github_issue = frontmatter.github_issue || existingTask.github_issue;
        existingTask.epic_task_number = frontmatter.epic_task_number || existingTask.epic_task_number;
    } else {
        // Register new task
        epic.tasks.push({
            task_file: taskFile,
            status: frontmatter.status || 'pending',
            github_issue: frontmatter.github_issue || null,
            epic_task_number: frontmatter.epic_task_number || null
        });
    }
    
    // Update epic progress
    updateEpicProgress(epicName);
    
    return saveEpic(epic);
}

/**
 * Update epic task status
 */
function updateEpicTaskStatus(epicName, taskFile, status) {
    const epic = loadEpic(epicName);
    if (!epic) {
        return false;
    }
    
    const task = epic.tasks.find(t => t.task_file === taskFile);
    if (!task) {
        // Task not registered, try to register it
        const taskPath = path.join(PROJECT_ROOT, 'sessions', 'tasks', taskFile);
        if (fs.existsSync(taskPath)) {
            const content = fs.readFileSync(taskPath, 'utf8');
            const { frontmatter } = parseFrontmatter(content);
            if (frontmatter?.epic === epicName) {
                syncTaskToEpic(taskPath, frontmatter);
                const updatedEpic = loadEpic(epicName);
                const updatedTask = updatedEpic.tasks.find(t => t.task_file === taskFile);
                if (updatedTask) {
                    updatedTask.status = status;
                    saveEpic(updatedEpic);
                    updateEpicProgress(epicName);
                    return true;
                }
            }
        }
        return false;
    }
    
    task.status = status;
    saveEpic(epic);
    updateEpicProgress(epicName);
    
    return true;
}

/**
 * Update epic progress percentage
 */
function updateEpicProgress(epicName) {
    const epic = loadEpic(epicName);
    if (!epic || epic.tasks.length === 0) {
        return 0;
    }
    
    // Query actual task statuses from files
    let completed = 0;
    let total = 0;
    
    for (const taskRef of epic.tasks) {
        const actualStatus = getTaskStatus(taskRef.task_file);
        if (actualStatus) {
            total++;
            if (actualStatus === 'completed') {
                completed++;
            }
            // Update task status in epic if different
            if (taskRef.status !== actualStatus) {
                taskRef.status = actualStatus;
            }
        }
    }
    
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    epic.progress = progress;
    
    // Update epic status
    if (progress === 100 && total > 0) {
        epic.status = 'completed';
    } else if (progress > 0) {
        epic.status = 'in-progress';
    } else {
        epic.status = 'open';
    }
    
    saveEpic(epic);
    return progress;
}

/**
 * Check if epic is complete
 */
function checkEpicComplete(epicName) {
    const epic = loadEpic(epicName);
    if (!epic) {
        return false;
    }
    
    // Recalculate progress to ensure accuracy
    const progress = updateEpicProgress(epicName);
    return progress === 100 && epic.tasks.length > 0;
}

/**
 * Sync task status to GitHub issue
 */
function syncToGitHub(epicName, taskFile, status) {
    const epic = loadEpic(epicName);
    if (!epic) {
        return false;
    }
    
    const task = epic.tasks.find(t => t.task_file === taskFile);
    if (!task || !task.github_issue) {
        return false; // No GitHub issue to sync
    }
    
    try {
        // Map status to GitHub issue state
        let ghState = 'open';
        if (status === 'completed') {
            ghState = 'closed';
        }
        
        // Use gh CLI to update issue
        const issueNumber = task.github_issue.replace('#', '').trim();
        execSync(`gh issue ${ghState} ${issueNumber}`, { 
            stdio: 'ignore',
            cwd: PROJECT_ROOT 
        });
        
        return true;
    } catch (error) {
        // GitHub CLI might not be available or issue might not exist
        // Silently fail - this is not critical
        return false;
    }
}

module.exports = {
    syncTaskToEpic,
    updateEpicTaskStatus,
    updateEpicProgress,
    checkEpicComplete,
    syncToGitHub,
    loadEpic,
    saveEpic
};

