# Task Completion Protocol

When a task meets its success criteria:

{todos}

{git_add_warning}

## 1. Pre-Completion Checks

Verify before proceeding:

```markdown
[STATUS: Pre-Completion Checks]
✓ All success criteria checked off in task file
✓ No unaddressed work remaining

Ready to proceed with task completion.
```

If any checks fail, stop and address the remaining work first.

{directory_completion_check}

## 2-4. Run Completion Agents

Delegate to specialized agents in this order:
```
1. code-review agent - Review all implemented code for security/quality
   Include: Changed files, task context, implementation approach, complete explanation of threat model (avoids ridiculous suggestions like "Critical: command injection vulnerability" when the environment is the shell and the command writer is the user who already has access to their own shell and can run dangerous commands if they truly wanted to)
   **IMPORTANT**: After code-review completes, report findings using this format:

```markdown
[FINDINGS: Code Review]
The code review agent has completed its analysis:

Critical Issues:
□ [None found / Description of critical issues]

Warnings:
□ [Description of any warnings]

Suggestions:
□ [Optional improvements identified]

How would you like to proceed?

1. YES - Fix issues now (stay in current task, address immediately)
2. NO - Proceed with task completion (accept findings, continue workflow)
3. LOG ALL - Create CODE-REVIEW- tasks for all findings, then continue
4. SELECT - Choose which findings become tasks (multi-select), then continue

Your choice: [1/2/3/4]
```

   - Wait for user confirmation before proceeding
   - If user chooses LOG ALL (3): Create tasks for ALL findings using naming pattern:
     - Critical (🔴): `h-CODE-REVIEW-critical-[brief-description].md`
     - Warnings (🟡): `m-CODE-REVIEW-warning-[brief-description].md`
     - Suggestions (🟢): `l-CODE-REVIEW-suggestion-[brief-description].md`
     - Report created tasks, then continue workflow
   - If user chooses SELECT (4): Present findings as checkboxes grouped by severity, allow user to select which ones become tasks, create tasks for selected findings only, report created tasks, then continue workflow
   - Task creation happens synchronously BEFORE workflow resumes
   
2. service-documentation agent - Update CLAUDE.md files 
   Include: List of services modified during task
   
3. logging agent - Finalize task documentation
   Include: Task completion summary, final status
```

## 5. LCMP Compaction (Optional)

After completion agents finish, suggest LCMP compaction to preserve durable learnings:

```markdown
[STATUS: LCMP Compaction Review]
Reviewing task context for durable information to preserve...
```

**LCMP Compaction Process:**

1. **Analyze task context** for durable information:
   - Architectural decisions with rationale
   - Patterns that apply to multiple features
   - Gotchas that are expensive to rediscover
   - Constraints that affect future work
   - Tradeoffs between competing approaches

2. **Categorize candidates** for LCMP files:
   - **decisions.md** - Architectural decisions, tradeoffs, rationale
   - **insights.md** - Patterns, learnings, best practices discovered
   - **gotchas.md** - Pitfalls, failure modes, edge cases encountered

3. **Present recommendations** using this format:

```markdown
[FINDINGS: LCMP Compaction]
I've reviewed the completed task context. Here's what I suggest preserving:

**For `Context/decisions.md`:**
- [Decision 1]: [Brief description]
- [Decision 2]: [Brief description]

**For `Context/insights.md`:**
- [Insight 1]: [Brief description]
- [Insight 2]: [Brief description]

**For `Context/gotchas.md`:**
- [Gotcha 1]: [Brief description]
- [Gotcha 2]: [Brief description]

Would you like to preserve these learnings in LCMP files?

1. YES - Compact now (promote to LCMP files)
2. NO - Skip compaction, continue workflow
3. SELECT - Choose which items to preserve (multi-select), then continue

Your choice: [1/2/3]
```

4. **Wait for user confirmation** before proceeding:
   - If user chooses YES (1): Perform LCMP compaction, then continue workflow
   - If user chooses NO (2): Skip compaction, continue workflow
   - If user chooses SELECT (3): Present items as checkboxes, allow user to select which ones to preserve, perform compaction for selected items only, then continue workflow

5. **After compaction** (if performed):
   - Show what was added to each LCMP file
   - Verify changes are correct
   - Continue with workflow

**Important Notes:**
- LCMP compaction is **optional** - user can skip it
- Only promote **durable** information (not ephemeral details)
- Never auto-compact without explicit user approval
- Compaction happens **before** task archival so learnings are preserved

## 6. Update Index Files

Before archiving the task:
1. Check all index files in `sessions/tasks/indexes/`
2. For each index that contains this task:
   - Move the task entry from the appropriate priority section under "Active Tasks"
   - Add it to the "Completed Tasks" section
   - Keep the same format: `` `[task-filename]` - [brief description]``
3. If no indexes contain the task, skip this step

## 7. Task Archival

After updating indexes:
```bash
# Update task file 'status' to 'completed' (do not add any fields)
# Move to done/ directory
mv sessions/tasks/[priority]-[task-name].md sessions/tasks/done/
# or for directories:
mv sessions/tasks/[priority]-[task-name]/ sessions/tasks/done/
```

## 8. Git Operations (Commit & Merge)

**NOTE**: Do not commit until the task file is marked complete and moved to done/. This ensures the completed task file is included in its final location.

{staging_instructions}

{commit_instructions}

## Important Notes

- NEVER skip the agent steps - they maintain system integrity
- Task files in done/ serve as historical record
- Completed experiments should document learnings even if code is discarded
- If task is abandoned incomplete, document why in task file before archiving
