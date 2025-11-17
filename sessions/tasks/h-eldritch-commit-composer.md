---
name: h-eldritch-commit-composer
branch: feature/h-eldritch-commit-composer
status: pending
created: 2025-11-16
priority: medium
---

# Ship Eldritch Commit Composer

## Problem/Goal
Lore-heavy commit taxonomy exists in `docs/commit_guidelines.md` but nothing enforces or assists authors, leading to drift from the ritual format. Provide a guided composer and optional hook to standardize commit messages.

## Success Criteria
- [ ] Implement `scripts/eldritch-commit.js` that prompts for commit type, breach context, manifest list, and residual effects, outputting the formatted message per guidelines.
- [ ] Add `npm run commit:ritual` alias to invoke the composer.
- [ ] Provide optional `prepare-commit-msg` hook under `summoning/hooks/` that runs the composer unless bypassed via env flag.
- [ ] Update `docs/commit_guidelines.md` and `README.md` with usage instructions and escape hatches for automation.
- [ ] Log any deviations or hook behavior in `context/decisions.md`.

## Context Manifest
- `scripts/eldritch-commit.js`
- `summoning/hooks/prepare-commit-msg`
- `docs/commit_guidelines.md`
- `README.md`
- `context/decisions.md`

## User Notes
- Created by a third-party AI; Claude must validate the plan, summarize benefits/risks to the user, recommend whether to proceed, and wait for explicit user permission before implementation.
- Benefit: consistent commit ritual and reduced manual errors. Risk: added friction for quick commits if the composer is too rigid.

## Work Log
- [2025-11-16] Task authored from feature suggestions; awaiting Claude validation and user permission.

---

## Complete Implementation Code

### Step 1: Create Eldritch Commit Composer Script

**File:** `scripts/eldritch-commit.js`

**Complete Code:**

