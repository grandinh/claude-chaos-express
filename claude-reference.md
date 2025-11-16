# claude-reference.md – Detailed Framework Spec & Examples
# Framework Version: 2.0
# Last Updated: 2025-11-15
# Recent Changes: REPAIR-todo-refinement-vs-scope-change (2025-11-15) - Added Section 2 (todo refinement guidance), fixed path references

This file supports `claude.md`. Use it for:
- Framework debugging
- REPAIR- tasks
- Health checks
- Concrete examples and templates

---

## 1. State Persistence – Example Schema

`sessions/sessions-state.json` is a lightweight checkpoint. Example:

```json
{
  "mode": "IMPLEMENT",
  "task_id": "task-2024-12-20-001",
  "last_todo_completed": 3,
  "timestamp": "2024-12-20T10:30:00Z",
  "last_file_modified": "src/api/handler.ts"
}
```

---

## 2. Todo Refinement vs Scope Change

**Note:** This guidance applies to all cc-sessions tasks, especially REPAIR tasks (see `CLAUDE.md` Section 6.3).

### 2.1 Definitions

**Todo Refinement** - Legitimate breakdown of generic placeholder todos into specific implementation steps after gathering context. This is a natural part of the ALIGN phase and should NOT trigger scope violation warnings.

**Scope Change** - Fundamental alteration of what the task is trying to accomplish, adding new features, or changing success criteria without explicit user approval. This SHOULD trigger scope violation warnings.

### 2.2 Legitimate Refinement Examples (✓ ALLOWED)

**Example 1: Breaking down "Begin work on task"**
```markdown
Before (from task startup):
□ Begin work on task

After (after context gathering in ALIGN):
□ Read authentication flow in src/auth/middleware.ts
□ Add JWT verification to existing middleware
□ Update tests in tests/auth/middleware.test.ts
□ Document changes in CLAUDE.md
```
**Why allowed:** Original todo was a generic placeholder. Refinement maintains the same goal (work on the task) but adds specific steps based on gathered context.

**Example 2: Expanding implementation steps**
```markdown
Before:
□ Fix path references in documentation

After:
□ Fix CLAUDE.md path references (4 locations)
□ Fix claude-reference.md path references (1 location)
□ Fix skill file path references (5 locations)
□ Verify all corrections complete
```
**Why allowed:** Same goal (fix path references), just broken into file-specific subtasks for tracking clarity.

### 2.3 Scope Change Examples (✗ VIOLATION)

**Example 1: Adding new features**
```markdown
Original task: "Fix authentication bug in login flow"

Before:
□ Debug login issue
□ Fix authentication bug

After:
□ Debug login issue
□ Fix authentication bug
□ Add OAuth support ← SCOPE CHANGE
□ Implement password reset ← SCOPE CHANGE
```
**Why violation:** Added completely new features not in original task scope.

**Example 2: Changing success criteria**
```markdown
Original success criteria: "Fix bug where users can't log in with email"

New todos:
□ Fix email login bug
□ Rewrite entire auth system to use different library ← SCOPE CHANGE
```
**Why violation:** Changed from a targeted bug fix to a major architectural change.

### 2.4 Decision Framework

Ask these questions when todos change:

1. **Is the goal the same?**
   - YES → Likely refinement
   - NO → Likely scope change

2. **Are you adding implementation detail or adding new features?**
   - Implementation detail → Refinement
   - New features → Scope change

3. **Would the user expect this based on the original task description?**
   - YES → Refinement
   - NO → Scope change

4. **Does it still satisfy the same success criteria?**
   - YES → Refinement
   - NO → Scope change

### 2.5 When Shame Ritual is Needed

The shame ritual (scope violation warning) should ONLY trigger when:
- Fundamental task goal changes
- New features added without user approval
- Success criteria modified without user approval
- Work diverges from stated task purpose

The shame ritual should NOT trigger when:
- Breaking generic todos into specific steps
- Adding file-specific subtasks for same goal
- Expanding implementation detail after context gathering
- Reordering or restructuring todos for same outcome

---

## 3. Skills – Concrete Examples

### 3.1 Skill File Structure (ANALYSIS-ONLY)

Example: `.claude/skills/error-tracking.md`

```markdown
# error-tracking

**Type:** ANALYSIS-ONLY
**DAIC Modes:** DISCUSS, ALIGN, IMPLEMENT, CHECK (all modes)
**Priority:** Medium

## Trigger Reference

This skill activates on:
- Keywords: "error handling", "sentry", "error tracking"
- Intent patterns: "(add|implement|configure).*?sentry"
- File patterns: `**/instrument.ts`, `**/sentry*.ts`

From: `skill-rules.json` - error-tracking configuration

## Purpose

Provide analysis and recommendations for error handling patterns, Sentry integration, and error monitoring strategies.

## Core Behavior

In any DAIC mode:

1. **Error Handling Analysis**
   - Review try-catch patterns
   - Identify missing error boundaries
   - Suggest error recovery strategies

2. **Sentry Integration Guidance**
   - Recommend Sentry SDK setup
   - Suggest captureException() placements
   - Guide context enrichment

## Safety Guardrails

**CRITICAL:**
- ✓ ANALYSIS-ONLY skill (never calls write tools)
- ✓ Runs in any DAIC mode (safe)
- ✓ Provides suggestions only
- ✓ Respects all cc-sessions rules
```

