---
name: REPAIR-hook-system-agent-conflicts
branch: feature/REPAIR-hook-system-agent-conflicts
status: pending
created: 2025-11-16
---

# REPAIR: Hook System Agent Instruction Conflicts

## Problem/Goal

The hook system's automatic workflow advancement conflicts with agent instructions that explicitly request user input. When agents ask "Your choice:" or "WAIT for user response", the hook system doesn't detect these pauses and continues advancing through todos automatically.

This violates the principle that **agent instructions override hook automation**.

## Success Criteria

- [ ] Identify all places where protocols/agents request user input
- [ ] Document each conflict between agent instructions and hook automation
- [ ] Design unified pause detection mechanism
- [ ] Implement pause detection in hook system
- [ ] Test each identified conflict scenario
- [ ] Document the solution in CLAUDE.md or claude-reference.md

## Context Manifest

**Root Cause:**
The hook system (`post_tool_use.js`) sees tool completion events (subagent finishes, todo completes) but doesn't inspect the **content** of agent outputs to detect if user input was requested.

**System Architecture:**

1. **Claude Code** (External Platform - Infrastructure Only)
   - Provides hook infrastructure (PreToolUse, PostToolUse events)
   - Provides tool system (Task, Bash, Edit, etc.)
   - Provides subagent infrastructure
   - **No conflicts** - Claude Code is just infrastructure, doesn't make workflow decisions

2. **cc-sessions** (Internal Framework - Control/SoT)
   - **Protocols/Agents Layer** (Instructional - defines WHAT should happen):
     - Task creation protocol
     - Task completion protocol
     - Code-review agent
     - Other agents
     - **Says**: "WAIT for user response", "Your choice:"
   
   - **Hooks Layer** (Mechanical - enforces HOW it happens):
     - `post_tool_use.js` - Auto-advances on tool completion
     - `user_messages.js` - Handles user input
     - `sessions_enforce.js` - DAIC enforcement
     - **Does**: Auto-advances workflows, cleans up subagents

**THE CONFLICT:**
This is an **INTERNAL conflict within cc-sessions**:
- cc-sessions protocols (instructional layer) say "wait"
- cc-sessions hooks (mechanical layer) say "advance"
- Both are cc-sessions, so cc-sessions should be the SoT and resolve this internally

**Current Behavior:**
- Hook sees: "Subagent finished" → Clean up and exit (ignores agent output)
- Hook sees: "Todo complete" → Advance to next todo (ignores protocol instructions)
- **Never checks**: "Did agent ask for user input?" or "Did protocol say to wait?"

**No External System Conflicts:**
- Claude Code is passive infrastructure - it just runs hooks, doesn't make decisions
- All conflicts are within cc-sessions itself
- Solution: Fix cc-sessions hooks to respect cc-sessions protocols/agents

## Identified Conflicts

### 1. Code-Review Agent (Task Completion)

**Location:** `sessions/protocols/task-completion/task-completion.md:53`
**Agent Instruction:** "Wait for user confirmation before proceeding"
**Hook Behavior:** `post_tool_use.js:96-111` - Subagent cleanup exits immediately
**Conflict:** Hook doesn't check if findings were reported before advancing

**Status:** Already documented in `REPAIR-code-review-findings-workflow.md`

---

### 2. Task Creation Protocol - Smart Questions

**Location:** `sessions/protocols/task-creation/task-creation.md:173`
**Protocol Instruction:** "**WAIT for user response** - execution MUST stop here if questions were asked."
**Hook Behavior:** No specific hook, but todos can auto-advance
**Conflict:** If questions are asked, workflow should pause but hook system doesn't detect this

**Evidence:**
```markdown
#### Wait for Responses
**WAIT for user response** - execution MUST stop here if questions were asked.
```

**Risk Level:** Medium - Task creation is interactive by design, but if questions are asked and user doesn't respond quickly, workflow might continue

---

### 3. Task Creation Protocol - Context Gathering Decision

**Location:** `sessions/protocols/task-creation/task-creation.md:208`
**Protocol Instruction:** "Your choice:" (YES/NO for context-gathering agent)
**Hook Behavior:** No specific hook, but if this is a todo, it could auto-advance
**Conflict:** User decision point might be skipped

