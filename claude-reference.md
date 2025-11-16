# claude-reference.md – Detailed Framework Spec & Examples
# Framework Version: 2.0
# Last Updated: 2025-11-15

This file supports `claude.md`. Use it for:
- Framework debugging
- REPAIR- tasks
- Health checks
- Concrete examples and templates

---

## 1. State Persistence – Example Schema

`/.cc-sessions/state.json` is a lightweight checkpoint. Example:

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

## 2. Skills – Concrete Examples

### 2.1 Skill File Structure (ANALYSIS-ONLY)

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