### 2.2 Skill File Structure (WRITE-CAPABLE)

Example: `.claude/skills/cc-sessions-core.md`

```markdown
# cc-sessions-core

**Type:** WRITE-CAPABLE
**DAIC Modes:** IMPLEMENT only
**Priority:** High

## Trigger Reference

This skill activates on:
- Keywords: "hook", "session", "task", "api endpoint"
- Intent patterns: "(create|modify|refactor).*?(hook|session|task)"
- File patterns: `sessions/**/*.js`

From: `skill-rules.json` - cc-sessions-core configuration

## Purpose

Guide development of core cc-sessions functionality.

## Core Behavior

When activated in IMPLEMENT mode with an active cc-sessions task:

1. **Development Guidance**
   - Create/modify hooks, sessions, tasks
   - Follow cc-sessions patterns
   - Respect DAIC discipline

## Safety Guardrails

**CRITICAL WRITE-GATING RULES:**
- ✓ Only execute write operations when in IMPLEMENT mode
- ✓ Verify active cc-sessions task exists before writing
- ✓ Follow approved manifest/todos from task file
- ✓ Never bypass DAIC discipline
```

### 2.3 Skill Configuration (skill-rules.json)

Example configuration for error-tracking skill:

```json
{
  "skills": {
    "error-tracking": {
      "type": "domain",
      "skillType": "ANALYSIS-ONLY",
      "daicMode": {
        "allowedModes": ["DISCUSS", "ALIGN", "IMPLEMENT", "CHECK"]
      },
      "enforcement": "suggest",
      "priority": "medium",
      "promptTriggers": {
        "keywords": [
          "error handling",
          "sentry",
          "error tracking",
          "captureException"
        ],
        "intentPatterns": [
          "(add|implement|configure).*?sentry",
          "error.*?(tracking|monitoring|handling)"
        ]
      },
      "fileTriggers": {
        "pathPatterns": [
          "**/instrument.ts",
          "**/sentry*.ts"
        ]
      }
    }
  }
}
```

### 2.4 Skill Usage Tracking

Example `.claude/skills/skill-usage.json`:

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
  },
  "approval_history": {
    "error-tracking → framework_health_check": {
      "suggested": 10,
      "approved": 8,
      "declined": 2,
      "disabled": false,
      "approval_rate": 0.80,
      "last_approved": "2025-11-15T17:30:00Z"
    }
  }
}
```

### 2.5 Skill Validation Steps

**For ANALYSIS-ONLY skills:**

1. Verify skill file has `Type: ANALYSIS-ONLY` header
2. Confirm no write tool calls in behavior description
3. Check `daicMode.allowedModes` includes all DAIC modes
4. Test auto-trigger with configured keywords
5. Validate manual invocation by name

**For WRITE-CAPABLE skills:**

1. Verify skill file has `Type: WRITE-CAPABLE` header
2. Confirm "CRITICAL WRITE-GATING RULES" section exists
3. Check `daicMode.allowedModes` is `["IMPLEMENT"]`
4. Test write-gating enforcement (should block in DISCUSS/ALIGN/CHECK)
5. Verify active task check before write operations
6. Test manifest/todo following in IMPLEMENT mode

**For all skills:**

1. Verify entry in `skill-rules.json`
2. Test auto-trigger keywords
3. Test intent pattern matching
4. Verify skill precedence (project > user/infra > defaults)
5. Check decision logging in `context/decisions.md` when multiple skills apply

### 3.6 Automated Skill Assessment Workflow

The framework includes an automated skill assessment system integrated via the `post_tool_use.js` hook.

**Hook Detection Pattern:**

When a new `.md` file is created in `.claude/skills/`:

```javascript
// post_tool_use.js (lines 222-275)
if (["Edit", "Write", "MultiEdit"].includes(toolName)) {
    const filePath = path.resolve(toolInput.file_path);
    const skillsPath = path.join(PROJECT_ROOT, '.claude', 'skills');

    // Check if file is in .claude/skills/ and is a .md file
    if (filePath.startsWith(skillsPath) && filePath.endsWith('.md')) {
        const skillFileName = path.basename(filePath);

        // Exclude README.md
        if (skillFileName !== 'README.md') {
            // Check if skill already exists in skill-rules.json
            const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf-8'));
            const skillName = skillFileName.replace('.md', '');

            // Only suggest if NOT yet configured
            if (!rules.skills || !rules.skills[skillName]) {
                console.error(`
[New Skill Detected] ${skillFileName} created but not yet in skill-rules.json.

💡 Recommendation: Assess this skill for auto-invocation using:
   1. context-gathering agent to understand skill purpose
   2. code-analyzer agent to find codebase patterns
   3. skill-assessor skill (if configured)
`);
            }
        }
    }
}
```

**Assessment Workflow Example:**

```markdown
# Scenario: User creates new "database-migration" skill

