#!/usr/bin/env node

/**
 * Task Registry Core Module
 * Centralized task metadata management for multi-model architecture
 */

const fs = require('fs');
const path = require('path');

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
const REGISTRY_PATH = path.join(PROJECT_ROOT, 'sessions', 'task-registry.json');
const LOCK_DIR = path.join(PROJECT_ROOT, 'sessions', '.task-registry.lock');

// Valid status values
const VALID_STATUSES = [
    'pending',
    'in-progress',
    'ready-for-review',
    'needs-revision',
    'completed',
    'blocked'
];

// Valid actors
const VALID_ACTORS = ['claude', 'cursor', 'codex'];

// Valid risk levels
const VALID_RISK_LEVELS = ['high', 'medium', 'low'];

// Default registry structure
const DEFAULT_REGISTRY = {
    version: '1.0.0',
    tasks: {}
};

// Lock file management for atomic operations
function acquireLock() {
    if (!fs.existsSync(LOCK_DIR)) {
        fs.mkdirSync(LOCK_DIR, { recursive: true });
        return true;
    }
    return false;
}

function releaseLock() {
    if (fs.existsSync(LOCK_DIR)) {
        try {
            fs.rmdirSync(LOCK_DIR);
        } catch (e) {
            // Ignore errors on release
        }
    }
}

// Load registry with retry logic
function loadRegistry() {
    let attempts = 0;
    const maxAttempts = 10;
    const retryDelay = 100; // ms

    while (attempts < maxAttempts) {
        if (!acquireLock()) {
            attempts++;
            if (attempts >= maxAttempts) {
                throw new Error('Could not acquire lock after multiple attempts');
            }
            // Wait before retry
            const start = Date.now();
            while (Date.now() - start < retryDelay) {
                // Busy wait
            }
            continue;
        }

        try {
            if (!fs.existsSync(REGISTRY_PATH)) {
                // Create default registry
                const defaultRegistry = JSON.stringify(DEFAULT_REGISTRY, null, 2);
                fs.writeFileSync(REGISTRY_PATH, defaultRegistry, 'utf8');
                releaseLock();
                return JSON.parse(defaultRegistry);
            }

            const content = fs.readFileSync(REGISTRY_PATH, 'utf8');
            const registry = JSON.parse(content);

            // Validate structure
            if (!registry.version || !registry.tasks) {
                throw new Error('Invalid registry structure');
            }

            releaseLock();
            return registry;
        } catch (error) {
            releaseLock();
            if (error.code === 'ENOENT' && attempts === 0) {
                // First attempt, create default
                const defaultRegistry = JSON.stringify(DEFAULT_REGISTRY, null, 2);
                fs.writeFileSync(REGISTRY_PATH, defaultRegistry, 'utf8');
                return JSON.parse(defaultRegistry);
            }
            throw error;
        }
    }
}

// Save registry atomically
function saveRegistry(registry) {
    if (!acquireLock()) {
        throw new Error('Could not acquire lock to save registry');
    }

    try {
        // Validate structure
        if (!registry.version || !registry.tasks) {
            throw new Error('Invalid registry structure');
        }

        // Write to temp file first, then rename (atomic on most systems)
        const tempPath = REGISTRY_PATH + '.tmp';
        const content = JSON.stringify(registry, null, 2);
        fs.writeFileSync(tempPath, content, 'utf8');
        fs.renameSync(tempPath, REGISTRY_PATH);
    } finally {
        releaseLock();
    }
}

// Get task by ID
function getTask(taskId) {
    const registry = loadRegistry();
    return registry.tasks[taskId] || null;
}

// Create new task entry
function createTask(taskId, initial = {}) {
    const registry = loadRegistry();

    if (registry.tasks[taskId]) {
        throw new Error(`Task ${taskId} already exists in registry`);
    }

    const now = new Date().toISOString();
    const task = {
        status: initial.status || 'pending',
        mode: initial.mode || 'full',
        assigned_to: initial.assigned_to || null,
        risk_level: initial.risk_level || 'medium',
        codex_reviews: initial.codex_reviews || [],
        created: initial.created || now,
        updated: now,
        last_actor: initial.last_actor || null,
        file_path: initial.file_path || `sessions/tasks/${taskId}.md`
    };

    // Validate fields
    if (!VALID_STATUSES.includes(task.status)) {
        throw new Error(`Invalid status: ${task.status}`);
    }
    if (task.assigned_to && !VALID_ACTORS.includes(task.assigned_to)) {
        throw new Error(`Invalid assigned_to: ${task.assigned_to}`);
    }
    if (!VALID_RISK_LEVELS.includes(task.risk_level)) {
        throw new Error(`Invalid risk_level: ${task.risk_level}`);
    }

    registry.tasks[taskId] = task;
    saveRegistry(registry);
    return task;
}

