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

## Implementation Instructions

### Step 1: Enhance Pause Detection in post_tool_use.js

**File:** `sessions/hooks/post_tool_use.js`

**Location:** After line 110 (in `shouldPauseForUserInput` function), the code-review detection already exists. We need to enhance it to store findings in state.

**Action:** Modify the pause detection section (around lines 130-142) to store code-review findings when detected:

```javascript
//!> Subagent cleanup
if (toolName === "Task" && STATE.flags.subagent) {
    // Check if agent requested pause before cleaning up
    if (shouldPauseForUserInput(toolName, toolOutput)) {
        // Check if this is a code-review findings pause
        const isCodeReviewFindings = toolOutput.match(/\[FINDINGS: Code Review\]/);
        
        if (isCodeReviewFindings) {
            // Extract findings from output
            const findings = extractCodeReviewFindings(toolOutput);
            editState(s => {
                s.flags.waiting_for_user_input = true;
                s.flags.pause_reason = "code_review_findings";
                s.flags.code_review_findings = findings; // Store findings for task creation
            });
            console.error("[PAUSE] Code-review completed with findings. Waiting for user response...");
        } else {
            // Other pause types (existing behavior)
            editState(s => {
                s.flags.waiting_for_user_input = true;
                s.flags.pause_reason = "agent_requested";
            });
            console.error("[PAUSE] Agent requested user input. Waiting for response...");
        }
        // Exit before cleanup - transcript directories preserved for resume
        process.exit(0);
    }
    // ... rest of cleanup code
}
```

**Add helper function** (before the subagent cleanup section, around line 118):

```javascript
//!> Extract code-review findings from output
function extractCodeReviewFindings(output) {
    const findings = {
        critical: [],
        warnings: [],
        suggestions: []
    };
    
    // Extract critical issues (🔴)
    const criticalMatch = output.match(/Critical Issues?:\s*\n([\s\S]*?)(?=Warnings?:|Suggestions?:|How would you like|Your choice:|$)/i);
    if (criticalMatch) {
        const criticalText = criticalMatch[1];
        // Extract each finding (lines starting with □ or - or numbered)
        const criticalItems = criticalText.split(/\n/).filter(line => {
            return line.trim().match(/^[□\-\d\.]\s*(.+)/);
        }).map(line => {
            const match = line.match(/^[□\-\d\.]\s*(.+)/);
            return match ? match[1].trim() : null;
        }).filter(Boolean);
        findings.critical = criticalItems;
    }
    
    // Extract warnings (🟡)
    const warningsMatch = output.match(/Warnings?:\s*\n([\s\S]*?)(?=Suggestions?:|How would you like|Your choice:|$)/i);
    if (warningsMatch) {
        const warningsText = warningsMatch[1];
        const warningItems = warningsText.split(/\n/).filter(line => {
            return line.trim().match(/^[□\-\d\.]\s*(.+)/);
        }).map(line => {
            const match = line.match(/^[□\-\d\.]\s*(.+)/);
            return match ? match[1].trim() : null;
        }).filter(Boolean);
        findings.warnings = warningItems;
    }
    
    // Extract suggestions (🟢)
    const suggestionsMatch = output.match(/Suggestions?:\s*\n([\s\S]*?)(?=How would you like|Your choice:|$)/i);
    if (suggestionsMatch) {
        const suggestionsText = suggestionsMatch[1];
        const suggestionItems = suggestionsText.split(/\n/).filter(line => {
            return line.trim().match(/^[□\-\d\.]\s*(.+)/);
        }).map(line => {
            const match = line.match(/^[□\-\d\.]\s*(.+)/);
            return match ? match[1].trim() : null;
        }).filter(Boolean);
        findings.suggestions = suggestionItems;
    }
    
    return findings;
}
//!<
```

### Step 2: Add Response Parsing in user_messages.js

**File:** `sessions/hooks/user_messages.js`

**Location:** After line 235 (in the "RESUME AFTER PAUSE" section)

**Action:** Replace the existing resume logic (lines 228-235) with enhanced code-review response handling:

