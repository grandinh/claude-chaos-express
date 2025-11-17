# Skills System

**Version:** 3.0
**Last Updated:** 2025-11-15

This directory contains **20 operational AI skills** that provide specialized guidance and automation within the cc-sessions framework. Skills auto-trigger based on user input patterns or can be manually invoked.

**Recent Changes (v3.0):**
- Added 9 new workflow-trigger skills for natural language slash command invocation
- Expanded trigger coverage from 66 to 140+ keywords (+112% increase)
- Expanded intent patterns from 28 to 55+ patterns (+96% increase)
- Improved natural language coverage from ~40% to ~85%

---

## Quick Reference

### WRITE-CAPABLE Skills (IMPLEMENT mode only)

| Skill | Purpose | Triggers |
|-------|---------|----------|
| **cc-sessions-core** | Core cc-sessions development | "hook", "session", "task", "api endpoint" |
| **cc-sessions-hooks** | Hook system development | "hook", "sessions_enforce", "post_tool_use" |
| **cc-sessions-api** | API/command development | "session command", "task command", "protocol command" |
| **skill-developer** | Skill system development | "skill system", "create skill", "skill architecture" |

### ANALYSIS-ONLY Skills (All DAIC modes)

| Skill | Purpose | Triggers |
|-------|---------|----------|
| **error-tracking** | Error handling analysis | "error handling", "sentry", "captureException" |
| **framework_version_check** | Version sync validation | "framework version", "version mismatch", "version sync" |
| **framework_health_check** | Framework diagnostics | "framework health", "validate framework", "check framework" |
| **framework_repair_suggester** | REPAIR task guidance | "REPAIR task", "framework issue", "broken gating" |
| **lcmp_recommendation** | LCMP compaction suggestions | "/squish", "compaction", "LCMP", "context cleanup" |
| **daic_mode_guidance** | DAIC mode navigation | "what mode", "can I write", "current mode" |
| **skill-assessor** | Skill assessment for auto-invocation | "assess skill", "skill assessment", "evaluate skill" |

### Workflow-Trigger Skills (Natural language wrappers for slash commands)

| Skill | Purpose | Triggers |
|-------|---------|----------|
| **code-review-trigger** | Natural language for /code-review | "review this code", "check for bugs", "validate code" |
| **research-trigger** | Natural language for /research | "research this", "find information", "investigate" |
| **pm-workflow-trigger** | Natural language for PM commands | "create PRD", "start epic", "update issue" |
| **pm-status-trigger** | Natural language for status queries | "project status", "epic progress", "what's next" |
| **git-workflow-trigger** | Natural language for git operations | "commit changes", "create branch", "push code" |
| **contextkit-planning-trigger** | Natural language for ContextKit | "plan feature", "research tech", "break into steps" |
| **testing-trigger** | Natural language for test execution | "run tests", "test this", "check coverage" |
| **validation-trigger** | Natural language for quality checks | "validate this", "check quality", "verify correct" |
| **checkpoint-trigger** | Natural language for checkpoints | "save progress", "checkpoint now", "save state" |

---

## How Skills Work

### Activation

Skills activate in two ways:

1. **Auto-trigger** – Based on keywords and intent patterns in user messages (configured in `skill-rules.json`)
2. **Manual invocation** – User explicitly references a skill by name

### Trigger Configuration

All skills are configured in `skill-rules.json`:

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
        "keywords": ["error handling", "sentry", "error tracking"],
        "intentPatterns": [
          "(add|implement|configure).*?sentry",
          "error.*?(tracking|monitoring|handling)"
        ]
      },
      "fileTriggers": {
        "pathPatterns": ["**/instrument.ts", "**/sentry*.ts"]
      }
    }
  }
}
```

### Skill Types

**ANALYSIS-ONLY**
- May run in any DAIC mode (DISCUSS, ALIGN, IMPLEMENT, CHECK)
- Never call write tools (Edit, Write, MultiEdit)
- Provide guidance, suggestions, and analysis only
- Safe to auto-trigger

**WRITE-CAPABLE**
- Only run in IMPLEMENT mode inside an active cc-sessions task
- May call write tools to modify files
- Must respect write-gating and follow approved manifest/todos
- Auto-trigger logic must check CC_SESSION_MODE before firing

---

## Self-Improvement System

The skill system includes feedback loop capabilities for continuous improvement:

### Usage Tracking

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
      "common_contexts": ["sentry integration", "async error handling"],
      "manual_keywords": ["exception handling", "try-catch review"]
    }
  }
}
```

