# Quick Task: CustomizeSkillRules
<!-- ContextKit Quick Plan | Created: 2025-11-15 -->

---

## 📋 Input

"""
Configure the newly installed skill-activation system to match this project's
specific patterns and needs. The default skill-rules.json contains generic examples
(frontend-dev-guidelines, backend-dev-guidelines, etc.) that need to be customized
to align with this project's tech stack, coding patterns, and workflow requirements.

Key requirements:
• Make skill triggers DAIC-aware (check CC_SESSION_MODE)
• Tag skills as ANALYSIS-ONLY vs WRITE-CAPABLE
• Add framework health/management skills
• Remove stale examples (blog-api, frontend paths)
• Align with cc-sessions workflow and this project's structure
"""

---

## 🎯 Understanding (Confirmed)

The skill-rules.json file controls automatic skill activation based on prompts and file paths. Currently, it contains 5 generic skills (skill-developer, backend-dev-guidelines, frontend-dev-guidelines, route-tester, error-tracking) with triggers that don't match this project and don't respect the cc-sessions DAIC workflow.

We need to customize this file to:
1. Add DAIC mode awareness so skills check CC_SESSION_MODE before activating
2. Explicitly tag each skill as ANALYSIS-ONLY (safe in all modes) or WRITE-CAPABLE (only in IMPLEMENT mode)
3. Remove stale triggers for projects that don't exist (blog-api, frontend directories)
4. Add project-specific skills for cc-sessions development (hooks, API, task management)
5. Add framework management skills (version check, health check, REPAIR suggester, LCMP recommendation)
6. Update file path patterns to match actual project structure (sessions/hooks/, sessions/api/, .claude/)

### In Scope ✅

