# Task Creation Protocol

{todos}

## Creating a Task
Follow these numbered steps to complete each todo above:

### 1: Create task file from template with appropriate priority, type, and structure

#### First, determine task priority
All task files MUST include a priority prefix before the task type:

- `h-` → High priority
- `m-` → Medium priority  
- `l-` → Low priority
- `?-` → Investigate (task may be obsolete, speculative priority)

Examples:
- `h-fix-auth-redirect.md`
- `m-implement-oauth.md`
- `l-docs-api-reference.md`
- `?-research-old-feature.md`

#### Then, choose task type prefix based on the primary goal (comes after priority):

- `implement-` → New functionality (creates feature/ branch)
- `fix-` → Bug fixes, corrections (creates fix/ branch)  
- `refactor-` → Code improvements (creates feature/ branch)
- `research-` → Investigation only (no branch needed)
- `experiment-` → Proof of concepts (creates experiment/ branch)
- `migrate-` → Moving/updating systems (creates feature/ branch)
- `test-` → Adding tests (creates feature/ branch)
- `docs-` → Documentation (creates feature/ branch)

Combine: `[priority]-[type]-[descriptive-name]`

#### Next, decide if task needs file or directory structure

**Use a FILE when**:
- Single focused goal
- Estimated < 3 days work
- No obvious subtasks at creation time
- Examples:
  - `h-fix-auth-redirect.md`
  - `m-research-mcp-features.md`
  - `l-refactor-redis-client.md`

**Use a DIRECTORY when**:
- Multiple distinct phases
- Needs clear subtasks from the start
- Estimated > 3 days work
- Examples:
  - `h-implement-auth/` (magic links + OAuth + sessions)
  - `m-migrate-to-postgres/` (schema + data + cutover)
  - `l-test-all-services/` (per-service test files)

#### For directory tasks, confirm with user

If you determine the task needs directory structure, explicitly confirm:

```markdown
[DECISION: Directory Task Structure]
This task appears complex enough to require directory structure with subtasks.

Using a directory means:
- Creating subtasks will be the first step after task creation
- All work will be done iteratively on the same task branch
- You'll plan and spec out subtasks comprehensively before implementation
- Individual subtask commits won't merge to main until all subtasks complete

Would you like to use directory structure for this task? (yes/no)
```

Only proceed with directory structure if user confirms. If they say no, use a file instead.

#### Propose the task naming to user

Before creating the file, present a structured proposal:

```markdown
[PROPOSAL: Task Name]
Priority: [h/m/l/?]
Type: [implement/fix/refactor/research/etc]
Name: [priority]-[type]-[descriptive-name]
Full path: sessions/tasks/[priority]-[type]-[descriptive-name].md

Structure: [FILE/DIRECTORY]
Rationale: [why file vs directory]

Approve this task naming?
```

#### Finally, create the task file
Once approved, create the file:

For file:
```bash
cp sessions/tasks/TEMPLATE.md sessions/tasks/[priority]-[task-name].md
```
For directory:
```bash
mkdir sessions/tasks/[priority]-[task-name]
cp sessions/tasks/TEMPLATE.md sessions/tasks/[priority]-[task-name]/README.md
```

Then fill out task frontmatter
  - name: Must match filename (including priority prefix)
  - branch: Based on task type (or 'none' for research)
  - status: Start as 'pending'
  - created: Today's date{submodules_field}

### 2: Ask smart contextual questions (0-3 questions, value-driven)

Before defining success criteria, analyze the task description for clarity gaps and ask targeted questions ONLY if they add value.

#### Decision Logic: How Many Questions?

**Ask 0 questions when:**
- Success criteria is already clear in user's description
- Task is low-risk (docs, tests, minor fixes, simple refactors)
- Constraints and scope boundaries are explicitly stated
- Integration points are obvious from context

