#!/usr/bin/env node

/**
 * Shared utility functions for orchestrator and automation scripts
 *
 * @module utils
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

/**
 * Detect project root directory
 * Handles running from scripts/ subdirectory or project root
 *
 * @returns {string} - Absolute path to project root
 */
function detectProjectRoot() {
    // First check environment variable
    if (process.env.CLAUDE_PROJECT_DIR) {
        return process.env.CLAUDE_PROJECT_DIR;
    }

    const cwd = process.cwd();

    // If running from scripts/, go up one level
    if (path.basename(cwd) === 'scripts') {
        return path.dirname(cwd);
    }

    return cwd;
}

/**
 * Find the project root directory by looking for .claude directory
 * @returns {string} Absolute path to project root
 * @throws {Error} If project root cannot be found
 */
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

module.exports = {
    detectProjectRoot,
    findProjectRoot
};
