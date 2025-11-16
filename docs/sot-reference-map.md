# Source of Truth (SoT) Reference Map

**Purpose:** Document which files are shared SoT between Claude Code and Cursor Agent, which are system-specific, and verify alignment.

**Last Updated:** 2025-01-20
**Task:** h-align-claude-cursor-systems

---

## Shared SoT Files

These files are referenced by BOTH Claude Code (`CLAUDE.md`) and Cursor Agent (`.cursor/rules/cursor-agent-operating-spec.mdc`) and must remain aligned.

### Framework Core (Tier-1 Canonical)

| File | Status | Referenced By | Purpose |
|------|--------|---------------|---------|
| `CLAUDE.md` | ✓ Exists | Both (Cursor reads it) | Claude Code operator spec, framework rules |
| `claude-reference.md` | ✓ Exists | Both (Cursor reads it) | Detailed Claude Code reference, protocols, examples |

### Architecture & Standards (Tier-1 Canonical)

| File | Status | Referenced By | Purpose |
|------|--------|---------------|---------|
| `AGENTS.md` | ✗ Missing | Both | Agent roles and responsibilities (optional) |
| `METASTRATEGY.md` | ✗ Missing | Both | High-level strategy and meta-patterns (optional) |
| `IMPLEMENTATION_GUIDE.md` | ✗ Missing | Both | Implementation guidelines (optional) |
| `docs/ARCHITECTURE.md` | ✗ Missing | Cursor | Architecture documentation (optional) |
| `docs/AI_WORKFLOWS.md` | ✗ Missing | Cursor | AI workflow documentation (optional) |

### LCMP Files (Tier-1 Canonical)

| File | Status | Referenced By | Purpose |
|------|--------|---------------|---------|
| `context/decisions.md` | ✓ Exists | Both | Decisions + rationale, skill assessments |
| `context/insights.md` | ✓ Exists | Both | Patterns and learnings |
| `context/gotchas.md` | ✓ Exists | Both | Pitfalls, failure modes, edge cases |
| `context/progress.md` | ✗ Missing | Cursor | Progress tracking (optional) |

### Operational Context (Tier-2)

| File | Status | Referenced By | Purpose |
|------|--------|---------------|---------|
| `docs/ai_handoffs.md` | ✓ Exists | Both (REQUIRED) | AI agent handoff log (structured YAML) |
| `docs/agent_bridge_protocol.md` | ✓ Exists | Cursor | Inter-agent coordination protocol |
| `docs/tiers_of_context.md` | ✓ Exists | Cursor | File hierarchy and protection rules |

---

## Claude-Specific Files

These files are used exclusively by Claude Code and cc-sessions. Cursor may read them for context but must NOT modify them.

### Framework Files (Tier-0/Tier-1)

| File | Status | Referenced By | Purpose |
|------|--------|---------------|---------|
| `COMMANDS.md` | ✗ Missing | Claude only | Command definitions (optional) |
| `HOOKS.md` | ✗ Missing | Claude only | Hook system documentation (optional) |
| `sessions/sessions-state.json` | ✓ Exists | Claude only | cc-sessions state persistence |
| `.claude/**` | Directory | Claude only | Claude Code configuration, agents, skills, hooks |

### Vision & Goals (Tier-1)

| File | Status | Referenced By | Purpose |
|------|--------|---------------|---------|
| `docs/original_vision.md` | ✗ Missing | Claude only | Original project vision (optional) |
| `docs/project_goals.md` | ✗ Missing | Claude only | Project goals and objectives (optional) |

### Task Management (Tier-2)

| File | Status | Referenced By | Purpose |
|------|--------|---------------|---------|
| `docs/tasks/*.md` | Directory | Claude only | Task-specific documentation |
| `sessions/tasks/*.md` | Directory | Claude only | cc-sessions task manifests |
| `docs/rfcs/*.md` | Directory | Claude only | Request for Comments documents |

---

## Cursor-Specific Files

These files are used exclusively by Cursor Agent. Claude may read them for context but should generally not modify them.

### Editor Configuration

