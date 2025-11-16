#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

// Initialize AJV with formats
const ajv = new Ajv({ allErrors: true, verbose: true });
addFormats(ajv);

// Paths
const REPO_ROOT = path.join(__dirname, '..');
const SCHEMA_PATH = path.join(REPO_ROOT, 'schemas', 'cloud-agent-config.json');
const CLOUD_AGENTS_DIR = path.join(REPO_ROOT, '.cursor', 'cloud-agents');

// Color codes for terminal output
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

function validateCloudAgentConfigs() {
  log('\nValidating Cloud Agent Configurations...', 'cyan');
  log('='.repeat(50), 'cyan');

  // Load schema
  let schema;
  try {
    const schemaContent = fs.readFileSync(SCHEMA_PATH, 'utf8');
    schema = JSON.parse(schemaContent);
    log(`✓ Loaded schema from ${SCHEMA_PATH}`, 'green');
  } catch (error) {
    log(`✗ Failed to load schema: ${error.message}`, 'red');
    process.exit(1);
  }

  // Compile schema
  let validate;
  try {
    validate = ajv.compile(schema);
    log('✓ Compiled schema successfully', 'green');
  } catch (error) {
    log(`✗ Failed to compile schema: ${error.message}`, 'red');
    process.exit(1);
  }

  // Get all Cloud Agent config files
  const configFiles = fs.readdirSync(CLOUD_AGENTS_DIR)
    .filter(file => file.endsWith('.json') && file !== 'package.json')
    .map(file => path.join(CLOUD_AGENTS_DIR, file));

  log(`\nFound ${configFiles.length} Cloud Agent config files\n`, 'cyan');

  // Validation results
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    errors: []
  };

  // Validate each config
  configFiles.forEach(configPath => {
    const fileName = path.basename(configPath);
    results.total++;

    try {
      const configContent = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configContent);

      const valid = validate(config);

      if (valid) {
        log(`✓ ${fileName} - VALID`, 'green');
        results.passed++;
      } else {
        log(`✗ ${fileName} - INVALID`, 'red');
        results.failed++;

        // Collect detailed errors
        const errors = validate.errors.map(err => ({
          file: fileName,
          path: err.instancePath || '/',
          message: err.message,
          params: err.params
        }));

        results.errors.push(...errors);

        // Print errors for this file
        validate.errors.forEach(err => {
          log(`  → ${err.instancePath || '/'}: ${err.message}`, 'yellow');
          if (err.params && Object.keys(err.params).length > 0) {
            log(`     Params: ${JSON.stringify(err.params)}`, 'yellow');
          }
        });
      }
    } catch (error) {
      log(`✗ ${fileName} - ERROR: ${error.message}`, 'red');
      results.failed++;
      results.errors.push({
        file: fileName,
        message: `Failed to parse JSON: ${error.message}`
      });
    }
  });

  // Print summary
  log('\n' + '='.repeat(50), 'cyan');
  log('Validation Summary:', 'cyan');
  log(`Total: ${results.total}`, 'cyan');
  log(`Passed: ${results.passed}`, results.passed === results.total ? 'green' : 'yellow');
  log(`Failed: ${results.failed}`, results.failed === 0 ? 'green' : 'red');

  if (results.errors.length > 0) {
    log('\nDetailed Errors:', 'red');
    results.errors.forEach((err, index) => {
      log(`\n${index + 1}. ${err.file}`, 'yellow');
      if (err.path) {
        log(`   Path: ${err.path}`, 'yellow');
      }
      log(`   Error: ${err.message}`, 'yellow');
      if (err.params) {
        log(`   Params: ${JSON.stringify(err.params, null, 2)}`, 'yellow');
      }
    });
  }

  log('\n' + '='.repeat(50) + '\n', 'cyan');

  // Exit with error if any validation failed
  if (results.failed > 0) {
    process.exit(1);
  }

  return results;
}

// Run validation
if (require.main === module) {
  validateCloudAgentConfigs();
}

module.exports = { validateCloudAgentConfigs };