// Update task with validation
function updateTask(taskId, updates, actor = null) {
    const registry = loadRegistry();

    if (!registry.tasks[taskId]) {
        throw new Error(`Task ${taskId} not found in registry`);
    }

    const task = registry.tasks[taskId];

    // Validate status transition if status is being updated
    if (updates.status && updates.status !== task.status) {
        if (!validateTransition(task.status, updates.status, actor || task.last_actor)) {
            console.warn(`Warning: Invalid status transition from ${task.status} to ${updates.status}`);
            // Don't throw, just warn (per spec: "should log, not block")
        }
    }

    // Apply updates
    if (updates.status !== undefined) {
        if (!VALID_STATUSES.includes(updates.status)) {
            throw new Error(`Invalid status: ${updates.status}`);
        }
        task.status = updates.status;
    }
    if (updates.mode !== undefined) {
        task.mode = updates.mode;
    }
    if (updates.assigned_to !== undefined) {
        if (updates.assigned_to && !VALID_ACTORS.includes(updates.assigned_to)) {
            throw new Error(`Invalid assigned_to: ${updates.assigned_to}`);
        }
        task.assigned_to = updates.assigned_to;
    }
    if (updates.risk_level !== undefined) {
        if (!VALID_RISK_LEVELS.includes(updates.risk_level)) {
            throw new Error(`Invalid risk_level: ${updates.risk_level}`);
        }
        task.risk_level = updates.risk_level;
    }
    if (updates.codex_reviews !== undefined) {
        task.codex_reviews = updates.codex_reviews;
    }
    if (updates.file_path !== undefined) {
        task.file_path = updates.file_path;
    }

    // Always update timestamp and actor
    task.updated = new Date().toISOString();
    if (actor) {
        if (!VALID_ACTORS.includes(actor)) {
            throw new Error(`Invalid actor: ${actor}`);
        }
        task.last_actor = actor;
    }

    saveRegistry(registry);
    return task;
}

// Validate status transition
function validateTransition(fromStatus, toStatus, actor) {
    // Define valid transitions
    const validTransitions = {
        'pending': ['in-progress', 'blocked'],
        'in-progress': ['ready-for-review', 'needs-revision', 'blocked', 'completed'],
        'ready-for-review': ['needs-revision', 'completed', 'in-progress'],
        'needs-revision': ['in-progress', 'blocked'],
        'blocked': ['pending', 'in-progress'],
        'completed': [] // Terminal state
    };

    const allowed = validTransitions[fromStatus] || [];
    return allowed.includes(toStatus);
}

// Get all tasks
function getAllTasks() {
    const registry = loadRegistry();
    return Object.keys(registry.tasks).map(taskId => ({
        id: taskId,
        ...registry.tasks[taskId]
    }));
}

// Get tasks by status
function getTasksByStatus(status) {
    if (!VALID_STATUSES.includes(status)) {
        throw new Error(`Invalid status: ${status}`);
    }
    const allTasks = getAllTasks();
    return allTasks.filter(task => task.status === status);
}

// Get tasks by actor
function getTasksByActor(actor) {
    if (!VALID_ACTORS.includes(actor)) {
        throw new Error(`Invalid actor: ${actor}`);
    }
    const allTasks = getAllTasks();
    return allTasks.filter(task => task.assigned_to === actor);
}

// Delete task (for cleanup)
function deleteTask(taskId) {
    const registry = loadRegistry();
    if (!registry.tasks[taskId]) {
        return false;
    }
    delete registry.tasks[taskId];
    saveRegistry(registry);
    return true;
}

module.exports = {
    loadRegistry,
    saveRegistry,
    getTask,
    createTask,
    updateTask,
    validateTransition,
    getAllTasks,
    getTasksByStatus,
    getTasksByActor,
    deleteTask,
    VALID_STATUSES,
    VALID_ACTORS,
    VALID_RISK_LEVELS
};
