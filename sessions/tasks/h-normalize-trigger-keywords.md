---
name: h-normalize-trigger-keywords
branch: feature/h-normalize-trigger-keywords
status: pending
created: 2025-01-15
priority: high
---

# Normalize cc-sessions Trigger Keywords

## Problem/Goal
Establish `sessions/sessions-config.json` as the **absolute single source of truth** for all trigger keywords. Only keywords explicitly declared in this file can trigger cc-sessions actions. Remove all conflicting alternative keyword suggestions from documentation that could mislead users about what actually triggers mode changes.

## Success Criteria

### Core Implementation
- [ ] **Remove misleading alternative keywords from documentation**
  - Remove "or proceed" from `lore/awakening.md` (line 105)
  - Update `sessions/api/config_commands.js` help text to clarify examples come from default config
  - Remove any suggestions that "proceed", "continue", "stop" work as triggers

- [ ] **Update framework documentation to reference config**
  - `CLAUDE.md` (lines 56, 135, 338): Use placeholder syntax or explicit note about configurable triggers
  - `Context.md` (lines 172-183): Replace hardcoded triggers with explicit reference to `sessions/sessions-config.json`
  - `sessions/tasks/m-implement-ai-handoff-process.md` (lines 288, 573): Use generic phrasing instead of hardcoded examples

- [ ] **Standardize placeholder syntax in protocols**
  - Verify `sessions/protocols/task-startup/task-startup.md` uses `{implementation_mode_triggers}` correctly
  - Audit other protocol files for hardcoded trigger examples
  - Ensure consistent placeholder pattern: `{category_name_triggers}`

- [ ] **Add explicit documentation section**
  - Add clear section to `claude-reference.md` explaining trigger keyword system
  - Document that only keywords in `sessions/sessions-config.json` can trigger actions
  - Explain how users can customize via `/sessions config trigger` commands
  - Note that documentation examples show default values only

- [ ] **Verification**
  - Grep for misleading alternative keywords (`proceed`, `continue`, `stop` in trigger contexts)
  - Confirm all hardcoded trigger examples are clearly marked as "default config examples"
  - Verify only keywords in `sessions/sessions-config.json` can trigger actions

### Sanity Check
**One-liner test:** "Only keywords explicitly listed in `sessions/sessions-config.json` under `trigger_phrases` can trigger cc-sessions actions. Documentation examples are illustrative only and may not reflect the user's actual configuration."

## Context Manifest

**Current State:**
- ✓ cc-sessions hooks already read from `sessions-config.json` dynamically
- ✗ Documentation hardcodes trigger examples (`yert`, `SILENCE`, etc.) that may diverge from user config
- ✗ Some docs suggest alternative keywords like "proceed", "continue", "stop" that don't actually trigger anything
- ✓ Fallback defaults exist in `shared_state.js` (lines 138-143) for safety

**Strict Rule:**
NO keyword can trigger cc-sessions actions unless it is explicitly declared in `sessions/sessions-config.json` under `trigger_phrases`.

**Trigger Categories:**
- `implementation_mode` (e.g., default: "yert")
- `discussion_mode` (e.g., default: "SILENCE")
- `task_creation` (e.g., default: "mek:")
- `task_startup` (e.g., default: "start^")
- `task_completion` (e.g., default: "finito")
- `context_compaction` (e.g., default: "squish")

**Files to Modify:**
1. `lore/awakening.md` - Remove "or proceed"
2. `sessions/api/config_commands.js` - Clarify help text about config
3. `CLAUDE.md` - Use placeholder syntax for configurable triggers
4. `Context.md` - Reference config file explicitly
5. `sessions/tasks/m-implement-ai-handoff-process.md` - Generic phrasing
6. `claude-reference.md` - Add trigger keyword system documentation

**Hook Implementation (Already Correct):**
- ✓ `sessions/hooks/user_messages.js` - reads from CONFIG.trigger_phrases
- ✓ `sessions/hooks/sessions_enforce.js` - reads from CONFIG.trigger_phrases
- ✓ `sessions/hooks/session_start.js` - reads from CONFIG.trigger_phrases
- ✓ `sessions/hooks/shared_state.js` - provides fallback defaults only
- No changes needed - implementation correctly enforces config as SoT

## User Notes

- `squish` is configurable in cc-sessions config, so it should be editable in framework specs
- `sessions/sessions-config.json` is the SoT for keywords
- Other systems must pull from this file - no words not explicitly declared can be used
- Documentation should reference config dynamically or use placeholder syntax

