#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Paths
const REPO_ROOT = path.join(__dirname, '..');
const CLOUD_AGENTS_DIR = path.join(REPO_ROOT, '.cursor', 'cloud-agents');

// Color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Validate a cron expression (5-field format)
 * Format: minute hour day month weekday
 *
 * Ranges:
 * - minute: 0-59
 * - hour: 0-23
 * - day: 1-31
 * - month: 1-12 or JAN-DEC
 * - weekday: 0-7 or SUN-SAT (0 and 7 are Sunday)
 *
 * Special characters: * (any), - (range), , (list), / (step)
 */
function validateCronExpression(cronExpr) {
  const errors = [];

  // Split into fields
  const fields = cronExpr.trim().split(/\s+/);

  if (fields.length !== 5) {
    errors.push(`Expected 5 fields (minute hour day month weekday), got ${fields.length}`);
    return { valid: false, errors };
  }

  const [minute, hour, day, month, weekday] = fields;

  // Field validators
  const validators = [
    { name: 'minute', value: minute, min: 0, max: 59 },
    { name: 'hour', value: hour, min: 0, max: 23 },
    { name: 'day', value: day, min: 1, max: 31 },
    { name: 'month', value: month, min: 1, max: 12 },
    { name: 'weekday', value: weekday, min: 0, max: 7 }
  ];

  validators.forEach(({ name, value, min, max }) => {
    const fieldErrors = validateCronField(name, value, min, max);
    errors.push(...fieldErrors);
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

function validateCronField(name, value, min, max) {
  const errors = [];

  // Allow * (any)
  if (value === '*') {
    return errors;
  }

  // Check for step values (e.g., */5, 0-59/5)
  if (value.includes('/')) {
    const [range, step] = value.split('/');

    if (!/^\d+$/.test(step)) {
      errors.push(`${name}: step value "${step}" must be a number`);
      return errors;
    }

    const stepNum = parseInt(step, 10);
    if (stepNum <= 0 || stepNum > (max - min)) {
      errors.push(`${name}: step value ${stepNum} out of range`);
      return errors;
    }

    // Validate range part
    if (range !== '*') {
      const rangeErrors = validateCronValue(name, range, min, max);
      errors.push(...rangeErrors);
    }

    return errors;
  }

  // Check for ranges (e.g., 1-5)
  if (value.includes('-')) {
    const [start, end] = value.split('-');

    if (!/^\d+$/.test(start) || !/^\d+$/.test(end)) {
      errors.push(`${name}: range "${value}" must contain only numbers`);
      return errors;
    }

    const startNum = parseInt(start, 10);
    const endNum = parseInt(end, 10);

    if (startNum < min || startNum > max) {
      errors.push(`${name}: range start ${startNum} out of range (${min}-${max})`);
    }

    if (endNum < min || endNum > max) {
      errors.push(`${name}: range end ${endNum} out of range (${min}-${max})`);
    }

    if (startNum > endNum) {
      errors.push(`${name}: range start ${startNum} must be <= end ${endNum}`);
    }

    return errors;
  }

  // Check for lists (e.g., 1,4,7,10)
  if (value.includes(',')) {
    const values = value.split(',');
    values.forEach(v => {
      const valueErrors = validateCronValue(name, v.trim(), min, max);
      errors.push(...valueErrors);
    });
    return errors;
  }

  // Single value
  const valueErrors = validateCronValue(name, value, min, max);
  errors.push(...valueErrors);

  return errors;
}

function validateCronValue(name, value, min, max) {
  const errors = [];

  if (!/^\d+$/.test(value)) {
    errors.push(`${name}: value "${value}" must be a number`);
    return errors;
  }

  const num = parseInt(value, 10);

  if (num < min || num > max) {
    errors.push(`${name}: value ${num} out of range (${min}-${max})`);
  }

  return errors;
}

function validateCronExpressions() {
  log('\nValidating Cron Expressions in Cloud Agent Configs...', 'cyan');
  log('='.repeat(50), 'cyan');

  // Get all Cloud Agent config files
  const configFiles = fs.readdirSync(CLOUD_AGENTS_DIR)
    .filter(file => file.endsWith('.json') && file !== 'package.json')
    .map(file => path.join(CLOUD_AGENTS_DIR, file));

  const results = {
    total: 0,
    scheduled: 0,
    valid: 0,
    invalid: 0,
    errors: []
  };

  configFiles.forEach(configPath => {
    const fileName = path.basename(configPath);

    try {
      const configContent = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configContent);

      // Check if this is a scheduled agent
      if (config.trigger && config.trigger.type === 'schedule') {
        results.total++;
        results.scheduled++;

        const cronExpr = config.trigger.schedule;

        if (!cronExpr) {
          log(`✗ ${fileName} - NO CRON EXPRESSION`, 'red');
          results.invalid++;
          results.errors.push({
            file: fileName,
            error: 'Missing schedule field for scheduled trigger'
          });
          return;
        }

        const validation = validateCronExpression(cronExpr);

        if (validation.valid) {
          log(`✓ ${fileName} - VALID CRON: "${cronExpr}"`, 'green');
          if (config.trigger.description) {
            log(`  → ${config.trigger.description}`, 'cyan');
          }
          results.valid++;
        } else {
          log(`✗ ${fileName} - INVALID CRON: "${cronExpr}"`, 'red');
          validation.errors.forEach(err => {
            log(`  → ${err}`, 'yellow');
          });
          results.invalid++;
          results.errors.push({
            file: fileName,
            cron: cronExpr,
            errors: validation.errors
          });
        }
      } else {
        results.total++;
      }
    } catch (error) {
      log(`✗ ${fileName} - ERROR: ${error.message}`, 'red');
      results.errors.push({
        file: fileName,
        error: error.message
      });
    }
  });

  // Print summary
  log('\n' + '='.repeat(50), 'cyan');
  log('Cron Validation Summary:', 'cyan');
  log(`Total configs: ${results.total}`, 'cyan');
  log(`Scheduled agents: ${results.scheduled}`, 'cyan');
  log(`Valid cron: ${results.valid}`, results.valid === results.scheduled ? 'green' : 'yellow');
  log(`Invalid cron: ${results.invalid}`, results.invalid === 0 ? 'green' : 'red');

  if (results.errors.length > 0) {
    log('\nDetailed Errors:', 'red');
    results.errors.forEach((err, index) => {
      log(`\n${index + 1}. ${err.file}`, 'yellow');
      if (err.cron) {
        log(`   Cron: ${err.cron}`, 'yellow');
        err.errors.forEach(e => log(`   → ${e}`, 'yellow'));
      } else {
        log(`   Error: ${err.error}`, 'yellow');
      }
    });
  }

  log('\n' + '='.repeat(50) + '\n', 'cyan');

  if (results.invalid > 0) {
    process.exit(1);
  }

  return results;
}

// Run validation
if (require.main === module) {
  validateCronExpressions();
}

module.exports = { validateCronExpression, validateCronExpressions };