```javascript
#!/usr/bin/env node
/**
 * Eldritch Commit Composer
 * 
 * Interactive tool for generating commit messages following the eldritch
 * commit message format defined in docs/commit_guidelines.md
 * 
 * Usage:
 *   node scripts/eldritch-commit.js
 *   SKIP_ELDRITCH_COMMIT=1 git commit  # Bypass hook
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const COMMIT_TYPES = [
  'INVOCATION',
  'CONTAINMENT',
  'BINDING',
  'RIFT',
  'OMEN',
  'APOLOGY',
  'TESTAMENT'
];

const COSMIC_SIGNIFICANCE_LEVELS = ['LOW', 'MODERATE', 'HIGH', 'EXISTENTIAL'];
const VEIL_INTEGRITY_LEVELS = ['STABLE', 'DEGRADED', 'CRITICAL', 'REINFORCED'];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function formatText(text, maxWidth = 80) {
  const words = text.split(/\s+/);
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + word).length <= maxWidth) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines.join('\n');
}

async function promptCommitType() {
  console.log('\n🜏 Select commit type:');
  COMMIT_TYPES.forEach((type, idx) => {
    console.log(`  ${idx + 1}. ${type}`);
  });

  while (true) {
    const answer = await question('\nType number (1-7): ');
    const num = parseInt(answer, 10);
    if (num >= 1 && num <= COMMIT_TYPES.length) {
      return COMMIT_TYPES[num - 1];
    }
    console.log('Invalid choice. Please enter 1-7.');
  }
}

async function promptSummary() {
  while (true) {
    const summary = await question('\n📝 Summary (max 80 chars): ');
    if (summary.length <= 80) {
      return summary;
    }
    console.log(`Summary is ${summary.length} characters. Maximum is 80.`);
  }
}

async function promptDescription() {
  console.log('\n📄 Detailed explanation (press Enter twice to finish):');
  const lines = [];
  
  while (true) {
    const line = await question('');
    if (line === '' && lines.length > 0 && lines[lines.length - 1] === '') {
      lines.pop(); // Remove the last empty line
      break;
    }
    if (line !== '') {
      lines.push(line);
    } else if (lines.length === 0) {
      // First line is empty, wait for more
      lines.push('');
    } else {
      // Empty line in middle, keep it
      lines.push('');
    }
  }

  return lines.join('\n');
}

async function promptManifestList() {
  console.log('\n📦 Manifested changes (one per line, empty line to finish):');
  const items = [];
  
  while (true) {
    const item = await question('  - ');
    if (item.trim() === '') break;
    items.push(item.trim());
  }

  return items;
}

async function promptAwakeningVector() {
  const vector = await question('\n🔮 Awakening vector (how this integrates): ');
  return vector.trim();
}

async function promptSealedRoutes() {
  console.log('\n🔒 Sealed routes (one per line, empty line to finish):');
  const routes = [];
  
  while (true) {
    const route = await question('  - ');
    if (route.trim() === '') break;
    routes.push(route.trim());
  }

  return routes;
}

async function promptResidualEffects() {
  const effects = await question('\n⚡ Residual effects: ');
  return effects.trim();
}

async function promptRealignedStructures() {
  console.log('\n🔄 Realigned structures (one per line, empty line to finish):');
  const structures = [];
  
  while (true) {
    const structure = await question('  - ');
    if (structure.trim() === '') break;
    structures.push(structure.trim());
  }

  return structures;
}

async function promptRitualIntegrity() {
  const integrity = await question('\n✨ Ritual integrity (Confirmed intact | Enhanced | Requires monitoring): ');
  return integrity.trim();
}

async function promptMigrationPath() {
  console.log('\n🛤️  Migration path:');
  const oldPattern = await question('  Old pattern: ');
  const newPattern = await question('  New pattern: ');
  return { old: oldPattern.trim(), new: newPattern.trim() };
}

async function promptAffectedTransitLines() {
  console.log('\n🚇 Affected transit lines (one per line, empty line to finish):');
  const lines = [];
  
  while (true) {
    const line = await question('  - ');
    if (line.trim() === '') break;
    lines.push(line.trim());
  }

  return lines;
}

async function promptDeprecationTimeline() {
  console.log('\n⏰ Deprecation timeline:');
  const now = await question('  Now: ');
  const warning = await question('  v[X.Y.Z] (Warning phase): ');
  const removal = await question('  v[X.Y.Z] (Removal): ');
  return {
    now: now.trim(),
    warning: warning.trim(),
    removal: removal.trim()
  };
}

async function promptPrepareAccordingly() {
  const prep = await question('\n📋 Prepare accordingly: ');
  return prep.trim();
}

async function promptFailureMode() {
  const mode = await question('\n💥 Failure mode: ');
  return mode.trim();
}

async function promptRootCause() {
  const cause = await question('\n🔍 Root cause: ');
  return cause.trim();
}

async function promptEmergencyFix() {
  const fix = await question('\n🚨 Emergency fix: ');
  return fix.trim();
}

async function promptPenance() {
  const penance = await question('\n🙏 Penance: ');
  return penance.trim();
}

async function promptWisdomPreserved() {
  console.log('\n📚 Wisdom preserved (one per line, empty line to finish):');
  const items = [];
  
  while (true) {
    const item = await question('  - ');
    if (item.trim() === '') break;
    items.push(item.trim());
  }

  return items;
}

async function promptForThoseWhoComeAfter() {
  const guidance = await question('\n👥 For those who come after: ');
  return guidance.trim();
}

async function promptTags() {
  const tags = await question('\n🏷️  Tags (comma-separated): ');
  return tags.split(',').map(t => t.trim()).filter(t => t);
}

async function promptCosmicSignificance() {
  console.log('\n🌌 Cosmic significance:');
  COSMIC_SIGNIFICANCE_LEVELS.forEach((level, idx) => {
    console.log(`  ${idx + 1}. ${level}`);
  });

  while (true) {
    const answer = await question('Level (1-4): ');
    const num = parseInt(answer, 10);
    if (num >= 1 && num <= COSMIC_SIGNIFICANCE_LEVELS.length) {
      return COSMIC_SIGNIFICANCE_LEVELS[num - 1];
    }
    console.log('Invalid choice. Please enter 1-4.');
  }
}

async function promptVeilIntegrity() {
  console.log('\n🛡️  Veil integrity:');
  VEIL_INTEGRITY_LEVELS.forEach((level, idx) => {
    console.log(`  ${idx + 1}. ${level}`);
  });

  while (true) {
    const answer = await question('Level (1-4): ');
    const num = parseInt(answer, 10);
    if (num >= 1 && num <= VEIL_INTEGRITY_LEVELS.length) {
      return VEIL_INTEGRITY_LEVELS[num - 1];
    }
    console.log('Invalid choice. Please enter 1-4.');
  }
}

async function buildCommitMessage(type, data) {
  let message = `${type}: ${data.summary}\n\n`;

  if (data.description) {
    message += formatText(data.description) + '\n\n';
  }

  // Type-specific sections
  switch (type) {
    case 'INVOCATION':
      if (data.manifestedChanges && data.manifestedChanges.length > 0) {
        message += 'Manifested changes:\n';
        data.manifestedChanges.forEach(item => {
          message += `- ${item}\n`;
        });
        message += '\n';
      }
      if (data.awakeningVector) {
        message += `Awakening vector: ${data.awakeningVector}\n`;
      }
      break;

    case 'CONTAINMENT':
      if (data.sealedRoutes && data.sealedRoutes.length > 0) {
        message += 'Sealed routes:\n';
        data.sealedRoutes.forEach(route => {
          message += `- ${route}\n`;
        });
        message += '\n';
      }
      if (data.residualEffects) {
        message += `Residual effects: ${data.residualEffects}\n`;
      }
      break;

    case 'BINDING':
      if (data.realignedStructures && data.realignedStructures.length > 0) {
        message += 'Realigned structures:\n';
        data.realignedStructures.forEach(structure => {
          message += `- ${structure}\n`;
        });
        message += '\n';
      }
      if (data.ritualIntegrity) {
        message += `Ritual integrity: ${data.ritualIntegrity}\n`;
      }
      break;

    case 'RIFT':
      message += '⚠️ BREAKING CHANGE ⚠️\n\n';
      if (data.migrationPath) {
        message += 'Migration path:\n';
        message += `- Old pattern: ${data.migrationPath.old}\n`;
        message += `- New pattern: ${data.migrationPath.new}\n\n`;
      }
      if (data.affectedTransitLines && data.affectedTransitLines.length > 0) {
        message += 'Affected transit lines:\n';
        data.affectedTransitLines.forEach(line => {
          message += `- ${line}\n`;
        });
      }
      break;

    case 'OMEN':
      if (data.deprecationTimeline) {
        message += 'Deprecation timeline:\n';
        message += `- Now: ${data.deprecationTimeline.now}\n`;
        message += `- ${data.deprecationTimeline.warning}\n`;
        message += `- ${data.deprecationTimeline.removal}\n\n`;
      }
      if (data.prepareAccordingly) {
        message += `Prepare accordingly: ${data.prepareAccordingly}\n`;
      }
      break;

    case 'APOLOGY':
      message += 'We are sorry. This should not have happened.\n\n';
      if (data.failureMode) {
        message += `Failure mode: ${data.failureMode}\n`;
      }
      if (data.rootCause) {
        message += `Root cause: ${data.rootCause}\n`;
      }
      if (data.emergencyFix) {
        message += `Emergency fix: ${data.emergencyFix}\n`;
      }
      if (data.penance) {
        message += `\nPenance: ${data.penance}\n`;
      }
      break;

    case 'TESTAMENT':
      if (data.wisdomPreserved && data.wisdomPreserved.length > 0) {
        message += 'Wisdom preserved:\n';
        data.wisdomPreserved.forEach(item => {
          message += `- ${item}\n`;
        });
        message += '\n';
      }
      if (data.forThoseWhoComeAfter) {
        message += `For those who come after: ${data.forThoseWhoComeAfter}\n`;
      }
      break;
  }

  // Common metadata
  if (data.tags && data.tags.length > 0) {
    message += `\nTags: ${data.tags.join(', ')}\n`;
  }

  const significance = data.cosmicSignificance || 'LOW';
  const integrity = data.veilIntegrity || 'STABLE';

  if (significance === 'HIGH' || significance === 'EXISTENTIAL') {
    message += `Cosmic-Significance: ${significance}\n`;
    message += `Veil-Integrity: ${integrity}\n`;
  } else if (data.cosmicSignificance) {
    message += `Cosmic-Significance: ${significance}\n`;
  }
  if (data.veilIntegrity && (significance !== 'HIGH' && significance !== 'EXISTENTIAL')) {
    message += `Veil-Integrity: ${integrity}\n`;
  }

  return message.trim();
}

async function main() {
  console.log('🜏 Eldritch Commit Composer');
  console.log('='.repeat(50));

  const type = await promptCommitType();
  const summary = await promptSummary();
  const description = await promptDescription();

  let data = { summary, description };

  // Type-specific prompts
  switch (type) {
    case 'INVOCATION':
      data.manifestedChanges = await promptManifestList();
      data.awakeningVector = await promptAwakeningVector();
      break;

    case 'CONTAINMENT':
      data.sealedRoutes = await promptSealedRoutes();
      data.residualEffects = await promptResidualEffects();
      break;

    case 'BINDING':
      data.realignedStructures = await promptRealignedStructures();
      data.ritualIntegrity = await promptRitualIntegrity();
      break;

    case 'RIFT':
      data.migrationPath = await promptMigrationPath();
      data.affectedTransitLines = await promptAffectedTransitLines();
      break;

    case 'OMEN':
      data.deprecationTimeline = await promptDeprecationTimeline();
      data.prepareAccordingly = await promptPrepareAccordingly();
      break;

    case 'APOLOGY':
      data.failureMode = await promptFailureMode();
      data.rootCause = await promptRootCause();
      data.emergencyFix = await promptEmergencyFix();
      data.penance = await promptPenance();
      break;

    case 'TESTAMENT':
      data.wisdomPreserved = await promptWisdomPreserved();
      data.forThoseWhoComeAfter = await promptForThoseWhoComeAfter();
      break;
  }

  // Common metadata
  data.tags = await promptTags();
  data.cosmicSignificance = await promptCosmicSignificance();
  data.veilIntegrity = await promptVeilIntegrity();

  const commitMessage = buildCommitMessage(type, data);

  console.log('\n' + '='.repeat(50));
  console.log('📝 Generated Commit Message:');
  console.log('='.repeat(50));
  console.log(commitMessage);
  console.log('='.repeat(50));

  // Write to .git/COMMIT_EDITMSG if in git hook context
  const commitMsgFile = process.env.GIT_EDITMSG || path.join(process.cwd(), '.git', 'COMMIT_EDITMSG');
  if (process.env.GIT_EDITMSG || fs.existsSync(path.join(process.cwd(), '.git'))) {
    const answer = await question('\n💾 Write to commit message file? (y/n): ');
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      try {
        fs.writeFileSync(commitMsgFile, commitMessage + '\n', 'utf8');
        console.log(`✅ Commit message written to ${commitMsgFile}`);
      } catch (err) {
        console.error(`❌ Error writing commit message: ${err.message}`);
        process.exit(1);
      }
    } else {
      console.log('\n📋 Commit message (copy manually):');
      console.log(commitMessage);
    }
  } else {
    console.log('\n📋 Commit message (copy manually):');
    console.log(commitMessage);
  }

  rl.close();
}

// Handle errors gracefully
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Interrupted. No commit message generated.');
  rl.close();
  process.exit(1);
});

if (require.main === module) {
  main().catch(err => {
    console.error('❌ Error:', err.message);
    rl.close();
    process.exit(1);
  });
}

module.exports = { buildCommitMessage, COMMIT_TYPES };
```

