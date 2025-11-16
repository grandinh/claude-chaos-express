# Trigger Testing & Validation Guide
**Created:** 2025-11-15
**Task:** m-audit-and-add-auto-invoke-triggers
**Branch:** feature/m-audit-and-add-auto-invoke-triggers
**Version:** 3.0.0

## Executive Summary

Comprehensive testing guide for validating the 140+ keywords and 55+ intent patterns across 20 skills (11 existing + 9 new). This guide provides test cases, validation checklists, and methodology for ensuring trigger accuracy without false positives.

---

## Testing Methodology

### 1. Manual Testing Process

**Setup:**
1. Restart Claude Code to load new skill-rules.json
2. Ensure all 20 skill files exist in `.claude/skills/`
3. Confirm skill-rules.json v3.0.0 is active

**Test Execution:**
1. Type natural language phrase in Claude Code
2. Observe which skill (if any) is triggered
3. Verify correct skill activated
4. Verify no false positives (unintended triggers)
5. Verify no false negatives (missed triggers)

**Recording Results:**
- ✓ PASS: Correct skill triggered, expected behavior
- ✗ FAIL: Wrong skill triggered or no skill triggered
- ⚠ WARN: Skill triggered but unexpected (false positive)

### 2. Automated Testing (Future Enhancement)

**Test Suite Structure:**
```javascript
const testCases = [
  {
    phrase: "Review this code",
    expectedSkill: "code-review-trigger",
    shouldTrigger: true
  },
  {
    phrase: "What files changed?",
    expectedSkill: null,
    shouldTrigger: false
  }
];
```

**Validation Script:**
- Load skill-rules.json
- For each test case:
  - Simulate phrase matching logic
  - Check if correct skill would trigger
  - Report pass/fail

---

## Test Cases by Skill

### 1. code-review-trigger (ANALYSIS-ONLY, HIGH PRIORITY)

**Should Trigger:**
- ✓ "Review this code"
- ✓ "Check for bugs in src/"
- ✓ "Validate code quality"
- ✓ "Find issues in my changes"
- ✓ "Analyze this file for problems"
- ✓ "Code review the authentication module"
- ✓ "Inspect the API endpoints"
- ✓ "Audit the error handling"
- ✓ "Is this code good?"
- ✓ "Check this for bugs"

**Should NOT Trigger:**
- ✗ "Code" (too generic, no review intent)
- ✗ "Files" (no code review intent)
- ✗ "What changed?" (status check, should trigger git-workflow-trigger)
- ✗ "Review meeting" (not code review)
- ✗ "Check email" (not code-related)

**Expected Behavior:**
- Invoke `/code-review` command
- Pass arguments from natural language (e.g., "src/" from "Review src/")
- Run multi-aspect code review
- Return findings

---

### 2. research-trigger (ANALYSIS-ONLY, HIGH PRIORITY)

**Should Trigger:**
- ✓ "Research best practices for error handling"
- ✓ "How do I implement OAuth2?"
- ✓ "What are the options for state management?"
- ✓ "Find information about GraphQL"
- ✓ "Investigate performance optimization"
- ✓ "Look up JWT patterns"
- ✓ "Search for Sentry examples"
- ✓ "Discover alternatives to Express"
- ✓ "Best practices for API versioning"
- ✓ "How should I approach authentication?"

**Should NOT Trigger:**
- ✗ "What is the current mode?" (DAIC mode question → daic_mode_guidance)
- ✗ "What's in progress?" (project status → pm-status-trigger)
- ✗ "What files changed?" (git status → git-workflow-trigger)
- ✗ "How are you?" (casual conversation)

**Expected Behavior:**
- Invoke `/research` command
- Extract question from natural language
- Run parallel research agents
- Return comprehensive findings

---

### 3. pm-workflow-trigger (WRITE-CAPABLE, HIGH PRIORITY)

**Should Trigger (IMPLEMENT mode only):**
- ✓ "Start working on epic auth-system"
- ✓ "Begin issue #456"
- ✓ "Launch epic dashboard"
- ✓ "Work on issue 789"
- ✓ "Parse PRD for user-profiles"
- ✓ "Convert PRD to epic"
- ✓ "Create new PRD"

**Should NOT Trigger:**
- ✗ "What's the status of epic X?" (status query → pm-status-trigger)
- ✗ "Show issue #123" (info display → pm-status-trigger)
- ✗ "List epics" (listing → pm-status-trigger)
- ✗ "Start thinking about epic" (not actionable workflow)

