---
name: h-breach-telemetry-ledger
branch: feature/h-breach-telemetry-ledger
status: pending
created: 2025-11-16
priority: medium
---

# Build Automated Breach Telemetry Ledger

## Problem/Goal
Incident templates capture anomaly checklists and severity, but there is no aggregated ledger to track veil integrity over time. Create an automated ledger under `/hazards` to summarize incidents and open breaches.

## Success Criteria
- [ ] Implement `scripts/anomaly-ledger.js` to parse `incidents/*.md`, extract checklist/severity/status, and generate `hazards/anomaly-ledger.md` with counts, MTTR per anomaly type, and top open breaches.
- [ ] Add `npm run anomalies:sync` to refresh the ledger during CHECK or on demand.
- [ ] Update `docs/ai_handoffs.md` to require linking the latest ledger snapshot in each handoff.
- [ ] Record the new ritual and any assumptions in `context/decisions.md` and `Context/insights.md`.
- [ ] Provide sample output and safeguards for missing or malformed incidents.

## Context Manifest
- `scripts/anomaly-ledger.js`
- `hazards/`
- `incidents/`
- `docs/ai_handoffs.md`
- `Context/insights.md`
- `context/decisions.md`

## User Notes
- Created by a third-party AI; Claude must validate the plan, summarize benefits/risks to the user, recommend whether to proceed, and wait for explicit user permission before implementation.
- Benefit: centralized breach visibility and trends. Risk: inaccurate parsing could misrepresent incident data.

## Work Log
- [2025-11-16] Task authored from feature suggestions; awaiting Claude validation and user permission.
