---
name: m-implement-artifact-lifecycle
branch: feature/m-implement-artifact-lifecycle
status: pending
created: 2025-11-16
---

# Post-Task Artifact Lifecycle Management

## Problem/Goal

The cc-sessions framework currently moves completed task manifests to `sessions/tasks/done/` but lacks a comprehensive protocol for managing the full lifecycle of task-related artifacts (spec files, planning docs, scratch notes, RFCs, etc.). This creates context bloat over time as old files accumulate without a mechanism to:

1. Clean up ephemeral Tier-3 artifacts (scratch notes, temporary files)
2. Condense/archive Tier-2 task-specific documentation
3. Extract and promote durable insights to LCMP (decisions, gotchas, patterns)
4. Maintain high-fidelity historical records while reducing active context overhead

The goal is to create a protocol that prevents bloat while preserving the system's ability to optimize itself through captured learnings.

## Success Criteria

- [ ] Create `sessions/protocols/task-completion/artifact-lifecycle.md` protocol defining:
  - Artifact discovery process (scan task context for all created/modified files)
  - Tier classification rules (Tier-1 SoT, Tier-2 task docs, Tier-3 scratch)
  - Cleanup procedures for Tier-3 ephemeral files
  - Archival procedures for Tier-2 task-specific docs
  - Decision extraction process (identify LCMP candidates from task work)
  - User approval workflow (no auto-compaction, user controls what gets promoted/deleted)

- [ ] Integrate artifact lifecycle into `sessions/protocols/task-completion/task-completion.md`
  - Add new step in CHECK phase before final archival
  - Reference the new artifact-lifecycle.md protocol
  - Ensure it runs after other completion agents but before git operations

- [ ] Update `CLAUDE.md` Section 7 (LCMP & Compaction) to reference the artifact lifecycle protocol
  - Link to the new protocol as the mechanism for LCMP promotion post-task
  - Clarify that artifact cleanup is user-controlled, not automatic

- [ ] Create example scenario in `claude-reference.md` showing:
  - A completed task with various artifact types (specs, scratch notes, RFCs)
  - The artifact review process
  - User decisions about what to keep/delete/promote
  - Final state showing cleaned context with LCMP updates

- [ ] Test the protocol with a real completed task
  - Run through the artifact lifecycle steps manually
  - Verify it prevents bloat while preserving important information
  - Document any issues or refinements needed

## Context Manifest
<!-- Added by context-gathering agent -->

## User Notes

Key design principles:
- **User-controlled**: No auto-deletion or auto-compaction; user approves all actions
- **Tier-aware**: Different handling for Tier-1 (canonical SoT), Tier-2 (task docs), Tier-3 (scratch)
- **Bloat prevention**: Clean up ephemeral artifacts that no longer serve a purpose
- **Learning extraction**: Identify and promote valuable insights to LCMP
- **Historical fidelity**: Maintain records for future reference/debugging without cluttering active context
- **Integration**: Seamlessly integrate into existing CHECK phase workflow

The protocol should balance two competing needs:
1. Keep the codebase lean and navigable
2. Preserve enough information for the system to continue optimizing itself

## Work Log
<!-- Updated as work progresses -->
- [2025-11-16] Task created after discussion about context bloat and artifact management

