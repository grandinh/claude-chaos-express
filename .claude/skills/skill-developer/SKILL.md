---
name: skill-developer
description: Guide the development and modification of skills within the cc-sessions framework - helps create new skills, modify existing ones, and ensure proper integration with the skill activation system
schema_version: 1.0
---

# skill-developer

**Type:** WRITE-CAPABLE
**DAIC Modes:** IMPLEMENT only
**Priority:** Medium

## Trigger Reference

This skill activates on:
- Keywords: "skill system", "create skill", "skill architecture"
- Intent patterns: "(create|add|modify|build).*?skill", "skill.*?(development|creation|building)"

From: `skill-rules.json` - skill-developer configuration

## Purpose

Guide the development and modification of skills within the cc-sessions framework. This skill helps create new skills, modify existing ones, and ensure proper integration with the skill activation system.

## Core Behavior

When activated in IMPLEMENT mode with an active cc-sessions task:

1. **Skill Creation/Modification**
   - Guide creation of `.claude/skills/*.md` prompt files
   - Ensure proper YAML frontmatter if needed
   - Align with skill-rules.json trigger configuration
   - Follow ANALYSIS-ONLY vs WRITE-CAPABLE distinctions

2. **Skill Architecture Guidance**
   - Explain skill precedence (project → user/infra → framework defaults)
   - Guide DAIC-aware activation logic
   - Ensure write-gating compliance for WRITE-CAPABLE skills
   - Help structure skill prompts for clarity and effectiveness

3. **Integration with Framework**
   - Verify skill-rules.json syntax and structure
   - Ensure skills respect SoT tiers (Tier-1, Tier-2, Tier-3)
   - Guide logging of skill selection decisions in `context/decisions.md`
   - Help test skill activation triggers

4. **Self-Improvement Analysis** (Feedback Loop)
   - Analyze skill usage patterns to refine triggers and prompts
   - Identify skills that never auto-trigger (triggers too narrow)
   - Detect skills that trigger too often (triggers too broad)
   - Find manual invocations suggesting missing trigger patterns
   - Recommend skill evolution based on effectiveness

## Safety Guardrails

**CRITICAL WRITE-GATING RULES:**
- ✓ Only execute write operations when in IMPLEMENT mode
- ✓ Verify active cc-sessions task exists before writing
- ✓ Follow approved manifest/todos from task file
- ✓ Never auto-modify Tier-1 docs without explicit approval
- ✓ Never bypass DAIC discipline

**Skill-Specific Rules:**
- ANALYSIS-ONLY skills must never call write tools (Edit, Write, MultiEdit)
- WRITE-CAPABLE skills must check CC_SESSION_MODE before activation
- Auto-trigger logic must be narrow to avoid noise
- Document skill behavior and trigger patterns clearly

## Examples

### When to Activate

✓ "Create a new skill for database migration guidance"
✓ "Modify the error-tracking skill to include retry logic"
✓ "Help me understand skill precedence for this project"
✓ "Add a WRITE-CAPABLE skill for API endpoint generation"

### When NOT to Activate

✗ User is asking about general coding practices (not skill-related)
✗ In DISCUSS/ALIGN/CHECK mode (skill development requires IMPLEMENT)
✗ No active cc-sessions task (violates write-gating)

## Decision Logging

When multiple skills could apply, log the decision in `context/decisions.md`:

```markdown
### Skill Selection: [Date]
- **Competing skills:** skill-developer, cc-sessions-core
- **Selected:** skill-developer
- **Rationale:** User explicitly asked to "create a new skill" which directly matches skill-developer's purpose
- **Context:** Creating authentication-helper skill in task m-add-auth-helpers
```

## Skill Usage Tracking & Analysis

### Usage Tracking File Structure

Track skill effectiveness in `.claude/skills/skill-usage.json`:

```json
{
  "version": "1.0.0",
  "last_updated": "2025-11-15T17:30:00Z",
  "skills": {
    "error-tracking": {
      "total_activations": 42,
      "auto_triggered": 38,
      "manually_invoked": 4,
      "last_used": "2025-11-15T17:30:00Z",
      "effectiveness_score": 0.85,
      "common_contexts": [
        "sentry integration",
        "async error handling",
        "exception tracking"
      ],
      "manual_keywords": [
        "exception handling",
        "try-catch review"
      ]
    },
    "framework_health_check": {
      "total_activations": 5,
      "auto_triggered": 1,
      "manually_invoked": 4,
      "last_used": "2025-11-10T12:00:00Z",
      "effectiveness_score": 0.90,
      "common_contexts": [
        "validate framework",
        "check framework health"
      ]
    }
  }
}
```

