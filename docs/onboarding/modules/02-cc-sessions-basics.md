---
name: cc-sessions-basics
title: "cc-sessions: DAIC Workflow Fundamentals"
duration: 15
prerequisites: ["welcome"]
next_module: cc-sessions-advanced
---

# Module 2: cc-sessions Basics

**Duration:** 15 minutes
**Prerequisites:** Welcome module completed

---

## Learning Objectives

By the end of this module, you will:

✅ Understand all four DAIC modes and their purposes
✅ Know when write tools are allowed vs. blocked
✅ Practice transitioning between modes using trigger phrases
✅ Create your first task manifest
✅ Execute a simple implementation with framework safety

---

## Part 1: The Four DAIC Modes (5 minutes)

### Mode 1: DISCUSS 💬

**Purpose:** Clarify requirements, constraints, and approach

**What's Allowed:**
- Read files (`Read`, `Grep`, `Glob`, `LS`)
- Ask questions
- Research and investigation
- Browse documentation

**What's Blocked:**
- ❌ `Write` - Cannot create files
- ❌ `Edit` - Cannot modify files
- ❌ `MultiEdit` - Cannot batch edit
- ❌ `NotebookEdit` - Cannot edit notebooks

**When to Use:**
- Starting a new piece of work
- Understanding existing code
- Clarifying user requirements
- Investigating bugs or issues

**Example Scenario:**
```
User: "I need to add JWT authentication to the API"

You (in DISCUSS mode):
1. Read existing auth middleware files
2. Search for authentication patterns in codebase
3. Ask clarifying questions:
   - Which endpoints need protection?
   - Where should tokens be stored?
   - Any specific JWT library preference?
4. Once clear → transition to ALIGN
```

---

### Mode 2: ALIGN 📋

**Purpose:** Design the solution and create an execution plan

**What's Allowed:**
- Everything from DISCUSS mode
- Create task manifests (special case)
- Design documentation
- Architecture diagrams

**What's Blocked:**
- ❌ Implementation code changes
- ❌ Production file modifications

**When to Use:**
- After requirements are clear (post-DISCUSS)
- Creating task manifests with todos
- Designing architecture
- Breaking down work into steps

**Example Scenario:**
```
You (in ALIGN mode):
1. Create task manifest: sessions/tasks/add-jwt-auth.md
2. Define success criteria
3. Break down into todos:
   □ Install jsonwebtoken library
   □ Create JWT middleware in src/middleware/jwt.ts
   □ Add auth to protected routes
   □ Write tests for JWT verification
   □ Update API documentation
4. Once plan approved → transition to IMPLEMENT
```

**Task Manifest Structure:**
```markdown
---
name: add-jwt-auth
branch: feature/jwt-authentication
status: pending
priority: high
---

# Add JWT Authentication

## Success Criteria
- [ ] Protected routes require valid JWT
- [ ] Token verification middleware implemented
- [ ] Tests pass with 90%+ coverage
- [ ] API docs updated

## Todos
- [ ] Install jsonwebtoken library
- [ ] Create JWT middleware
- [ ] Protect routes
- [ ] Write tests
```

---

### Mode 3: IMPLEMENT ⚡

**Purpose:** Execute the approved plan

**What's Allowed:**
- ✅ **ALL write tools** (`Write`, `Edit`, `MultiEdit`, `NotebookEdit`)
- ✅ All read tools
- ✅ Bash commands
- ✅ Git operations

**What's Required:**
- Active task manifest with todos
- Working from approved plan (no scope creep)
- Updating todos as you complete them

**When to Use:**
- After ALIGN plan is approved
- Making code changes
- Creating/modifying files
- Installing dependencies

**Example Scenario:**
```
You (in IMPLEMENT mode):
1. Mark first todo as in_progress
2. Run: npm install jsonwebtoken
3. Create src/middleware/jwt.ts
4. Write JWT verification logic
5. Mark todo as completed
6. Move to next todo
7. When all done → transition to CHECK
```

---

### Mode 4: CHECK ✅

**Purpose:** Verify work quality and document outcomes

**What's Allowed:**
- Run tests
- Build verification
- Minimal documentation updates (LCMP, task summary)
- Read-only verification