### Step 2: Create Git Hook

**File:** `summoning/hooks/prepare-commit-msg`

**Complete Code:**

```bash
#!/bin/bash
#
# Git prepare-commit-msg hook
# Runs the Eldritch Commit Composer unless bypassed
#
# Bypass methods:
#   SKIP_ELDRITCH_COMMIT=1 git commit
#   git commit --no-verify  # Skips all hooks
#

# Check if bypassed
if [ "$SKIP_ELDRITCH_COMMIT" = "1" ]; then
  exit 0
fi

# Check if commit message already provided (e.g., -m flag)
if [ -n "$2" ] && [ "$2" != "message" ]; then
  # User provided message directly, skip composer
  exit 0
fi

# Check if we're in a merge, squash, or other special commit
if [ "$2" = "merge" ] || [ "$2" = "squash" ] || [ "$2" = "commit" ]; then
  # For merge/squash, we might want to skip or handle differently
  # For now, skip for merges
  if [ "$2" = "merge" ]; then
    exit 0
  fi
fi

# Get the path to the commit composer script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSER_SCRIPT="$PROJECT_ROOT/scripts/eldritch-commit.js"

# Check if script exists
if [ ! -f "$COMPOSER_SCRIPT" ]; then
  echo "⚠️  Eldritch commit composer not found at $COMPOSER_SCRIPT"
  exit 0  # Don't fail the commit, just skip
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
  echo "⚠️  Node.js not found. Skipping eldritch commit composer."
  exit 0
fi

# Set GIT_EDITMSG so the script knows where to write
export GIT_EDITMSG="$1"

# Run the composer
node "$COMPOSER_SCRIPT"

# Check exit code
if [ $? -ne 0 ]; then
  echo "❌ Eldritch commit composer failed. Commit aborted."
  exit 1
fi

exit 0
```

