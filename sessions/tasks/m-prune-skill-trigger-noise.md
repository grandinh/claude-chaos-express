---
name: m-prune-skill-trigger-noise
branch: feature/m-prune-skill-trigger-noise
status: pending
created: 2025-11-16
priority: medium
---

# Prune Workflow-Trigger Skill Noise

## Problem/Goal
Nine workflow-trigger skills auto-fire despite only rephrasing slash commands, adding token load without guardrail value. Trim or demote them to keep auto-triggered skills meaningful.

## Success Criteria
- [ ] Audit `.claude/skills/skill-rules.json` for workflow-trigger skills and gather any available usage evidence.
- [ ] For each, choose delete, manual-only, or merge into a richer guardrail skill; update rules accordingly with valid JSON.
- [ ] Ensure remaining skills have clean `daicMode.allowedModes` and non-overlapping triggers; validate JSON via Node one-liner.
- [ ] Update `CLAUDE.md` Section 4 and `Context/insights.md` to reflect the leaner skill set.
- [ ] Add a note or lightweight script describing how to monitor skill usage going forward.

## Context Manifest
- `.claude/skills/skill-rules.json`
- `.claude/skills/*.md`
- `CLAUDE.md` Section 4
- `Context/insights.md`

## User Notes
- Created by a third-party AI; Claude must validate the plan, summarize benefits/risks to the user, recommend whether to proceed, and wait for explicit user permission before implementation.
- Benefit: reduces auto-trigger noise and token waste. Risk: removing triggers could hide useful workflows if misclassified.

## Work Log
- [2025-11-16] Task authored during audit; awaiting Claude validation and user permission.