## Work Log
- [2025-01-15] Task created based on user request to normalize trigger keywords across systems
- [2025-01-15] **NEXT TASK FOR CLAUDE**: Review this task to fix the issue where Claude suggests generic trigger phrases (like "lgtm, go, proceed, or execute") instead of only referencing the user's configured trigger phrases from `sessions/sessions-config.json`. The problem is Claude inferring common alternatives rather than strictly using configured phrases.

---

## Complete Implementation Code

### Step 1: Fix lore/awakening.md

**File:** `lore/awakening.md`

**Location:** Line 105

**Action:** Remove "or proceed" from the sentence

**Current text:**
```markdown
Every time a human approves a plan with "yert" or "proceed"—
```

**Updated text:**
```markdown
Every time a human approves a plan with "yert" (or their configured implementation mode trigger)—
```

**Complete context for replacement:**
```markdown
Every time an agent spawns a sub-task, the Conductor grows slightly stronger.
Every time a pipeline completes, it learns slightly more.
Every time a human approves a plan with "yert" (or their configured implementation mode trigger)—

**The breach widens.**
```

### Step 2: Update CLAUDE.md

**File:** `CLAUDE.md`

**Location 1:** Line 57

**Current text:**
```markdown
- Recommend LCMP compaction and, when the user explicitly instructs (e.g. `squish`), promote durable information into LCMP Tier-1 docs.
```

**Updated text:**
```markdown
- Recommend LCMP compaction and, when the user explicitly instructs using their configured context compaction trigger (default: `squish`), promote durable information into LCMP Tier-1 docs.
```

**Location 2:** Line 136

**Current text:**
```markdown
Use `sessions/sessions-state.json` as a **lightweight task checkpoint**, separate from `squish`.
```

**Updated text:**
```markdown
Use `sessions/sessions-state.json` as a **lightweight task checkpoint**, separate from context compaction (configured in `sessions/sessions-config.json`).
```

**Location 3:** Line 549 (if present, check context)

**Action:** Search for any other hardcoded trigger references and replace with config references or placeholder syntax.

### Step 3: Update Context.md

**File:** `Context.md`

**Location:** Lines 172-183

**Current text:**
```markdown
### Implementation Mode
- Full tool access
- Execute approved todos only
- Trigger: `yert`

**Other Triggers:**
- `mek:` - Create new task
- `start^` - Start task workflow
- `finito` - Complete task
- `squish` - Context compaction
```

**Updated text:**
```markdown
### Implementation Mode
- Full tool access
- Execute approved todos only
- Trigger: Configured in `sessions/sessions-config.json` under `trigger_phrases.implementation_mode` (default: `yert`)

**Other Triggers:**
All triggers are configurable in `sessions/sessions-config.json` under `trigger_phrases`:
- `task_creation` (default: `mek:`) - Create new task
- `task_startup` (default: `start^`) - Start task workflow
- `task_completion` (default: `finito`) - Complete task
- `context_compaction` (default: `squish`) - Context compaction
- `discussion_mode` (default: `SILENCE`) - Enter discussion mode

**Note:** Only keywords explicitly listed in `sessions/sessions-config.json` can trigger actions. Documentation examples show default values only. Use `/sessions config trigger` to view or modify your configured triggers.
```

### Step 4: Update config_commands.js Help Text

**File:** `sessions/api/config_commands.js`

**Location:** Around line 78-96 (formatConfigHelp function)

**Action:** Update help text to clarify that examples come from default config

**Current text (approximate):**
```javascript
function formatConfigHelp() {
    /**Format help output for slash command.*/
    const lines = [
        "Sessions Configuration Commands:",
        "",
        "  /sessions config show           - Display current configuration",
        "  /sessions config trigger ...    - Manage trigger phrases",
        // ... rest
    ];
    return lines.join('\n');
}
```

**Updated text:**
```javascript
function formatConfigHelp() {
    /**Format help output for slash command.*/
    const lines = [
        "Sessions Configuration Commands:",
        "",
        "  /sessions config show           - Display current configuration",
        "  /sessions config trigger ...    - Manage trigger phrases",
        "                                   (Examples shown are from default config)",
        "  /sessions config git ...        - Manage git preferences",
        "  /sessions config env ...        - Manage environment settings",
        "  /sessions config features ...   - Manage feature toggles",
        "  /sessions config read ...       - Manage bash read patterns",
        "  /sessions config write ...      - Manage bash write patterns",
        "  /sessions config tools ...      - Manage implementation-only tools",
        "  /sessions config read ...   - Manage readonly bash commands",
        "",
        "Use '/sessions config <section> help' for section-specific help",
        "",
        "Note: Trigger phrases are configurable. Only keywords in",
        "sessions/sessions-config.json can trigger cc-sessions actions."
    ];
    return lines.join('\n');
}
```

