---
allowed-tools: Bash, Read, Write, LS, Task
---

# Epic Decompose

Break epic into concrete, actionable cc-sessions tasks.

## Usage
```
/pm:epic-decompose <feature_name>
```

## Required Rules

**IMPORTANT:** Before executing this command, read and follow:
- `.claude/rules/datetime.md` - For getting real current date/time
- `sessions/protocols/task-creation/task-creation.md` - For task creation protocol

## Preflight Checklist

Before proceeding, complete these validation steps.
Do not bother the user with preflight checks progress ("I'm not going to ..."). Just do them and move on.

1. **Verify epic exists:**
   - Check if `.claude/epics/$ARGUMENTS/epic.md` or `.claude/epics/$ARGUMENTS/epic.json` exists
   - If not found, tell user: "❌ Epic not found: $ARGUMENTS. First create it with: /pm:prd-parse $ARGUMENTS"
   - Stop execution if epic doesn't exist

2. **Check for existing cc-sessions tasks:**
   - Query `sessions/tasks/*.md` for tasks with `epic: $ARGUMENTS` in frontmatter
   - If tasks exist, list them and ask: "⚠️ Found {count} existing tasks for this epic. Delete and recreate all tasks? (yes/no)"
   - Only proceed with explicit 'yes' confirmation
   - If user says no, suggest: "View existing tasks with: /pm:epic-status $ARGUMENTS"

3. **Validate epic:**
   - Read epic from `.claude/epics/$ARGUMENTS/epic.md` or `.claude/epics/$ARGUMENTS/epic.json`
   - Verify epic has: name, status, created
   - If invalid, tell user: "❌ Invalid epic. Please check: .claude/epics/$ARGUMENTS/"

4. **Check epic status:**
   - If epic status is already "completed", warn user: "⚠️ Epic is marked as completed. Are you sure you want to decompose it again?"

## Instructions

You are decomposing an epic into specific, actionable cc-sessions tasks for: **$ARGUMENTS**

**CRITICAL:** Tasks are created as cc-sessions task manifests in `sessions/tasks/`, NOT as PM task files in `.claude/epics/`.

### 1. Read the Epic