```javascript
/// ===== RESUME AFTER PAUSE ===== ///
//!> Resume after user input
if (STATE.flags.waiting_for_user_input) {
    // Check if this is a code-review findings response
    if (STATE.flags.pause_reason === "code_review_findings") {
        const response = parseCodeReviewResponse(prompt);
        
        if (response === "YES" || response === "1") {
            // User wants to fix issues now - stay in current task
            editState(s => {
                s.flags.waiting_for_user_input = false;
                s.flags.pause_reason = null;
                s.flags.code_review_findings = null; // Clear findings
            });
            // Workflow continues in current task
        } else if (response === "NO" || response === "2") {
            // User wants to proceed - clear flags and continue workflow
            editState(s => {
                s.flags.waiting_for_user_input = false;
                s.flags.pause_reason = null;
                s.flags.code_review_findings = null;
            });
            // Workflow continues to next agent
        } else if (response === "LOG ALL" || response === "3") {
            // Create tasks for all findings
            const findings = STATE.flags.code_review_findings || { critical: [], warnings: [], suggestions: [] };
            const createdTasks = createCodeReviewTasks(findings, "ALL");
            
            // Report created tasks
            console.error(`\n[CODE-REVIEW] Created ${createdTasks.length} tasks:\n${createdTasks.map(t => `  - ${t}`).join('\n')}\n`);
            
            // Clear flags and continue
            editState(s => {
                s.flags.waiting_for_user_input = false;
                s.flags.pause_reason = null;
                s.flags.code_review_findings = null;
            });
        } else if (response === "SELECT" || response === "4") {
            // User wants to select which findings become tasks
            // For now, treat SELECT same as LOG ALL (multi-select UI can be added later)
            // TODO: Implement multi-select parsing
            const findings = STATE.flags.code_review_findings || { critical: [], warnings: [], suggestions: [] };
            const createdTasks = createCodeReviewTasks(findings, "ALL");
            
            console.error(`\n[CODE-REVIEW] Created ${createdTasks.length} tasks:\n${createdTasks.map(t => `  - ${t}`).join('\n')}\n`);
            
            editState(s => {
                s.flags.waiting_for_user_input = false;
                s.flags.pause_reason = null;
                s.flags.code_review_findings = null;
            });
        } else {
            // Unrecognized response - keep waiting
            console.error("[WARNING] Unrecognized code-review response. Please respond with: YES (1), NO (2), LOG ALL (3), or SELECT (4)");
        }
    } else {
        // Other pause types (existing behavior)
        editState(s => {
            s.flags.waiting_for_user_input = false;
            s.flags.pause_reason = null;
        });
    }
}
//!<
```

**Add helper functions** (before the RESUME AFTER PAUSE section, around line 220):

```javascript
//!> Parse code-review response from user message
function parseCodeReviewResponse(message) {
    const msg = message.trim().toUpperCase();
    
    // Check for explicit options
    if (msg.match(/^(YES|1|FIX NOW|FIX ISSUES)/)) return "YES";
    if (msg.match(/^(NO|2|PROCEED|CONTINUE|ACCEPT)/)) return "NO";
    if (msg.match(/^(LOG ALL|3|CREATE ALL|CREATE TASKS)/)) return "LOG ALL";
    if (msg.match(/^(SELECT|4|CHOOSE|PICK)/)) return "SELECT";
    
    // Check for numeric responses
    if (msg === "1") return "YES";
    if (msg === "2") return "NO";
    if (msg === "3") return "LOG ALL";
    if (msg === "4") return "SELECT";
    
    return null;
}
//!<

//!> Create CODE-REVIEW task files
function createCodeReviewTasks(findings, mode) {
    const createdTasks = [];
    const tasksDir = path.join(PROJECT_ROOT, 'sessions', 'tasks');
    const templatePath = path.join(tasksDir, 'TEMPLATE.md');
    
    // Read template
    let template = "";
    if (fs.existsSync(templatePath)) {
        template = fs.readFileSync(templatePath, 'utf-8');
    } else {
        // Fallback template
        template = `---
name: {name}
status: pending
created: {date}
---

# {title}

## Problem/Goal
{description}

## Success Criteria
- [ ] Fix the issue identified in code review

## Context Manifest
**Source:** Code review finding from task completion
**Original Finding:** {original_finding}

