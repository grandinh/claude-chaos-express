---
name: m-implement-custom-skill-rules
branch: feature/m-implement-custom-skill-rules
status: pending
created: 2025-11-15
---

# Customize Skill Rules for Project

## Problem/Goal
Configure the newly installed skill-activation system to match this project's specific patterns and needs. The default skill-rules.json contains generic examples (frontend-dev-guidelines, backend-dev-guidelines, etc.) that need to be customized to align with this project's tech stack, coding patterns, and workflow requirements.

## Success Criteria

### Core Implementation
- [ ] **skill-rules.json customized**
  - All default skills updated for this project's stack (Node.js, JS, cc-sessions, CCPM, ContextKit)
  - Each skill explicitly tagged as `ANALYSIS-ONLY` or `WRITE-CAPABLE`

- [ ] **DAIC- & gating-aware triggers**
  - Automatic skill trigger checks `CC_SESSION_MODE` before firing
  - ANALYSIS-ONLY skills may trigger in any mode
  - WRITE-CAPABLE skills only trigger (and only call write tools) in IMPLEMENT mode

- [ ] **Project-specific framework skills added**
  - Skills for DAIC mode guidance, REPAIR- task creation, framework_version_check, framework_health_check, and LCMP recommendation (never auto-compaction)

- [ ] **Skill triggers tested for safety and relevance**
  - Verified that no triggers cause writes or Tier-1 edits outside IMPLEMENT
  - Framework skills activate on clear phrases ("run framework health check", "sync framework version", "create REPAIR task for X")
  - Triggers are narrow enough to avoid constant noise

- [ ] **Documentation updated**
  - skill-rules.json documented with which skills are ANALYSIS-ONLY vs WRITE-CAPABLE
  - Example trigger phrases included
  - Expected behavior and DAIC mode requirements specified

### Sanity Check
**One-liner test:** "In DISCUSS/ALIGN/CHECK, the automatic skill trigger can help me think, suggest REPAIRs, and point at docs—but it never writes. In IMPLEMENT, it can also call write-capable skills, but still won't silently edit Tier-1 or auto-squish."

## Context Manifest

**Framework Context:**
- claude.md - Primary operating spec with DAIC modes, SoT tiers, write-gating rules
- claude-reference.md - Supporting details and protocols
- .cc-sessions/state.json - Lightweight task checkpoint mechanism
- context/ - LCMP files (decisions.md, insights.md, gotchas.md)

**Implementation Plan:**
- **Context/Features/001-CustomizeSkillRules.md** - ContextKit quick plan (detailed)
  - 13 in-scope items: schema enhancements, cleanup, framework skills
  - 5 edge cases: CC_SESSION_MODE handling, REPAIR tasks, mode conflicts
  - 17 actionable tasks with file paths and acceptance criteria
  - Implementation approach with rationale and testing strategy

**Key Constraints:**
- Write tools only allowed in IMPLEMENT mode within active cc-sessions task
- No auto-compaction of LCMP files (manual `/squish` only)
- Analysis-only skills must not call write tools
- Framework health checks only run on-demand or during REPAIR tasks

**Tech Stack:**
- cc-sessions as execution spine
- Cursor as secondary editor
- skill-rules.json for skill activation logic

## Core Guardrails for Auto-Trigger Logic

**DAIC + Write-Gating Awareness:**
- Auto-trigger MUST read `CC_SESSION_MODE` before firing any skill
- Treat DISCUSS/ALIGN/CHECK as read-only modes
- Only allow skills that call write tools when `CC_SESSION_MODE === IMPLEMENT`

**Tiered SoT Awareness:**
- Auto-triggered skills may freely read Tier-1/Tier-2/Tier-3
- Skills must NEVER auto-create or auto-edit Tier-1 docs
- Framework-related changes must propose a REPAIR- task, not modify directly
- Skills should prefer writing to Tier-2 (task docs, manifests) when writes are needed

**Self-Healing Pattern:**
- Framework health checks, sync, and drift detection are SKILLS, not side-effects
- Any framework issues must log in LCMP (`context/*`) or propose a REPAIR- task
- Never silently rewrite framework docs, skills, or hooks

**No Auto-Compaction:**
- No skill may auto-run `/squish` or perform LCMP promotion
- Skills may SUGGEST compaction with rationale, but user must approve

**Explicit Framework Skills:**
- `framework_version_check` - reads headers of claude.md / claude-reference.md
- `framework_health_check` - runs checklist from claude-reference.md
- `framework_repair_suggester` - suggests REPAIR- tasks for framework issues

## User Notes

Session focused on defining and refining task scope:
- Clarified that default skill-rules.json has generic examples needing customization
- Identified need for DAIC-aware skill triggering
- Emphasized framework constraints: write-gating, SoT tiers, manual compaction only
- Discussed skill precedence and conflict resolution

## Work Log

### 2025-11-15

#### Completed
- Task created and scoped for customizing skill-rules.json
- Success criteria defined with DAIC-aware skill triggers and framework constraints
- Context manifest populated with relevant framework files and key constraints

#### Decisions
- Skills must respect DAIC modes: analysis-only in DISCUSS/ALIGN/CHECK, write-capable only in IMPLEMENT
- Write-gating enforcement remains strict (no bypasses, even for framework/tooling fixes outside REPAIR tasks)
- Skill precedence follows: project skills > user/infra skills > framework defaults

#### Discovered
- Default skill-rules.json contains generic examples (frontend-dev-guidelines, backend-dev-guidelines)
- Need to align skill activation with cc-sessions state (CC_SESSION_MODE, CC_SESSION_TASK_ID)
- Framework health checks should be on-demand skills, not automatic

#### Next Steps
- Review existing .claude/skills/ directory structure ✅ COMPLETED
- Map project patterns to skill trigger conditions (file paths, keywords, DAIC mode) ✅ COMPLETED
- Draft custom skill-rules.json with DAIC-aware triggers → IN PROGRESS (see ContextKit plan)
- Add write-gating enforcement rules → IN PROGRESS (see ContextKit plan)
- Define framework health check skills → IN PROGRESS (see ContextKit plan)
- Test skill activation logic with sample scenarios → PENDING

---

### 2025-11-15 (Continued - Planning Phase)

#### Completed
- Analyzed current skill-rules.json structure (5 generic skills with stale paths)
- Identified project tech stack (Node.js, JavaScript, cc-sessions framework - no frontend)
- Created ContextKit quick plan at Context/Features/001-CustomizeSkillRules.md
- Validated understanding with user (in-scope, out-of-scope, edge cases)
- Linked ContextKit plan into cc-sessions task manifest (hybrid approach)
- Documented 17 specific implementation tasks with clear acceptance criteria

#### Decisions
- Use hybrid ContextKit + cc-sessions approach for this task
  - ContextKit provides structured planning template
  - cc-sessions provides DAIC discipline and execution control
  - Best of both: thorough planning + write-gating enforcement
- Add `skillType` and `daicMode` fields to skill schema (machine-readable)
- Remove frontend-dev-guidelines and route-tester (not applicable)
- Rename backend-dev-guidelines to cc-sessions-core (clearer naming)
- All framework skills are ANALYSIS-ONLY (health check, version check, REPAIR suggester, LCMP recommendation)

#### Next Phase
- Transition to IMPLEMENT mode
- Execute 17 tasks from ContextKit plan
- Test JSON validity and skill behavior
- Document final configuration
