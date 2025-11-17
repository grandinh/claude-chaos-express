#!/usr/bin/env node
/**
 * Validate file path patterns in skill-rules.json
 *
 * Checks that base directories referenced in fileTriggers.pathPatterns exist
 */

const fs = require('fs');
const path = require('path');

const skillRulesPath = path.join(__dirname, '..', '.claude', 'skills', 'skill-rules.json');
const data = JSON.parse(fs.readFileSync(skillRulesPath, 'utf8'));

console.log('=== File Path Pattern Validation ===\n');

const pathsToCheck = [];

Object.entries(data.skills).forEach(([name, config]) => {
  if (config.fileTriggers && config.fileTriggers.pathPatterns) {
    config.fileTriggers.pathPatterns.forEach(pattern => {
      pathsToCheck.push({skill: name, pattern});
    });
  }
});

console.log('Skills with file triggers: ' + pathsToCheck.length + ' patterns\n');

pathsToCheck.forEach(({skill, pattern}) => {
  // Check if the base directory exists
  const basePath = pattern.split('**')[0].replace(/\*/g, '');
  const fullPath = path.join(__dirname, '..', basePath);
  const exists = fs.existsSync(fullPath);
  const status = exists ? '✓' : '✗';
  console.log(status, skill + ':', pattern, exists ? '' : '(path does not exist)');
});

console.log('\n✅ File path validation complete');
