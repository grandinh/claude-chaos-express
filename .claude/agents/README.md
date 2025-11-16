# Agent Quick Reference

**For complete documentation, see:** [repo_state/README.md](../../repo_state/README.md)

This directory contains project-level Claude Code subagents tracked by the agent registry system.

## Quick Commands

```bash
# Check for duplicates before creating
node scripts/agent-registry.js check <agent-name>

# Create new agent
node scripts/agent-registry.js create claude --name <name> --category <category>

# Sync registry after editing agent files
node scripts/agent-registry.js sync

# Update documentation
node scripts/agent-registry.js generate-docs

# Deprecate agent (30-day grace period)
node scripts/agent-registry.js warn <agent> --reason "<reason>"

# Archive agent (after grace period)
node scripts/agent-registry.js archive <agent>
```

## Common Workflows

### Creating a New Agent

```bash
# 1. Check for duplicates
node scripts/agent-registry.js check my-new-agent

# 2. Create agent file + registry entry
node scripts/agent-registry.js create claude --name my-new-agent --category tools

# 3. Edit the generated file
vim .claude/agents/my-new-agent.md

# 4. Re-sync to update metadata
node scripts/agent-registry.js sync

# 5. Update documentation
node scripts/agent-registry.js generate-docs
```

### Linking to a Cloud Agent

```bash
# Link this Claude agent to a Cloud Agent for automation
node scripts/agent-registry.js link service-documentation doc-sync
```

### Deprecating an Agent

```bash
# 1. Start 30-day grace period
node scripts/agent-registry.js warn old-agent --reason "Replaced by new-agent"

# 2. Wait for grace period to expire (30 days)

# 3. Archive the agent
node scripts/agent-registry.js archive old-agent
```

## Agent Lifecycle

**Active** → **Deprecated** (30 days) → **Archived**

- **Active:** Fully operational, appears in documentation
- **Deprecated:** Still works with warnings, 30-day grace period for migration
- **Archived:** Removed from registry, moved to `archive/` directory

See [repo_state/README.md](../../repo_state/README.md#agent-lifecycle-state-machine) for detailed lifecycle documentation.

## Registry Files

- **Registry:** `repo_state/agent-registry.json`
- **Schema:** `repo_state/agent-registry-schema.json`
- **Management Script:** `scripts/agent-registry.js`
- **Archive:** `.claude/agents/archive/`

## Documentation

The registry auto-generates documentation blocks in:
- `docs/agent-system-audit.md` (3 blocks)
- `docs/claude-cursor-agent-alignment.md` (2 blocks)

Run `node scripts/agent-registry.js generate-docs` after any agent changes.

## Complete Reference

**See [repo_state/README.md](../../repo_state/README.md) for:**
- Complete lifecycle state machine
- CLI command reference
- Duplicate detection details
- Schema documentation
- Workflow examples
- Integration with documentation system
- Troubleshooting and maintenance

**See [scripts/README.md](../../scripts/README.md) for:**
- Detailed command documentation
- Test suite information
- Development guidelines
- Error handling
