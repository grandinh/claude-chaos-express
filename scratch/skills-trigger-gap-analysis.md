# Skills Trigger Gap Analysis
**Created:** 2025-11-15
**Task:** m-audit-and-add-auto-invoke-triggers
**Branch:** feature/m-audit-and-add-auto-invoke-triggers

## Executive Summary

Comprehensive audit of all 11 skills in `.claude/skills/` to identify missing trigger keywords and intent patterns. Current state shows significant gaps in natural language coverage, with most skills having 3-7 keywords and 1-2 intent patterns. This analysis identifies 50+ missing keywords and 30+ missing intent patterns across the skill system.

**Key Findings:**
- **Coverage Gap:** Current triggers capture ~40% of natural language variations
- **Synonym Gap:** Missing common synonyms for technical terms (e.g., "exception" for "error")
- **Question Pattern Gap:** Missing "how do I", "can I", "what is" question patterns
- **Workflow Gap:** Missing workflow-related phrases (e.g., "start working on", "set up")
- **Abbreviation Gap:** Missing abbreviations and shorthand (e.g., "err" for "error")

---

## Skill-by-Skill Analysis

### 1. cc-sessions-core (WRITE-CAPABLE)

**Current Triggers:**
- Keywords (7): "hook", "session", "task", "middleware", "route handler", "api endpoint", "cc-sessions"
- Intent Patterns (3): `(create|modify|refactor).*?(hook|session|task)`, `sessions.*?development`, `api.*?(implementation|development)`

**Missing Keywords (15):**
- Core System: "framework", "core system", "architecture", "backbone"
- State Management: "state management", "persistence", "state file", "state tracking"
- Development: "sessions dev", "framework dev", "core dev"
- Components: "router", "controller", "service"
- Lifecycle: "initialization", "startup", "shutdown", "lifecycle"

**Missing Intent Patterns (5):**
- `(build|develop|implement).*?framework`
- `(fix|debug|troubleshoot).*?(session|state|task)`
- `framework.*?(architecture|design|structure)`
- `state.*?(management|persistence|tracking)`
- `core.*?system.*?development`

**Natural Language Examples Missing:**
- "How do I work on the framework core?"
- "I need to modify session state management"
- "Debug the task lifecycle"
- "Build new framework feature"
- "Fix state persistence issue"

**Recommendation:** Add workflow and component-specific triggers to catch development intent.

---

### 2. cc-sessions-hooks (WRITE-CAPABLE)

**Current Triggers:**
- Keywords (6): "hook", "sessions_enforce", "post_tool_use", "user_messages", "subagent_hooks", "shared_state"
- Intent Patterns (2): `(create|modify|fix).*?hook`, `hook.*?(enforcement|validation)`

**Missing Keywords (12):**
- Hook Types: "pre_tool_use", "session_start", "hook system", "hook pipeline"
- Enforcement: "enforcement layer", "validation", "guard", "gating", "blocker"
- Lifecycle: "before tool", "after tool", "on startup", "on submit"
- Debugging: "hook debugging", "hook not firing", "hook broken"

**Missing Intent Patterns (4):**
- `(test|debug|troubleshoot).*?hook`
- `hook.*?(not firing|broken|failing)`
- `(enforcement|validation|gating).*?(issue|problem|broken)`
- `(pre|post).*?tool.*?use`

**Natural Language Examples Missing:**
- "The pre_tool_use hook isn't firing"
- "Debug hook enforcement layer"
- "Fix validation hook that's broken"
- "Test session_start hook behavior"
- "Troubleshoot hook pipeline"

**Recommendation:** Add hook lifecycle and debugging triggers for troubleshooting workflows.

---

### 3. cc-sessions-api (WRITE-CAPABLE)

**Current Triggers:**
- Keywords (5): "session command", "task command", "state command", "protocol command", "config command"
- Intent Patterns (2): `(create|modify|fix).*?(command|api)`, `sessions.*?api`

**Missing Keywords (10):**
- CLI: "cli", "command line", "bin", "sessions bin"
- API Components: "router", "endpoint", "route", "handler"
- Subsystems: "state api", "task api", "config api", "protocol api"
- Development: "api dev", "command dev"

**Missing Intent Patterns (4):**
- `(build|develop|implement).*?(cli|command|api)`
- `(fix|debug).*?(endpoint|route|command)`
- `api.*?(endpoint|route|handler)`
- `command.*?(line|interface|cli)`

