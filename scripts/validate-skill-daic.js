#!/usr/bin/env node
/**
 * Validate DAIC mode configurations in skill-rules.json
 *
 * Checks:
 * - All skills have skillType field
 * - All skills have daicMode.allowedModes field
 * - WRITE-CAPABLE skills only allow IMPLEMENT mode
 * - ANALYSIS-ONLY skills allow all DAIC modes
 */

const path = require('path');
const fs = require('fs');

const skillRulesPath = path.join(__dirname, '..', '.claude', 'skills', 'skill-rules.json');
const data = JSON.parse(fs.readFileSync(skillRulesPath, 'utf8'));
const skills = data.skills;

console.log('=== DAIC Mode Validation ===\n');

let writeCapable = [];
let analysisOnly = [];
let issues = [];

Object.entries(skills).forEach(([name, config]) => {
  if (!config.skillType) {
    issues.push(`${name}: Missing skillType field`);
    return;
  }

  if (!config.daicMode || !config.daicMode.allowedModes) {
    issues.push(`${name}: Missing daicMode.allowedModes field`);
    return;
  }

  const modes = config.daicMode.allowedModes;

  if (config.skillType === 'WRITE-CAPABLE') {
    writeCapable.push(name);
    // Should only allow IMPLEMENT mode
    if (modes.length !== 1 || modes[0] !== 'IMPLEMENT') {
      issues.push(`${name}: WRITE-CAPABLE should only allow IMPLEMENT mode, got: [${modes.join(', ')}]`);
    }
  } else if (config.skillType === 'ANALYSIS-ONLY') {
    analysisOnly.push(name);
    // Should allow all modes
    const expected = ['DISCUSS', 'ALIGN', 'IMPLEMENT', 'CHECK'];
    const hasAll = expected.every(m => modes.includes(m));
    if (!hasAll) {
      issues.push(`${name}: ANALYSIS-ONLY should allow all DAIC modes, missing: [${expected.filter(m => !modes.includes(m)).join(', ')}]`);
    }
  }
});

console.log('WRITE-CAPABLE Skills (' + writeCapable.length + '):');
writeCapable.forEach(s => console.log('  ✓', s));

console.log('\nANALYSIS-ONLY Skills (' + analysisOnly.length + '):');
analysisOnly.forEach(s => console.log('  ✓', s));

if (issues.length > 0) {
  console.log('\n❌ Issues Found:');
  issues.forEach(i => console.log('  -', i));
  process.exit(1);
} else {
  console.log('\n✅ All DAIC configurations are correct!');
}