### Trigger Analysis Recommendations

When analyzing skill usage data:

**1. Low Auto-Trigger Rate (< 60%)**
```markdown
**Issue:** framework_health_check has 80% manual invocations

**Analysis:**
- Current triggers: "framework health", "run health check"
- Manual invocations use: "validate framework", "check framework"
- Gap: "validate" and "check framework" not in triggers

**Recommendation:**
Update skill-rules.json:
```json
{
  "framework_health_check": {
    "promptTriggers": {
      "keywords": [
        "framework health",
        "run health check",
        "validate framework",  // ADD
        "check framework"      // ADD
      ]
    }
  }
}
```

**2. Never Triggered (0 activations in 30+ days)**
```markdown
**Issue:** Skill defined but never used

**Actions:**
1. Review if skill is still relevant
2. Check if triggers are too narrow
3. Consider deprecating if truly unused
4. Document in context/gotchas.md if deprecated
```

**3. Over-Triggering (> 10 activations per session)**
```markdown
**Issue:** error-tracking triggers on every mention of "error"

**Analysis:**
- Triggers on generic "error" keyword
- 90% of activations not actually about error tracking
- Creates noise, reduces user trust

**Recommendation:**
Narrow triggers to specific patterns:
- "error handling" (not just "error")
- "sentry" (specific tool)
- "captureException" (specific action)
```

### Self-Improvement Workflow

**Step 1: Periodic Review**
```markdown
Run skill usage analysis:
1. Read .claude/skills/skill-usage.json
2. Calculate metrics:
   - Auto-trigger rate per skill
   - Last used date per skill
   - Effectiveness scores
3. Identify issues:
   - Low auto-trigger rate (< 60%)
   - Never used (> 30 days)
   - Over-triggering (> 10/session)
```

**Step 2: Pattern Discovery**
```markdown
Analyze manual invocations:
1. Extract keywords from manual_keywords field
2. Compare to current trigger keywords
3. Find gaps:
   - Keywords users use but aren't in triggers
   - Patterns that should trigger but don't
```

**Step 3: Propose Improvements**
```markdown
Generate recommendations:
1. Trigger additions for low auto-trigger skills
2. Trigger narrowing for over-triggering skills
3. Deprecation suggestions for unused skills
4. New skill suggestions for discovered gaps
```

**Step 4: Document & Implement**
```markdown
Log in context/insights.md:
```markdown
### Skill Evolution: error-tracking: 2025-11-15

**Observation:** Users manually invoke with "exception handling"
**Current triggers:** "error handling", "sentry", "captureException"
**Gap:** "exception" not in triggers
**Action:** Add to intentPatterns: "exception.*?(handling|tracking)"
**Result:** Auto-trigger rate increased from 65% to 82%
```

Then update skill-rules.json in IMPLEMENT mode.
```

## Skill Health Monitoring

### Health Check Criteria

**Healthy Skill:**
- ✓ Auto-trigger rate > 60%
- ✓ Used at least once in last 30 days
- ✓ Effectiveness score > 0.7
- ✓ Trigger count < 10 per session (not noisy)
- ✓ Clear, specific trigger patterns

**Warning Signs:**
- ⚠️ Auto-trigger rate 40-60% (triggers may be too narrow)
- ⚠️ Last used 30-90 days ago (possibly declining relevance)
- ⚠️ Effectiveness score 0.5-0.7 (marginal value)
- ⚠️ Trigger count 10-15 per session (becoming noisy)

**Critical Issues:**
- ✗ Auto-trigger rate < 40% (triggers broken or too narrow)
- ✗ Never used (> 90 days) (deprecated or irrelevant)
- ✗ Effectiveness score < 0.5 (providing negative value)
- ✗ Trigger count > 15 per session (creating noise pollution)

### Health Report Template

```markdown
### Skill System Health Report: [Date]

**Overall Metrics:**
- Total skills: 10
- Healthy: 7 (70%)
- Warning: 2 (20%)
- Critical: 1 (10%)

