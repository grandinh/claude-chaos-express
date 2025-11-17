#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Paths
const REPO_ROOT = path.join(__dirname, '..');
const SKILLS_DIR = path.join(REPO_ROOT, '.claude', 'skills');
const SKILL_RULES_PATH = path.join(SKILLS_DIR, 'skill-rules.json');

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

function validateSkills() {
  log('\nValidating Skills...', 'cyan');
  log('='.repeat(50), 'cyan');

  const errors = [];
  const warnings = [];

  // Check if skills directory exists
  if (!fs.existsSync(SKILLS_DIR)) {
    log(`✗ Skills directory not found: ${SKILLS_DIR}`, 'red');
    process.exit(1);
  }

  // Check if skill-rules.json exists
  if (!fs.existsSync(SKILL_RULES_PATH)) {
    log(`✗ skill-rules.json not found: ${SKILL_RULES_PATH}`, 'red');
    process.exit(1);
  }

  // Load skill-rules.json
  let skillRules;
  try {
    const rulesContent = fs.readFileSync(SKILL_RULES_PATH, 'utf8');
    skillRules = JSON.parse(rulesContent);
    log(`✓ Loaded skill-rules.json`, 'green');
  } catch (error) {
    log(`✗ Failed to parse skill-rules.json: ${error.message}`, 'red');
    process.exit(1);
  }

  // Validate skill-rules.json structure
  if (!skillRules.skills || typeof skillRules.skills !== 'object') {
    log(`✗ skill-rules.json missing or invalid 'skills' object`, 'red');
    process.exit(1);
  }

  // Get all skill files (skills are .md files directly in .claude/skills/)
  const skillFiles = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isFile() && dirent.name.endsWith('.md') && dirent.name !== 'README.md')
    .map(dirent => dirent.name);

  // Get registered skill names
  const registeredSkills = Object.keys(skillRules.skills);

  log(`\nFound ${registeredSkills.length} registered skills`, 'cyan');
  log(`Found ${skillFiles.length} skill files\n`, 'cyan');

  // Check each registered skill has a corresponding .md file
  log(`Checking registered skills...`, 'cyan');
  for (const skillName of registeredSkills) {
    const skillConfig = skillRules.skills[skillName];
    const skillFile = path.join(SKILLS_DIR, `${skillName}.md`);

    // Check if skill file exists
    if (!fs.existsSync(skillFile)) {
      errors.push({
        type: 'missing_file',
        skill: skillName,
        message: `Registered skill "${skillName}" has no corresponding file: ${skillFile}`
      });
      log(`✗ ${skillName} - Missing file`, 'red');
      continue;
    }

    // Validate required fields in skill-rules.json
    if (!skillConfig.type) {
      warnings.push({
        type: 'missing_field',
        skill: skillName,
        field: 'type',
        message: `Skill "${skillName}" missing field: type`
      });
    }

    if (!skillConfig.skillType) {
      warnings.push({
        type: 'missing_field',
        skill: skillName,
        field: 'skillType',
        message: `Skill "${skillName}" missing required field: skillType`
      });
    } else if (!['ANALYSIS-ONLY', 'WRITE-CAPABLE'].includes(skillConfig.skillType)) {
      errors.push({
        type: 'invalid_field',
        skill: skillName,
        field: 'skillType',
        message: `Skill "${skillName}" has invalid skillType: ${skillConfig.skillType} (must be ANALYSIS-ONLY or WRITE-CAPABLE)`
      });
      log(`✗ ${skillName} - Invalid skillType: ${skillConfig.skillType}`, 'red');
    }

    if (!skillConfig.daicMode || !skillConfig.daicMode.allowedModes) {
      warnings.push({
        type: 'missing_field',
        skill: skillName,
        field: 'daicMode.allowedModes',
        message: `Skill "${skillName}" missing field: daicMode.allowedModes`
      });
    }

    // Validate skill file content (basic checks)
    try {
      const skillContent = fs.readFileSync(skillFile, 'utf8');
      
      // Check for basic structure (should have a title or header)
      if (skillContent.trim().length === 0) {
        warnings.push({
          type: 'empty_file',
          skill: skillName,
          message: `Skill "${skillName}" file is empty`
        });
      }

      // Check if file mentions the skill name (basic sanity check)
      if (!skillContent.toLowerCase().includes(skillName.toLowerCase())) {
        warnings.push({
          type: 'name_mismatch',
          skill: skillName,
          message: `Skill "${skillName}" file doesn't appear to mention the skill name`
        });
      }
    } catch (error) {
      errors.push({
        type: 'read_error',
        skill: skillName,
        message: `Failed to read skill file for "${skillName}": ${error.message}`
      });
      log(`✗ ${skillName} - Failed to read file: ${error.message}`, 'red');
      continue;
    }

    log(`✓ ${skillName} - Valid`, 'green');
  }

  // Check for orphaned files (files not registered)
  log(`\nChecking for orphaned files...`, 'cyan');
  const registeredSet = new Set(registeredSkills);
  
  skillFiles.forEach(file => {
    const skillName = file.replace('.md', '');
    if (!registeredSet.has(skillName)) {
      warnings.push({
        type: 'orphaned_file',
        file: file,
        message: `Skill file "${file}" exists but is not registered in skill-rules.json`
      });
      log(`⚠ ${file} - Not registered`, 'yellow');
    }
  });

  // Check for duplicate skill names (shouldn't happen in JSON, but check anyway)
  const skillNames = registeredSkills;
  const seen = new Set();
  const duplicates = [];
  skillNames.forEach(name => {
    if (seen.has(name)) {
      duplicates.push(name);
    } else {
      seen.add(name);
    }
  });

  if (duplicates.length > 0) {
    duplicates.forEach(dup => {
      errors.push({
        type: 'duplicate',
        skill: dup,
        message: `Duplicate skill name in skill-rules.json: "${dup}"`
      });
      log(`✗ Duplicate skill: ${dup}`, 'red');
    });
  }

  // Summary
  log(`\n${'='.repeat(50)}`, 'cyan');
  log(`Validation Summary:`, 'cyan');
  log(`  Total registered skills: ${registeredSkills.length}`, 'cyan');
  log(`  Total skill files: ${skillFiles.length}`, 'cyan');
  log(`  Errors: ${errors.length}`, errors.length > 0 ? 'red' : 'green');
  log(`  Warnings: ${warnings.length}`, warnings.length > 0 ? 'yellow' : 'green');

  if (errors.length > 0) {
    log(`\nErrors:`, 'red');
    errors.forEach(err => {
      log(`  ✗ ${err.message}`, 'red');
    });
  }

  if (warnings.length > 0) {
    log(`\nWarnings:`, 'yellow');
    warnings.forEach(warn => {
      log(`  ⚠ ${warn.message}`, 'yellow');
    });
  }

  // Exit with error code if errors found
  if (errors.length > 0) {
    log(`\n✗ Validation failed with ${errors.length} error(s)`, 'red');
    process.exit(1);
  }

  if (warnings.length > 0) {
    log(`\n⚠ Validation passed with ${warnings.length} warning(s)`, 'yellow');
    process.exit(0);
  }

  log(`\n✓ All skills validated successfully!`, 'green');
  process.exit(0);
}

// Run validation
if (require.main === module) {
  validateSkills();
}

module.exports = { validateSkills };