### Health Monitoring

**Healthy Skill Indicators:**
- Auto-trigger rate > 60%
- Used at least once in last 30 days
- Effectiveness score > 0.7
- Trigger count < 10 per session (not noisy)

**Warning Signs:**
- Auto-trigger rate 40-60% (triggers may be too narrow)
- Last used 30-90 days ago (declining relevance)
- Effectiveness score 0.5-0.7 (marginal value)

**Critical Issues:**
- Auto-trigger rate < 40% (triggers broken)
- Never used (> 90 days) (deprecated or irrelevant)
- Effectiveness score < 0.5 (negative value)
- Trigger count > 15 per session (noise pollution)

### Pattern Discovery

Analyze manual invocations to improve auto-triggers:

1. Extract keywords from `manual_keywords` field in usage tracking
2. Compare to current trigger keywords in `skill-rules.json`
3. Find gaps where users invoke manually with patterns not in triggers
4. Propose trigger additions to increase auto-trigger rate

### Workflow Suggestions

Skills can suggest next steps after completion using lightweight approval UX:

```
✓ Error tracking complete. Found 3 issues.

💡 Next: framework_health_check? (y/n/x)
   └─ Pattern: 8/10 times | Mode: DISCUSS (safe)
```

**Approval Keys:**
- `y` – Yes, execute now
- `n` – No, skip this time (no nag)
- `x` – Never suggest this pattern again
- `?` – Show detailed rationale

**Safety:** Workflow suggestions never bypass cc-sessions rules, write-gating, or DAIC discipline.

---

## Skill Development

### Creating New Skills

Use the `skill-developer` skill in IMPLEMENT mode:

1. Create `.claude/skills/my-skill-name/SKILL.md` using this template:

```markdown
---
name: my-skill-name
description: Brief one-line description of what this skill does
schema_version: 1.0
---

# my-skill-name

**Type:** ANALYSIS-ONLY (or WRITE-CAPABLE)
**DAIC Modes:** DISCUSS, ALIGN, IMPLEMENT, CHECK (or IMPLEMENT only for WRITE-CAPABLE)
**Priority:** High/Medium/Low

## Trigger Reference

This skill activates on:
- **Keywords:** "keyword1", "keyword2", "keyword3"
- **Intent Patterns:** `pattern1.*?pattern2`, `another.*?pattern`

From: `skill-rules.json` - my-skill-name configuration

## Purpose

Clear description of what this skill does and when it should be used.

## Core Behavior

When activated:

1. **Step 1**
   - What happens first
   - Key actions

2. **Step 2**
   - What happens next
   - More details

## Natural Language Examples

**Triggers this skill:**
- ✓ "example trigger phrase"
- ✓ "another example"

**Doesn't trigger:**
- ✗ "non-matching phrase"

## Safety Guardrails

**[WRITE-CAPABLE or ANALYSIS-ONLY] RULES:**
- ✓ List safety rules
- ✓ Constraints and limitations

```

2. **IMPORTANT: Skill assessment is automatically suggested**
   - When you create a new skill file, the `post_tool_use.js` hook detects it
   - If the skill is not yet in `skill-rules.json`, you'll see a suggestion to assess it
   - Run the `skill-assessor` skill to get a comprehensive evaluation
   - The assessment will recommend whether the skill should auto-trigger and provide suggested configuration

3. Add configuration to `skill-rules.json` (if assessment recommends auto-invocation):
   - `skillType` – ANALYSIS-ONLY or WRITE-CAPABLE
   - `daicMode.allowedModes` – Which DAIC modes skill can run in
   - `promptTriggers.keywords` – Trigger keywords (use assessment recommendations)
   - `promptTriggers.intentPatterns` – Regex patterns for user intent
   - `fileTriggers.pathPatterns` – Optional file path patterns

4. Test activation:
   - Verify auto-trigger works with configured keywords
   - Test manual invocation by name
   - Confirm DAIC mode enforcement
   - Validate write-gating for WRITE-CAPABLE skills