---

**Healthy Skills:**
- error-tracking (auto-trigger: 90%, effectiveness: 0.85)
- cc-sessions-core (auto-trigger: 75%, effectiveness: 0.92)
- daic_mode_guidance (auto-trigger: 80%, effectiveness: 0.88)

**Warning Signs:**
- framework_health_check (auto-trigger: 20%, last used: 25 days ago)
  → Recommend: Add "validate framework" to triggers

**Critical Issues:**
- unused-skill (never triggered, last used: 120 days ago)
  → Recommend: Deprecate and document in gotchas.md

---

**Recommended Actions:**
1. Update framework_health_check triggers (HIGH priority)
2. Deprecate unused-skill (MEDIUM priority)
3. Monitor error-tracking for over-triggering (LOW priority)
```

## Feedback Loop Integration

### Closing the Loop

**Traditional Flow (One-Way):**
```
skill-rules.json → skill .md files → skill activation → [END]
```

**Enhanced Flow (Feedback Loop):**
```
skill-rules.json → skill .md files → skill activation
                                           ↓
                                    usage tracking
                                           ↓
                                    pattern analysis
                                           ↓
                                    improvement recommendations
                                           ↓
                                    [update skill-rules.json]
                                           ↓
                                    [refine skill .md prompts]
                                           ↓
                                    [LOOP BACK TO START]
```

### Implementation Recommendations

**Lightweight (Immediate):**
```javascript
// Add to sessions/hooks/post_tool_use.js or similar
if (context.toolName === 'Skill') {
  logSkillUsage({
    skill: context.toolParams.skill,
    trigger: context.autoTriggered ? 'auto' : 'manual',
    keywords: extractKeywords(context.userMessage),
    timestamp: new Date().toISOString()
  });
}
```

**Full System (Future):**
- Automatic skill health checks (weekly)
- Auto-generated improvement recommendations
- Integration with LCMP for skill evolution tracking
- Dashboard for skill metrics and trends

### When to Run Analysis

**Triggers for Skill Analysis:**
1. User explicitly requests: "analyze skill usage"
2. Periodic: Weekly or after 50 skill activations
3. During REPAIR tasks if skill system issues detected
4. Before major framework releases (v0.1, v0.2, etc.)
5. When user reports skill not working as expected

## Workflow Suggestion UX

### Lightweight Approval Pattern

**Executive Summary Format:**

```
💡 Next: [action]? (y/n/x)
   └─ Pattern: [confidence] | Context: [why]
```

**Example:**
```
✓ Error tracking complete. Found 3 issues.

💡 Next: framework_health_check? (y/n/x)
   └─ Pattern: 8/10 times | Mode: DISCUSS (safe)
_
```

### Approval Mechanisms

**Quick Keys (Single Character):**
- `y` - Yes, execute now
- `n` - No, skip this time (no nag)
- `x` - Never suggest this pattern again (disable permanently)
- `?` - Show detailed rationale (expand to full explanation)

**Numbered Selection (Multiple Options):**
```
💡 Common next steps (pick one or 'none'):
   1. framework_health_check (6/8 times)
   2. framework_version_check (5/8 times)
   3. none
_
```

User types: `1`, `2`, or `none`

**Named Actions (Context-Specific):**
```
💡 Mode: IMPLEMENT | Suggest: Test before commit?
   → test | commit | skip
