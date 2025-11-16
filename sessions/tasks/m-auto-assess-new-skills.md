---
name: m-auto-assess-new-skills
branch: feature/m-auto-assess-new-skills
status: open
created: 2025-11-16
---

# Auto-Assess New Skills for Auto-Invocation

## Problem/Goal

When new skills are created in `.claude/skills/`, there's no automated way to assess whether they provide significant value for auto-invocation via skill-rules.json. This leads to:
- Potentially valuable skills not being auto-invoked
- Manual assessment burden on developers
- Inconsistent decisions about which skills should auto-trigger

**Goal**: Create an automated system that detects newly created skills and assesses whether they should be added to the skill-rules.json auto-invoke workflow, using context-gathering and other agents for comprehensive analysis.

## Success Criteria

- [ ] New skills in `.claude/skills/*.md` automatically trigger assessment after creation
- [ ] Assessment uses context-gathering agent, code-analyzer, and optionally research-expert for comprehensive evaluation
- [ ] Evaluation follows prioritized criteria:
  - (c) Prevents mistakes/enforces guardrails (highest priority)
  - (b) Frequently used scenarios (medium priority)
  - (a) Saves time via auto-invocation (lower priority)
  - Token cost impact analysis (bloat prevention)
- [ ] Recommendation includes detailed rationale and suggested promptTriggers configuration
- [ ] User must approve before any changes to skill-rules.json (semi-automatic, not fully automatic)
- [ ] System is conservative to prevent skill bloat
- [ ] All assessments are logged in context/decisions.md

## Planning Spec

This task was created from a Cursor planning session. The full specification and implementation plan is available in the plan mode output above this task file's creation.

**Key Implementation Components**:

1. **skill-assessor.md**: New ANALYSIS-ONLY skill that orchestrates the assessment process
   - Invokes context-gathering agent to deeply understand new skill's purpose
   - Invokes code-analyzer to identify codebase patterns where skill applies
   - Optionally invokes research-expert for domain-specific considerations
   - Evaluates using prioritized criteria with token cost analysis
   - Generates recommendation with detailed rationale (never auto-adds)

2. **post_tool_use.js hook**: Enhanced to detect new skill file creation
   - Monitors Write/Edit/MultiEdit tools for `.claude/skills/*.md` creation
   - Triggers skill-assessor automatically after new skill detection
   - Excludes skill-rules.json from triggering assessment

3. **skill-rules.json entry**: Configuration for skill-assessor auto-invocation
   - ANALYSIS-ONLY skill type
   - Allowed in all DAIC modes
   - Appropriate triggers for skill assessment requests

4. **Documentation updates**: Pattern for Cursor → Claude Code handoffs
   - When to create specs in Cursor vs implement in Claude Code
   - How to convert plans/specs to cc-sessions tasks
   - Task manifest structure and context-gathering workflow

## Context Manifest
<!-- To be added by context-gathering agent -->

## User Notes

- This task should be executed in Claude Code (NOT Cursor)
- Large feature builds belong in Claude Code; Cursor is for specs/planning
- The assessment system should be conservative to avoid skill bloat
- Token usage analysis must be included in every assessment

## Work Log
- [2025-11-16] Task created from Cursor planning session

