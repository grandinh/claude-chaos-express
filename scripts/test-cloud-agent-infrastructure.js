#!/usr/bin/env node

/**
 * Comprehensive Cloud Agent Infrastructure Testing
 * Validates configs, cron expressions, path patterns, and webhook setup
 */

const fs = require('fs');
const path = require('path');
const { validateCloudAgentConfigs } = require('./validate-cloud-agents');

// Find project root
function findProjectRoot() {
    if (process.env.CLAUDE_PROJECT_DIR) {
        return process.env.CLAUDE_PROJECT_DIR;
    }
    let cur = process.cwd();
    while (cur !== path.dirname(cur)) {
        if (fs.existsSync(path.join(cur, '.claude')) || fs.existsSync(path.join(cur, '.cursor'))) {
            return cur;
        }
        cur = path.dirname(cur);
    }
    throw new Error('Could not find project root');
}

const PROJECT_ROOT = findProjectRoot();
const CLOUD_AGENTS_DIR = path.join(PROJECT_ROOT, '.cursor', 'cloud-agents');
const WEBHOOKS_DIR = path.join(CLOUD_AGENTS_DIR, 'webhooks');
const SETUP_GUIDE = path.join(WEBHOOKS_DIR, 'setup-guide.md');
const PAYLOAD_EXAMPLES = path.join(WEBHOOKS_DIR, 'payload-examples.json');

// Color codes
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    blue: '\x1b[34m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Validate cron expression (5-field format)
 */