### Automated Skill Assessment

The framework includes an automated skill assessment system to prevent skill bloat and ensure only valuable skills auto-trigger:

**How It Works:**
1. Create a new skill file in `.claude/skills/`
2. Hook automatically detects the new file and suggests assessment
3. Invoke `skill-assessor` skill (manually or via suggestion)
4. skill-assessor orchestrates multi-agent analysis:
   - `context-gathering` agent understands skill purpose and domain
   - `code-analyzer` agent finds codebase patterns where skill applies
   - `research-expert` agent (optional) provides domain-specific insights
5. Evaluation uses prioritized criteria:
   - **(c) Guardrails/Safety** (HIGHEST) – Prevents mistakes or enforces framework rules
   - **(b) Frequency** (MEDIUM) – Applies to common scenarios (>60% relevance)
   - **(a) Convenience** (LOWEST) – Merely saves time without protection or frequency
6. Token cost analysis calculates value score to prevent waste
7. Recommendation provided with suggested trigger configuration
8. User must explicitly approve before adding to `skill-rules.json`
9. Assessment logged in `context/decisions.md` for pattern learning

**Conservative Approach:**
- Never auto-modifies `skill-rules.json`
- When uncertain, recommends MANUAL-ONLY invocation
- Token cost analysis prevents bloat
- All decisions logged for future reference

**See:** `.claude/skills/skill-assessor/SKILL.md` for detailed assessment methodology

### Skill Precedence

When multiple skills could apply:

1. **Highest-precedence skill wins** (project > user/infra > framework defaults)
2. **Log decision** in `context/decisions.md`:
   - Competing skills
   - Selected skill
   - Rationale
   - Context

---

## File Structure

```
.claude/skills/
├── README.md                           # This file
├── skill-rules.json                    # Trigger configuration (v3.0.0)
├── skill-usage.json                    # Usage tracking (created on first use)
│
├── WRITE-CAPABLE Skills (4 total):
│   ├── cc-sessions-core/
│   │   └── SKILL.md
│   ├── cc-sessions-hooks/
│   │   └── SKILL.md
│   ├── cc-sessions-api/
│   │   └── SKILL.md
│   └── skill-developer/
│       └── SKILL.md
│
├── ANALYSIS-ONLY Skills (7 total):
│   ├── error-tracking/
│   │   └── SKILL.md
│   ├── framework_version_check/
│   │   └── SKILL.md
│   ├── framework_health_check/
│   │   └── SKILL.md
│   ├── framework_repair_suggester/
│   │   └── SKILL.md
│   ├── lcmp_recommendation/
│   │   └── SKILL.md
│   ├── daic_mode_guidance/
│   │   └── SKILL.md
│   └── skill-assessor/
│       └── SKILL.md
│
└── WORKFLOW-TRIGGER Skills (9 total - NEW in v3.0):
    ├── code-review-trigger/
    │   └── SKILL.md
    ├── research-trigger/
    │   └── SKILL.md
    ├── pm-workflow-trigger/
    │   └── SKILL.md
    ├── pm-status-trigger/
    │   └── SKILL.md
    ├── git-workflow-trigger/
    │   └── SKILL.md
    ├── contextkit-planning-trigger/
    │   └── SKILL.md
    ├── testing-trigger/
    │   └── SKILL.md
    ├── validation-trigger/
    │   └── SKILL.md
    └── checkpoint-trigger/
        └── SKILL.md
```

**IMPORTANT:** All skills MUST follow the official Claude Code format:
- Each skill in its own directory: `.claude/skills/<skill-name>/`
- Directory must contain a file named `SKILL.md`
- SKILL.md must have YAML frontmatter with `name`, `description`, and `schema_version` fields
- **Claude Code must be restarted after adding or modifying skills for discovery to occur**

---

## Integration with Framework

### Write Gating

**CRITICAL:** Write tools (Edit, Write, MultiEdit) are ONLY allowed in IMPLEMENT mode inside an active cc-sessions task.

- ANALYSIS-ONLY skills never call write tools
- WRITE-CAPABLE skills check `CC_SESSION_MODE` before activation
- Auto-trigger logic must respect write-gating
- Manual invocation still subject to write-gating enforcement

### DAIC Discipline

Skills respect DAIC workflow:

