# Archived Agents

This directory contains agents that have been deprecated and archived after their 30-day grace period.

## Archive Purpose

Archived agents are:
- **Removed from the active registry** (`repo_state/agent-registry.json`)
- **No longer operational** (not loaded by Claude Code)
- **Preserved for historical reference** (audit trail, learning from past decisions)
- **Excluded from documentation** (not in agent catalogs or mapping tables)

## File Naming Convention

Archived agent files follow this naming pattern:

```
{agent-name}-deprecated-YYYY-MM-DD.md
```

**Example:** `old-agent-deprecated-2025-11-16.md`

**Components:**
- `{agent-name}` - Original agent ID (kebab-case)
- `deprecated` - Fixed keyword indicating archived status
- `YYYY-MM-DD` - ISO 8601 date when agent was deprecated (NOT archived)

**Why deprecation date, not archive date?**
- The deprecation date marks when the 30-day grace period started
- Provides audit trail of when users were first notified
- Archive date can be inferred (deprecation date + 30 days)

## Archive Process

Agents are archived using the CLI command:

```bash
# After 30-day grace period expires
node scripts/agent-registry.js archive <agent>
```

**Automated Steps:**
1. Validates that `deprecated_until` date has passed (enforces grace period)
2. Removes agent from `repo_state/agent-registry.json`
3. Moves file from `.claude/agents/` to `.claude/agents/archive/`
4. Renames file with deprecation date suffix
5. Updates documentation (removes from catalogs)

## Relationship to Registry

**Active Agents:**
- Tracked in `repo_state/agent-registry.json`
- Files in `.claude/agents/`
- Appear in documentation

**Deprecated Agents:**
- Still tracked in `repo_state/agent-registry.json` (with `deprecated: true`)
- Files remain in `.claude/agents/` during grace period
- Appear in documentation with deprecation notice
- Cannot be archived until `deprecated_until` date passes

**Archived Agents:**
- **Removed** from `repo_state/agent-registry.json`
- Files moved to `.claude/agents/archive/` with dated suffix
- **Not** in documentation
- Preserved for historical reference only

## Retrieving Archived Agents

If you need to restore an archived agent:

```bash
# 1. Find the archived file
ls -la .claude/agents/archive/

# 2. Copy to active directory and remove date suffix
cp .claude/agents/archive/old-agent-deprecated-2025-11-16.md .claude/agents/old-agent.md

# 3. Re-sync registry
node scripts/agent-registry.js sync

# 4. Update documentation
node scripts/agent-registry.js generate-docs
```

**Note:** Restoring an archived agent creates a **new** registry entry. The original deprecation metadata is not restored.

## Audit Trail

This archive serves as an audit trail for:
- **Decision tracking** - Why was the agent deprecated?
- **Migration patterns** - What replaced it?
- **Learning** - What worked? What didn't?
- **Compliance** - Historical record of system changes

The deprecation date in the filename provides a clear timeline for when decisions were made.

## Maintenance

**No cleanup required** - Archived files are kept indefinitely for historical reference.

**Size monitoring** - If the archive grows too large, consider:
- Compressing old archives (`.tar.gz`)
- Moving very old archives to external storage
- Documenting lessons learned in `context/insights.md` and removing redundant files

## Related Files

- **Active Agents:** `.claude/agents/`
- **Registry:** `repo_state/agent-registry.json`
- **System Documentation:** `repo_state/README.md`
- **Operator Reference:** `.claude/agents/README.md`
- **Archive Command:** `scripts/agent-registry.js` (`archive` subcommand)

## Examples

### Example Archive Entry

**Filename:** `old-service-doc-deprecated-2025-11-16.md`

**Original deprecation (in registry before archiving):**
```json
{
  "id": "old-service-doc",
  "deprecated": true,
  "deprecatedAt": "2025-11-16T10:00:00.000Z",
  "deprecationReason": "Replaced by service-documentation with improved workflow",
  "deprecated_until": "2025-12-16"
}
```

**After archiving:**
- Entry removed from registry
- File moved to archive with deprecation date in filename
- Documentation updated to remove references

### Timeline Example

```
2025-11-16: Agent deprecated (warn command)
            - deprecated: true
            - deprecated_until: "2025-12-16"
            - File remains in .claude/agents/

2025-11-17 to 2025-12-15: Grace period (30 days)
                          - Agent still works
                          - Deprecation warnings shown
                          - Users migrate to replacement

2025-12-16: Grace period expires
            - archive command now allowed

2025-12-17: Agent archived
            - Removed from registry
            - File moved to archive/
            - Renamed: old-agent-deprecated-2025-11-16.md
```

## Support

For questions or issues with the archive system, see:
- **Complete documentation:** `repo_state/README.md`
- **CLI reference:** `scripts/README.md`
- **GitHub Issue:** #1 (https://github.com/grandinh/claude-chaos-express/issues/1)