**Note:** After creating this file, make it executable:
```bash
chmod +x summoning/hooks/prepare-commit-msg
```

### Step 3: Update Package.json

**File:** `scripts/package.json`

**Location:** Add to the "scripts" section

**Action:** Add this script:

```json
"commit:ritual": "node scripts/eldritch-commit.js"
```

**Complete updated scripts section:**

```json
"scripts": {
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage",
  "commit:ritual": "node scripts/eldritch-commit.js"
}
```

### Step 4: Update Documentation

**File:** `docs/commit_guidelines.md`

**Location:** Add new section after "## Enforcement" (around line 461)

**Action:** Add this section:

```markdown
## 🜏 Automated Composer

The Eldritch Commit Composer provides an interactive tool for generating properly formatted commit messages.

### Usage

**Manual invocation:**
```bash
npm run commit:ritual
# or
node scripts/eldritch-commit.js
```

**Automatic via git hook:**
The composer runs automatically when you run `git commit` (unless bypassed).

**Bypass methods:**
```bash
# Skip the composer for this commit
SKIP_ELDRITCH_COMMIT=1 git commit -m "Quick fix"

# Skip all hooks (including composer)
git commit --no-verify -m "Emergency fix"
```

### Hook Installation

The git hook is located at `summoning/hooks/prepare-commit-msg`. To install it:

```bash
# Copy hook to .git/hooks/
cp summoning/hooks/prepare-commit-msg .git/hooks/prepare-commit-msg
chmod +x .git/hooks/prepare-commit-msg
```

Or create a symlink:
```bash
ln -s ../../summoning/hooks/prepare-commit-msg .git/hooks/prepare-commit-msg
```

**Note:** The hook is optional. You can always use `npm run commit:ritual` manually or bypass with environment variables.
```

