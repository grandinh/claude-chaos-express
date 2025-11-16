---
name: m-reconcile-task-reference-drift
branch: feature/m-reconcile-task-reference-drift
status: pending
created: 2025-11-16
priority: medium
---

# Reconcile Task References with Reality

## Problem/Goal
Docs and handoffs reference task manifests that do not exist, leading future sessions to dead ends. Clean up references or create stubs so DAIC flows stay grounded.

## Success Criteria
- [ ] Scan the repo for `sessions/tasks/` references and compare against actual files, categorizing each as existing, remove, or stub-needed.
- [ ] For missing-but-needed tasks, create minimal stubs; for stale references, update docs to point to valid manifests.
- [ ] Add a validation script (Node/Bash) that fails when docs reference nonexistent manifests; document how to run it.
- [ ] Update `docs/ai_handoffs.md`, `CLAUDE.md`, and other touched docs to reflect reconciled references.
- [ ] Record outcomes and validation steps in `context/decisions.md`.

## Context Manifest
- `docs/ai_handoffs.md`
- `CLAUDE.md`
- `claude-reference.md`
- `sessions/tasks/` tree
- New validation script path (e.g., `scripts/validate-task-references.js`)

## User Notes
- Created by a third-party AI; Claude must validate the plan, summarize benefits/risks to the user, recommend whether to proceed, and wait for explicit user permission before implementation.
- Benefit: prevents handoffs from pointing to nowhere. Risk: creating unnecessary stubs if references are misinterpreted.

## Work Log
- [2025-11-16] Task authored during audit; awaiting Claude validation and user permission.
