---
name: REPAIR-todo-refinement-vs-scope-change
branch: feature/REPAIR-todo-refinement-vs-scope-change
status: pending
created: 2025-11-16
---

# REPAIR: Todo Refinement vs Scope Change

## Problem/Goal

The cc-sessions enforcement hooks currently block ALL todo list changes as potential scope violations, even when the changes are legitimate refinements (e.g., breaking down "Begin work on task" into specific implementation steps after gathering context).

This creates unnecessary friction in the natural DAIC workflow:
1. Task startup gives generic todos including "Begin work on task"
2. After context gathering, AI breaks down generic todo into specific steps
3. Hook incorrectly triggers shame ritual for legitimate planning refinement

Additionally, the framework documentation never explicitly states that REPAIR tasks ARE cc-sessions tasks, leading to potential confusion about whether they should go through DAIC or be handled differently.

## Success Criteria

- [x] Create REPAIR task as proper cc-sessions task (demonstrating the pattern)
- [ ] Update `CLAUDE.md` Section 6.3 to explicitly state REPAIR tasks ARE cc-sessions tasks
- [ ] Update `CLAUDE.md` or `claude-reference.md` to define "todo refinement" vs "scope change"
- [ ] Add examples distinguishing legitimate refinements from violations
- [ ] Document when shame ritual is actually needed vs when refinement is allowed
- [ ] Optionally: Review and refine `sessions/hooks/user_messages.js` todo-change detection logic to be smarter about refinements
- [ ] Add this pattern to `context/gotchas.md` with concrete examples
- [ ] Ensure DAIC integrity remains intact while allowing natural planning evolution
- [ ] Run framework health check to verify changes work correctly

## Context Manifest

**Issue Context:**
- Observed in task `m-implement-skill-prompts`
- AI gathered context, then tried to break down "Begin work on task" into 10 specific implementation steps
- Hook blocked this as scope change, triggered shame ritual
- User correctly identified this as legitimate refinement, not violation

**Relevant Files:**
- `/Users/grandinharrison/Desktop/claude-code-projects/claude-chaos-express/CLAUDE.md` - Section 6.3 (REPAIR tasks), Section 2 (DAIC)
- `/Users/grandinharrison/Desktop/claude-code-projects/claude-chaos-express/claude-reference.md` - Supporting details
- `/Users/grandinharrison/Desktop/claude-code-projects/claude-chaos-express/sessions/hooks/user_messages.js` - Todo change detection logic
- `/Users/grandinharrison/Desktop/claude-code-projects/claude-chaos-express/Context/gotchas.md` - Where to document the pattern

## User Notes

This REPAIR task itself demonstrates the fix: it IS a cc-sessions task going through normal DAIC, showing that REPAIR tasks are just specialized tasks with framework-modification scope.

## Work Log

- [2025-11-16] Created task in response to observed hook over-enforcement issue

