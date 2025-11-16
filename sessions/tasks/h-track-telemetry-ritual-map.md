---
name: h-track-telemetry-ritual-map
branch: feature/h-track-telemetry-ritual-map
status: pending
created: 2025-11-16
priority: medium
---

# Summon Track Telemetry & Ritual Map

## Problem/Goal
README hints at `/tracks` and Track 7 rituals but offers no telemetry on route health; operators must manually parse incidents to infer breaches. Build a manifest-driven track map and telemetry to surface state at a glance.

## Success Criteria
- [ ] Create `tracks/trackmap.schema.json` and canonical `tracks/trackmap.yaml` listing routes (1-6, Track 7) with glyphs, owners, DAIC states.
- [ ] Implement `scripts/track-telemetry.js` to parse the manifest, `sessions/sessions-state.json`, `docs/ai_handoffs.md`, and `incidents/*.md`, emitting `tracks/status.json` with health metrics.
- [ ] Add `npm run tracks:scan` and wire `sessions/statusline.js` (or equivalent) to display top-line telemetry (e.g., 🔥 Track 7 Breaching).
- [ ] Update `README.md` and `Context/insights.md` with regeneration steps and interpretation guidance for the ritual map.
- [ ] Include sample output and guardrails for when sources are missing; document in `context/decisions.md` if telemetry assumptions change.

## Context Manifest
- `tracks/` directory
- `scripts/track-telemetry.js`
- `sessions/sessions-state.json`
- `docs/ai_handoffs.md`
- `incidents/`
- `sessions/statusline.js`
- `Context/insights.md`, `context/decisions.md`, `README.md`

## User Notes
- Created by a third-party AI; Claude must validate the plan, summarize benefits/risks to the user, recommend whether to proceed, and wait for explicit user permission before implementation.
- Benefit: fast visibility into Track 7 and route health. Risk: telemetry may mislead if parsing heuristics are wrong or sources are incomplete.

## Work Log
- [2025-11-16] Task authored from feature suggestions; awaiting Claude validation and user permission.
