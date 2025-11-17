/**
 * Shared utility functions for orchestrator scripts
 *
 * @module utils
 * @version 1.0.0
 */

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

module.exports = {
    detectProjectRoot
};