## Work Log
`;
    }
    
    // Create tasks for critical issues
    findings.critical.forEach((finding, index) => {
        const taskName = sanitizeTaskName(`h-CODE-REVIEW-critical-${finding.substring(0, 50)}`);
        const taskPath = path.join(tasksDir, `${taskName}.md`);
        
        // Skip if already exists
        if (fs.existsSync(taskPath)) {
            return;
        }
        
        const taskContent = template
            .replace(/{name}/g, taskName.replace('.md', ''))
            .replace(/{date}/g, new Date().toISOString().split('T')[0])
            .replace(/{title}/g, `CODE-REVIEW: Critical - ${finding.substring(0, 100)}`)
            .replace(/{description}/g, finding)
            .replace(/{original_finding}/g, finding);
        
        fs.writeFileSync(taskPath, taskContent);
        createdTasks.push(`${taskName}.md`);
    });
    
    // Create tasks for warnings
    findings.warnings.forEach((finding, index) => {
        const taskName = sanitizeTaskName(`m-CODE-REVIEW-warning-${finding.substring(0, 50)}`);
        const taskPath = path.join(tasksDir, `${taskName}.md`);
        
        if (fs.existsSync(taskPath)) {
            return;
        }
        
        const taskContent = template
            .replace(/{name}/g, taskName.replace('.md', ''))
            .replace(/{date}/g, new Date().toISOString().split('T')[0])
            .replace(/{title}/g, `CODE-REVIEW: Warning - ${finding.substring(0, 100)}`)
            .replace(/{description}/g, finding)
            .replace(/{original_finding}/g, finding);
        
        fs.writeFileSync(taskPath, taskContent);
        createdTasks.push(`${taskName}.md`);
    });
    
    // Create tasks for suggestions
    findings.suggestions.forEach((finding, index) => {
        const taskName = sanitizeTaskName(`l-CODE-REVIEW-suggestion-${finding.substring(0, 50)}`);
        const taskPath = path.join(tasksDir, `${taskName}.md`);
        
        if (fs.existsSync(taskPath)) {
            return;
        }
        
        const taskContent = template
            .replace(/{name}/g, taskName.replace('.md', ''))
            .replace(/{date}/g, new Date().toISOString().split('T')[0])
            .replace(/{title}/g, `CODE-REVIEW: Suggestion - ${finding.substring(0, 100)}`)
            .replace(/{description}/g, finding)
            .replace(/{original_finding}/g, finding);
        
        fs.writeFileSync(taskPath, taskContent);
        createdTasks.push(`${taskName}.md`);
    });
    
    return createdTasks;
}

//!> Sanitize task name for filename
function sanitizeTaskName(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 100); // Limit length
}
//!<
```

### Step 3: Update shared_state.js to Support Findings Storage

**File:** `sessions/hooks/shared_state.js`

**Location:** Find the `SessionsFlags` class definition (search for `class SessionsFlags`)

**Action:** Add `code_review_findings` field to the class:

```javascript
class SessionsFlags {
    constructor() {
        // ... existing fields ...
        this.waiting_for_user_input = false;
        this.pause_reason = null;
        this.code_review_findings = null; // NEW: Store findings for task creation
        // ... rest of fields ...
    }
    
    // ... existing methods ...
}
```

### Step 4: Add Natural Language Triggers

**File:** `.claude/skills/skill-rules.json` (or wherever skill rules are stored)

**Action:** Find or create entry for `code-review-trigger` skill and add triggers:

```json
{
  "code-review-trigger": {
    "type": "ANALYSIS-ONLY",
    "skillType": "trigger",
    "daicMode": ["DISCUSS", "ALIGN", "IMPLEMENT", "CHECK"],
    "priority": "medium",
    "triggers": {
      "keywords": [
        "review this code",
        "check for bugs",
        "validate code quality",
        "code review",
        "review code",
        "check code quality",
        "analyze code",
        "code analysis",
        "find bugs",
        "code quality check"
      ],
      "patterns": [
        "(review|check|validate|analyze).*?(code|quality|bugs|issues)",
        "code.*?(review|quality|check|analysis)",
        "(find|identify|detect).*?(bugs|issues|problems).*?code"
      ]
    }
  }
}
```

### Step 5: Verify Protocol Already Has Format

**File:** `sessions/protocols/task-completion/task-completion.md`

**Action:** Verify the protocol already includes the 4-option format (it does, see lines 31-63). No changes needed unless format needs adjustment.

### Step 6: Testing

1. **Test pause detection:**
   - Run a task completion that triggers code-review
   - Verify workflow pauses when findings are present
   - Verify findings are stored in state

2. **Test response parsing:**
   - Respond with "YES" - verify workflow continues in current task
   - Respond with "NO" - verify workflow continues to next agent
   - Respond with "LOG ALL" - verify tasks are created and workflow continues
   - Respond with "SELECT" - verify tasks are created (multi-select can be enhanced later)

3. **Test task creation:**
   - Verify tasks are created with correct naming pattern
   - Verify tasks have correct priority prefixes (h-/m-/l-)
   - Verify tasks include original finding in context

4. **Test natural language triggers:**
   - Try phrases like "review this code", "check for bugs"
   - Verify code-review skill/command is suggested or invoked

## Work Log

<!-- Work log entries will be added during implementation -->

