# cc-sessions Protocol Reference Guide

**Purpose:** Quick reference guide for all cc-sessions protocols, their versions, applicability to Cursor vs Claude, and last sync status.

**Last Updated:** 2025-11-17

---

## Quick Reference Table

| Protocol | Version | Last Updated | Applies To | Cursor Adaptation |
|----------|---------|--------------|------------|------------------|
| **task-completion** | 1.0 | 2025-11-16 | Claude Code, Cursor | Section 4.2 of Cursor rules |
| **task-creation** | 1.0 | 2025-11-17 | Claude Code, Cursor | When creating tasks for Claude |
| **task-startup** | 1.0 | 2025-11-17 | Claude Code | Reference only |
| **context-compaction** | 1.0 | 2025-11-16 | Claude Code, Cursor | For LCMP guidance |

---

## Protocol Details

### task-completion

**File:** `sessions/protocols/task-completion/task-completion.md`  
**Version:** 1.0  
**Last Updated:** 2025-11-16

**Applies To:**
- **Claude Code**: Full protocol execution (code-review, logging, service-documentation agents)
- **Cursor**: Adapted version in Section 4.2 of Cursor rules (pre-completion checks, code review task creation, documentation updates, handoff entry, git operations)

**Key Steps:**
1. Pre-completion checks
2. Code review (via agent for Claude, task creation for Cursor)
3. Documentation updates
4. LCMP compaction (optional)
5. Task archival
6. Git operations

**Cursor Reference:** `.cursor/rules/cursor-agent-operating-spec.mdc` Section 4.2

---

### task-creation

**File:** `sessions/protocols/task-creation/task-creation.md`  
**Version:** 1.0  
**Last Updated:** 2025-11-17

**Applies To:**
- **Claude Code**: Full protocol execution
- **Cursor**: When creating tasks for Claude Code to execute

**Key Steps:**
1. Determine task priority
2. Create task file from template
3. Populate frontmatter
4. Add task description and success criteria
5. Leave Context Manifest empty (Claude will populate)

**Cursor Reference:** `.cursor/rules/cursor-agent-operating-spec.mdc` Section 1.5

---

### task-startup

**File:** `sessions/protocols/task-startup/task-startup.md`  
**Version:** 1.0  
**Last Updated:** 2025-11-17

**Applies To:**
- **Claude Code**: Full protocol execution
- **Cursor**: Reference only (understanding how tasks begin)

**Key Steps:**
1. Check git status
2. Load task file
3. Verify context manifest exists
4. Initialize state
5. Begin DAIC workflow

**Cursor Reference:** `.cursor/rules/cursor-agent-operating-spec.mdc` Section 1.5 (reference only)

---

### context-compaction

**File:** `sessions/protocols/context-compaction/context-compaction.md`  
**Version:** 1.0  
**Last Updated:** 2025-11-16

**Applies To:**
- **Claude Code**: Full protocol execution
- **Cursor**: For LCMP compaction guidance (suggest only, never auto-compact)

**Key Steps:**
1. Analyze task context for durable information
2. Categorize candidates for LCMP files
3. Present recommendations
4. Wait for user confirmation
5. Perform compaction if approved

**Cursor Reference:** `.cursor/rules/cursor-agent-operating-spec.mdc` Section 4.2 (documentation updates)

---

## Version Tracking

**Registry:** `sessions/protocols/PROTOCOL-VERSIONS.md`

All protocol versions are tracked in the centralized registry. When protocols change:
1. Protocol file frontmatter is updated
2. Registry is updated
3. Cursor rules are updated if change affects coordination
4. Drift detection validates synchronization

---

## Protocol Change Propagation

When a protocol is updated, follow the procedure in `docs/claude-cursor-alignment.md` Section "Type 8: Protocol Changes":

1. Update protocol file with new version
2. Update `sessions/protocols/PROTOCOL-VERSIONS.md`
3. Assess if change affects Cursor coordination
4. If YES: Update Cursor rules
5. Run drift detection
6. Document in `context/decisions.md`

---

## Drift Detection

The drift detection script (`scripts/check-claude-cursor-alignment.sh`) validates:
- Protocol files exist and have version frontmatter
- Cursor rules reference key protocols
- Protocol versions are tracked in registry
- Cursor rules have explicit SOP declaration

Run monthly or when protocols change:
```bash
./scripts/check-claude-cursor-alignment.sh
```

---

## Related Documentation

- **Protocol Versions Registry:** `sessions/protocols/PROTOCOL-VERSIONS.md`
- **Alignment Procedures:** `docs/claude-cursor-alignment.md`
- **Cursor Rules:** `.cursor/rules/cursor-agent-operating-spec.mdc`
- **Claude Framework:** `CLAUDE.md` Section 5
- **Drift Detection:** `scripts/check-claude-cursor-alignment.sh`

---

## Changelog

### 2025-11-17
- Initial protocol reference guide created
- All protocols documented with versions and applicability
- Version tracking system established
- Drift detection enhanced with protocol checks

