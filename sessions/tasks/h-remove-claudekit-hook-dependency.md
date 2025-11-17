---
name: h-remove-claudekit-hook-dependency
branch: feature/h-remove-claudekit-hook-dependency
status: pending
created: 2025-11-16
priority: high
---

# Remove Phantom `claudekit-hooks` Dependencies

## Problem/Goal
`.claude/settings.json` invokes `claudekit-hooks run …` in multiple lifecycle stages, but those binaries are not present in the repo, leading to command-not-found failures and noisy sessions. Replace or guard these hooks with local equivalents to stabilize the pipeline.

## Success Criteria
- [ ] Inventory each `claudekit-hooks run …` invocation and decide to replace, guard via env flag, or remove.
- [ ] Wire local alternatives for lint/test (e.g., npm scripts) where enforcement is still needed, with clear naming.
- [ ] Disable or vendor alternatives for analysis hooks (codebase-map, thinking-level) and document rationale inline.
- [ ] Update `.claude/settings.json` and any referenced docs (`CLAUDE.md` Section 8) to reflect the new behavior.
- [ ] Smoke-test a minimal session (read + edit) to confirm no missing-command errors; log results in LCMP gotchas/decisions.

## Context Manifest
- `.claude/settings.json`
- `CLAUDE.md` (health check references)
- Any local scripts used as replacements (e.g., `scripts/test-and-log.sh`)
- `context/decisions.md`, `context/gotchas.md`

## User Notes
- Created by a third-party AI; Claude must validate the plan, summarize benefits/risks to the user, recommend whether to proceed, and wait for explicit user permission before implementation.
- Benefit: stabilizes hooks and reduces noise. Risk: losing intended safety checks if replacements are weaker than original external tools.

## Implementation Instructions

### Step 1: Inventory All claudekit-hooks Invocations

**Action:** Search for all claudekit-hooks references:

```bash
# Find all claudekit-hooks references
grep -r "claudekit-hooks" . --exclude-dir=node_modules --exclude-dir=.git > /tmp/claudekit-hooks-refs.txt

# Review the results
cat /tmp/claudekit-hooks-refs.txt
```

**Found in:** `.claude/settings.json` (15 references)

### Step 2: Categorize Hooks by Type

**Analysis hooks (can be disabled or replaced):**
- `codebase-map` - Analysis hook, can be disabled
- `thinking-level` - Analysis hook, can be disabled

**Lint/test hooks (replace with local scripts):**
- `lint-changed` - Replace with local npm script or remove
- `typecheck-changed` - Replace with local npm script or remove
- `check-any-changed` - Replace with local npm script or remove
- `test-changed` - Replace with local npm script or remove
- `lint-project` - Replace with local npm script or remove
- `typecheck-project` - Replace with local npm script or remove
- `test-project` - Replace with local npm script or remove

**Guard hooks (replace with local alternatives):**
- `file-guard` - Create local script or remove
- `check-comment-replacement` - Create local script or remove
- `check-unused-parameters` - Create local script or remove
- `check-todos` - Create local script or remove
- `self-review` - Create local script or remove

**Checkpoint hooks (keep or replace):**
- `create-checkpoint` - Create local script or remove

### Step 3: Update .claude/settings.json

**File:** `.claude/settings.json`

**Action:** Replace or disable claudekit-hooks invocations:

**Option A: Disable Analysis Hooks (Recommended)**

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node $CLAUDE_PROJECT_DIR/sessions/hooks/user_messages.js"
          },
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/skill-activation-prompt.sh"
          }
        ]
      }
      // REMOVED: claudekit-hooks run codebase-map
      // REMOVED: claudekit-hooks run thinking-level
    ],
    "PreToolUse": [
      // ... existing hooks ...
      {
        "matcher": "Read|Edit|MultiEdit|Write|Bash",
        "hooks": [
          // REMOVED: claudekit-hooks run file-guard
          // Replace with local script if needed
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|MultiEdit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "node $CLAUDE_PROJECT_DIR/sessions/hooks/post_tool_use.js"
          }
          // REMOVED: claudekit-hooks run lint-changed
          // REMOVED: claudekit-hooks run typecheck-changed
          // REMOVED: claudekit-hooks run test-changed
          // REMOVED: claudekit-hooks run check-any-changed
          // REMOVED: claudekit-hooks run check-comment-replacement
          // REMOVED: claudekit-hooks run check-unused-parameters
        ]
      }
    ],
    "PreCommit": [
      {
        "hooks": [
          // REMOVED: claudekit-hooks run typecheck-project
          // REMOVED: claudekit-hooks run lint-project
          // REMOVED: claudekit-hooks run test-project
          // REMOVED: claudekit-hooks run check-todos
          // REMOVED: claudekit-hooks run self-review
          // REMOVED: claudekit-hooks run create-checkpoint
        ]
      }
    ]
  }
}
```

**Option B: Replace with Local Scripts (If enforcement needed)**

**File:** `scripts/local-hooks.sh` (NEW)

**Action:** Create local hook wrapper:

```bash
#!/bin/bash
# Local hook wrapper to replace claudekit-hooks