**Evidence:**
```markdown
[DECISION: Context Gathering]
Would you like me to run the context-gathering agent now?
- YES: I'll run the agent...
- NO: We'll skip this for now...

Your choice:
```

**Risk Level:** Low - This is usually handled conversationally, not as a todo

---

### 4. Task Creation Protocol - Task Index Decision

**Location:** `sessions/protocols/task-creation/task-creation.md:227`
**Protocol Instruction:** "Your choice:" (YES/NO for creating task index)
**Hook Behavior:** No specific hook
**Conflict:** Similar to context gathering decision

**Risk Level:** Low - Conversational decision point

---

### 5. Task Completion Protocol - Staging Decision

**Location:** `sessions/protocols/task-completion/staging-ask.md:27`
**Protocol Instruction:** "Your choice:" (ALL/SELECTIVE/REVIEW for staging)
**Hook Behavior:** Part of task-completion todos, could auto-advance
**Conflict:** If this is a todo step, hook might advance before user responds

**Evidence:**
```markdown
[DECISION: Staging Changes]
How would you like to stage these changes?
- ALL: Stage all changes
- SELECTIVE: Review and select specific files
- REVIEW: Show diffs before deciding

Your choice:
```

**Risk Level:** Medium - This is part of completion workflow, could be skipped

---

### 6. Task Completion Protocol - Merge Decision

**Location:** `sessions/protocols/task-completion/commit-standard.md:17`
**Protocol Instruction:** "Your choice:" (YES/NO for merge)
**Hook Behavior:** Part of task-completion todos
**Conflict:** Merge decision might be skipped if hook auto-advances

**Evidence:**
```markdown
[DECISION: Merge to {default_branch}]
Would you like to merge this branch to {default_branch}?
- YES: Merge to {default_branch}
- NO: Keep changes on feature branch

Your choice:
```

**Risk Level:** Medium - Critical decision point, should not be skipped

---

### 7. Task Completion Protocol - Push Decision

**Location:** `sessions/protocols/task-completion/commit-standard.md:29`
**Protocol Instruction:** "Your choice:" (YES/NO for push)
**Hook Behavior:** Part of task-completion todos
**Conflict:** Push decision might be skipped

**Risk Level:** Medium - Important decision, should not be skipped

---

## Design Solution: Unified Pause Detection

### Pattern Recognition

Agents/protocols use consistent markers for user input requests:

1. **Explicit wait instructions:**
   - "WAIT for user response"
   - "Wait for user confirmation"
   - "execution MUST stop here"

2. **Decision prompts:**
   - `[DECISION: ...]` blocks
   - `[PROPOSAL: ...]` blocks (sometimes)
   - "Your choice:" at end of prompt

3. **Structured options:**
   - Numbered options (1/2/3/4)
   - YES/NO choices
   - Multiple choice lists

### Proposed Hook System Enhancement

**In `post_tool_use.js`:**

Add pause detection before auto-advancing:

```javascript
//!> Pause detection for agent instructions
function shouldPauseForUserInput(toolName, toolOutput) {
    if (toolName === "Task" && STATE.flags.subagent) {
        // Check subagent output for pause markers
        const output = toolOutput || "";
        
        // Check for explicit wait instructions
        if (output.match(/WAIT for user|Wait for user|execution MUST stop/i)) {
            return true;
        }
        
        // Check for decision prompts
        if (output.match(/\[DECISION:/) && output.match(/Your choice:/)) {
            return true;
        }
        
        // Check for code-review findings
        if (output.match(/\[FINDINGS: Code Review\]/)) {
            return true;
        }
    }
    
    return false;
}

// Before subagent cleanup
if (toolName === "Task" && STATE.flags.subagent) {
    // Check if agent requested pause
    if (shouldPauseForUserInput(toolName, toolInput.output)) {
        // Set pause flag instead of cleaning up
        editState(s => {
            s.flags.waiting_for_user_input = true;
            s.flags.pause_reason = "agent_requested";
        });
        console.error("[PAUSE] Agent requested user input. Waiting for response...");
        process.exit(0); // Exit but don't clean up yet
    }
    // Otherwise proceed with normal cleanup
    // ... existing cleanup code
}
//!<
```