**Ask 1-3 questions when:**
- Description lacks clear success criteria beyond "make it work"
- Risks/constraints not mentioned (deadlines, breaking changes, rollback needs)
- Integration points or dependencies unclear
- Scope boundaries ambiguous (what's in/out)

**Ask 4+ questions ONLY for high-risk scenarios:**
- Security-sensitive changes (auth, permissions, data access)
- Data migrations or schema changes
- Breaking API/contract changes
- Core architectural refactors
- User explicitly indicates complexity or requests help thinking through implications

#### Question Selection (pick max 3 unless high-risk)

Present questions in this format:

```markdown
[CONTEXTUAL CLARITY - [N] Questions]

Before I create the implementation plan, I need to clarify:

1. [Question from list below, only if adds value]
2. [Question from list below, only if adds value]
3. [Question from list below, only if adds value]

Your insights:
```

**Available questions (pick what's missing from user's description):**

1. **Success Clarity** (if vague): "What does 'done' look like from a user/stakeholder perspective beyond code working?"

2. **Risk/Constraints** (if unstated): "Are there deadlines, breaking change concerns, or rollback requirements I should know about?"

3. **Integration** (if unclear): "What other systems, features, or teams does this interact with?"

4. **Scope Boundaries** (if ambiguous): "What should explicitly NOT be included in this work?"

5. **Future Extensibility** (for significant features): "How might this need to evolve in the next 6-12 months?"

**HIGH-RISK Additional Questions (add to the 3 above if applicable):**
- Auth/Security: "Who should have access? What permission model applies?"
- Data Migration: "What's the rollback plan if issues occur?"
- Breaking Changes: "What's the deprecation timeline and communication plan?"
- Performance: "What are the performance requirements or SLAs?"

#### Wait for Responses

**WAIT for user response** - execution MUST stop here if questions were asked.

### 3: Propose success criteria based on context

Based on the user's original description AND any contextual answers from step 2, propose specific success criteria:

```markdown
[PROPOSAL: Success Criteria]
Based on your requirements and context, I propose:

**Problem/Goal:**
[Clear description of what we're solving/building, incorporating business context]

**Success Criteria:**
□ [Specific measurable criterion - technical]
□ [User/stakeholder outcome - if applicable]
□ [Additional criterion for completeness]
□ [Integration/compatibility requirement - if applicable]

Would you like to adjust or add to these criteria?
```

Once approved, write the Problem/Goal description and record the success criteria with checkboxes in the task file.

### 4: Run context-gathering agent or mark complete

Present the decision to the user:

```markdown
[DECISION: Context Gathering]
Would you like me to run the context-gathering agent now to create a comprehensive context manifest?

- YES: I'll run the agent to analyze the codebase and create context
- NO: We'll skip this for now (must be done during task startup)

Your choice:
```

  - If yes: Use context-gathering agent on sessions/tasks/[priority]-[task-name].md
  - If no: Mark this step complete and continue
  - Context manifest MUST be complete before work begins (if not now, during task startup)

### 5: Update service index files if applicable
  - Check if task relates to any task indexes (sessions/tasks/indexes)
  - If not, present a structured decision:

```markdown
[DECISION: Task Index]
I didn't find any task indexes that fit this task.
Would you like me to create a new index category for this type of task?

- YES: Create new index file
- NO: No index needed

Your choice:
```

  - **If creating a new index**:
    1. Copy the index template: `cp cc-sessions/cc_sessions/templates/INDEX_TEMPLATE.md sessions/tasks/indexes/[index-name].md`
    2. Fill out the frontmatter:
       - `index`: Short identifier (e.g., `auth-oauth`, `mcp`, `user-model`)
       - `name`: Human-readable name (e.g., "Authentication & OAuth")
       - `description`: Brief description of what tasks belong in this index
    3. Add the new task to the appropriate priority section
  - **If using existing index**:
    - Add task to relevant index files under appropriate priority section
    - Use format: `` `[task-filename]` - [brief description]``
    - For directory tasks, append `/` to the filename
  - Skip if no relevant index exists and user declines to create one

### 6: Commit the new task file
- Stage the task file and any updated index files
- Commit with descriptive message about the new task


## Task Evolution

If a file task needs subtasks during work:
1. Create directory with same name
2. Move original file to directory as README.md
3. Add subtask files
4. Update active task reference if needed
  - ex:
  ```json
  {{ "task": "some-task-dir/README.md" }}
  ```
  - ex:
  ```json
  {{ "task": "some-task-dir/some-subtask.md" }}
  ```

## Important Note on Context

The context-gathering agent is responsible for creating a complete, self-contained context manifest. This replaces the deprecated patterns system. If the context proves insufficient during implementation, the agent's prompt should be improved rather than adding workarounds or modifying the context manifest manually.

## Philosophy: Smart Contextual Questions

### Why Questions Matter

Code analysis alone cannot reveal:
- **Business value** - Why this work matters to users/stakeholders
- **Success criteria** - What "done" looks like beyond technical completion
- **Constraints** - Deadlines, risk tolerance, rollback requirements
- **Integration expectations** - How this fits with other systems/teams
- **Future evolution** - What needs to stay flexible vs. locked down

These insights dramatically improve task outcomes by ensuring alignment before implementation begins.

### Intelligence Over Automation

The questioning system is **value-driven, not checklist-driven**:

- **0 questions** when the user has already provided clear context
- **1-3 targeted questions** when specific clarity gaps exist
- **4+ questions** only for genuinely high-risk scenarios

This approach:
- ✅ Respects the user's time (no redundant questions)
- ✅ Adds value where code can't (business/human context)
- ✅ Scales questioning to task complexity and risk
- ✅ Prevents ambiguous requirements from reaching implementation

### Question Selection Criteria

A question should be asked ONLY when ALL of these are true:
1. **Missing**: The information is not in the user's description
2. **Valuable**: The answer will improve task outcomes
3. **Non-inferrable**: Code analysis cannot determine this
4. **Actionable**: The answer will change implementation approach or success criteria

If a question doesn't meet all four criteria, skip it.

## Protocol Completion

Once the task file has been created and the context-gathering agent has populated the context manifest:

1. Inform the user that the task has been successfully created
2. Show the task file path: `sessions/tasks/[priority]-[task-name].md`
3. **DO NOT start working on the task** - The task has been created but will remain in 'pending' status
4. The task will not be started now unless the user explicitly asks to begin work on it
5. If the user wants to start the task, they should use the task startup protocol

This completes the task creation protocol. The task is now ready to be started at a future time.
