---
name: h-rightsize-contextkit-footprint
branch: feature/h-rightsize-contextkit-footprint
status: pending
created: 2025-11-16
priority: high
---

# Right-Size ContextKit Hooks for Node.js

## Problem/Goal
Current ContextKit scripts target Swift/macOS (SwiftFormat) and attempt remote `git pull` updates, which are irrelevant to this Node.js repo and brittle offline. Replace or disable these scripts to match project needs.

## Success Criteria
- [ ] Swap `Context/Scripts/AutoFormat.sh` for a Node-friendly formatter (Prettier/ESLint) or disable with explicit comments and hook guards.
- [ ] Rework `Context/Scripts/VersionStatus.sh` to avoid remote pulls by default; optionally gate updates behind an env flag while providing local version info.
- [ ] Update `.claude/settings.json` to use the new scripts or skip them, ensuring PostToolUse/SessionStart run without missing tooling.
- [ ] Refresh `Context.md` and `Context/insights.md` to describe the new, slimmer integration and remove Swift-specific claims.
- [ ] Document the change and any opt-in flags in LCMP decisions/gotchas; verify PostToolUse succeeds in a Node-only environment.

## Context Manifest
- `Context/Scripts/AutoFormat.sh`
- `Context/Scripts/VersionStatus.sh`
- `.claude/settings.json`
- `Context.md`
- `Context/insights.md`
- `context/decisions.md`
- Formatter configs (Prettier/ESLint)

## User Notes
- Created by a third-party AI; Claude must validate the plan, summarize benefits/risks to the user, recommend whether to proceed, and wait for explicit user permission before implementation.
- Benefit: removes irrelevant tooling and reduces hook failures. Risk: loss of auto-formatting if not replaced; potential divergence from upstream ContextKit behavior.

## Work Log
- [2025-11-16] Task authored during audit; awaiting Claude validation and user permission.