**In `user_messages.js`:**

Detect user response and clear pause flag:

```javascript
//!> Resume after user input
if (STATE.flags.waiting_for_user_input) {
    // User has responded, clear pause flag
    editState(s => {
        s.flags.waiting_for_user_input = false;
        s.flags.pause_reason = null;
    });
    // Allow workflow to continue
}
//!<
```

### Alternative: Protocol-Level Pause Flags

Instead of parsing output, protocols could set explicit pause flags:

```javascript
// In protocol templates
const PAUSE_MARKERS = {
    code_review: "[FINDINGS: Code Review]",
    decision: "[DECISION:",
    proposal: "[PROPOSAL:",
    wait_instruction: "WAIT for user"
};
```

## Implementation Strategy

**Phase 1: Detection**
- Add pause detection function to `post_tool_use.js`
- Test with code-review agent (known conflict)
- Verify detection works for all identified patterns

**Phase 2: State Management**
- Add `waiting_for_user_input` flag to state
- Add `pause_reason` for debugging
- Update state schema documentation

**Phase 3: Resume Logic**
- Add resume detection in `user_messages.js`
- Test resume after user responds
- Verify workflow continues correctly

**Phase 4: Protocol Updates**
- Review all protocols for consistent pause markers
- Update protocols to use standard pause patterns
- Document pause/resume behavior

**Phase 5: Testing**
- Test each identified conflict scenario
- Verify no false positives (pausing when shouldn't)
- Verify no false negatives (not pausing when should)

## Related Files

- `/Users/grandinharrison/Desktop/claude-code-projects/claude-chaos-express/sessions/hooks/post_tool_use.js` - Main hook file
- `/Users/grandinharrison/Desktop/claude-code-projects/claude-chaos-express/sessions/hooks/user_messages.js` - User input handling
- `/Users/grandinharrison/Desktop/claude-code-projects/claude-chaos-express/sessions/hooks/shared_state.js` - State management
- `/Users/grandinharrison/Desktop/claude-code-projects/claude-chaos-express/sessions/protocols/task-completion/task-completion.md` - Code-review conflict
- `/Users/grandinharrison/Desktop/claude-code-projects/claude-chaos-express/sessions/protocols/task-creation/task-creation.md` - Multiple decision points
- `/Users/grandinharrison/Desktop/claude-code-projects/claude-chaos-express/sessions/protocols/task-completion/staging-ask.md` - Staging decision
- `/Users/grandinharrison/Desktop/claude-code-projects/claude-chaos-express/sessions/protocols/task-completion/commit-standard.md` - Merge/push decisions

## User Notes

**Key Principle:**
Agent instructions ("WAIT", "Your choice:") should **always** override hook automation. The hook system should detect these pauses and respect them, not blindly advance workflows.

**System Control/SoT:**
- **cc-sessions is the control mechanism/SoT** for all workflow decisions
- All conflicts are **internal to cc-sessions** (protocols vs hooks)
- **No external system conflicts** - Claude Code is passive infrastructure
- Solution must fix cc-sessions hooks to respect cc-sessions protocols

**Design Philosophy:**
- **Instructional layer** (cc-sessions protocols/agents) defines **what** should happen
- **Mechanical layer** (cc-sessions hooks) enforces **how** it happens
- When they conflict, instructional layer wins (both are cc-sessions, so this is internal resolution)

**Scope:**
This REPAIR addresses the **systemic issue** of hook/agent conflicts within cc-sessions. Individual conflicts (like code-review) should reference this for the general solution, then add specific handling if needed.

**External Systems (No Conflicts):**
- **Claude Code**: Provides hook infrastructure only, makes no workflow decisions
- **Task Tool**: Claude Code tool that cc-sessions uses, no conflicts
- **Permission System**: Claude Code feature, unrelated to workflow advancement

## Work Log

<!-- Work log entries will be added during implementation -->

