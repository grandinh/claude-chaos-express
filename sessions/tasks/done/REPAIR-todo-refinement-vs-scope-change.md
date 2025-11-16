---
name: REPAIR-todo-refinement-vs-scope-change
branch: feature/REPAIR-todo-refinement-vs-scope-change
status: completed
created: 2025-11-16
completed: 2025-11-15
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
- [x] Update `CLAUDE.md` Section 6.3 to explicitly state REPAIR tasks ARE cc-sessions tasks
- [x] Update `CLAUDE.md` or `claude-reference.md` to define "todo refinement" vs "scope change"
- [x] Add examples distinguishing legitimate refinements from violations
- [x] Document when shame ritual is actually needed vs when refinement is allowed
- [x] Optionally: Review and refine `sessions/hooks/user_messages.js` todo-change detection logic to be smarter about refinements (DECISION: Leave hook as-is, documentation fix sufficient)
- [x] Add this pattern to `context/gotchas.md` with concrete examples
- [x] Ensure DAIC integrity remains intact while allowing natural planning evolution

### Secondary: Documentation Path Corrections
- [x] Fix all `.cc-sessions/` → `sessions/` path references in framework documentation
- [x] Update `CLAUDE.md` references (lines 53, 133, 135, 366)
- [x] Update `.claude/skills/framework_health_check.md` references
- [x] Update `.claude/skills/cc-sessions-core.md` references (line 125)
- [x] Update `claude-reference.md` references (line 15)
- [x] Update `Context/Features/001-CustomizeSkillRules.md` references
- [x] Verify all documentation now correctly references canonical cc-sessions structure
- [x] Run framework health check to verify changes work correctly

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

### 2025-11-15 - Implementation Complete

#### Path Corrections (Secondary Issue)
- Fixed all 14 path references across 7 files:
  - `CLAUDE.md`: 4 corrections (lines 53, 133, 135, 366)
  - `claude-reference.md`: 1 correction (line 15)
  - `.claude/skills/cc-sessions-core.md`: 1 correction (line 125)
  - `.claude/skills/framework_health_check.md`: 4 corrections (lines 30, 90, 125, 184)
  - `Context/Features/001-CustomizeSkillRules.md`: 2 corrections (lines 79, 89)
  - `sessions/tasks/m-implement-custom-skill-rules.md`: 1 correction (line 46)
  - `sessions/tasks/done/m-repo-initialization.md`: 1 correction (line 106)
- All `.cc-sessions/state.json` references now correctly point to `sessions/sessions-state.json`
- Verified with grep - no remaining incorrect references

#### Todo Refinement Documentation (Primary Issue)
- **Added Section 2 to claude-reference.md**: "Todo Refinement vs Scope Change"
  - Defined clear distinction between refinement and scope violation
  - Provided concrete examples of each category
  - Established rules for when shame ritual applies
  - Added cross-reference to CLAUDE.md Section 6.3
- **Updated CLAUDE.md Section 6.3**: Explicitly stated REPAIR tasks ARE cc-sessions tasks
  - Clarified they follow normal DAIC workflow
  - Listed all framework rules they must respect
  - Emphasized scope difference is limited to framework modifications
  - Added cross-reference to claude-reference.md Section 2
- **Created Context/gotchas.md**: Documented both issues with template
  - Todo Refinement vs Scope Change pattern with examples
  - Documentation Path Inconsistency with root cause analysis
  - Prevention strategies for both issues
  - Added reference to real-world example in template section

#### Code Review Findings Addressed
- Added cross-references between CLAUDE.md 6.3 and claude-reference.md Section 2
- Strengthened definitions in claude-reference.md Section 2.1 and 2.2
- Added concrete before/after examples in Section 2.3
- Added version history notes to both CLAUDE.md and claude-reference.md headers
- Updated gotchas.md template to reference real-world example

#### Framework Health Check
- Verified state persistence: `sessions/sessions-state.json` exists and valid
- Confirmed all path corrections work correctly
- No framework integrity issues detected

#### Key Decisions
- **Decision**: Leave hook logic unchanged, fix via documentation only
  - Rationale: Hook's conservative approach is actually correct - it should block ambiguous changes
  - Solution: Provide clear guidelines so AI operators understand when refinement is legitimate
  - Impact: Maintains safety while reducing false positives through better documentation
- **Decision**: User approved scope expansion during implementation to address code review findings
  - Added cross-references, strengthened definitions, added examples, added version tracking
  - Rationale: Improves documentation quality and prevents similar confusion in future

