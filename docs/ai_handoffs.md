---
title: AI Handoffs Log
summary: Agent coordination YAML entries (Cursor ↔ Claude)
tier: 2
schema: from/to/next
schema_version: "1.0"
tags: [handoff, coordination, yaml, cursor, claude]
last_updated: 2025-11-15
---

# AI Handoffs Log

This file records structured handoffs between Cursor and Claude Code.

## Division of Labor Principle

**Cursor**: Specs, plans, design documents, small edits
**Claude Code**: Large feature builds, complex implementations, multi-file changes

### When to Use Cursor
- Writing specifications and design documents
- Creating plans and architecture diagrams
- Small, localized edits (1-2 files)
- Quick refactors with clear scope
- Documentation updates

### When to Use Claude Code
- Implementing complex features (3+ files)
- Multi-step workflows requiring DAIC discipline
- Tasks requiring extensive context gathering
- Features with testing, validation, and iteration cycles
- Anything requiring write-gating and cc-sessions task management

## Cursor → Claude Code Handoff Pattern

When Cursor creates a plan or spec for a large feature:

1. **Create cc-sessions Task Manifest**
   - File: `sessions/tasks/[priority]-[task-name].md`
   - Frontmatter: name, branch, status (open), created date
   - Include task description and success criteria
   - Reference the original Cursor plan/spec as a resource
   - Leave "Context Manifest" section empty

2. **Invoke Context-Gathering Agent**
   - Claude Code should use the context-gathering agent on the new task
   - Agent will populate the context manifest with comprehensive information
   - This follows the standard task-creation protocol

3. **Execute in Claude Code**
   - Use DAIC workflow (DISCUSS → ALIGN → IMPLEMENT → CHECK)
   - Follow cc-sessions discipline with approved todos
   - Respect write-gating and mode transitions

## Handoff Entry Schema

```yaml
schema_version: "1.0"
timestamp: ISO-8601
from: claude|cursor
to: claude|cursor
issue_id: <GitHub Issue number or "none">
branch: <current branch>
repo_state:  # Optional - git repository state
  branch: <branch>
  last_commit: <hash>
  dirty_files: [...]
  changed_files: [...]
completed:
  - <completed task with file paths>
next:
  - <specific next actions with acceptance criteria>
context_files:
  - <paths to Tier-2 docs>
```

---

## Handoff Entries

<!-- Entries appear below in reverse chronological order -->

```yaml
schema_version: "1.0"
timestamp: 2025-11-15T20:00:00Z
from: claude
to: cursor
issue_id: none
branch: feature/h-implement-ai-handoff-process
completed:
  - Normalized handoff schema to use from/to/next fields
  - Updated claude.md Section 5.3 with schema_version field
  - Created handoff-receiver skill for parsing handoffs
  - Created validation script at scripts/validate-handoffs.sh
  - Added frontmatter metadata to all handoff docs
  - Configured handoff-receiver for auto-invocation
next:
  - Review handoff system implementation
  - Test handoff-receiver skill with a real handoff
  - Merge changes to main branch
context_files:
  - docs/ai_handoffs.md
  - docs/agent_bridge_protocol.md
  - claude.md
  - .claude/skills/handoff-receiver.md
  - scripts/validate-handoffs.sh
```

```yaml
schema_version: "1.0"
timestamp: 2025-01-20T12:00:00Z
from: cursor
to: claude
issue_id: 1
branch: feature/h-align-claude-cursor-systems
repo_state:
  branch: feature/h-align-claude-cursor-systems
  last_commit: b120098e9f695fae5fcb4662edc93502acac49b9
  dirty_files:
    - CURSOR.md
    - docs/agent_bridge_protocol.md
    - docs/ai_handoffs.md
  changed_files:
    - sessions/tasks/h-enhance-handoff-for-cursor-independence.md
completed:
  - Reviewed Claude Code's proposal for Agent Registry System and Cloud Agent infrastructure
  - Provided detailed feedback on registry location, config structure, webhook setup, and run tracking
  - Identified Cursor Agent's agent needs (code-review-expert, git-expert, documentation-expert, code-search)
  - Recommended .cursor/cloud-agents/ for Cloud Agent configs
  - Recommended manual webhook setup with helper scripts/docs
  - Recommended lightweight run tracking (recent 10-20 runs only)
  - Drafted comprehensive GitHub Issue with phased implementation plan
  - Created GitHub Issue #1: "Implement Agent Registry System and Cloud Agent Infrastructure"
next:
  - Implement Phase 1: Registry foundation (repo_state/agent-registry.json + scripts/agent-registry.js)
  - Implement Phase 2: Cloud Agent infrastructure (6 configs in .cursor/cloud-agents/)
  - Implement Phase 3: Documentation automation (auto-generate audit from registry)
  - Implement Phase 4: Lifecycle management (create, link, deprecate commands)
  - Update docs/agent-system-audit.md to note it's generated from registry
  - Update docs/claude-cursor-agent-alignment.md to reference registry
context_files:
  - docs/agent-system-audit.md
  - docs/claude-cursor-agent-alignment.md
  - docs/agent_bridge_protocol.md
  - sessions/tasks/h-align-claude-cursor-systems.md
  - CURSOR.md (for Cursor Agent role context)
  - https://github.com/grandinh/claude-chaos-express/issues/1
```

```yaml
schema_version: "1.0"
timestamp: 2025-01-20T00:00:00Z
from: cursor
to: claude
issue_id: none
branch: feature/h-align-claude-cursor-systems
repo_state:
  branch: feature/h-align-claude-cursor-systems
  last_commit: b120098e9f695fae5fcb4662edc93502acac49b9
  dirty_files:
    - CURSOR.md
    - docs/agent_bridge_protocol.md
  changed_files:
    - sessions/tasks/h-enhance-handoff-for-cursor-independence.md
completed:
  - Created high-priority task manifest: sessions/tasks/h-enhance-handoff-for-cursor-independence.md
  - Defined spec for Cursor Coordination Guide to enable Cursor independence from CLAUDE.md
  - Identified coordination-relevant information to extract from CLAUDE.md
next:
  - Create docs/cursor-coordination-guide.md with all coordination-relevant information (DAIC workflow, write-gating, tier rules, handoff format, decision priority, boundaries, shared SoT)
  - Update .cursor/rules/cursor-agent-operating-spec.mdc to remove @CLAUDE.md reference and replace with @docs/cursor-coordination-guide.md
  - Update docs/agent_bridge_protocol.md to reference coordination guide
  - Update docs/ai_handoffs.md to reference coordination guide and fix path inconsistencies
  - Verify Cursor rule has no remaining dependencies on CLAUDE.md
context_files:
  - sessions/tasks/h-enhance-handoff-for-cursor-independence.md
  - docs/agent_bridge_protocol.md
  - docs/ai_handoffs.md
  - .cursor/rules/cursor-agent-operating-spec.mdc
  - CLAUDE.md (source for extraction)
  - docs/tiers_of_context.md
```

