# cc-sessions Protocol Version Registry

**Purpose:** Centralized tracking of all cc-sessions protocol versions and last updated dates. Used for drift detection and ensuring Cursor rules stay synchronized with protocol changes.

**Last Registry Update:** 2025-11-17

---

## Core Protocols

| Protocol Name | File Path | Version | Last Updated | Applies To |
|--------------|-----------|---------|--------------|------------|
| task-completion | `sessions/protocols/task-completion/task-completion.md` | 1.0 | 2025-11-16 | Claude Code, Cursor (adapted) |
| task-creation | `sessions/protocols/task-creation/task-creation.md` | 1.0 | 2025-11-17 | Claude Code, Cursor (when creating tasks) |
| task-startup | `sessions/protocols/task-startup/task-startup.md` | 1.0 | 2025-11-17 | Claude Code |
| context-compaction | `sessions/protocols/context-compaction/context-compaction.md` | 1.0 | 2025-11-16 | Claude Code, Cursor (for LCMP guidance) |

---

## Protocol Change Propagation

When a protocol is updated:

1. Update the protocol file's frontmatter with new version and `last_updated` date
2. Update this registry with the new version and date
3. Assess if the change affects Cursor coordination (see `docs/claude-cursor-alignment.md`)
4. If YES: Update Cursor rules (`.cursor/rules/cursor-agent-operating-spec.mdc`) with new protocol reference
5. Run drift detection (`scripts/check-claude-cursor-alignment.sh`) to verify sync
6. Document the change in `context/decisions.md`

---

## Version History

### 2025-11-17
- Initial version registry created
- All protocols set to version 1.0
- Protocol version tracking system established

---

## Notes

- Protocol versions follow semantic versioning (major.minor.patch)
- Breaking changes increment major version
- Non-breaking additions increment minor version
- Bug fixes increment patch version
- Cursor rules must reference current protocol versions
- Drift detection validates protocol synchronization