- Enhance skill-rules.json schema to include `daicMode` and `skillType` fields
- Tag all existing skills as ANALYSIS-ONLY or WRITE-CAPABLE based on their behavior
- Remove frontend-dev-guidelines and route-tester (not applicable to this project)
- Remove blog-api path references from backend-dev-guidelines
- Add cc-sessions-hooks skill for working on hook files (sessions/hooks/*.js)
- Add cc-sessions-api skill for working on API commands (sessions/api/*.js)
- Add framework_version_check skill (ANALYSIS-ONLY)
- Add framework_health_check skill (ANALYSIS-ONLY)
- Add framework_repair_suggester skill (ANALYSIS-ONLY, suggests REPAIR- tasks)
- Add lcmp_recommendation skill (ANALYSIS-ONLY, suggests /squish but never auto-runs)
- Add daic_mode_guidance skill (ANALYSIS-ONLY, helps choose correct mode)
- Document skill types and DAIC requirements in comments/metadata
- Test that WRITE-CAPABLE skills respect CC_SESSION_MODE

### Out of Scope ❌

- Implementing the auto-trigger logic itself (assumes it exists and can read skill-rules.json)
- Creating the actual skill prompt files (.md files in .claude/skills/)
- Modifying cc-sessions hooks to enforce skill-level write-gating (separate concern)
- Adding skills for every possible framework operation (start with core health/management)
- Changing the skill-rules.json schema format beyond adding new fields

### Edge Cases 🔍

- What if CC_SESSION_MODE is undefined/null? (Skills should treat as DISCUSS - read-only)
- What if a skill is triggered during a REPAIR- task? (REPAIR tasks run in IMPLEMENT, so WRITE-CAPABLE skills are allowed)
- What if user explicitly requests a write-capable skill in DISCUSS mode? (Skill should suggest moving to IMPLEMENT)
- What about skills that both analyze AND write based on context? (Tag as WRITE-CAPABLE and check mode before any writes)
- How to handle skill precedence when multiple skills match? (Follow existing priority field, but document DAIC implications)

---

## 🔍 Code Context

**Relevant Files:**
- `.claude/skills/skill-rules.json:1-124` - Current skill trigger configuration with 5 generic skills
- `CLAUDE.md` - Framework operating spec defining DAIC modes (DISCUSS/ALIGN/IMPLEMENT/CHECK), SoT tiers, write-gating rules
- `claude-reference.md` - Supporting protocols and examples for framework operations
- `sessions/hooks/sessions_enforce.js` - Hook that enforces DAIC discipline and write-gating
- `sessions/hooks/post_tool_use.js` - Post-tool-use validation hook
- `sessions/api/` - Session command implementations (task_commands.js, state_commands.js, etc.)
- `.cc-sessions/state.json` - Would store CC_SESSION_MODE and CC_SESSION_TASK_ID

**Current Patterns:**
- skill-rules.json schema: Each skill has `type` (domain/guardrail), `enforcement` (suggest/block), `priority` (critical/high/medium), `promptTriggers` (keywords, intentPatterns), `fileTriggers` (pathPatterns, skipConditions)
- No DAIC awareness: Skills don't check CC_SESSION_MODE before activating
- No skill type classification: No distinction between analysis-only and write-capable skills
- Generic triggers: Path patterns reference non-existent projects (blog-api/src/, frontend/src/)
- Hook enforcement: sessions_enforce.js blocks write tools in DISCUSS/ALIGN/CHECK, but doesn't integrate with skill system

**Integration Points:**
- Skill auto-trigger logic (external to skill-rules.json) must read CC_SESSION_MODE from .cc-sessions/state.json or environment
- Framework health check skills should reference checklist defined in claude-reference.md
- REPAIR suggester skill should know how to format REPAIR- task proposals (naming: REPAIR-issue-YYYY-MM-DD)
- LCMP recommendation skill should understand when compaction is appropriate vs premature
- Write-gating enforcement already exists in hooks, but needs skill-level awareness for better UX

---

## 💡 Implementation Approach

**Schema Enhancement Strategy:**

Add two new top-level fields to each skill definition:
1. `skillType`: "ANALYSIS-ONLY" | "WRITE-CAPABLE"
   - ANALYSIS-ONLY: Can run in any DAIC mode (DISCUSS, ALIGN, IMPLEMENT, CHECK)
   - WRITE-CAPABLE: Only runs in IMPLEMENT mode, blocked in all other modes
2. `daicMode`: Object with `allowedModes` array
   - Example: `{"allowedModes": ["DISCUSS", "ALIGN", "IMPLEMENT", "CHECK"]}` for analysis-only
   - Example: `{"allowedModes": ["IMPLEMENT"]}` for write-capable

**Rationale:** Adding explicit fields rather than relying on naming conventions or documentation makes the constraint machine-readable and enforceable by the auto-trigger logic.

**Cleanup Strategy:**

1. Remove frontend-dev-guidelines entirely (no React/frontend code in this project)
2. Remove route-tester entirely (was specific to blog-api example)
3. Keep skill-developer but tag as WRITE-CAPABLE (creates/modifies skill files)
4. Keep backend-dev-guidelines but:
   - Rename to cc-sessions-core for clarity
   - Replace blog-api paths with sessions/ paths
   - Tag as WRITE-CAPABLE (modifies hooks, API code)
5. Keep error-tracking but tag as ANALYSIS-ONLY (suggests error handling patterns)

**New Framework Skills:**

All framework skills are ANALYSIS-ONLY and use `enforcement: "suggest"`:

1. **framework_version_check**
   - Keywords: "framework version", "claude.md version", "version mismatch"
   - Reads headers of CLAUDE.md and claude-reference.md
   - Compares version numbers and dates
   - Suggests REPAIR task if mismatch detected

2. **framework_health_check**
   - Keywords: "framework health", "run health check", "validate framework"
   - Runs checklist from claude-reference.md (write-gating test, state persistence, skill precedence, LCMP freshness, handoff log)
   - Reports pass/fail for each check
   - Suggests REPAIR tasks for failures

3. **framework_repair_suggester**
   - Keywords: "REPAIR task", "framework issue", "broken gating"
   - Triggers when framework violations detected
   - Formats REPAIR- task proposals with naming convention
   - Logs issue in context/gotchas.md

4. **lcmp_recommendation**
   - Keywords: "/squish", "compaction", "LCMP", "context cleanup"
   - Analyzes current context usage and work log size
   - Suggests when compaction is appropriate
   - Never auto-runs /squish (manual only per framework rules)

5. **daic_mode_guidance**
   - Keywords: "what mode", "DAIC", "can I write", "implement mode"
   - Explains current mode restrictions
   - Suggests appropriate mode for user's intent
   - References CLAUDE.md Section 2.2 for details

**Testing Approach:**

Document expected behavior in skill-rules.json comments:
- "ANALYSIS-ONLY skills provide suggestions and analysis but never call write tools"
- "WRITE-CAPABLE skills check CC_SESSION_MODE and only activate in IMPLEMENT mode"
- "If CC_SESSION_MODE is undefined/null, treat as DISCUSS (read-only)"

Actual enforcement happens in the auto-trigger logic (external to this file), but documenting expectations here provides clear contract.

---

## ✅ Tasks

- [ ] Add schema documentation comment at top of `.claude/skills/skill-rules.json` explaining `skillType` and `daicMode` fields
- [ ] Remove `frontend-dev-guidelines` skill entirely from skill-rules.json
- [ ] Remove `route-tester` skill entirely from skill-rules.json
- [ ] Update `skill-developer`: Add `"skillType": "WRITE-CAPABLE"` and `"daicMode": {"allowedModes": ["IMPLEMENT"]}`
- [ ] Rename `backend-dev-guidelines` to `cc-sessions-core` in skill-rules.json
- [ ] Update `cc-sessions-core`: Replace blog-api paths with `sessions/**/*.js`, add `"skillType": "WRITE-CAPABLE"` and `"daicMode": {"allowedModes": ["IMPLEMENT"]}`
- [ ] Update `error-tracking`: Add `"skillType": "ANALYSIS-ONLY"` and `"daicMode": {"allowedModes": ["DISCUSS", "ALIGN", "IMPLEMENT", "CHECK"]}`
- [ ] Add new `framework_version_check` skill (ANALYSIS-ONLY, keywords: "framework version", "version mismatch")
- [ ] Add new `framework_health_check` skill (ANALYSIS-ONLY, keywords: "framework health", "run health check")
- [ ] Add new `framework_repair_suggester` skill (ANALYSIS-ONLY, keywords: "REPAIR task", "framework issue")
- [ ] Add new `lcmp_recommendation` skill (ANALYSIS-ONLY, keywords: "/squish", "compaction", "LCMP")
- [ ] Add new `daic_mode_guidance` skill (ANALYSIS-ONLY, keywords: "what mode", "DAIC", "can I write")
- [ ] Add new `cc-sessions-hooks` skill (WRITE-CAPABLE, file triggers: `sessions/hooks/**/*.js`)
- [ ] Add new `cc-sessions-api` skill (WRITE-CAPABLE, file triggers: `sessions/api/**/*.js`)
- [ ] Verify all skills have both `skillType` and `daicMode` fields populated
- [ ] Add inline comments documenting DAIC behavior expectations for each skill type
- [ ] Test: Manually verify JSON is valid with `node -e "require('./.claude/skills/skill-rules.json')"`

---

## 📝 Notes

[Optional section for additional context, links, or observations during implementation]

---