- **DISCUSS** – Clarify requirements (ANALYSIS-ONLY skills safe)
- **ALIGN** – Design plan (ANALYSIS-ONLY skills safe)
- **IMPLEMENT** – Execute (WRITE-CAPABLE skills allowed)
- **CHECK** – Verify (ANALYSIS-ONLY skills safe)

### SoT Tiers

Skills respect Source-of-Truth hierarchy:

- **Tier-1** – Framework docs (`claude.md`, `AGENTS.md`, LCMP files) – Canonical
- **Tier-2** – Task/feature docs (`docs/tasks/*.md`, manifests) – Scoped SoT
- **Tier-3** – Scratch files – Ephemeral

Skills may update Tier-2 docs during IMPLEMENT and suggest Tier-1 updates via REPAIR tasks.

---

## Framework Health Checks

The `framework_health_check` skill now includes skill system validation:

**Skill System Checks:**
- Verify `skill-rules.json` syntax and structure
- Confirm all skill .md files exist for configured skills
- Validate DAIC mode configuration consistency
- Check for orphaned skills (in rules but no .md file)
- Test skill precedence logic

**Usage Tracking Checks:**
- Identify skills with low auto-trigger rate (< 60%)
- Find unused skills (> 30 days)
- Detect over-triggering skills (> 10/session)
- Report skills with low effectiveness (< 0.7)

---

## Best Practices

### When to Create a Skill

✓ **Create a skill when:**
- Repeated guidance needed for a specific domain (error tracking, testing, API design)
- Complex analysis requires consistent methodology
- Framework/tooling needs specialized knowledge
- Write operations require domain-specific validation

✗ **Don't create a skill for:**
- One-off tasks (use standard cc-sessions workflow)
- Simple CRUD operations (handled by cc-sessions-core)
- Generic coding help (not skill-specific)

### Trigger Design

**DO:**
- Use specific, meaningful keywords that users naturally type
- Create intent patterns that capture variations in phrasing
- Keep trigger list focused (5-10 keywords max)
- Test with real user messages

**DON'T:**
- Use overly generic keywords ("code", "help", "file")
- Create hundreds of keyword variations (use regex patterns instead)
- Overlap heavily with other skill triggers
- Auto-trigger WRITE-CAPABLE skills without DAIC mode checks

### Documentation

- Keep skill .md files focused on behavior and examples
- Document safety guardrails clearly
- Provide concrete trigger examples in "When to Activate" section
- Update skill docs when behavior changes

---

## Troubleshooting

### Skill Not Auto-Triggering

1. Check `skill-rules.json` for keyword configuration
2. Verify user message contains trigger keywords or matches intent patterns
3. For WRITE-CAPABLE skills, confirm CC_SESSION_MODE is "IMPLEMENT"
4. Review file path triggers if applicable
5. Check skill precedence (project skill may be overriding)

### Skill Triggering Too Often

1. Review trigger keywords for overly generic terms
2. Narrow intent patterns to be more specific
3. Consider raising priority threshold
4. Check if skill should be ANALYSIS-ONLY instead of WRITE-CAPABLE

### Skill Usage Tracking Not Working

1. Verify `.claude/skills/skill-usage.json` exists
2. Check write permissions on directory
3. Confirm skill activations are being logged
4. Validate JSON structure matches schema

---

## Related Documentation

- **`claude.md`** – Framework overview, Section 4 (Skills)
- **`skill-developer.md`** – Skill development and self-improvement guide
- **`skill-rules.json`** – Trigger configuration reference
- **`claude-reference.md`** – Framework examples and templates

---

## Version History

**v3.0** (2025-11-15)
- Added 9 workflow-trigger skills for natural language slash command invocation
- Expanded skill-rules.json from v2.0.0 to v3.0.0
- Increased keyword coverage from 66 to 140+ (+112%)
- Increased intent pattern coverage from 28 to 55+ (+96%)
- Improved natural language coverage from ~40% to ~85%
- Total skills increased from 11 to 20

**v2.0** (2025-11-15)
- Initial DAIC-aware skill system with 11 operational skills
- Automated skill assessment via skill-assessor
- Framework health checks and self-improvement features

---

**Last Updated:** 2025-11-15
**Skills System Version:** 3.0
**Framework Version:** 2.0