**Expected Behavior:**
- Only activate in IMPLEMENT mode
- Blocked in DISCUSS/ALIGN/CHECK modes
- Route to appropriate PM command
- Create branches, modify files as needed

---

### 4. pm-status-trigger (ANALYSIS-ONLY, HIGH PRIORITY)

**Should Trigger:**
- ✓ "What should I work on next?"
- ✓ "What's in progress?"
- ✓ "Show me what's blocked"
- ✓ "Project status"
- ✓ "What am I working on?"
- ✓ "Next task"
- ✓ "Show blockers"
- ✓ "Current work"

**Should NOT Trigger:**
- ✗ "Start working on epic" (workflow action → pm-workflow-trigger)
- ✗ "Create new issue" (workflow action)
- ✗ "Status code 404" (HTTP status, not project status)

**Expected Behavior:**
- Activate in any DAIC mode
- Route to appropriate PM command (/pm:next, /pm:status, /pm:blocked)
- Return formatted status information

---

### 5. git-workflow-trigger (WRITE-CAPABLE, MEDIUM PRIORITY)

**Should Trigger:**
- ✓ "Commit my changes" (IMPLEMENT mode)
- ✓ "Save work and commit" (IMPLEMENT mode)
- ✓ "Show my changes" (any mode)
- ✓ "Git status" (any mode)
- ✓ "Push to remote" (IMPLEMENT mode)

**Should NOT Trigger:**
- ✗ "Commit to the plan" (not git-related)
- ✗ "Change settings" (not git changes)
- ✗ "Save file" (file operation, not git)

**Expected Behavior:**
- Read operations (status) allowed in any mode
- Write operations (commit, push) only in IMPLEMENT mode
- Route to appropriate git command
- Validate working directory state

---

### 6. error-tracking (ANALYSIS-ONLY, MEDIUM PRIORITY)

**Should Trigger:**
- ✓ "How do I handle exceptions?"
- ✓ "Set up crash reporting"
- ✓ "Add error recovery logic"
- ✓ "Configure Sentry"
- ✓ "Implement try-catch patterns"
- ✓ "Track exceptions"
- ✓ "Error boundary setup"

**Should NOT Trigger:**
- ✗ "Error in my code" (debugging, not error tracking setup)
- ✗ "Fix this error" (bug fixing, not error handling architecture)
- ✗ "Error message" (generic mention)

**Expected Behavior:**
- Activate in any DAIC mode
- Provide error handling guidance
- Suggest Sentry integration patterns
- Recommend best practices

---

### 7. framework_health_check (ANALYSIS-ONLY, MEDIUM PRIORITY)

**Should Trigger:**
- ✓ "Run framework health check"
- ✓ "Validate framework"
- ✓ "Check if write-gating works"
- ✓ "Is the framework healthy?"
- ✓ "Diagnose framework issues"
- ✓ "Test framework components"

**Should NOT Trigger:**
- ✗ "Framework" (generic mention)
- ✗ "Health insurance" (wrong domain)
- ✗ "Check my health" (not framework-related)

**Expected Behavior:**
- Execute health checks
- Validate write-gating, state persistence, skills, LCMP
- Report pass/fail for each check
- Suggest REPAIR tasks for failures

---

### 8. daic_mode_guidance (ANALYSIS-ONLY, MEDIUM PRIORITY)

**Should Trigger:**
- ✓ "What mode am I in?"
- ✓ "Can I write files?"
- ✓ "How do I switch to IMPLEMENT?"
- ✓ "What's allowed in this mode?"
- ✓ "I'm blocked from writing"
- ✓ "DAIC workflow help"

**Should NOT Trigger:**
- ✗ "Mode switching circuit" (electronics context)
- ✗ "Can I write a novel?" (not coding context)
- ✗ "Allowed users" (permissions, not DAIC modes)

**Expected Behavior:**
- Explain current DAIC mode
- List allowed operations
- Provide mode transition guidance
- Help troubleshoot mode confusion

---

### 9. contextkit-planning-trigger (ANALYSIS-ONLY, MEDIUM PRIORITY)

**Should Trigger:**
- ✓ "Plan this feature"
- ✓ "How should I approach this?"
- ✓ "Break down into steps"
- ✓ "Research tech options"
- ✓ "Create implementation plan"
- ✓ "Quick planning"

