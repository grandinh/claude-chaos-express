#!/usr/bin/env node

/**
 * Context Validation Utilities
 * Shared validation logic for context gathering enforcement
 */

const MIN_CONTEXT_MANIFEST_LENGTH = 50; // Characters of meaningful content required

/**
 * Validate that Context Manifest section exists and has meaningful content
 * @param {string} content - Full task file content
 * @param {number} minContentLength - Minimum characters of meaningful content (default: 50)
 * @returns {Object} - { valid: boolean, reason?: string }
 */
function hasValidContextManifest(content, minContentLength = MIN_CONTEXT_MANIFEST_LENGTH) {
    // Match markdown heading at any level (##, ###, ####, etc.)
    // Must be at start of line, case-sensitive
    const headingRegex = /^#{1,6}\s+Context Manifest\s*$/m;
    const match = content.match(headingRegex);

    if (!match) {
        return { valid: false, reason: 'heading_missing' };
    }

    // Extract content after the heading until next heading or end
    const headingIndex = match.index + match[0].length;
    const afterHeading = content.substring(headingIndex);

    // Find next heading (any level)
    const nextHeadingMatch = afterHeading.match(/^#{1,6}\s+\w/m);
    const sectionContent = nextHeadingMatch
        ? afterHeading.substring(0, nextHeadingMatch.index)
        : afterHeading;

    // Check if section has meaningful content (non-whitespace, non-comment)
    const meaningfulContent = sectionContent
        .split('\n')
        .filter(line => {
            const trimmed = line.trim();
            // Exclude empty lines and HTML comments
            return trimmed.length > 0 && !trimmed.startsWith('<!--');
        })
        .join('\n');

    if (meaningfulContent.length < minContentLength) {
        return { valid: false, reason: 'content_insufficient' };
    }

    return { valid: true };
}

/**
 * Validate that a task has proper context for implementation
 * @param {string} taskFilePath - Path to task markdown file
 * @param {Function} parseFrontmatter - Function to parse frontmatter
 * @param {Function} readFileSync - Function to read files (for testing injection)
 * @returns {Object} - { valid: boolean, error?: string, suggestion?: string }
 */
function validateTaskContext(taskFilePath, parseFrontmatter, readFileSync) {
    const fs = readFileSync || require('fs').readFileSync;

    if (!require('fs').existsSync(taskFilePath)) {
        return {
            valid: false,
            error: `Task file not found: ${taskFilePath}`
        };
    }

    const content = fs(taskFilePath, 'utf8');
    const { frontmatter } = parseFrontmatter(content);

    if (!frontmatter) {
        return {
            valid: false,
            error: 'No frontmatter found in task file'
        };
    }

    // Check context_gathered flag (defaults to false if missing)
    const contextGathered = frontmatter.context_gathered === true;

    if (!contextGathered) {
        return {
            valid: false,
            error: 'Context gathering required',
            suggestion: 'Invoke context-gathering agent on this task'
        };
    }

    // Verify Context Manifest section exists and has meaningful content
    const manifestCheck = hasValidContextManifest(content);
    if (!manifestCheck.valid) {
        const errorMessages = {
            heading_missing: 'context_gathered is true but no Context Manifest heading found',
            content_insufficient: 'Context Manifest section exists but appears empty or incomplete'
        };
        return {
            valid: false,
            error: errorMessages[manifestCheck.reason],
            suggestion: 'Re-run context-gathering agent to populate Context Manifest section'
        };
    }

    return { valid: true };
}

module.exports = {
    hasValidContextManifest,
    validateTaskContext,
    MIN_CONTEXT_MANIFEST_LENGTH
};
