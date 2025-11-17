#!/usr/bin/env node

/**
 * Frontmatter Sync Utility
 * Syncs task registry data to task file frontmatter (one-way: registry -> frontmatter)
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

// Parse frontmatter from markdown content
function parseFrontmatter(content) {
    if (!content.startsWith('---')) {
        return { frontmatter: null, body: content };
    }

    const parts = content.split('---');
    if (parts.length < 3) {
        return { frontmatter: null, body: content };
    }

    const frontmatterLines = parts[1].split('\n');
    const frontmatter = {};
    const body = parts.slice(2).join('---');

    for (const line of frontmatterLines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.includes(':')) {
            continue;
        }

        const colonIndex = trimmed.indexOf(':');
        const key = trimmed.substring(0, colonIndex).trim();
        let value = trimmed.substring(colonIndex + 1).trim();

        // Handle special cases
        if (key === 'submodules' || key === 'dependencies') {
            // Parse arrays formatted as: [item1, item2]
            if (value.startsWith('[') && value.endsWith(']')) {
                value = value.slice(1, -1)
                    .split(',')
                    .map(s => s.trim())
                    .filter(s => s.length > 0);
            } else if (value === 'null' || value === '') {
                value = null;
            }
        } else if (value === 'null' || value === '') {
            value = null;
        } else {
            // Try to parse as boolean
            if (value === 'true') value = true;
            else if (value === 'false') value = false;
        }

        frontmatter[key] = value;
    }

    return { frontmatter, body };
}

// Format frontmatter to YAML string
function formatFrontmatter(frontmatter) {
    const lines = ['---'];
    for (const [key, value] of Object.entries(frontmatter)) {
        if (value === null || value === undefined) {
            lines.push(`${key}: null`);
        } else if (Array.isArray(value)) {
            if (value.length === 0) {
                lines.push(`${key}: []`);
            } else {
                lines.push(`${key}: [${value.map(v => String(v)).join(', ')}]`);
            }
        } else if (typeof value === 'boolean') {
            lines.push(`${key}: ${value}`);
        } else {
            lines.push(`${key}: ${value}`);
        }
    }
    lines.push('---');
    return lines.join('\n');
}

// Sync registry data to frontmatter
function syncFrontmatter(taskId) {
    const { getTask } = require('./task-registry.js');
    const task = getTask(taskId);

    if (!task) {
        throw new Error(`Task ${taskId} not found in registry`);
    }

    // Resolve task file path
    const taskFilePath = path.join(PROJECT_ROOT, task.file_path);
    if (!fs.existsSync(taskFilePath)) {
        throw new Error(`Task file not found: ${taskFilePath}`);
    }

    // Read current file
    const content = fs.readFileSync(taskFilePath, 'utf8');
    const { frontmatter, body } = parseFrontmatter(content);

    if (!frontmatter) {
        throw new Error(`Task file missing frontmatter: ${taskFilePath}`);
    }

    // Update only registry-controlled fields
    const updatedFrontmatter = { ...frontmatter };
    updatedFrontmatter.status = task.status;
    updatedFrontmatter.assigned_to = task.assigned_to;
    updatedFrontmatter.risk_level = task.risk_level;

    // Update codex_reviews if present
    if (task.codex_reviews && task.codex_reviews.length > 0) {
        updatedFrontmatter.codex_reviews = task.codex_reviews;
    }

    // Preserve all other fields (name, branch, created, dependencies, etc.)
    // Only update the registry-controlled ones

    // Write updated file
    const newContent = formatFrontmatter(updatedFrontmatter) + '\n' + body;
    fs.writeFileSync(taskFilePath, newContent, 'utf8');

    return true;
}

module.exports = {
    parseFrontmatter,
    formatFrontmatter,
    syncFrontmatter
};