function validateCronExpression(cron) {
    const errors = [];

    if (!cron || typeof cron !== 'string') {
        return { valid: false, errors: ['Cron expression must be a string'] };
    }

    const parts = cron.trim().split(/\s+/);

    if (parts.length !== 5) {
        errors.push(`Cron expression must have 5 fields, got ${parts.length}`);
        return { valid: false, errors };
    }

    const [minute, hour, day, month, weekday] = parts;
    const ranges = [
        { field: 'minute', value: minute, min: 0, max: 59 },
        { field: 'hour', value: hour, min: 0, max: 23 },
        { field: 'day', value: day, min: 1, max: 31 },
        { field: 'month', value: month, min: 1, max: 12 },
        { field: 'weekday', value: weekday, min: 0, max: 6 }
    ];

    for (const { field, value, min, max } of ranges) {
        // Allow wildcards, ranges, lists, and step values
        const pattern = /^(\*|\d+(-\d+)?)(\/\d+)?(,(\*|\d+(-\d+)?)(\/\d+)?)*$/;

        if (value === '*' || value.match(pattern)) {
            // Check numeric values if not wildcard
            if (value !== '*') {
                const numbers = value.split(',').flatMap(v => {
                    if (v.includes('/')) {
                        const [base] = v.split('/');
                        return base === '*' ? [] : [parseInt(base)];
                    } else if (v.includes('-')) {
                        const [start, end] = v.split('-').map(Number);
                        return [start, end];
                    } else {
                        return [parseInt(v)];
                    }
                }).filter(n => !isNaN(n));

                for (const num of numbers) {
                    if (num < min || num > max) {
                        errors.push(`${field} value ${num} is out of range [${min}, ${max}]`);
                    }
                }
            }
        } else {
            errors.push(`Invalid ${field} format: ${value}`);
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Validate path pattern (glob format)
 */
function validatePathPattern(pattern) {
    const errors = [];

    if (!pattern || typeof pattern !== 'string') {
        return { valid: false, errors: ['Path pattern must be a string'] };
    }

    // Basic glob pattern validation
    // Allow: *, ?, **, [], {}, !, and normal path characters
    const validChars = /^[a-zA-Z0-9_\-./*?\[\]{}!]+$/;

    if (!validChars.test(pattern)) {
        errors.push(`Path pattern contains invalid characters: ${pattern}`);
    }

    // Check for balanced brackets
    const brackets = { '[': ']', '{': '}' };
    const stack = [];

    for (const char of pattern) {
        if (char in brackets) {
            stack.push(brackets[char]);
        } else if (Object.values(brackets).includes(char)) {
            if (stack.length === 0 || stack.pop() !== char) {
                errors.push(`Unbalanced brackets in path pattern: ${pattern}`);
                break;
            }
        }
    }

    if (stack.length > 0) {
        errors.push(`Unclosed brackets in path pattern: ${pattern}`);
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Test Cloud Agent configs
 */
function testCloudAgentConfigs() {
    log('\n' + '='.repeat(60), 'cyan');
    log('Testing Cloud Agent Configurations', 'cyan');
    log('='.repeat(60) + '\n', 'cyan');

    const results = {
        schema: { passed: 0, failed: 0 },
        cron: { passed: 0, failed: 0, skipped: 0 },
        paths: { passed: 0, failed: 0, skipped: 0 },
        agentFiles: { passed: 0, failed: 0 }
    };

    // Step 1: Schema validation
    log('Step 1: Schema Validation', 'blue');
    log('-'.repeat(60), 'blue');
    try {
        const validationResults = validateCloudAgentConfigs();
        if (validationResults.failed === 0) {
            results.schema.passed = validationResults.total;
            log(`✓ All ${validationResults.total} configs passed schema validation\n`, 'green');
        } else {
            results.schema.failed = validationResults.failed;
            results.schema.passed = validationResults.passed;
            log(`✗ ${validationResults.failed} config(s) failed schema validation\n`, 'red');
        }
    } catch (error) {
        log(`✗ Schema validation failed: ${error.message}\n`, 'red');
        results.schema.failed = 1;
    }

    // Step 2: Load and test individual configs
    const configFiles = fs.readdirSync(CLOUD_AGENTS_DIR)
        .filter(file => file.endsWith('.json') && file !== 'package.json')
        .map(file => path.join(CLOUD_AGENTS_DIR, file));

    log('Step 2: Individual Config Testing', 'blue');
    log('-'.repeat(60), 'blue');

    for (const configPath of configFiles) {
        const fileName = path.basename(configPath);

        try {
            const content = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(content);

            // Test cron expressions (scheduled agents)
            if (config.trigger?.type === 'schedule' && config.trigger.schedule) {
                const cronResult = validateCronExpression(config.trigger.schedule);
                if (cronResult.valid) {
                    log(`✓ ${fileName}: Valid cron expression (${config.trigger.schedule})`, 'green');
                    results.cron.passed++;
                } else {
                    log(`✗ ${fileName}: Invalid cron expression`, 'red');
                    cronResult.errors.forEach(err => log(`  → ${err}`, 'yellow'));
                    results.cron.failed++;
                }
            } else if (config.trigger?.type === 'schedule') {
                log(`⚠ ${fileName}: Scheduled agent missing cron expression`, 'yellow');
                results.cron.failed++;
            } else {
                results.cron.skipped++;
            }

            // Test path patterns (webhook agents)
            if (config.trigger?.type === 'webhook' && config.trigger.filters) {
                const filters = config.trigger.filters;
                const pathFields = ['pathPatterns', 'includePatterns', 'excludePatterns'];
                let hasPaths = false;

                for (const field of pathFields) {
                    if (filters[field] && Array.isArray(filters[field])) {
                        hasPaths = true;
                        for (const pattern of filters[field]) {
                            const pathResult = validatePathPattern(pattern);
                            if (pathResult.valid) {
                                log(`✓ ${fileName}: Valid path pattern (${pattern})`, 'green');
                                results.paths.passed++;
                            } else {
                                log(`✗ ${fileName}: Invalid path pattern (${pattern})`, 'red');
                                pathResult.errors.forEach(err => log(`  → ${err}`, 'yellow'));
                                results.paths.failed++;
                            }
                        }
                    }
                }

                if (!hasPaths) {
                    results.paths.skipped++;
                }
            } else {
                results.paths.skipped++;
            }

            // Test agent file exists
            if (config.claudeAgentPath) {
                const agentPath = path.join(PROJECT_ROOT, config.claudeAgentPath);
                if (fs.existsSync(agentPath)) {
                    log(`✓ ${fileName}: Agent file exists (${config.claudeAgentPath})`, 'green');
                    results.agentFiles.passed++;
                } else {
                    log(`✗ ${fileName}: Agent file not found (${config.claudeAgentPath})`, 'red');
                    results.agentFiles.failed++;
                }
            } else {
                log(`⚠ ${fileName}: No agent path specified`, 'yellow');
            }

        } catch (error) {
            log(`✗ ${fileName}: Error reading config - ${error.message}`, 'red');
        }
    }

    log('');

    // Step 3: Test webhook setup guide
    log('Step 3: Webhook Setup Guide Testing', 'blue');
    log('-'.repeat(60), 'blue');

    if (fs.existsSync(SETUP_GUIDE)) {
        const guideContent = fs.readFileSync(SETUP_GUIDE, 'utf8');

        // Check for required sections
        const requiredSections = [
            'Prerequisites',
            'Step 1',
            'Payload URL',
            'Content type',
            'Secret',
            'Events'
        ];

        const missingSections = requiredSections.filter(section =>
            !guideContent.toLowerCase().includes(section.toLowerCase())
        );

        if (missingSections.length === 0) {
            log('✓ Setup guide contains all required sections', 'green');
        } else {
            log(`✗ Setup guide missing sections: ${missingSections.join(', ')}`, 'red');
        }

        // Check for payload examples
        if (fs.existsSync(PAYLOAD_EXAMPLES)) {
            try {
                const examples = JSON.parse(fs.readFileSync(PAYLOAD_EXAMPLES, 'utf8'));
                log(`✓ Payload examples file exists and is valid JSON`, 'green');
            } catch (error) {
                log(`✗ Payload examples file is invalid JSON: ${error.message}`, 'red');
            }
        } else {
            log(`⚠ Payload examples file not found`, 'yellow');
        }
    } else {
        log(`✗ Setup guide not found: ${SETUP_GUIDE}`, 'red');
    }

    log('');

    // Summary
    log('='.repeat(60), 'cyan');
    log('Test Summary', 'cyan');
    log('='.repeat(60), 'cyan');
    log(`Schema Validation: ${results.schema.passed} passed, ${results.schema.failed} failed`,
        results.schema.failed === 0 ? 'green' : 'red');
    log(`Cron Expressions: ${results.cron.passed} passed, ${results.cron.failed} failed, ${results.cron.skipped} skipped`,
        results.cron.failed === 0 ? 'green' : 'red');
    log(`Path Patterns: ${results.paths.passed} passed, ${results.paths.failed} failed, ${results.paths.skipped} skipped`,
        results.paths.failed === 0 ? 'green' : 'red');
    log(`Agent Files: ${results.agentFiles.passed} passed, ${results.agentFiles.failed} failed`,
        results.agentFiles.failed === 0 ? 'green' : 'red');
    log('='.repeat(60) + '\n', 'cyan');

    // Exit code
    const totalFailed = results.schema.failed + results.cron.failed + results.paths.failed + results.agentFiles.failed;
    if (totalFailed > 0) {
        process.exit(1);
    }

    return results;
}

// Run tests
if (require.main === module) {
    testCloudAgentConfigs();
}

module.exports = { testCloudAgentConfigs, validateCronExpression, validatePathPattern };