**Should NOT Trigger:**
- ✗ "Floor plan" (architecture, not software planning)
- ✗ "Plan vacation" (not coding context)
- ✗ "Approach road" (navigation, not coding)

**Expected Behavior:**
- Route to appropriate ContextKit planning command
- Generate planning documentation
- Return structured plan

---

### 10. testing-trigger (ANALYSIS-ONLY, MEDIUM PRIORITY)

**Should Trigger:**
- ✓ "Run tests"
- ✓ "Test this code"
- ✓ "Execute test suite"
- ✓ "Run unit tests"
- ✓ "Test everything"

**Should NOT Trigger:**
- ✗ "Test kitchen" (cooking context)
- ✗ "Run errands" (daily tasks)
- ✗ "Execute plan" (not test execution)

**Expected Behavior:**
- Invoke `/testing:run` command
- Execute configured test suite
- Return test results

---

### 11. validation-trigger (WRITE-CAPABLE, MEDIUM PRIORITY)

**Should Trigger (IMPLEMENT mode only):**
- ✓ "Fix linting errors"
- ✓ "Validate code quality"
- ✓ "Auto-fix issues"
- ✓ "Run quality checks"
- ✓ "Format code"

**Should NOT Trigger:**
- ✗ "Validate parking" (not code validation)
- ✗ "Fix dinner" (not code fixing)
- ✗ "Code formatting course" (educational, not action)

**Expected Behavior:**
- Only activate in IMPLEMENT mode
- Invoke `/validate-and-fix` command
- Run linting, type checks, auto-fix
- Modify files to fix issues

---

### 12. checkpoint-trigger (WRITE-CAPABLE, LOW PRIORITY)

**Should Trigger (IMPLEMENT mode only):**
- ✓ "Create checkpoint"
- ✓ "Save current state"
- ✓ "Restore checkpoint 3"
- ✓ "List checkpoints"

**Should NOT Trigger:**
- ✗ "Checkpoint Charlie" (historical reference)
- ✗ "Save money" (financial, not state saving)
- ✗ "List groceries" (not checkpoints)

**Expected Behavior:**
- Only activate in IMPLEMENT mode
- Route to appropriate checkpoint command
- Use git stash mechanism

---

### 13-20. Existing Skills (Expanded Triggers)

**Testing approach for existing skills:**
- All existing skills have 2-3x more triggers than before
- Focus on testing new keywords and intent patterns
- Ensure backward compatibility with original triggers
- Verify no conflicts between skills

---

## Validation Checklist

### Pre-Deployment Validation

- [ ] **JSON Syntax:** skill-rules.json is valid JSON
- [ ] **Schema Validation:** All required fields present (type, skillType, daicMode, priority, promptTriggers)
- [ ] **Keyword Uniqueness:** No duplicate keywords across skills (acceptable if different contexts)
- [ ] **Intent Pattern Syntax:** All regex patterns are valid
- [ ] **DAIC Mode Configuration:** WRITE-CAPABLE skills have `allowedModes: ["IMPLEMENT"]`
- [ ] **Priority Assignment:** High/Medium/Low assigned appropriately
- [ ] **Skill File Existence:** All 20 skill files exist in `.claude/skills/`
- [ ] **Trigger Reference Documentation:** Each skill file documents its triggers

### Post-Deployment Testing

- [ ] **Claude Code Restart:** Restart to load new skill-rules.json
- [ ] **Skill Discovery:** Confirm all 20 skills discovered
- [ ] **Trigger Accuracy:** Test 10-20 phrases per skill for correct triggering
- [ ] **False Positive Check:** Test edge cases that should NOT trigger skills
- [ ] **DAIC Mode Enforcement:** Test WRITE-CAPABLE skills blocked in DISCUSS mode
- [ ] **Command Routing:** Verify new workflow-trigger skills invoke correct slash commands
- [ ] **Performance:** Ensure no degradation in response time with 140+ keywords

### Conflict Resolution

**If multiple skills match:**
1. **Priority-based resolution:** Higher priority wins
2. **Skill type precedence:** workflow > domain > framework
3. **Specificity rule:** More specific match wins (longer keyword match)
4. **First match:** If equal priority/specificity, first configured skill wins

**Expected conflicts (acceptable):**
- "research" could match both `research-trigger` and `contextkit-planning-trigger` ("research tech")
  - Resolution: `contextkit-planning-trigger` has higher specificity for "research tech"