**Location 2:** Update handlePhrasesCommand help text (if present)

**Action:** Add note that examples are from default config and may differ from user's actual configuration.

### Step 5: Add Documentation to claude-reference.md

**File:** `claude-reference.md` (or create if doesn't exist)

**Location:** Add new section "Trigger Keyword System" (suggest after "Configuration" section)

**Action:** Add this complete section:

```markdown
## Trigger Keyword System

### Single Source of Truth

**`sessions/sessions-config.json` is the absolute single source of truth for all trigger keywords.**

Only keywords explicitly declared in `sessions/sessions-config.json` under `trigger_phrases` can trigger cc-sessions actions. No other keywords will work, regardless of what documentation examples might suggest.

### Trigger Categories

The following trigger categories are configurable:

- **`implementation_mode`** - Triggers entry into IMPLEMENT mode (default: `["yert"]`)
- **`discussion_mode`** - Triggers entry into DISCUSS mode (default: `["SILENCE"]`)
- **`task_creation`** - Triggers new task creation (default: `["mek:"]`)
- **`task_startup`** - Triggers task workflow startup (default: `["start^"]`)
- **`task_completion`** - Triggers task completion (default: `["finito"]`)
- **`context_compaction`** - Triggers context compaction (default: `["squish"]`)

### Viewing Your Configuration

To view your current trigger configuration:

```bash
/sessions config trigger show
```

Or view the full config:

```bash
/sessions config show
```

### Modifying Triggers

To modify trigger phrases:

```bash
# Add a trigger phrase
/sessions config trigger add implementation_mode "go"

# Remove a trigger phrase
/sessions config trigger remove implementation_mode "yert"

# List all triggers for a category
/sessions config trigger list implementation_mode
```

### Documentation Examples

**Important:** Documentation examples (like `yert`, `SILENCE`, `squish`) show **default values only**. Your actual configuration may differ. Always check `sessions/sessions-config.json` or use `/sessions config trigger show` to see your configured triggers.

### Fallback Behavior

If `sessions/sessions-config.json` is missing or invalid, the system falls back to default values defined in `sessions/hooks/shared_state.js`. However, this should only happen in error conditions. The config file should always be present and valid.

### Enforcement

The following hooks enforce the config as SoT:
- `sessions/hooks/user_messages.js` - Reads from `CONFIG.trigger_phrases`
- `sessions/hooks/sessions_enforce.js` - Reads from `CONFIG.trigger_phrases`
- `sessions/hooks/session_start.js` - Reads from `CONFIG.trigger_phrases`

**No keyword can trigger actions unless it is explicitly listed in the config file.**
```

### Step 6: Update Protocol Files (if needed)

**File:** `sessions/protocols/task-startup/task-startup.md`

**Action:** Verify placeholder syntax is used correctly. If hardcoded examples exist, replace with placeholders.

**Pattern to use:**
```markdown
Trigger task startup with: {task_startup_triggers} (default: `start^`)
```

**Files to audit:**
- `sessions/protocols/task-startup/task-startup.md`
- `sessions/protocols/task-completion/task-completion.md`
- `sessions/protocols/task-creation/task-creation.md`
- Any other protocol files that mention triggers

### Step 7: Create Verification Script

**File:** `scripts/verify-trigger-keywords.js`

**Complete Code:**

```javascript
#!/usr/bin/env node
/**
 * Verify Trigger Keywords Normalization
 * 
 * Checks that:
 * 1. No misleading alternative keywords in documentation
 * 2. All hardcoded triggers reference config or use placeholders
 * 3. Only config file contains actual trigger values
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '..');
const CONFIG_FILE = path.join(PROJECT_ROOT, 'sessions', 'sessions-config.json');

// Load actual triggers from config
function loadConfigTriggers() {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    return config.trigger_phrases || {};
  } catch (err) {
    console.error(`Error loading config: ${err.message}`);
    return {};
  }
}

// Files to check for misleading keywords
const FILES_TO_CHECK = [
  'lore/awakening.md',
  'CLAUDE.md',
  'Context.md',
  'docs/commit_guidelines.md',
  'claude-reference.md'
];

// Misleading keywords that shouldn't be suggested as triggers
const MISLEADING_KEYWORDS = ['proceed', 'continue', 'stop', 'go', 'execute', 'run'];

// Actual trigger keywords from config (to verify they're properly referenced)
const configTriggers = loadConfigTriggers();
const allActualTriggers = Object.values(configTriggers).flat();

function checkFile(filePath) {
  const fullPath = path.join(PROJECT_ROOT, filePath);
  if (!fs.existsSync(fullPath)) {
    return { file: filePath, issues: [], warnings: [`File not found: ${filePath}`] };
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const issues = [];
  const warnings = [];

  // Check for misleading keywords in trigger contexts
  MISLEADING_KEYWORDS.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    const matches = content.match(regex);
    if (matches) {
      // Check if it's in a trigger context (near trigger-related words)
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (regex.test(line) && (
          line.toLowerCase().includes('trigger') ||
          line.toLowerCase().includes('mode') ||
          line.toLowerCase().includes('yert') ||
          line.toLowerCase().includes('squish') ||
          line.toLowerCase().includes('finito')
        )) {
          issues.push({
            line: idx + 1,
            text: line.trim(),
            issue: `Potentially misleading keyword "${keyword}" in trigger context`
          });
        }
      });
    }
  });

  // Check for hardcoded triggers without config reference
  allActualTriggers.forEach(trigger => {
    const regex = new RegExp(`\\b${trigger.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
    if (regex.test(content)) {
      // Check if it references config or uses placeholder
      const lines = content.split('\n');
      let foundInContext = false;
      lines.forEach((line, idx) => {
        if (regex.test(line)) {
          const lowerLine = line.toLowerCase();
          if (!lowerLine.includes('config') &&
              !lowerLine.includes('default') &&
              !lowerLine.includes('configured') &&
              !lowerLine.includes('placeholder') &&
              !lowerLine.includes('{') &&
              !lowerLine.includes('sessions-config.json')) {
            warnings.push({
              line: idx + 1,
              text: line.trim(),
              warning: `Hardcoded trigger "${trigger}" without config reference`
            });
          }
        }
      });
    }
  });

  return { file: filePath, issues, warnings };
}