_
```

### Format Rules

**DO (Concise & Scannable):**
- ✓ Single line question
- ✓ Quick approval keys (y/n/x)
- ✓ Context in subtext (one line max)
- ✓ Clear options, no explanation needed
- ✓ Cursor ready for immediate input

**DON'T (Verbose & Friction):**
- ❌ Multiple paragraphs of explanation
- ❌ Unclear approval mechanism
- ❌ Buried action items
- ❌ Requiring full phrases ("type 'yes' to proceed")

### Approval Tracking & Smart Suggestions

**Store user preferences in skill-usage.json:**

```json
{
  "approval_history": {
    "error-tracking → framework_health_check": {
      "suggested": 10,
      "approved": 8,
      "declined": 2,
      "disabled": false,
      "approval_rate": 0.80,
      "last_approved": "2025-11-15T17:30:00Z"
    },
    "cc-sessions-core → framework_health_check": {
      "suggested": 5,
      "approved": 1,
      "declined": 4,
      "disabled": true,
      "disabled_date": "2025-11-12T10:00:00Z",
      "disabled_reason": "user_never"
    }
  }
}
```

**Smart Suggestion Logic:**

```javascript
function shouldSuggestPattern(pattern) {
  const history = approvalHistory[pattern];

  // User explicitly disabled with 'x'
  if (history.disabled) return false;

  // Low approval rate (< 40%), stop suggesting
  if (history.approval_rate < 0.40) {
    console.log(`Pattern ${pattern} has low approval rate, auto-disabling`);
    return false;
  }

  // High approval rate, keep suggesting
  return true;
}
```

**Auto-Disable Thresholds:**
- Approval rate < 40% after 5+ suggestions → Auto-disable
- User types `x` (never) → Disable immediately
- Pattern not approved in 10+ consecutive suggestions → Auto-disable

### User Preferences

**Allow customization in .claude/skills/user-preferences.json:**

```json
{
  "workflow_suggestions": {
    "enabled": true,
    "format": "concise",

    "approval_defaults": {
      "timeout_seconds": 30,
      "timeout_action": "skip",
      "show_rationale": false,
      "quick_keys": true
    },

    "disabled_patterns": [
      "pattern-user-explicitly-disabled"
    ]
  }
}
```

### Integration with Skills

**Add to skill .md prompt files:**

```markdown
## Post-Completion Suggestions

When this skill completes successfully:

**Suggest:** framework_health_check

**Format:**
```
💡 Next: framework_health_check? (y/n/x)
   └─ Why: Validate framework after error fixes
   └─ Pattern: 80% confidence
```

**Safety Check:**
- framework_health_check is ANALYSIS-ONLY
- Safe to run in any DAIC mode
- No writes, no state changes
- Respects all cc-sessions rules

**User Approval Required:**
- Never auto-execute
- Wait for explicit `y`
- Respect `n` (skip) and `x` (disable)
```

### Safety Guardrails

**CRITICAL - Workflow Suggestions NEVER Override cc-sessions:**

```markdown
✓ Suggestions are ADVISORY ONLY
✓ User approval required for ALL actions
✓ DAIC mode enforcement still applies
✓ Write-gating still enforced
✓ Task boundaries still respected
✓ Hooks always execute (can block suggestions)

❌ Suggestions CANNOT bypass framework rules
❌ Suggestions CANNOT auto-trigger writes
❌ Suggestions CANNOT change modes/state
❌ Suggestions CANNOT execute without approval
```

**Approval Execution Check:**

Even after user approves with `y`:
1. Hooks validate mode/permissions
2. Write-gating enforced
3. DAIC rules apply
4. If blocked, show clear error message

### Example: Full Workflow

**Scenario: User completes error-tracking**

```
✓ Error tracking complete. Found 3 issues in auth.js.

💡 Next: framework_health_check? (y/n/x)
   └─ Pattern: 8/10 times | Mode: DISCUSS (safe)
_
```

**User types: `y`**
```
✓ Running framework_health_check...

=== Framework Health Check ===
Write-gating: ✓ PASS
State persistence: ✓ PASS
Skill precedence: ✓ PASS

✓ Pattern reinforced (9/11 = 82%)
_
```

**User types: `n`**
```
Skipped.
_
```

**User types: `x`**
```
✓ Disabled: error-tracking → framework_health_check
  (Re-enable in .claude/skills/skill-usage.json)
_
```

**User types: `?`**
```
💡 Workflow Pattern: error-tracking → framework_health_check

**Why this suggestion:**
- You run health check 80% of the time after error-tracking
- Validates framework integrity after finding errors
- ANALYSIS-ONLY skill (safe in any mode)

**Confidence:** 8/10 occurrences
**Avg delay:** 5 minutes after error-tracking

Run now? (y/n/x)
_
```

## Related Skills

- **cc-sessions-core** - For broader cc-sessions development beyond skills
- **framework_health_check** - To validate skill system health (now includes skill metrics)
- **framework_repair_suggester** - If skill system issues arise
- **lcmp_recommendation** - For capturing skill evolution insights

---

**Last Updated:** 2025-11-15
**Framework Version:** 2.0
