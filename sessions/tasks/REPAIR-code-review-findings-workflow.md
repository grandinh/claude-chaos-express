---
name: REPAIR-code-review-findings-workflow
branch: feature/REPAIR-code-review-findings-workflow
status: pending
created: 2025-11-16
---

# REPAIR: Code Review Findings Workflow

## Problem/Goal

The code-review agent outputs findings (Critical/Warning/Suggestion) and explicitly states "Wait for user confirmation before proceeding" (per [cc-sessions canonical spec](https://github.com/GWUDCAP/cc-sessions/blob/main/cc_sessions/agents/code-review.md)), but the hook system's todo auto-advancement **overrides this instruction** and immediately continues to the next todo without waiting.

This violates the explicit agent instruction. The hook system should NOT override agent instructions - agent instructions take precedence.

Additionally, there's no structured way to track code-review findings that aren't fixed immediately - they just get lost in chat history.

**Note:** This task also includes adding natural language triggers for code-review (consolidated from `m-audit-and-add-auto-invoke-triggers.md` to avoid duplicate work on code-review improvements).

## Success Criteria

- [ ] Fix hook system to respect code-review agent's "wait for user confirmation" instruction
- [ ] Update `sessions/protocols/task-completion/task-completion.md` to provide 4 user options:
  - [ ] YES: Fix issues now (stay in current task, address immediately)
  - [ ] NO: Proceed with task completion (accept findings, continue workflow)
  - [ ] LOG ALL: Create CODE-REVIEW- tasks for all findings, then continue
  - [ ] SELECT: User picks which findings become tasks (multi-select UI), then continue
- [ ] Implement task creation logic for LOG ALL and SELECT options
- [ ] Task creation happens BEFORE workflow resumes (blocking)
- [ ] Implement CODE-REVIEW-[severity]-[description] task naming pattern:
  - [ ] Critical (🔴): h-CODE-REVIEW-critical-[description].md
  - [ ] Warnings (🟡): m-CODE-REVIEW-warning-[description].md
  - [ ] Suggestions (🟢): l-CODE-REVIEW-suggestion-[description].md
- [ ] Update hook system (`sessions/hooks/post_tool_use.js`) to detect code-review completion and pause workflow
- [ ] Resume workflow only after user responds with one of the 4 options
- [ ] Document the workflow in CLAUDE.md or claude-reference.md
- [ ] Test with sample code-review findings at each severity level
- [ ] Ensure works for both `finito` and `squish` protocols
- [ ] Add natural language triggers for code-review command/skill to `skill-rules.json`:
  - [ ] Keywords: "review this code", "check for bugs", "validate code quality", "code review", "review code", "check code quality"
  - [ ] Intent patterns: `"(review|check|validate|analyze).*?(code|quality|bugs)"`, `"code.*?(review|quality|check)"`
  - [ ] Ensure triggers work for both `/code-review` command and code-review-expert agent invocation

## Context Manifest

**Issue Context:**
- Observed in task `m-implement-skill-prompts` completion
- Code-review ran successfully, found 3 warnings + 5 suggestions
- Asked user "Your choice:" but then auto-continued to next todo (logging agent)
- User lost opportunity to address findings before task completion

**Current Behavior:**
1. ✅ Code-review invoked by task-completion protocol (correct)
2. ✅ Outputs findings in structured format (correct)
3. ✅ Asks for user input with "Wait for user confirmation before proceeding" (correct)
4. ❌ **Hook system auto-advances to next todo anyway** (incorrect - violates agent instruction)
5. ❌ Findings lost in chat history (not systematically tracked)

**Desired Behavior:**
1. Code-review completes and outputs findings
2. **Hook system detects code-review completion and PAUSES workflow**
3. User presented with 4 options:
   - YES: Fix issues now
   - NO: Proceed with completion
   - LOG ALL: Create tasks for all findings
   - SELECT: Pick which findings become tasks (multi-select UI)
4. If LOG ALL or SELECT chosen:
   - Create CODE-REVIEW- task files BEFORE continuing
   - Report created tasks
5. Workflow resumes only after user responds
6. Continue to logging agent → service-documentation agent → completion

**Relevant Files:**
- `/Users/grandinharrison/Desktop/claude-code-projects/claude-chaos-express/sessions/hooks/post_tool_use.js` - Hook that auto-advances todos (needs modification)
- `/Users/grandinharrison/Desktop/claude-code-projects/claude-chaos-express/sessions/protocols/task-completion/task-completion.md` - Protocol that invokes code-review (needs updated prompt)
- `/Users/grandinharrison/Desktop/claude-code-projects/claude-chaos-express/.claude/agents/code-review.md` - Agent spec (may need update for new options)
- `/Users/grandinharrison/Desktop/claude-code-projects/claude-chaos-express/sessions/tasks/TEMPLATE.md` - Template for task files
- `/Users/grandinharrison/Desktop/claude-code-projects/claude-chaos-express/CLAUDE.md` - Framework documentation
- Canonical code-review spec: https://github.com/GWUDCAP/cc-sessions/blob/main/cc_sessions/agents/code-review.md

**Key Principle:**
- Agent instructions ("Wait for user confirmation") **override** hook automation
- Hook system should detect when agent asks for input and pause workflow
- User must explicitly respond before workflow resumes
- Task creation (if chosen) happens synchronously before workflow continues

## Design Notes

### User Options (4 Choices)

After code-review completes with findings, present user with:

```markdown
[FINDINGS: Code Review]
The code review agent has completed its analysis:

Critical Issues:
□ [List of critical issues]

Warnings:
□ [List of warnings]

Suggestions:
□ [List of suggestions]

How would you like to proceed?

1. YES - Fix issues now (stay in current task, address immediately)
2. NO - Proceed with task completion (accept findings, continue workflow)
3. LOG ALL - Create CODE-REVIEW- tasks for all findings, then continue
4. SELECT - Choose which findings become tasks (multi-select), then continue

Your choice: [1/2/3/4]
```

**Option 3 (LOG ALL):**
- Create tasks for ALL findings automatically
- Report created tasks
- Continue workflow

**Option 4 (SELECT):**
- Present multi-select UI:
  ```
  Select which findings should become tasks:
  
  Critical Issues:
  ☐ [ ] Critical: Input validation missing (path/to/file:45)
  ☐ [ ] Critical: SQL injection risk (path/to/file:89)
  
  Warnings:
  ☐ [ ] Warning: Unhandled network error (path/to/file:120)
  ☐ [ ] Warning: Memory leak potential (path/to/file:156)
  
  Suggestions:
  ☐ [ ] Suggestion: Extract magic number (path/to/file:23)
  ☐ [ ] Suggestion: Use existing utility (path/to/file:45)
  
  [Submit] [Cancel]
  ```
- Create tasks only for selected findings
- Report created tasks
- Continue workflow

### Task Naming Convention

```
[priority]-CODE-REVIEW-[severity]-[brief-description].md

Examples:
- h-CODE-REVIEW-critical-input-validation.md
- m-CODE-REVIEW-warning-unhandled-network-error.md
- l-CODE-REVIEW-suggestion-extract-magic-numbers.md
```

Priority mapping:
- Critical (🔴) → `h-` (high)
- Warnings (🟡) → `m-` (medium)
- Suggestions (🟢) → `l-` (low)

### Implementation Strategy

**Phase 1: Fix Hook System**

1. **Modify `post_tool_use.js`**:
   - Detect when code-review subagent completes
   - Check if output contains `[FINDINGS: Code Review]` marker
   - If findings exist, **PAUSE workflow** (don't advance to next todo)
   - Set flag in state: `waiting_for_code_review_response: true`
   - Log message: "Code-review completed with findings. Waiting for user response..."

2. **Modify `user_messages.js`**:
   - Detect user response to code-review prompt
   - Parse response (YES/NO/LOG ALL/SELECT)
   - Clear `waiting_for_code_review_response` flag
   - If LOG ALL or SELECT, trigger task creation
   - Resume workflow after task creation (if any)

**Phase 2: Update Protocol**

1. **Update `task-completion.md`**:
   - Replace current code-review prompt with 4-option format
   - Add instructions for task creation logic
   - Specify that workflow pauses until user responds

**Phase 3: Task Creation Logic**

1. **Parse findings from code-review output**:
   - Extract severity markers (🔴/🟡/🟢)
   - Extract descriptions and file locations
   - Build structured list

2. **Create task files**:
   - Use TEMPLATE.md structure
   - Include code-review details in Context Manifest
   - Set status to 'pending'
   - Set appropriate priority prefix

3. **Report created tasks**:
   ```markdown
   Created CODE-REVIEW tasks:
   - h-CODE-REVIEW-critical-input-validation.md
   - m-CODE-REVIEW-warning-error-handling.md
   - l-CODE-REVIEW-suggestion-extract-constants.md
   
   Total: 3 tasks created
   ```

**Phase 4: Multi-Select UI (Option 4)**

1. **Present findings as checkboxes**:
   - Format each finding with checkbox
   - Group by severity
   - Include file path and line numbers

2. **Parse user selection**:
   - Extract checked items
   - Create tasks only for selected findings
   - Report selection summary

**Phase 5: Add Natural Language Triggers**

1. **Create or update code-review skill entry in `skill-rules.json`**:
   - Skill type: ANALYSIS-ONLY (code-review reads code, provides feedback)
   - DAIC modes: All modes (DISCUSS, ALIGN, IMPLEMENT, CHECK)
   - Priority: Medium (helpful but not critical)

2. **Add comprehensive trigger patterns**:
   - Keywords: "review this code", "check for bugs", "validate code quality", "code review", "review code", "check code quality", "analyze code", "code analysis"
   - Intent patterns: 
     - `"(review|check|validate|analyze).*?(code|quality|bugs|issues)"`
     - `"code.*?(review|quality|check|analysis)"`
     - `"(find|identify|detect).*?(bugs|issues|problems).*?code"`
   - File triggers: Consider adding if code-review should auto-trigger on certain file patterns

3. **Test trigger accuracy**:
   - Verify natural language phrases correctly trigger code-review
   - Ensure no false positives with unrelated phrases
   - Test in different DAIC modes

### Hook System Changes Required

**In `post_tool_use.js`:**
```javascript
// After detecting code-review completion
if (toolName === "Subagent" && subagentName === "code-review") {
    // Check if output contains findings marker
    if (outputContainsFindings(toolOutput)) {
        // Set pause flag
        editState(s => {
            s.flags.waiting_for_code_review_response = true;
        });
        // Don't advance to next todo
        return; // Exit early, don't process todo completion
    }
}
```

**In `user_messages.js`:**
```javascript
// Detect user response to code-review
if (STATE.flags.waiting_for_code_review_response) {
    const response = parseCodeReviewResponse(userMessage);
    if (response === "LOG ALL" || response === "SELECT") {
        // Create tasks synchronously
        createCodeReviewTasks(findings, response);
        // Clear flag and resume
        editState(s => {
            s.flags.waiting_for_code_review_response = false;
        });
    }
}
```

## User Notes

**Key Design Principle:**
Agent instructions ("Wait for user confirmation before proceeding") **override** hook automation. The hook system should respect agent pauses, not override them.

**Design Requirements:**
1. Fix hook system to detect and respect code-review pause instruction
2. Provide 4 clear user options (YES/NO/LOG ALL/SELECT)
3. Task creation (if chosen) happens synchronously BEFORE workflow resumes
4. Multi-select UI for SELECT option allows granular control
5. Workflow only resumes after explicit user response

**Rationale:**
- Respects canonical cc-sessions agent specification
- Maintains "basically autopilot" while allowing critical decision points
- Systematic tracking of findings without losing them
- User maintains control over what becomes a task vs. what gets ignored

## Work Log

<!-- Work log entries will be added during implementation -->