- "hook" could match both `cc-sessions-core` and `cc-sessions-hooks`
  - Resolution: `cc-sessions-hooks` is more specific (hook-focused)

---

## Testing Results Template

```markdown
## Test Results - [Date]

### Skill: [skill-name]

| Phrase | Expected | Actual | Result |
|--------|----------|--------|--------|
| "Review this code" | code-review-trigger | code-review-trigger | ✓ PASS |
| "Code" | null | null | ✓ PASS |
| "Check for bugs" | code-review-trigger | code-review-trigger | ✓ PASS |

**Summary:**
- Total Tests: 20
- Passed: 18
- Failed: 2
- Warnings: 0

**Issues Found:**
1. False positive: "commit to the plan" triggered git-workflow-trigger (should not)
2. False negative: "validate this code" did not trigger code-review-trigger (should)

**Recommended Fixes:**
1. Add negative pattern to git-workflow-trigger to exclude "commit to"
2. Add "validate this" to code-review-trigger keywords
```

---

## Edge Cases & Ambiguities

### 1. Multi-Intent Phrases

**Example:** "Review this code and fix linting errors"
- Contains both review intent and fix intent
- **Expected:** Trigger code-review-trigger (first intent)
- **Alternative:** Trigger both skills sequentially
- **Current Behavior:** First matching skill wins

### 2. Context-Dependent Triggers

**Example:** "What are the options?"
- Could be research question or project status query
- Depends on conversation context
- **Resolution:** Favor research-trigger (more common use case)

### 3. Abbreviations

**Example:** "err handling"
- Should match "error handling"
- **Current:** May not match if keyword is "error handling" (exact match)
- **Recommendation:** Add "err" as separate keyword if commonly used

### 4. Typos

**Example:** "reserach best practices" (typo: reserach)
- Will not match "research" keyword (exact match)
- **Recommendation:** Fuzzy matching not supported, user must fix typo

---

## Performance Considerations

**Trigger Matching Cost:**
- 140+ keywords to check per user message
- 55+ regex patterns to evaluate
- **Mitigation:** Keywords checked first (fast), regex only for matches

**Token Impact:**
- Each skill file adds to context when triggered
- 9 new skills = ~9KB additional skill prompt content
- **Mitigation:** Skills only loaded when triggered (lazy loading)

**Optimization Recommendations:**
1. **Keyword First:** Always check keywords before intent patterns
2. **Short-Circuit:** Stop matching once skill found (unless collecting all matches)
3. **Regex Efficiency:** Use non-capturing groups `(?:...)` for faster regex
4. **Skill Precedence:** Order skills in skill-rules.json by likelihood (most common first)

---

## Maintenance Guidelines

### Adding New Triggers

1. **Identify natural language patterns users actually type**
2. **Add keywords for literal phrase matches**
3. **Add intent patterns for flexible variations**
4. **Test for false positives**
5. **Document in skill file's Trigger Reference section**
6. **Update this testing guide**

### Removing Triggers

1. **Analyze usage data to identify unused triggers**
2. **Remove triggers with 0% activation rate after 30 days**
3. **Log removal in skill-rules.json version history**
4. **Update skill file documentation**

### Resolving Conflicts

1. **Identify conflicting keywords/patterns**
2. **Determine which skill should win**
3. **Adjust priority or specificity**
4. **Add negative patterns to exclude false positives**
5. **Test resolution thoroughly**

---

## Summary Statistics

| Metric | Value |
|--------|-------|
| **Total Skills** | 20 (11 existing + 9 new) |
| **Total Keywords** | 140+ |
| **Total Intent Patterns** | 55+ |
| **ANALYSIS-ONLY Skills** | 14 |
| **WRITE-CAPABLE Skills** | 6 |
| **High Priority Skills** | 6 |
| **Medium Priority Skills** | 12 |
| **Low Priority Skills** | 2 |
| **Test Cases Created** | 100+ |

---

## Next Steps

1. **Manual Testing:** Test all 100+ test cases manually
2. **Automated Testing:** Build test suite for regression testing
3. **Usage Monitoring:** Track which triggers activate most frequently
4. **Refinement:** Adjust triggers based on real-world usage
5. **Documentation:** Keep this guide updated with new findings

---

**Testing Guide Complete:** 2025-11-15
**Author:** Claude (cc-sessions framework)
**Task:** m-audit-and-add-auto-invoke-triggers
**Version:** 3.0.0