1. User creates `.claude/skills/database-migration.md` in IMPLEMENT mode

2. Hook detects file creation and prints to stderr:
   [New Skill Detected] database-migration.md created but not yet in skill-rules.json.

   💡 Recommendation: Assess this skill for auto-invocation...

3. Claude sees hook output and suggests:
   "I see you've created a new skill. Would you like me to assess whether it should auto-trigger?"

4. User: "Yes, assess it"

5. Claude invokes skill-assessor skill which:
   a. Uses context-gathering agent to read database-migration.md
   b. Uses code-analyzer to search for migration patterns in codebase
   c. Evaluates against prioritized criteria:
      - Guardrails: LOW (migrations don't enforce framework rules)
      - Frequency: LOW (4% of files contain migration patterns)
      - Convenience: MEDIUM (saves time when working on migrations)
   d. Calculates token cost:
      - Skill file: 350 tokens
      - Estimated trigger rate: 15% of messages mentioning "database"
      - Value Score = (0.15 × 0.3) - (0.35 × 0.85) = -0.25 (negative!)
   e. Recommendation: MANUAL-ONLY
      Rationale: Low frequency and low guardrail value don't justify token cost.
                 User can manually invoke when needed.

6. skill-assessor outputs structured assessment:
   # Skill Assessment: database-migration

   ## Assessment Summary
   - Recommendation: MANUAL-ONLY
   - Confidence: HIGH

   ## Evaluation Criteria

   ### Guardrails/Safety: LOW
   This skill provides guidance for database migrations but does not enforce
   framework rules or prevent errors. It's convenience-focused.

   ### Frequency: LOW
   - Codebase Coverage: 4% of files contain migration patterns
   - Pattern Occurrences: 8 instances found
   - Relevance Rate: 15% (only applies when actively working on migrations)

   ### Token Cost Analysis
   - Skill File Size: 350 tokens
   - Estimated Trigger Rate: 15% of messages
   - Value Score: -0.25 (below 0.4 threshold)
   - Token Waste Risk: CONCERNING

   ## Recommendation

   MANUAL-ONLY invocation recommended. The skill provides value but triggers
   too infrequently to justify auto-loading. Users can invoke it explicitly
   when working on migrations: "use database-migration skill"

   ## Next Steps

   No action needed for skill-rules.json. Keep the skill file for manual use.
   Log this assessment in context/decisions.md.

7. User approves recommendation (no changes to skill-rules.json)

8. Assessment logged in context/decisions.md:
   ### Skill Assessment: database-migration - 2025-11-15

   **Skill File:** `.claude/skills/database-migration.md`
   **Assessed By:** skill-assessor (context-gathering + code-analyzer)

   **Purpose**: Guidance for database schema migrations

   **Evaluation Criteria**:
   - Guardrails/Safety: LOW
   - Frequency: LOW (4% of codebase)
   - Convenience: MEDIUM
   - Token Cost: 350 tokens (CONCERNING)
   - Value Score: -0.25

   **Final Recommendation**: MANUAL-ONLY
   **Rationale**: Low frequency and guardrail value don't justify token cost

   **User Decision**: APPROVED
   **Decision Date**: 2025-11-15
```

**Example: Skill APPROVED for Auto-Invocation:**

```markdown
# Scenario: User creates "framework_scope_guard" skill

1. skill-assessor evaluates:
   - Guardrails: HIGH (prevents scope creep, enforces DAIC discipline)
   - Frequency: HIGH (applies to every task with todos)
   - Token Cost: 400 tokens
   - Value Score = (0.85 × 1.0) - (0.4 × 0.15) = 0.79 (well above threshold!)

2. Recommendation: AUTO-INVOKE
   Suggested triggers:
   {
     "keywords": ["scope change", "add feature", "expand scope", "todo update"],
     "intentPatterns": ["(add|expand|change).*?scope", "todo.*?(update|change)"]
   }

3. User approves

4. User manually adds to skill-rules.json:
   "framework_scope_guard": {
     "type": "domain",
     "skillType": "ANALYSIS-ONLY",
     "daicMode": { "allowedModes": ["DISCUSS", "ALIGN", "IMPLEMENT", "CHECK"] },
     "enforcement": "suggest",
     "priority": "high",
     "promptTriggers": {
       "keywords": ["scope change", "add feature", "expand scope", "todo update"],
       "intentPatterns": ["(add|expand|change).*?scope", "todo.*?(update|change)"]
     }
   }

5. Assessment logged in context/decisions.md with APPROVED status
```

**Key Design Principles:**

1. **Hook is read-only** - Never modifies skill-rules.json, only suggests
2. **Conservative bias** - When uncertain, recommend MANUAL-ONLY
3. **Token cost awareness** - Always calculate and report value score
4. **LCMP logging** - Every assessment logged for pattern learning
5. **User approval required** - No automatic configuration changes