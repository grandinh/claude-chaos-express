---
name: h-vision-codex-progress-ledger
branch: feature/h-vision-codex-progress-ledger
status: pending
created: 2025-11-16
priority: medium
---

# Author Vision Codex and LCMP Progress Ledger

## Problem/Goal
Tier-1/Tier-2 references call for `docs/original_vision.md`, `docs/project_goals.md`, and `context/progress.md`, but these SoT documents are missing. Create them to anchor vision and measurable progress.

## Success Criteria
- [ ] Draft `docs/original_vision.md` capturing lore and practical goals; draft `docs/project_goals.md` for current-year objectives tied to cc-sessions metrics.
- [ ] Create `context/progress.md` summarizing velocity, track health, and outstanding rituals using data from `sessions/sessions-state.json` and telemetry scripts.
- [ ] Update `docs/sot-reference-map.md`, `CLAUDE.md`, and `Context.md` to register these as Tier-1/Tier-2 sources.
- [ ] Link the documents into `Context/Backlog` workflows so Cursor and Claude load the same vision during prioritization.
- [ ] Note assumptions and maintenance cadence in `context/decisions.md` or `Context/insights.md`.

## Context Manifest
- `docs/original_vision.md`
- `docs/project_goals.md`
- `context/progress.md`
- `docs/sot-reference-map.md`
- `CLAUDE.md`
- `Context.md`
- `Context/Backlog/*`
- `context/decisions.md`, `Context/insights.md`
- `sessions/sessions-state.json` and telemetry outputs

## User Notes
- Created by a third-party AI; Claude must validate the plan, summarize benefits/risks to the user, recommend whether to proceed, and wait for explicit user permission before implementation.
- Benefit: establishes missing vision SoT and measurable progress ledger. Risk: duplicating philosophy already covered elsewhere or creating stale documents if not maintained.

## Work Log
- [2025-11-16] Task authored from feature suggestions; awaiting Claude validation and user permission.
