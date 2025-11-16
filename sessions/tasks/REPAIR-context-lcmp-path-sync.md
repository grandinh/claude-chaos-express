---
name: REPAIR-context-lcmp-path-sync
branch: feature/REPAIR-context-lcmp-path-sync
status: pending
created: 2025-11-16
priority: high
---

# REPAIR: Align LCMP Path Case Across Framework

## Problem/Goal
Tier-1 docs and health checks reference lowercase `context/` paths, but the repository uses `Context/`, causing alignment checks to flag missing SoT and any automation keyed to lowercase paths to fail. Normalize casing and references so LCMP files are reliably detected on case-sensitive systems.

## Success Criteria
- [ ] Inventory all references to `context/` or `Context/` across docs, scripts, and settings, and select a single canonical casing (prefer `context/`).
- [ ] Rename the directory via `git mv` to the canonical casing and update all references accordingly (docs, scripts, hooks, templates).
- [ ] Rerun `scripts/check-claude-cursor-alignment.sh` or equivalent to confirm LCMP files are detected without case-related errors.
- [ ] Record the casing decision and any fallout in LCMP docs (`context/decisions.md`, `context/gotchas.md`).
- [ ] Capture before/after notes showing the error disappeared after the rename.

## Context Manifest
- `CLAUDE.md`
- `claude-reference.md`
- `scripts/check-claude-cursor-alignment.sh`
- `Context/` directory and all LCMP files
- `.claude/settings.json` references to `Context/Scripts/*`

## User Notes
- Created by a third-party AI; Claude must validate the plan, summarize benefits/risks to the user, recommend whether to proceed, and wait for explicit user permission before implementation.
- Primary benefit: restores LCMP SoT detection and eliminates false negatives in health checks. Primary risk: casing renames can break paths for existing scripts or clones until updated.

## Work Log
- [2025-11-16] Task authored during audit; awaiting Claude validation and user permission.