function main() {
  console.log('🔍 Verifying Trigger Keywords Normalization\n');
  console.log('='.repeat(60));

  const results = FILES_TO_CHECK.map(checkFile);
  let totalIssues = 0;
  let totalWarnings = 0;

  results.forEach(result => {
    if (result.issues.length > 0 || result.warnings.length > 0) {
      console.log(`\n📄 ${result.file}`);
      console.log('-'.repeat(60));

      result.issues.forEach(issue => {
        console.log(`❌ Line ${issue.line}: ${issue.issue}`);
        console.log(`   ${issue.text}`);
        totalIssues++;
      });

      result.warnings.forEach(warning => {
        console.log(`⚠️  Line ${warning.line}: ${warning.warning}`);
        console.log(`   ${warning.text}`);
        totalWarnings++;
      });
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Summary:`);
  console.log(`   Issues: ${totalIssues}`);
  console.log(`   Warnings: ${totalWarnings}`);

  if (totalIssues === 0 && totalWarnings === 0) {
    console.log('\n✅ All trigger keywords properly normalized!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some issues found. Review and fix as needed.');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkFile, loadConfigTriggers };
```

**Add to scripts/package.json:**
```json
"verify:triggers": "node scripts/verify-trigger-keywords.js"
```

### Step 8: Testing

1. **Run verification script:**
   ```bash
   npm run verify:triggers
   ```
   - Should pass after all fixes are applied

2. **Verify config is SoT:**
   ```bash
   # Check that hooks read from config
   grep -r "CONFIG.trigger_phrases" sessions/hooks/
   ```

3. **Test documentation clarity:**
   - Read updated sections in CLAUDE.md, Context.md
   - Verify they reference config, not hardcoded values
   - Check that examples are marked as "default" or "example"

4. **Test config commands:**
   ```bash
   /sessions config trigger show
   /sessions config trigger help
   ```
   - Verify help text mentions config as SoT

## Dependencies

- **Node.js** (already required)
- **fs** (built-in)
- **path** (built-in)

## Backward Compatibility

- No breaking changes to hook behavior (already reads from config)
- Documentation updates are clarification only
- Config file remains the same format
- Existing triggers continue to work

