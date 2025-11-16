# git-workflow-trigger

**Type:** WRITE-CAPABLE
**DAIC Modes:** IMPLEMENT only (for write operations)
**Priority:** Medium

## Trigger Reference

This skill activates on:
- **Keywords:** "commit changes", "save changes", "create commit", "git status", "show changes", "push changes", "commit this", "save work", "git commit", "push to remote", "push work"
- **Intent Patterns:** `(commit|save).*?(changes|work)`, `create.*?commit`, `(show|display|check).*(changes|status)`, `push.*?(changes|to remote|work)`

From: `skill-rules.json` - git-workflow-trigger configuration

## Purpose

Automatically trigger git commands (`/git:commit`, `/git:status`, `/git:push`) when users express git workflow intent using natural language.

## Core Behavior

1. **Git Workflow Detection**
   - Detect git operations from natural language
   - Route to appropriate git command based on intent

2. **Command Routing**
   - **Commit:** "commit changes" → `/git:commit` (IMPLEMENT mode only)
   - **Status:** "show changes" → `/git:status` (any mode)
   - **Push:** "push changes" → `/git:push` (IMPLEMENT mode only)

3. **Mode-Aware Execution**
   - Read operations (status) allowed in any mode
   - Write operations (commit, push) only in IMPLEMENT mode

## Natural Language Examples

**Triggers this skill:**
- ✓ "Commit my changes"
- ✓ "Save work and commit"
- ✓ "Show my changes"
- ✓ "Push to remote"
- ✓ "Git status"

## Safety Guardrails

**WRITE-CAPABLE RULES:**
- ✓ Only write operations in IMPLEMENT mode
- ✓ Verify active task for commits
- ✓ Read operations (status) allowed in any mode
