#!/usr/bin/env node

/**
 * Test Webhook Setup Guide
 * Validates webhook configuration and provides testing utilities
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
        if (fs.existsSync(path.join(cur, '.claude')) || fs.existsSync(path.join(cur, '.cursor'))) {
            return cur;
        }
        cur = path.dirname(cur);
    }
    throw new Error('Could not find project root');
}

const PROJECT_ROOT = findProjectRoot();
const WEBHOOKS_DIR = path.join(PROJECT_ROOT, '.cursor', 'cloud-agents', 'webhooks');
const SETUP_GUIDE = path.join(WEBHOOKS_DIR, 'setup-guide.md');
const PAYLOAD_EXAMPLES = path.join(WEBHOOKS_DIR, 'payload-examples.json');

function testWebhookSetup() {
    console.log('\n' + '='.repeat(60));
    console.log('Testing Webhook Setup Guide');
    console.log('='.repeat(60) + '\n');

    const results = {
        guideExists: false,
        examplesExist: false,
        guideComplete: false,
        examplesValid: false
    };

    // Check setup guide exists
    if (fs.existsSync(SETUP_GUIDE)) {
        results.guideExists = true;
        console.log('✓ Setup guide exists');

        const guideContent = fs.readFileSync(SETUP_GUIDE, 'utf8');

        // Check for required content
        const requiredContent = [
            'api.cursor.com',
            'webhook',
            'secret',
            'payload',
            'GitHub'
        ];

        const missing = requiredContent.filter(item =>
            !guideContent.toLowerCase().includes(item.toLowerCase())
        );

        if (missing.length === 0) {
            results.guideComplete = true;
            console.log('✓ Setup guide contains required content');
        } else {
            console.log(`⚠ Setup guide missing: ${missing.join(', ')}`);
        }
    } else {
        console.log(`✗ Setup guide not found: ${SETUP_GUIDE}`);
    }

    // Check payload examples
    if (fs.existsSync(PAYLOAD_EXAMPLES)) {
        results.examplesExist = true;
        console.log('✓ Payload examples file exists');

        try {
            const examples = JSON.parse(fs.readFileSync(PAYLOAD_EXAMPLES, 'utf8'));
            results.examplesValid = true;
            console.log('✓ Payload examples are valid JSON');

            // Check for common webhook events
            const commonEvents = ['pull_request', 'push', 'issues'];
            const hasEvents = Object.keys(examples).some(key =>
                commonEvents.some(event => key.toLowerCase().includes(event))
            );

            if (hasEvents) {
                console.log('✓ Payload examples include common webhook events');
            } else {
                console.log('⚠ Payload examples may be missing common events');
            }
        } catch (error) {
            console.log(`✗ Payload examples invalid: ${error.message}`);
        }
    } else {
        console.log(`⚠ Payload examples not found: ${PAYLOAD_EXAMPLES}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('Summary:');
    console.log(`  Guide exists: ${results.guideExists ? '✓' : '✗'}`);
    console.log(`  Guide complete: ${results.guideComplete ? '✓' : '✗'}`);
    console.log(`  Examples exist: ${results.examplesExist ? '✓' : '✗'}`);
    console.log(`  Examples valid: ${results.examplesValid ? '✓' : '✗'}`);
    console.log('='.repeat(60) + '\n');

    return results;
}

if (require.main === module) {
    testWebhookSetup();
}

module.exports = { testWebhookSetup };