- Load the epic from `.claude/epics/$ARGUMENTS/epic.md` (or epic.json if epic.md doesn't exist)
- Understand the technical approach and requirements
- Review the task breakdown preview
- Extract epic metadata (name, github_issue if present)

### 2. Break Down into Tasks

Analyze the epic and break it into:
- **1-3 day tasks** - Each task should be completable in 1-3 days
- **Clear dependencies** - Identify which tasks depend on others
- **Parallel opportunities** - Identify tasks that can run in parallel

### 3. Create cc-sessions Tasks

For each task, create a cc-sessions task file following the task-creation protocol:

**Task Naming:**
- Use format: `{priority}-{type}-{descriptive-name}.md`
- Priority: `h-` (high), `m-` (medium), `l-` (low)
- Type: `implement-`, `fix-`, `refactor-`, `test-`, `docs-`, etc.
- Example: `m-implement-auth-jwt.md`, `h-fix-login-redirect.md`

**Task Location:**
- Create in `sessions/tasks/` directory
- NOT in `.claude/epics/$ARGUMENTS/`

**Task Frontmatter (REQUIRED fields):**
```yaml
---
name: "{priority}-{type}-{descriptive-name}"
branch: "feature/{name}"  # Based on task type
status: "pending"
created: "{YYYY-MM-DD}"  # Get real date
context_gathered: false
depends_on: []  # List of task files this depends on, e.g. ["m-implement-auth-jwt.md"]
epic: "$ARGUMENTS"  # REQUIRED: Epic name
epic_task_number: "001"  # Optional: Order within epic (001, 002, etc.)
github_issue: ""  # Optional: Will be set during sync
---
```

**Task Structure:**
Follow the task-creation protocol structure:
- Problem/Goal section
- Success Criteria (checkboxes)
- Context Manifest (will be populated by context-gathering agent)
- User Notes (optional)
- Work Log (optional)

### 4. Task Creation Process

For each task:

1. **Determine priority and type:**
   - High priority: Critical path, blockers
   - Medium priority: Important but not blocking
   - Low priority: Nice to have, can be deferred

2. **Create task file:**
   ```bash
   cp sessions/tasks/TEMPLATE.md sessions/tasks/{priority}-{type}-{name}.md
   ```

3. **Fill out frontmatter:**
   - Set `name` to match filename
   - Set `epic: $ARGUMENTS` (REQUIRED)
   - Set `epic_task_number` for ordering (optional)
   - Set `depends_on` with actual task filenames (not numbers)
   - Set `status: pending`
   - Set `created` to real date

4. **Write task content:**
   - Problem/Goal: Clear description
   - Success Criteria: Specific, measurable checkboxes
   - Leave Context Manifest empty (context-gathering agent will populate)

5. **Handle dependencies:**
   - If task depends on others, list them in `depends_on` as task filenames
   - Example: `depends_on: ["m-implement-auth-jwt.md", "h-fix-login-redirect.md"]`
   - Dependencies must reference actual task filenames, not numbers

### 5. Update Epic JSON

After creating all tasks, create/update `.claude/epics/$ARGUMENTS/epic.json`:

```json
{
  "name": "$ARGUMENTS",
  "github_issue": "{from epic.md if present}",
  "tasks": [
    {
      "task_file": "m-implement-auth-jwt.md",
      "status": "pending",
      "github_issue": null,
      "epic_task_number": "001"
    },
    {
      "task_file": "h-fix-login-redirect.md",
      "status": "pending",
      "github_issue": null,
      "epic_task_number": "002"
    }
  ],
  "progress": 0,
  "status": "open",
  "created": "{epic creation date}",
  "updated": "{current date}"
}
```

**Note:** PM sync hooks will automatically update this file when tasks are created/started/completed, but initial creation should populate it.

### 6. Execution Strategy

Choose based on task count and complexity:

**Small Epic (< 5 tasks)**: Create sequentially for simplicity

**Medium Epic (5-10 tasks)**:
- Batch into 2-3 groups
- Create tasks in batches
- Consolidate results

**Large Epic (> 10 tasks)**:
- Analyze dependencies first
- Group independent tasks
- Create dependent tasks after prerequisites
- Consider using Task agents for parallel creation

### 7. Task Dependency Validation

When creating tasks with dependencies:
- Ensure referenced dependencies exist (check task filenames in `depends_on`)
- Check for circular dependencies (Task A → Task B → Task A)
- If dependency issues found, warn but continue: "⚠️ Task dependency warning: {details}"

### 8. Quality Validation

Before finalizing tasks, verify:
- [ ] All tasks have clear acceptance criteria
- [ ] Task sizes are reasonable (1-3 days each)
- [ ] Dependencies are logical and achievable
- [ ] All tasks have `epic: $ARGUMENTS` in frontmatter
- [ ] Task filenames follow cc-sessions naming convention
- [ ] Combined tasks cover all epic requirements

### 9. Post-Decomposition

After successfully creating tasks:

1. Confirm: "✅ Created {count} cc-sessions tasks for epic: $ARGUMENTS"
2. Show summary:
   - Total tasks created
   - Task files created (list filenames)
   - Dependencies mapped
3. Show next steps:
   - "Tasks are in: sessions/tasks/"
   - "View next tasks: /pm:next"
   - "View epic status: /pm:epic-status $ARGUMENTS"
   - "Ready to sync to GitHub? Run: /pm:epic-sync $ARGUMENTS"

## Important Notes

- **Tasks are cc-sessions task manifests**, not PM task files
- **Tasks go in `sessions/tasks/`**, not `.claude/epics/$ARGUMENTS/`
- **Epic metadata is in frontmatter**, not separate PM task format
- **PM sync happens automatically** via hooks when tasks are created/started/completed
- **Dependencies use task filenames**, not task numbers

## Error Recovery

If any step fails:
- If task creation partially completes, list which tasks were created
- Provide option to clean up partial tasks
- Never leave the epic in an inconsistent state
- Ensure epic.json is updated even if some tasks fail

Aim for tasks that can be completed in 1-3 days each. Break down larger tasks into smaller, manageable pieces for the "$ARGUMENTS" epic.
