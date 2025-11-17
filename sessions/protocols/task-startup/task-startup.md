---
protocol_version: "1.0"
last_updated: "2025-11-17"
protocol_name: "task-startup"
---

# Task Startup Protocol

When starting work on a task (new or existing):

{todos}

## 1. Check git status and handle any uncommitted changes

Before starting any task work, ensure a clean working state and sync with remote:

### Local Changes
- Check git status {git_status_scope}
- Address EVERY file shown in `git status`, not just expected files
- Common missed files: CLAUDE.md, sessions/state files, test outputs

If uncommitted changes exist, present them:

```markdown
[STATUS: Uncommitted Changes]
Found uncommitted changes in the repository:

Modified files:
- file1.py: [brief description of changes if known]
- file2.md: [brief description]

Untracked files:
- newfile.txt
- temp/

How would you like to handle these changes?
- COMMIT: Commit all changes with message (git add -A && git commit -m "...")
- STASH: Stash changes to apply later (git stash push -m "...")
- SELECTIVE: Review each file individually (git add -p)

Your choice:
```

{git_handling}

### Remote Changes
- Check for unpulled changes from origin/{default_branch}
- Pull any remote changes BEFORE creating new branches (prevents conflicts)
- If both local and remote changes exist:
  1. Commit or stash local changes first
  2. Pull remote changes
  3. Resolve any conflicts if they arise
  4. Unstash if needed

> Note: If resuming work on an existing branch:
{resume_notes}

## 2. Create/checkout task branch{submodule_branch_todo}

Check task frontmatter for branch name{submodule_context}, then create/checkout branches.

### Branch Creation/Checkout

1. Start from {default_branch} branch (already clean and synced from step 1)
2. Create the new task branch from the updated {default_branch}

{submodule_management_section}

## 3. Verify context manifest for the task

Check the task file's frontmatter for the `context_gathered` flag and verify the Context Manifest section exists:

**Check `context_gathered` flag:**
- If `context_gathered: true` → Context is already gathered, skip to step 4
- If `context_gathered: false` or missing → Context gathering is required (todo will be added)

**Check for Context Manifest section:**

If missing:
```markdown
[STATUS: Context Manifest]
✗ No context manifest found in task file

Running context-gathering agent to analyze the task and create comprehensive context...
```

If present:
```markdown
[STATUS: Context Manifest]
✓ Context manifest found and loaded
```

**Actions:**
- **`context_gathered: false` OR missing:**
  - MUST invoke context-gathering agent before proceeding to IMPLEMENT
  - Agent will:
    - Analyze task requirements and dependencies
    - Create comprehensive context manifest
    - Update task file with manifest section
    - Set `context_gathered: true` in frontmatter
  - Block progression to IMPLEMENT until complete

- **`context_gathered: true`:**
  - Verify "Context Manifest" section exists in task file
  - If missing or incomplete, re-run context-gathering agent
  - Otherwise, proceed to step 4

**Validation Checklist:**
- [ ] Flag exists and is boolean
- [ ] If true, Context Manifest section present
- [ ] Manifest contains narrative explanation
- [ ] Manifest contains technical references

**Behavior:**
- If `context_gathered: true` AND Context Manifest exists → Skip context gathering todo (step 4), proceed to "Initial Discussion & Planning" (step 5)
- If `context_gathered: false` or missing → Context gathering todo will be added automatically (step 4)
- If `context_gathered: true` but Context Manifest missing → This is an error state; context gathering todo will still be added (step 4)

**Error Recovery:**

If context-gathering agent fails:
1. Log failure to `context/gotchas.md` with error details
2. Present options to user:
   ```markdown
   [ERROR: Context Gathering Failed]
   The context-gathering agent encountered an error: <error message>

   Options:
   - RETRY: Invoke agent again (recommended for transient failures)
   - MANUAL: I'll create a minimal context manifest manually (requires your input)
   - ABORT: Cancel task startup and return to discussion mode

   Your choice:
   ```
3. Based on user choice:
   - **RETRY**: Invoke agent again with same parameters
   - **MANUAL**:
     - Create minimal Context Manifest section with placeholder text
     - Set `context_gathered: false` (still incomplete)
     - Continue to step 5 but warn that context is incomplete
   - **ABORT**: Exit protocol, return to discussion mode

**Note**: Manual context manifest creation is a fallback only. The task will still require proper context gathering before IMPLEMENT mode (hook validation will block).

## 4. Gather context for the task

**Note:** This step only appears as a todo if `context_gathered: false` or missing. If `context_gathered: true`, this todo is automatically skipped and you proceed directly to "Initial Discussion & Planning" (step 5).

If context gathering is needed:

Based on the manifest:
- Read the narrative explanation to understand how everything works
- Note technical reference details for implementation
- Check environmental requirements
- Note file locations for where changes will be made
- Read prescribed file segments (if any)

Verify branch state:
- Confirm you're on the correct branch that matches the task's expected branch
- If the branch doesn't match the task branch, STOP and fix it first

{directory_guidance}

## 5. Initial Discussion & Planning (After Todos Complete)

**Note**: This step happens AFTER all startup todos are complete and you've automatically returned to discussion mode.

After gathering context:
1. Analyze the task requirements thoroughly
2. Propose implementation plan with structured format:

```markdown
[PLAN: Implementation Approach]
Based on the task requirements, I propose the following implementation:

□ [Specific action 1]
  → [Expanded explanation of what this involves]

□ [Specific action 2]
  → [Expanded explanation of what this involves]

□ [Specific action 3]
  → [Expanded explanation of what this involves]

To approve these todos, you may use any of your implementation mode trigger phrases: 
{implementation_mode_triggers}
```

3. Iterate based on user feedback until approved
4. Upon approval, convert proposed todos to TodoWrite exactly as written

**IMPORTANT**: Until your todos are approved, you are seeking the user's approval of an explicitly proposed and properly explained list of execution todos. Besides answering user questions during discussion, your messages should end with an expanded explanation of each todo, the clean list of todos, and **no further messages**.

## 6. Work Mode
For the duration of the task:
- Discuss before implementing
- Constantly seek user input and approval

Once approved, remember:
- *Immediately* load your proposed todo items *exactly* as you proposed them using ToDoWrite
- Work logs are maintained by the logging agent (not manually)

After completion of the last task in any todo list:
- *Do not* try to run any write-based tools (you will be automatically put into discussion mode)
- Repeat todo proposal and approval workflow for any additional write/edit-based work

## Example First Message

"I've loaded the context for [task]. Based on the manifest, I understand we're working on [summary]. The last work log entry shows [status]. 

Here is the work I think we should accomplish:
- [todo item]: [full explanation]
- [todo item]: [full explanation]
- ...

Use any discussion mode trigger phrase if you approve the proposal *or* tell me how I should adjust the proposal."