**What's Blocked:**
- ❌ New feature implementation
- ❌ Scope expansion
- ❌ Extensive code changes

**When to Use:**
- After IMPLEMENT work is complete
- Running test suites
- Validating acceptance criteria
- Documenting lessons learned

**Example Scenario:**
```
You (in CHECK mode):
1. Run: npm test
2. Verify all tests pass
3. Check success criteria:
   ✅ Protected routes require valid JWT
   ✅ Middleware implemented
   ✅ Tests pass with 92% coverage
   ✅ API docs updated
4. Update context/gotchas.md with learnings
5. Mark task as complete
6. Return to DISCUSS for next work
```

---

## Part 2: Mode Transitions & Trigger Phrases (3 minutes)

### How to Transition Between Modes

Modes are controlled by **trigger phrases** configured in `sessions/sessions-config.json`.

**Your Current Triggers** (check your config):
```json
{
  "trigger_phrases": {
    "implementation_mode": ["yert"],
    "discussion_mode": ["SILENCE"],
    "task_startup": ["start^"],
    "task_completion": ["finito"],
    "context_compaction": ["squish"]
  }
}
```

### Transition Examples

**DISCUSS → ALIGN:**
```
User: "Okay, I understand. Create a plan for implementing this."
(No trigger needed - you can propose moving to ALIGN)
```

**ALIGN → IMPLEMENT:**
```
User: "yert"  (trigger phrase)
AI: "Entering IMPLEMENT mode. Write tools now active."
```

**IMPLEMENT → CHECK:**
```
User: "SILENCE"  (returns to DISCUSS)
AI: "Entering DISCUSS mode. Write tools blocked."
```

**Alternative:** Most transitions can happen conversationally. Trigger phrases are mainly used for IMPLEMENT mode for safety.

### The Write-Gating Safety System

The framework **automatically blocks** write tools outside IMPLEMENT mode:

```
You (in DISCUSS mode):
> I'll update src/app.ts...
[BLOCKED] Write tool attempted outside IMPLEMENT mode

Hooks system response:
"🚫 Write blocked: You are in DISCUSS mode.
Use trigger phrase 'yert' to enter IMPLEMENT mode,
or create a task manifest in ALIGN mode first."
```

This prevents accidental file modifications before planning is complete!

---

## Part 3: Hands-On Exercise - Your First Task (7 minutes)

Let's create a simple practice task and walk through the full DAIC cycle.

### Exercise Setup

We'll create a task that adds a simple text file with your name and favorite programming language.

### Step 1: DISCUSS Mode

**What you do:**
```
You: "I want to create a practice file for the onboarding tutorial."
```

**AI should (in DISCUSS):**
- Ask clarifying questions (if needed)
- Confirm what file to create
- Suggest next step (create task manifest)

### Step 2: ALIGN Mode - Create Task Manifest

**Create this file manually:** `sessions/tasks/onboarding-practice.md`

```markdown
---
name: onboarding-practice
branch: onboarding/practice-task
status: pending
priority: low
---

# Onboarding Practice Task

## Success Criteria
- [ ] File created at `scratch/my-practice.txt`
- [ ] Contains your name
- [ ] Contains favorite language
- [ ] File readable and valid

## Todos
- [ ] Create scratch directory if needed
- [ ] Create my-practice.txt file
- [ ] Add name and language content
- [ ] Verify file exists and is readable
```

**Save the file**, then tell Claude:
```
You: "start^ onboarding-practice"  (task startup trigger)
```

### Step 3: IMPLEMENT Mode - Execute the Plan

**Enter IMPLEMENT:**
```
You: "yert"  (implementation trigger)
```

**AI should now:**
1. Mark first todo as in_progress
2. Create `scratch/` directory
3. Mark first todo complete
4. Create `scratch/my-practice.txt` with content:
   ```
   Name: [Your Name]
   Favorite Language: [Your Choice]
   ```
5. Mark remaining todos complete

### Step 4: CHECK Mode - Verify

**Exit IMPLEMENT:**
```
You: "SILENCE"  (discussion trigger)
```

**Verify the work:**
```bash
# In your terminal
cat scratch/my-practice.txt
```

You should see your name and favorite language!

