# AI Handoffs Log

This file records structured handoffs between Cursor and Claude Code.

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

