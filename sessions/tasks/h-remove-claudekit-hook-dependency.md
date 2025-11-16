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

## Work Log
- [2025-11-16] Task authored during audit; awaiting Claude validation and user permission.