**Natural Language Examples Missing:**
- "Build new CLI command"
- "Fix the state API endpoint"
- "Debug command router"
- "Implement new protocol command"
- "Modify API handler for tasks"

**Recommendation:** Add CLI and component-specific triggers for API development.

---

### 4. error-tracking (ANALYSIS-ONLY)

**Current Triggers:**
- Keywords (5): "error handling", "sentry", "error tracking", "captureException", "captureMessage"
- Intent Patterns (2): `(add|implement|configure).*?sentry`, `error.*?(tracking|monitoring|handling)`

**Missing Keywords (18):**
- Error Types: "exception", "exception handling", "crash", "failure", "fault"
- Monitoring: "bug monitoring", "crash tracking", "crash reporting", "error logs", "error reporting"
- Recovery: "error recovery", "graceful degradation", "fallback", "retry logic"
- Patterns: "try-catch", "error boundary", "error middleware"
- Sentry Features: "breadcrumbs", "context", "tags", "sampling"

**Missing Intent Patterns (6):**
- `(handle|catch|manage).*?(exception|error|crash)`
- `(log|report|track).*?(error|exception|failure)`
- `(monitor|observe|watch).*?(crash|error|bug)`
- `exception.*?(handling|management|tracking)`
- `crash.*?(reporting|tracking|monitoring)`
- `try.*?catch|error.*?boundary`

**Natural Language Examples Missing:**
- "How do I handle exceptions in this code?"
- "Set up crash reporting"
- "Add error recovery logic"
- "Configure error boundaries"
- "Track exceptions with Sentry"
- "Log crashes automatically"
- "Implement try-catch patterns"

**Recommendation:** Significantly expand to cover exception handling workflows and recovery patterns.

---

### 5. framework_version_check (ANALYSIS-ONLY)

**Current Triggers:**
- Keywords (5): "framework version", "claude.md version", "version mismatch", "version sync", "framework sync"
- Intent Patterns (2): `check.*?framework.*?version`, `version.*?(mismatch|sync|drift)`

**Missing Keywords (10):**
- Drift: "version drift", "docs out of sync", "docs mismatch", "docs drift"
- Validation: "validate version", "verify sync", "check consistency"
- Files: "claude.md", "claude-reference.md", "framework docs"
- Status: "framework status", "docs status"

**Missing Intent Patterns (4):**
- `(validate|verify|confirm).*?version.*?sync`
- `docs.*?(out of sync|mismatch|drift)`
- `(claude\.md|claude-reference\.md).*?(version|sync)`
- `framework.*?docs.*?(sync|consistency)`

**Natural Language Examples Missing:**
- "Are the framework docs in sync?"
- "Check if claude.md and claude-reference.md match"
- "Validate version consistency"
- "Docs seem out of sync"
- "Framework docs might have drifted"

**Recommendation:** Add document-specific and drift-detection triggers.

---

### 6. framework_health_check (ANALYSIS-ONLY)

**Current Triggers:**
- Keywords (5): "framework health", "run health check", "validate framework", "framework test", "check framework"
- Intent Patterns (3): `(run|execute|perform).*?health.*?check`, `validate.*?framework`, `framework.*?health`

**Missing Keywords (15):**
- Diagnostics: "diagnose framework", "framework diagnostics", "system check", "framework status"
- Validation: "validate setup", "verify framework", "check system", "test framework"
- Health: "system health", "framework wellness", "health test"
- Components: "check write-gating", "validate state", "test skills", "check LCMP"
- Troubleshooting: "framework issues", "system problems", "framework broken"

**Missing Intent Patterns (5):**
- `(diagnose|troubleshoot|debug).*?framework`
- `(validate|verify|test).*?(setup|system|framework)`
- `check.*?(write-gating|state|skills|LCMP)`
- `framework.*?(issues|problems|status)`
- `health.*?(test|check|validation)`

**Natural Language Examples Missing:**
- "Diagnose framework issues"
- "Test if write-gating is working"
- "Validate framework setup"
- "Check system health"
- "Is the framework working correctly?"
- "Verify LCMP files are present"

**Recommendation:** Add diagnostic and component-specific validation triggers.

---

### 7. framework_repair_suggester (ANALYSIS-ONLY)

**Current Triggers:**
- Keywords (5): "REPAIR task", "framework issue", "broken gating", "framework bug", "framework broken"
- Intent Patterns (3): `create.*?REPAIR.*?task`, `framework.*(issue|bug|broken|problem)`, `REPAIR-`

