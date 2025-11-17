#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const TASKS_DIR = path.join(PROJECT_ROOT, 'sessions', 'tasks');

const files = fs.readdirSync(TASKS_DIR).filter(f =>
  f.endsWith('.md') &&
  !f.includes('TEMPLATE') &&
  !f.includes('done/') &&
  !f.includes('archive/')
);

const missingDeps = [];

files.forEach(file => {
  const filePath = path.join(TASKS_DIR, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (frontmatterMatch) {
    try {
      const frontmatter = yaml.load(frontmatterMatch[1], { schema: yaml.SAFE_SCHEMA });
      const deps = frontmatter.depends_on || [];

      deps.forEach(dep => {
        const depFile = dep.endsWith('.md') ? dep : dep + '.md';
        const depPath = path.join(TASKS_DIR, depFile);

        if (!fs.existsSync(depPath)) {
          missingDeps.push({
            task: file,
            missingDep: depFile,
            priority: frontmatter.priority || 'undefined',
            status: frontmatter.status || 'undefined'
          });
        }
      });
    } catch (e) {
      // Skip invalid frontmatter
    }
  }
});

console.log('🔍 Tasks with Missing Dependencies:\n');
if (missingDeps.length === 0) {
  console.log('   ✅ No missing dependencies found!');
} else {
  console.log('   Total: ' + missingDeps.length + '\n');
  missingDeps.forEach(({ task, missingDep, priority, status }) => {
    console.log('   ❌ ' + task);
    console.log('      Missing: ' + missingDep);
    console.log('      Status: ' + status + ' | Priority: ' + priority);
    console.log('');
  });
}
