---
name: REPAIR-todo-refinement-vs-scope-change
branch: feature/REPAIR-todo-refinement-vs-scope-change
status: pending
created: 2025-11-16
---

# REPAIR: Todo Refinement vs Scope Change

## Problem/Goal

### Primary Issue: Todo Refinement vs Scope Change
The cc-sessions enforcement hooks currently block ALL todo list changes as potential scope violations, even when the changes are legitimate refinements (e.g., breaking down "Begin work on task" into specific implementation steps after gathering context).

This creates unnecessary friction in the natural DAIC workflow:
1. Task startup gives generic todos including "Begin work on task"
2. After context gathering, AI breaks down generic todo into specific steps
3. Hook incorrectly triggers shame ritual for legitimate planning refinement

Additionally, the framework documentation never explicitly states that REPAIR tasks ARE cc-sessions tasks, leading to potential confusion about whether they should go through DAIC or be handled differently.

### Secondary Issue: Documentation Path Inconsistency
The framework documentation inconsistently references `.cc-sessions/` paths instead of the canonical `sessions/` directory structure used by the official cc-sessions repo. This creates confusion when:
1. Following framework health check instructions
2. Understanding state persistence mechanisms
3. Debugging session-related issues

All references to `.cc-sessions/state.json` should be corrected to `sessions/sessions-state.json` to match the actual implementation and canonical structure.

## Success Criteria

### Primary: Todo Refinement vs Scope Change
- [x] Create REPAIR task as proper cc-sessions task (demonstrating the pattern)
- [ ] Update `CLAUDE.md` Section 6.3 to explicitly state REPAIR tasks ARE cc-sessions tasks
- [ ] Update `CLAUDE.md` or `claude-reference.md` to define "todo refinement" vs "scope change"
- [ ] Add examples distinguishing legitimate refinements from violations
- [ ] Document when shame ritual is actually needed vs when refinement is allowed
- [ ] Optionally: Review and refine `sessions/hooks/user_messages.js` todo-change detection logic to be smarter about refinements
- [ ] Add this pattern to `context/gotchas.md` with concrete examples
- [ ] Ensure DAIC integrity remains intact while allowing natural planning evolution

### Secondary: Documentation Path Corrections
- [ ] Fix all `.cc-sessions/` → `sessions/` path references in framework documentation
- [ ] Update `CLAUDE.md` references (lines 53, 133, 135, 366)
- [ ] Update `.claude/skills/framework_health_check.md` references
- [ ] Update `.claude/skills/cc-sessions-core.md` references (line 125)
- [ ] Update `claude-reference.md` references (line 15)
- [ ] Update `Context/Features/001-CustomizeSkillRules.md` references
- [ ] Verify all documentation now correctly references canonical cc-sessions structure
- [ ] Run framework health check to verify changes work correctly

## Context Manifest

**Issue Context:**
- Observed in task `m-implement-skill-prompts`
- AI gathered context, then tried to break down "Begin work on task" into 10 specific implementation steps
- Hook blocked this as scope change, triggered shame ritual
- User correctly identified this as legitimate refinement, not violation

**Relevant Files (Primary Issue):**
- `/Users/grandinharrison/Desktop/claude-code-projects/claude-chaos-express/CLAUDE.md` - Section 6.3 (REPAIR tasks), Section 2 (DAIC)
- `/Users/grandinharrison/Desktop/claude-code-projects/claude-chaos-express/claude-reference.md` - Supporting details
- `/Users/grandinharrison/Desktop/claude-code-projects/claude-chaos-express/sessions/hooks/user_messages.js` - Todo change detection logic
- `/Users/grandinharrison/Desktop/claude-code-projects/claude-chaos-express/Context/gotchas.md` - Where to document the pattern

**Files Needing Path Corrections (Secondary Issue):**
All references to `.cc-sessions/state.json` should be changed to `sessions/sessions-state.json`:

1. **CLAUDE.md** (4 occurrences)
   - Line 53: "Use lightweight JSON (e.g. `.cc-sessions/state.json`)"
   - Line 133: Section header "### 3.2 State Persistence (`.cc-sessions/state.json`)"
   - Line 135: "Use `.cc-sessions/state.json` as a **lightweight task checkpoint**"
   - Line 366: "Verify `.cc-sessions/state.json` exists"

2. **claude-reference.md** (1 occurrence)
   - Line 15: "`/.cc-sessions/state.json` is a lightweight checkpoint"

3. **.claude/skills/cc-sessions-core.md** (1 occurrence)
   - Line 125: "Task state tracked in `.cc-sessions/state.json`"

4. **.claude/skills/framework_health_check.md** (4 occurrences)
   - Line 30: "Check `.cc-sessions/state.json` exists"
   - Line 90: ".cc-sessions/state.json exists and valid"
   - Line 125: ".cc-sessions/state.json valid"
   - Line 184: "Check .cc-sessions/state.json exists"

5. **Context/Features/001-CustomizeSkillRules.md** (2 occurrences)
   - Line 79: "`.cc-sessions/state.json` - Would store CC_SESSION_MODE"
   - Line 89: "read CC_SESSION_MODE from .cc-sessions/state.json"

6. **sessions/tasks/m-implement-custom-skill-rules.md** (1 occurrence)
   - Line 46: ".cc-sessions/state.json - Lightweight task checkpoint mechanism"

7. **sessions/tasks/done/m-repo-initialization.md** (1 occurrence)
   - Line 106: ".cc-sessions/state.json - Task state persistence"

**Note:** This task file (REPAIR-todo-refinement-vs-scope-change.md) correctly references the issue but should not be modified as it documents the problem itself.

## User Notes

This REPAIR task itself demonstrates the fix: it IS a cc-sessions task going through normal DAIC, showing that REPAIR tasks are just specialized tasks with framework-modification scope.

## Work Log

### 2025-11-16 - Initial Creation
- Created task in response to observed hook over-enforcement issue during `m-implement-skill-prompts` task
- Scope: Fix todo refinement detection in enforcement hooks

### 2025-11-15 - Scope Expansion
- Expanded scope to include documentation path corrections
- Identified inconsistency: framework docs reference `.cc-sessions/` instead of canonical `sessions/` structure
- Added secondary success criteria for fixing all path references
- Updated Problem/Goal section to reflect both issues
- Rationale: Both issues discovered during same investigation, both affect framework documentation consistency

