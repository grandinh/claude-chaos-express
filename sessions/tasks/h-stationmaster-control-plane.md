---
name: h-stationmaster-control-plane
branch: feature/h-stationmaster-control-plane
status: pending
created: 2025-11-16
priority: medium
---

# Stand Up Stationmaster Control Plane

## Problem/Goal
Coordination between Claude subagents and Cursor cloud agents is scattered across hooks and docs without a unified control surface. Build a Stationmaster control plane to declaratively route DAIC phases to agents and log runs.

## Success Criteria
- [ ] Create `stationmaster/manifest.yaml` mapping DAIC phases to Claude agents and optional Cursor cloud agents, including routing rules.
- [ ] Implement `stationmaster/control-plane.js` to read the manifest, call `sessions/bin/sessions` or Cursor webhooks, and write run logs to `stationmaster/logs/*.md`.
- [ ] Add CLI entry `npm run stationmaster:route <task-id>` and document parameters.
- [ ] Update `README.md` and `docs/agent-system-audit.md` to describe Stationmaster usage and how it brokers hybrid runs.
- [ ] Provide sample manifest and error handling notes in `Context/insights.md` or `context/decisions.md`.

## Context Manifest
- `stationmaster/manifest.yaml`
- `stationmaster/control-plane.js`
- `stationmaster/logs/`
- `sessions/bin/sessions`
- `.cursor/cloud-agents/` (webhook info)
- `docs/agent-system-audit.md`
- `README.md`
- `Context/insights.md`, `context/decisions.md`

## User Notes
- Created by a third-party AI; Claude must validate the plan, summarize benefits/risks to the user, recommend whether to proceed, and wait for explicit user permission before implementation.
- Benefit: centralized orchestration and clearer hybrid runs. Risk: manifest mistakes could dispatch the wrong agents or spam webhooks.

## Work Log
- [2025-11-16] Task authored from feature suggestions; awaiting Claude validation and user permission.
