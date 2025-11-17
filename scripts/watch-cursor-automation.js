#!/usr/bin/env node

/**
 * Unified Cursor Automation Watcher
 * Monitors both new task files and handoff triggers
 */

const fs = require('fs');
const path = require('path');
const { findProjectRoot } = require('./utils');

const PROJECT_ROOT = findProjectRoot();
const TASKS_DIR = path.join(PROJECT_ROOT, 'sessions', 'tasks');
const LOGS_DIR = path.join(PROJECT_ROOT, '.cursor', 'automation-logs');

// Ensure directories exist
if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
}

const TASK_LOG = path.join(TASKS_DIR, '.new-tasks.log');
const WATCH_LOG = path.join(LOGS_DIR, 'watch.log');
const DETECTION_LOG = path.join(LOGS_DIR, 'detection.log');
const ERROR_LOG = path.join(LOGS_DIR, 'errors.log');

const EXCLUDED_TASK_FILES = ['TEMPLATE.md'];
const EXCLUDED_TASK_DIRS = ['done', 'indexes', 'archive'];

// Logging utilities
function log(message, logFile = WATCH_LOG) {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(logFile, entry, 'utf8');
    console.log(entry.trim());
}

function logError(message, error) {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] ERROR: ${message}\n${error.stack || error}\n\n`;
    fs.appendFileSync(ERROR_LOG, entry, 'utf8');
    console.error(entry.trim());
}

// Desktop notification utility
function notify(title, message) {
    try {
        const os = require('os');
        const platform = os.platform();
        const { execSync } = require('child_process');

        if (platform === 'darwin') {
            // macOS
            execSync(
                `osascript -e 'display notification "${message}" with title "${title}"'`,
                { timeout: 5000 }
            );
        } else if (platform === 'linux') {
            // Linux (requires notify-send)
            try {
                execSync(`notify-send "${title}" "${message}"`, { timeout: 5000 });
            } catch (e) {
                // notify-send not available, skip
            }
        }
        // Windows notifications would require additional packages
    } catch (e) {
        // Notification failed, continue without it
    }
}

// Task File Detection Handler
function handleNewTask(filePath) {
    try {
        const relativePath = path.relative(TASKS_DIR, filePath);
        const basename = path.basename(relativePath);
        const dirname = path.dirname(relativePath);

        // Skip excluded files
        if (EXCLUDED_TASK_FILES.includes(basename)) {
            return;
        }

        // Skip excluded directories
        if (dirname !== '.' && EXCLUDED_TASK_DIRS.some(dir => dirname.startsWith(dir))) {
            return;
        }

        // Log new task
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] New task detected: ${relativePath}\n`;
        fs.appendFileSync(TASK_LOG, logEntry, 'utf8');

        // Detailed logging
        log(`📋 New task detected: ${relativePath}`, WATCH_LOG);
        log(`📋 Task logged for queue manager: ${relativePath}`, DETECTION_LOG);

        // Notify user
        notify('New Task Detected', `Task: ${basename}`);

        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`📋 NEW TASK DETECTED`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`File: ${relativePath}`);
        console.log(`Path: ${filePath}`);
        console.log(`\nNext Steps:`);
        console.log(`1. Task logged to queue (see .new-tasks.log)`);
        console.log(`2. Multi-agent orchestrator will handle automatically`);
        console.log(`3. Or manually start: @sessions/tasks/${relativePath}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    } catch (error) {
        logError(`Failed to handle new task: ${filePath}`, error);
    }
}

// Setup watcher
let watcher = null;
let useChokidar = false;

try {
    const chokidar = require('chokidar');
    useChokidar = true;

    watcher = chokidar.watch(TASKS_DIR, {
        ignored: [
            /(^|[\/\\])\../, // ignore dotfiles
            /node_modules/,
            /\.git/,
            (filePath) => {
                const relativePath = path.relative(TASKS_DIR, filePath);
                const basename = path.basename(filePath);
                const dirname = path.dirname(relativePath);

                // Skip excluded files
                if (EXCLUDED_TASK_FILES.includes(basename)) {
                    return true;
                }

                // Skip excluded directories
                if (dirname !== '.' && EXCLUDED_TASK_DIRS.some(dir => dirname.startsWith(dir))) {
                    return true;
                }

                return false;
            }
        ],
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
            stabilityThreshold: 500,
            pollInterval: 100
        }
    });

    watcher
        .on('add', (filePath) => {
            // Only process .md files
            if (!filePath.endsWith('.md')) {
                return;
            }

            // Handle new task detection
            handleNewTask(filePath);
        })
        .on('ready', () => {
            console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`👀 Task Detection Watcher Started`);
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`\nMonitoring:`);
            console.log(`  📋 Task files: ${TASKS_DIR}`);
            console.log(`\nLogs:`);
            console.log(`  Detection: ${DETECTION_LOG}`);
            console.log(`  Watch:     ${WATCH_LOG}`);
            console.log(`  Errors:    ${ERROR_LOG}`);
            console.log(`\nQueue:`);
            console.log(`  New tasks: ${TASK_LOG}`);
            console.log(`\nPress Ctrl+C to stop\n`);
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

            log('Task detection watcher started', WATCH_LOG);
        })
        .on('error', (error) => {
            logError('Watcher error', error);
        });

} catch (e) {
    console.error('ERROR: chokidar not available');
    console.error('Install chokidar: cd scripts && npm install chokidar');
    process.exit(1);
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n👋 Stopping automation watcher...');
    log('Watcher stopped (SIGINT)', WATCH_LOG);
    if (watcher && useChokidar) {
        watcher.close();
    }
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n\n👋 Stopping automation watcher...');
    log('Watcher stopped (SIGTERM)', WATCH_LOG);
    if (watcher && useChokidar) {
        watcher.close();
    }
    process.exit(0);
});