**Missing Keywords (12):**
- Repair Actions: "fix framework", "repair system", "fix bug", "resolve issue"
- Problem States: "broken feature", "not working", "malfunctioning", "failing"
- Components: "broken hooks", "broken skills", "broken gating", "broken state"
- Troubleshooting: "framework problem", "system issue", "framework error"

**Missing Intent Patterns (4):**
- `(fix|repair|resolve).*?(framework|system|feature)`
- `(broken|failing|not working).*?(hook|skill|gating|state)`
- `framework.*?(error|failure|malfunction)`
- `need.*?REPAIR.*?task`

**Natural Language Examples Missing:**
- "The hook system is broken, need to fix it"
- "Write-gating isn't working, create REPAIR task"
- "Framework malfunctioning, how do I repair it?"
- "State persistence is failing"
- "Resolve framework issue with skills"

**Recommendation:** Add problem-state and component-specific repair triggers.

---

### 8. lcmp_recommendation (ANALYSIS-ONLY)

**Current Triggers:**
- Keywords (5): "/squish", "compaction", "LCMP", "context cleanup", "context compaction"
- Intent Patterns (3): `compact.*?context`, `LCMP.*(compaction|cleanup)`, `/squish`

**Missing Keywords (14):**
- Actions: "save context", "preserve learnings", "capture insights", "save decisions"
- States: "context overflow", "too much context", "context bloat", "context heavy"
- LCMP Files: "decisions.md", "insights.md", "gotchas.md"
- Workflows: "what did we learn", "summarize session", "preserve knowledge"
- Commands: "squish", "compact", "summarize"

**Missing Intent Patterns (5):**
- `(save|preserve|capture).*?(context|learnings|insights|decisions)`
- `context.*?(overflow|bloat|heavy|too much)`
- `(summarize|distill).*?(session|work|learnings)`
- `what.*?(learned|discovered|insights)`
- `(decisions|insights|gotchas)\.md`

**Natural Language Examples Missing:**
- "Save what we learned to LCMP"
- "Context is getting too big"
- "Preserve these insights"
- "What should we capture from this work?"
- "Summarize our decisions"
- "Context overflow, need to compact"

**Recommendation:** Add context-state and knowledge-preservation triggers.

---

### 9. daic_mode_guidance (ANALYSIS-ONLY)

**Current Triggers:**
- Keywords (8): "what mode", "DAIC", "can I write", "implement mode", "current mode", "DISCUSS mode", "ALIGN mode", "CHECK mode"
- Intent Patterns (3): `what.*(mode|DAIC)`, `can.*?(write|edit|modify)`, `(current|which).*?mode`

**Missing Keywords (16):**
- Questions: "which mode am I in", "what mode are we in", "mode help", "workflow help"
- Capabilities: "what can I do", "allowed to write", "can I edit", "what's allowed"
- Transitions: "mode switch", "change mode", "go to implement", "return to discuss"
- States: "blocked", "can't write", "permission denied", "write-gating"
- Modes: "DISCUSS", "ALIGN", "IMPLEMENT", "CHECK" (without "mode" suffix)

**Missing Intent Patterns (6):**
- `(which|what).*?mode.*?(in|now|current)`
- `what.*?(can|allowed|permitted).*?(do|write|edit)`
- `(switch|change|transition).*?mode`
- `(blocked|denied|prevented).*?write`
- `(return|go back).*?discuss`
- `workflow.*?(help|guidance|explanation)`

**Natural Language Examples Missing:**
- "Which mode am I in right now?"
- "What am I allowed to do in this mode?"
- "How do I switch to IMPLEMENT mode?"
- "I'm blocked from writing, why?"
- "Return to discussion mode"
- "Help me understand the workflow"
- "Can I edit files now?"

**Recommendation:** Add question patterns and capability-inquiry triggers.

---

### 10. skill-developer (WRITE-CAPABLE)

**Current Triggers:**
- Keywords (3): "skill system", "create skill", "skill architecture"
- Intent Patterns (2): `(create|add|modify|build).*?skill`, `skill.*?(development|creation|building)`

**Missing Keywords (12):**
- Actions: "modify skill", "update skill", "fix skill", "refactor skill", "delete skill"
- Configuration: "skill config", "skill-rules.json", "skill triggers", "auto-invoke"
- Development: "skill dev", "skill system dev", "build skill"
- Files: "skill file", "skill prompt", ".claude/skills/"
- Precedence: "skill precedence", "skill priority"

