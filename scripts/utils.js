#!/usr/bin/env node

/**
 * Shared utilities for scripts
 */

const fs = require('fs');
const path = require('path');

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
    findProjectRoot
};