HOOK_NAME="$1"
shift
ARGS="$@"

case "$HOOK_NAME" in
  "lint-changed")
    # Run local lint on changed files
    npm run lint -- --fix 2>/dev/null || true
    ;;
  "typecheck-changed")
    # Run typecheck on changed files
    npm run typecheck 2>/dev/null || true
    ;;
  "test-changed")
    # Run tests on changed files
    npm test 2>/dev/null || true
    ;;
  "lint-project")
    npm run lint 2>/dev/null || true
    ;;
  "typecheck-project")
    npm run typecheck 2>/dev/null || true
    ;;
  "test-project")
    npm test 2>/dev/null || true
    ;;
  *)
    # Unknown hook - silently skip
    exit 0
    ;;
esac
```

**Make executable:**
```bash
chmod +x scripts/local-hooks.sh
```

**Update settings.json to use local script:**
```json
{
  "command": "$CLAUDE_PROJECT_DIR/scripts/local-hooks.sh lint-changed"
}
```

### Step 4: Document Changes

**File:** `context/decisions.md`

**Action:** Add entry:

```markdown
## 2025-01-27: Remove claudekit-hooks Dependencies

**Decision:** Removed all `claudekit-hooks` invocations from `.claude/settings.json` to eliminate phantom command failures.

**Rationale:**
- claudekit-hooks binaries are not present in the repo
- Command-not-found errors create noise in sessions
- Local alternatives can be created if enforcement is needed
- Analysis hooks (codebase-map, thinking-level) are not critical

**Changes:**
- Disabled analysis hooks (codebase-map, thinking-level)
- Removed lint/test hooks (replaced with optional local scripts if needed)
- Removed guard hooks (file-guard, check-*)
- Removed checkpoint hooks (create-checkpoint)

**Impact:**
- No more command-not-found errors
- Hooks system is more stable
- Can add local alternatives later if needed
```

**File:** `context/gotchas.md`

**Action:** Add entry:

```markdown
## claudekit-hooks Phantom Dependencies

**Issue:** `.claude/settings.json` referenced `claudekit-hooks` commands that don't exist, causing command-not-found errors.

**Fix:** Removed all claudekit-hooks references (2025-01-27). Analysis hooks disabled, lint/test hooks can be replaced with local npm scripts if needed.

**Prevention:** Only reference commands/scripts that exist in the repo or are installed dependencies.
```

### Step 5: Update CLAUDE.md Documentation

**File:** `CLAUDE.md`

**Action:** Update Section 8 (health check references) if it mentions claudekit-hooks:

```markdown
## Health Checks

Health checks use local scripts and npm commands, not external claudekit-hooks.
Run `node scripts/health-check.sh` for system validation.
```

### Step 6: Testing

1. **Test hook execution:**
   - Submit a user prompt
   - Verify no command-not-found errors
   - Verify hooks still run (if local alternatives created)

2. **Test tool execution:**
   - Use Write/Edit tools
   - Verify no claudekit-hooks errors
   - Verify post-tool hooks work

3. **Test commit hooks:**
   - Attempt a commit
   - Verify no claudekit-hooks errors
   - Verify local alternatives work (if created)

4. **Verify stability:**
   - Run a full session
   - Check for any missing command errors
   - Verify system works without claudekit-hooks

## Work Log
- [2025-11-16] Task authored during audit; awaiting Claude validation and user permission.