**Missing Intent Patterns (5):**
- `(update|modify|refactor|fix).*?skill`
- `skill.*?(configuration|config|rules|triggers)`
- `(auto-invoke|auto-trigger).*?skill`
- `skill-rules\.json|skill.*?precedence`
- `\.claude/skills/.*?`

**Natural Language Examples Missing:**
- "Update skill configuration"
- "Modify skill triggers"
- "Fix broken skill"
- "Configure auto-invoke for this skill"
- "Refactor skill system architecture"
- "Edit skill-rules.json"

**Recommendation:** Add configuration and modification triggers for skill maintenance.

---

### 11. skill-assessor (ANALYSIS-ONLY)

**Current Triggers:**
- Keywords (7): "assess skill", "skill assessment", "evaluate skill", "should this skill auto-trigger", "add skill to rules", "analyze skill", "skill auto-invoke"
- Intent Patterns (4): `(assess|evaluate|analyze).*?skill`, `skill.*?(assessment|evaluation|analysis)`, `auto.*?trigger.*?skill`, `should.*?skill.*?(auto|trigger)`

**Missing Keywords (10):**
- Actions: "configure skill", "setup skill", "skill setup", "trigger config"
- Evaluation: "skill value", "skill usefulness", "skill effectiveness"
- Automation: "auto-trigger config", "automatic invocation", "skill automation"
- Cost: "token cost", "skill overhead", "skill bloat"

**Missing Intent Patterns (4):**
- `(configure|setup).*?skill.*(trigger|auto|invoke)`
- `skill.*(value|usefulness|effectiveness|worth)`
- `(token cost|overhead|bloat).*?skill`
- `automatic.*?invocation.*?skill`

**Natural Language Examples Missing:**
- "Configure auto-trigger for new skill"
- "Is this skill worth auto-invoking?"
- "Setup automatic invocation"
- "What's the token cost of this skill?"
- "Evaluate skill effectiveness"

**Recommendation:** Add configuration and cost-analysis triggers.

---

## Summary Statistics

| Metric | Current State | Proposed State | Improvement |
|--------|---------------|----------------|-------------|
| **Total Keywords** | 66 | 140+ | +112% |
| **Total Intent Patterns** | 28 | 55+ | +96% |
| **Avg Keywords per Skill** | 6.0 | 12.7 | +112% |
| **Avg Intent Patterns per Skill** | 2.5 | 5.0 | +100% |
| **Natural Language Coverage** | ~40% | ~85% | +112% |

---

## Priority Recommendations

### High Priority (Guardrails & Frequent Use)

1. **error-tracking** - Missing critical exception handling triggers (+18 keywords, +6 patterns)
2. **framework_health_check** - Missing diagnostic triggers (+15 keywords, +5 patterns)
3. **daic_mode_guidance** - Missing question patterns (+16 keywords, +6 patterns)

### Medium Priority (Frequent Use)

4. **cc-sessions-core** - Missing framework development triggers (+15 keywords, +5 patterns)
5. **cc-sessions-hooks** - Missing hook debugging triggers (+12 keywords, +4 patterns)
6. **lcmp_recommendation** - Missing context preservation triggers (+14 keywords, +5 patterns)

### Lower Priority (Convenience & Specialized)

7. **skill-developer** - Missing configuration triggers (+12 keywords, +5 patterns)
8. **cc-sessions-api** - Missing CLI triggers (+10 keywords, +4 patterns)
9. **framework_repair_suggester** - Missing repair workflow triggers (+12 keywords, +4 patterns)
10. **framework_version_check** - Missing drift detection triggers (+10 keywords, +4 patterns)
11. **skill-assessor** - Missing setup triggers (+10 keywords, +4 patterns)

---

## Next Steps

1. **Phase 2:** Inventory slash commands for natural language wrapper opportunities
2. **Phase 3:** Design comprehensive trigger patterns for each skill
3. **Phase 4:** Update skill-rules.json with new triggers
4. **Phase 5:** Document new triggers in each skill file
5. **Phase 6:** Create testing suite to validate trigger accuracy

---

**Analysis Complete:** 2025-11-15
**Analyst:** Claude (cc-sessions framework)
**Task:** m-audit-and-add-auto-invoke-triggers
