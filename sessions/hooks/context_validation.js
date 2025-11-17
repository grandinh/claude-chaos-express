#!/usr/bin/env node

/**
 * Context Validation Hook
 * Blocks IMPLEMENT mode if context_gathered flag is false
 */

const fs = require('fs');
const path = require('path');

// Load shared utilities with error handling
let parseFrontmatter, validateTaskContext;
try {
    const frontmatterLib = require('../lib/frontmatter-sync.js');
    parseFrontmatter = frontmatterLib.parseFrontmatter;

    const validationLib = require('../lib/context-validation-utils.js');
    validateTaskContext = validationLib.validateTaskContext;

    if (typeof parseFrontmatter !== 'function' || typeof validateTaskContext !== 'function') {
        throw new Error('Required functions are not available');
    }
} catch (error) {
    console.error('[context_validation] Failed to load required utilities:', error.message);
    console.error('Expected files: ../lib/frontmatter-sync.js, ../lib/context-validation-utils.js');
    process.exit(1);
}

const CLAUDE_PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const GOTCHAS_PATH = path.join(CLAUDE_PROJECT_DIR, 'context', 'gotchas.md');
const STRUCTURED_LOG_PATH = path.join(CLAUDE_PROJECT_DIR, 'context', 'validation-failures.jsonl');

function validateContext(sessionState) {
    const { mode, taskFile } = sessionState;

    // Only validate when entering IMPLEMENT mode
    if (mode !== 'IMPLEMENT') {
        return { valid: true };
    }

    if (!taskFile) {
        return {
            valid: false,
            error: 'No task file specified. Cannot validate context.'
        };
    }

    // Use shared validation utility
    const result = validateTaskContext(taskFile, parseFrontmatter, fs.readFileSync);

    if (!result.valid) {
        // Log violation to gotchas.md (human-readable)
        const timestamp = new Date().toISOString();
        const logEntry = `\n## Context Validation Failure (${timestamp})\n\n` +
            `Task: ${path.basename(taskFile)}\n` +
            `Issue: ${result.error}\n` +
            `Resolution: ${result.suggestion || 'Address validation failure'}\n`;

        fs.appendFileSync(GOTCHAS_PATH, logEntry, 'utf8');

        // Log to structured JSON file (machine-readable)
        const jsonLogEntry = JSON.stringify({
            timestamp,
            taskFile: path.basename(taskFile),
            taskPath: taskFile,
            mode,
            error: result.error,
            suggestion: result.suggestion
        });
        fs.appendFileSync(STRUCTURED_LOG_PATH, jsonLogEntry + '\n', 'utf8');

        // Return enhanced error message with context
        return {
            valid: false,
            error: `Context gathering required. Task file: ${path.basename(taskFile)}

       To resolve:
       1. Invoke context-gathering agent on this task
       2. Agent will populate Context Manifest section
       3. Agent will set context_gathered: true in frontmatter
       4. Then you can enter IMPLEMENT mode`,
            taskFile,
            suggestion: result.suggestion
        };
    }

    return { valid: true };
}

// CLI usage
if (require.main === module) {
    const sessionStatePath = path.join(CLAUDE_PROJECT_DIR, 'sessions', 'sessions-state.json');
    const sessionState = JSON.parse(fs.readFileSync(sessionStatePath, 'utf8'));
    const result = validateContext(sessionState);

    if (!result.valid) {
        console.error(`❌ Context Validation Failed: ${result.error}`);
        if (result.suggestion) {
            console.error(`💡 Suggestion: ${result.suggestion}`);
        }
        process.exit(1);
    }

    console.log('✅ Context validation passed');
    process.exit(0);
}

module.exports = { validateContext };