| File | Status | Referenced By | Purpose |
|------|--------|---------------|---------|
| `.cursor/**` | Directory | Cursor only | Cursor editor settings and rules |
| `.cursor/rules/*.mdc` | Directory | Cursor only | Cursor rule files (MDC format) |
| `.vscode/**` | Directory | Cursor only | VS Code settings |
| `CURSOR.md` | ✓ Exists (legacy) | Reference only | Legacy Cursor spec (migrated to `.cursor/rules/`) |

---

## Reference Alignment Status

### ✅ Aligned References

1. **Handoff Log Path**
   - CLAUDE.md: Not explicitly mentioned (relies on handoff protocol)
   - Cursor rule: `@docs/ai_handoffs.md` ✓
   - CURSOR.md (legacy): `docs/ai_handoffs.md` ✓
   - agent_bridge_protocol.md: `docs/ai_handoffs.md` ✓
   - **Status:** All aligned to `docs/ai_handoffs.md`

2. **LCMP Files**
   - CLAUDE.md: `context/decisions.md`, `context/insights.md`, `context/gotchas.md` ✓
   - Cursor rule: `@context/decisions.md`, `@context/insights.md`, `@context/gotchas.md`, `@context/progress.md` ✓
   - **Status:** Aligned (Cursor references optional `progress.md`)

3. **Framework Core**
   - CLAUDE.md: `claude.md`, `claude-reference.md` ✓
   - Cursor rule: `@CLAUDE.md`, `@claude-reference.md` ✓
   - **Status:** Aligned (case difference is acceptable)

### ⚠️ Optional Files (Referenced but Missing)

These files are referenced but don't exist. This is acceptable - they're optional files that can be created if needed:

- `AGENTS.md` - Agent roles and responsibilities
- `COMMANDS.md` - Command definitions
- `HOOKS.md` - Hook system documentation
- `METASTRATEGY.md` - High-level strategy
- `IMPLEMENTATION_GUIDE.md` - Implementation guidelines
- `docs/ARCHITECTURE.md` - Architecture documentation
- `docs/AI_WORKFLOWS.md` - AI workflow documentation
- `docs/original_vision.md` - Original project vision
- `docs/project_goals.md` - Project goals
- `context/progress.md` - Progress tracking

### ✅ No Discrepancies Found

All paths that reference actual existing files are correctly aligned between systems.

---

## Maintenance Rules

### When Adding New SoT Files

1. **Shared SoT Files** (Both systems should reference):
   - Add to this map under "Shared SoT Files"
   - Update both CLAUDE.md and Cursor rule if relevant
   - Ensure paths match exactly (case-sensitive)
   - Document purpose and tier classification

2. **Claude-Only Files**:
   - Add to this map under "Claude-Specific Files"
   - Only reference in CLAUDE.md
   - Cursor may read for context but not modify

3. **Cursor-Only Files**:
   - Add to this map under "Cursor-Specific Files"
   - Only reference in Cursor rule
   - Claude may read for context but not modify

### When Renaming or Moving Files

1. Update ALL references in:
   - CLAUDE.md
   - claude-reference.md
   - .cursor/rules/cursor-agent-operating-spec.mdc
   - CURSOR.md (legacy)
   - Any protocol documents (agent_bridge_protocol.md, etc.)
2. Update this map
3. Test that both systems can still access the file
4. Document the change in `context/decisions.md`

### Validation Checklist

Before releasing framework updates:

- [ ] All referenced files exist or are documented as optional
- [ ] Paths match exactly between CLAUDE.md and Cursor rule
- [ ] Handoff log path is consistent across all systems
- [ ] LCMP file references are aligned
- [ ] This map is up to date
- [ ] No orphaned references (files referenced but deleted)

---

## Change Log

### 2025-01-20
- **Initial SoT reference map created**
- Audited CLAUDE.md and Cursor rule for all file references
- Verified existence of all referenced files
- Documented alignment status: All paths aligned, no discrepancies
- Identified optional files that are referenced but don't exist (acceptable)
- Established maintenance rules for keeping systems aligned
