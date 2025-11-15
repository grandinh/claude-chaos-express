# claude-reference.md – Detailed Framework Spec & Examples
# Framework Version: 2.0
# Last Updated: 2025-11-15

This file supports `claude.md`. Use it for:
- Framework debugging
- REPAIR- tasks
- Health checks
- Concrete examples and templates

---

## 1. State Persistence – Example Schema

`/.cc-sessions/state.json` is a lightweight checkpoint. Example:

```json
{
  "mode": "IMPLEMENT",
  "task_id": "task-2024-12-20-001",
  "last_todo_completed": 3,
  "timestamp": "2024-12-20T10:30:00Z",
  "last_file_modified": "src/api/handler.ts"
}