### Step 5: Update README.md

**File:** `README.md`

**Location:** Add to a relevant section (suggest after "Startup Incantation" or in a new "Development Workflow" section)

**Action:** Add this section:

```markdown
## 🜏 Commit Ritual

This project uses the **Eldritch Commit Message Format** (see `docs/commit_guidelines.md`). 

To generate a properly formatted commit message:

```bash
npm run commit:ritual
```

The composer will guide you through selecting the commit type and filling in all required fields.

**Quick commits (bypass composer):**
```bash
SKIP_ELDRITCH_COMMIT=1 git commit -m "CONTAINMENT: Quick fix"
```

**Automatic hook:**
Install the git hook to run the composer automatically:
```bash
cp summoning/hooks/prepare-commit-msg .git/hooks/prepare-commit-msg
chmod +x .git/hooks/prepare-commit-msg
```
```

### Step 6: Update Context Decisions

**File:** `Context/decisions.md` (or `context/decisions.md` if using lowercase)

**Location:** Add new entry at the end

**Action:** Add this entry:

```markdown
## 2025-01-27: Eldritch Commit Composer Implementation

**Decision:** Implemented interactive commit message composer to enforce eldritch commit format.

**Rationale:**
- Commit message format drift was occurring due to manual composition
- The ritual format is complex with many required fields
- Interactive prompts reduce errors and ensure completeness

**Implementation:**
- Created `scripts/eldritch-commit.js` with full interactive prompts
- Added optional git hook at `summoning/hooks/prepare-commit-msg`
- Hook can be bypassed with `SKIP_ELDRITCH_COMMIT=1` for quick commits
- Manual invocation via `npm run commit:ritual`

**Trade-offs:**
- Adds friction for quick commits (mitigated by bypass flag)
- Requires Node.js (already a project dependency)
- Hook is optional, not enforced (allows flexibility)

**Future considerations:**
- Could add validation to reject non-eldritch commits (currently not enforced)
- Could add commit message linting in CI/CD
```

### Step 7: Testing

1. **Test manual invocation:**
   ```bash
   npm run commit:ritual
   ```
   - Verify all prompts work correctly
   - Test each commit type
   - Verify output format matches guidelines

2. **Test git hook (if installed):**
   ```bash
   # Make some changes
   git add .
   git commit
   # Should trigger composer
   ```

3. **Test bypass:**
   ```bash
   SKIP_ELDRITCH_COMMIT=1 git commit -m "TEST: Bypass test"
   # Should skip composer
   ```

4. **Test hook installation:**
   ```bash
   cp summoning/hooks/prepare-commit-msg .git/hooks/prepare-commit-msg
   chmod +x .git/hooks/prepare-commit-msg
   git commit
   # Should run composer
   ```

## Dependencies

- **Node.js** (already required for project)
- **readline** (Node.js built-in, no additional packages needed)

## Backward Compatibility

- The composer is **optional** - existing commit workflows continue to work
- The git hook can be bypassed with `SKIP_ELDRITCH_COMMIT=1`
- Manual commits with `-m` flag skip the composer
- No breaking changes to existing workflows
