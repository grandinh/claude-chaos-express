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
timestamp: ISO-8601
from_agent: claude|cursor
to_agent: claude|cursor
issue_id: <GitHub Issue number or "none">
branch: <current branch>
repo_state:
  branch: <branch>
  last_commit: <hash>
  dirty_files: [...]
  changed_files: [...]
completed:
  - <completed task with file paths>
needed:
  - <specific next actions with acceptance criteria>
context_files:
  - <paths to Tier-2 docs>
```

---

## Handoff Entries

<!-- Entries appear below in reverse chronological order -->