**AI should:**
- Confirm file exists
- Verify content matches criteria
- Mark task complete
- Suggest next steps

---

## Part 4: Understanding Write-Gating (Knowledge Check)

### Quiz: When Are Write Tools Allowed?

For each scenario, say if write tools are ALLOWED or BLOCKED:

**Scenario 1:** You're in DISCUSS mode, user asks "Can you fix this typo in README.md?"
- **Answer:** _____________

**Scenario 2:** You're in IMPLEMENT mode with active task manifest
- **Answer:** _____________

**Scenario 3:** You're in ALIGN mode creating a task manifest
- **Answer:** _____________

**Scenario 4:** You're in CHECK mode, tests passed, user says "add a comment to this function"
- **Answer:** _____________

<details>
<summary>Show Answers</summary>

**S1:** BLOCKED - In DISCUSS, must transition to IMPLEMENT first
**S2:** ALLOWED - IMPLEMENT mode with task = full write access
**S3:** ALLOWED (special case) - Can create/edit task manifests only
**S4:** BLOCKED - CHECK is for verification, not new changes (would need new task)

</details>

---

## Part 5: Key Takeaways

### What You Learned

✅ **DISCUSS** - Clarify before coding (reads only)
✅ **ALIGN** - Plan before implementing (task manifests)
✅ **IMPLEMENT** - Execute approved plans (writes allowed)
✅ **CHECK** - Verify and document (minimal writes)

✅ **Write-gating** - Automatic safety prevents premature changes
✅ **Trigger phrases** - Customizable mode transitions
✅ **Task manifests** - Structured plans with todos and criteria

### Why This Matters

**Without DAIC:**
```
User: "Add authentication"
AI: *immediately starts editing files*
User: "Wait, I meant OAuth not JWT!"
AI: *half-finished changes scattered across files*
```

**With DAIC:**
```
User: "Add authentication"
AI (DISCUSS): "Which type? OAuth, JWT, session-based?"
User: "OAuth with Google"
AI (ALIGN): *creates clear plan*
User: "yert"
AI (IMPLEMENT): *executes exactly what was agreed*
User: "SILENCE"
AI (CHECK): *verifies, documents, done*
```

---

## Common Pitfalls (Avoid These!)

❌ **Skipping ALIGN** - Jumping straight to IMPLEMENT without a plan
  → Result: Unclear scope, potential rework

❌ **Scope creep in IMPLEMENT** - Adding features not in task manifest
  → Result: Framework will warn about scope violations

❌ **Forgetting to mark todos complete** - Not tracking progress
  → Result: Lost context, harder to resume

❌ **Using wrong trigger phrases** - Trying "implement" instead of "yert"
  → Result: Mode won't change (use your configured triggers!)

---

## Practice Challenge (Optional)

Want more practice? Try this challenge:

**Task:** Create a task manifest for "Add a new skill to the framework"

**Requirements:**
1. Create `sessions/tasks/practice-add-skill.md`
2. Include proper YAML frontmatter
3. Define 3-5 success criteria
4. Break down into 6-8 specific todos
5. Don't implement it - just plan it (ALIGN mode practice!)

**Time:** 10 minutes

---

## Module Summary

You've completed cc-sessions basics! You can now:

✅ Navigate all four DAIC modes
✅ Understand write-gating safety
✅ Create task manifests
✅ Execute planned work
✅ Verify and document outcomes

### What's Next

In **Module 3: cc-sessions Advanced**, you'll learn:
- State management and resumption
- Hook system internals
- Task lifecycle protocols
- Multi-agent orchestration overview

**Time Estimate:** 20 minutes

---

## Navigation

**Current Module:** cc-sessions Basics (2/7)
**Progress:** 14% → 28% (after completion)

**Actions:**
- Type `[Next]` to continue to Module 3: cc-sessions Advanced
- Type `[Back]` to return to Welcome
- Type `[Help]` for all navigation commands
- Type `[Quit]` to save progress and exit

---

**Pro Tip:** Your task manifests are living documents. You can refine todos during ALIGN, but don't change the core goal during IMPLEMENT - that's scope creep!

**Module Complete!** 🎉
You've mastered DAIC fundamentals and created your first task.

→ **Type `[Next]` to continue to cc-sessions Advanced**
