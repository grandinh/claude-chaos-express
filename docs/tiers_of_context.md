---
title: Tiers of Context
summary: File hierarchy and protection rules (Tier-0/1/2/3)
tier: 2
tags: [context, hierarchy, protection, sot, tiers]
last_updated: 2025-11-15
---

# Tiers of Context

This document defines the file hierarchy and protection rules for the repository.

## Tier-0 (Protected)

These files define core agent behavior and framework rules. Do not modify without explicit user permission.

- `CLAUDE.md`
- `claude-reference.md`
- `CURSOR.md` (legacy, kept for reference)
- `.cursor/rules/*.mdc` (active Cursor rules)
- `.claude/AGENTS.md` (if present)
- `.claude/METASTRATEGY.md` (if present)
- `sessions/CLAUDE.sessions.md`

## Tier-1 (Project Intent)

These files capture the vision, goals, and high-level decisions. Used for reasoning and decision-making.

- `docs/original_vision.md`
- `docs/project_goals.md`
- `Context/Features/*.md`
- LCMP files:
  - `Context/decisions.md` (if present)
  - `Context/insights.md` (if present)
  - `Context/gotchas.md` (if present)
  - `Context/progress.md` (if present)

## Tier-2 (Operational Context)

These files support day-to-day agent operations. Safe for agent read/write as part of workflows.

- `docs/ai_handoffs.md`
- `docs/agent_bridge_protocol.md`
- `docs/tiers_of_context.md`
- `docs/**/*.md` (task-specific docs)
- `sessions/tasks/**/*.md` (cc-sessions manifests)
- `repo_state/metadata.json`

## Tier-3 (Scratch / Temporary)

Ephemeral files safe to create, modify, or delete. Not treated as long-term truth.

- `scratch/**`
- `notes/**`
- `tmp/**`
- Any files explicitly marked as temporary

## Protection Rules

### For Cursor

- Read-only: Tier-0, Tier-1 (unless explicitly instructed)
- Read-write: Tier-2, Tier-3
- Always maintain: `repo_state/metadata.json`

### For Claude Code

- Read-only: Tier-0 (unless in a REPAIR- task)
- Careful edits: Tier-1 (only with clear justification and Issue/manifest)
- Read-write: Tier-2, Tier-3
- Respect cc-sessions DAIC discipline for all writes

