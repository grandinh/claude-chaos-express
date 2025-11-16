---
name: REPAIR-agent-registry-sot
branch: feature/REPAIR-agent-registry-sot
status: pending
created: 2025-11-16
priority: high
---

# REPAIR: Restore Agent Registry Source of Truth

## Problem/Goal
`scripts/agent-registry.js` and multiple docs expect `repo_state/agent-registry.json` plus a schema, but those files are absent, causing the CLI to crash and auto-generated docs to be stale. Recreate the registry SoT and bootstrap logic so the registry pipeline works end-to-end.

## Success Criteria
- [ ] Create `repo_state/agent-registry-schema.json` describing the registry structure and validation rules.
- [ ] Generate an initial `repo_state/agent-registry.json` from `.claude/agents/**` and `.cursor/cloud-agents/*.json`, capturing IDs, categories, automation flags, and links.
- [ ] Update `scripts/agent-registry.js` to bootstrap when missing (e.g., `node scripts/agent-registry.js init`) and to fail gracefully with actionable messaging.
- [ ] Regenerate auto-generated sections in `docs/agent-system-audit.md` and `docs/claude-cursor-agent-alignment.md` from the registry, documenting the command used.
- [ ] Add a `node scripts/agent-registry.js validate` command and record the SoT decision in `context/decisions.md`.

## Context Manifest
- `scripts/agent-registry.js`
- `.claude/agents/**`
- `.cursor/cloud-agents/**`
- `docs/agent-system-audit.md`
- `docs/claude-cursor-agent-alignment.md`
- `repo_state/metadata.json`

## User Notes
- Created by a third-party AI; Claude must validate the plan, summarize benefits/risks to the user, recommend whether to proceed, and wait for explicit user permission before implementation.
- Benefit: unblocks registry CLI and keeps agent docs truthful. Risk: schema mistakes could freeze automation or misreport agent metadata.

## Work Log
- [2025-11-16] Task authored during audit; awaiting Claude validation and user permission.
