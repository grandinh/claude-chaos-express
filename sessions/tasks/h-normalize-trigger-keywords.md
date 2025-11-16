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

