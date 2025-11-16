# Context Insights

This file documents patterns, learnings, and insights discovered during framework development and usage.

---

## Skill Trigger System: Natural Language Coverage & Monitoring

**Date:** 2025-11-15
**Context:** m-audit-and-add-auto-invoke-triggers task completion
**Impact:** Expanded natural language coverage from 40% → 85%

### Key Insight: Three-Tier Assessment Framework

When deciding whether a skill should auto-trigger, use this prioritized evaluation:

1. **Guardrails/Safety (HIGHEST PRIORITY)**
   - Does this skill prevent framework violations, enforce SoT discipline, or catch errors before they occur?
   - If YES → Recommend AUTO-INVOKE **regardless of frequency or convenience**
   - Examples: framework_version_check, write-gating enforcement, REPAIR task detection
   - Rationale: Safety and correctness trump all other concerns

2. **Frequency (MEDIUM PRIORITY)**
   - How often do users work on tasks in this domain?
   - Metrics: Codebase coverage % (>10% = frequent), Relevance rate (>60% threshold)
   - If frequent AND relevant → Recommend AUTO-INVOKE
   - Rationale: Skills that apply to common scenarios save time across many tasks

3. **Convenience (LOWEST PRIORITY)**
   - Does this skill merely save time without protection or frequency?
   - If ONLY convenience (no guardrails, low frequency) → Recommend MANUAL-ONLY
   - Rationale: Pure convenience skills add noise and token cost without sufficient benefit

**Token Cost Formula:**
```
Value Score = (Relevance Rate × Impact) - (Token Cost × Noise Rate)
Threshold: Value Score > 0.4 for auto-invocation consideration
```

### Trigger Design Patterns

**1. Keywords vs Intent Patterns:**
- **Keywords:** Exact substring matches (case-insensitive unless all-caps)
  - Use for: Common terms, domain-specific jargon, command names
  - Example: "error handling", "sentry", "captureException"

- **Intent Patterns:** Regex patterns for flexible matching
  - Use for: Question variations, action verbs, phrasing flexibility
  - Example: `"(add|implement|configure).*?sentry"`, `"how.*(do I|implement)"`

**2. Specificity vs Coverage Trade-off:**
- Too broad: "error" → false positives on any error mention
- Too narrow: "implement Sentry error tracking with breadcrumbs" → misses variations
- Sweet spot: "error handling", "configure Sentry", `error.*(tracking|monitoring)`

**3. Skill Type Distinctions:**
- **ANALYSIS-ONLY:** Can run in any DAIC mode, provide guidance only
  - Use for: Research, diagnostics, recommendations, status queries
  - Examples: research-trigger, pm-status-trigger, daic_mode_guidance

- **WRITE-CAPABLE:** Only run in IMPLEMENT mode, may modify files
  - Use for: Workflow actions that create/modify state
  - Examples: pm-workflow-trigger, git-workflow-trigger, validation-trigger
  - Must check `CC_SESSION_MODE === "IMPLEMENT"` before triggering

**4. Priority Assignment Strategy:**
- **HIGH:** Safety-critical or high-frequency high-value skills (code-review, research, pm-status)
- **MEDIUM:** Frequent but not critical, or critical but infrequent (git-workflow, error-tracking)
- **LOW:** Convenience features with low activation frequency (checkpoint, lcmp_recommendation)

### Monitoring & Refinement Process

**1. Track Activation Metrics (via skill-usage.json):**
- Auto-trigger count vs manual invocation count
- Relevance rate: % of auto-triggers where skill was actually useful
- False positive rate: % of auto-triggers where user dismissed or ignored skill
- False negative rate: Manual invocations after failed auto-trigger

**2. Monitoring Period: 1-2 Weeks**
- Collect real-world usage data across diverse user scenarios
- Track which keywords/patterns activate most frequently
- Identify gaps where users manually invoke skills

**3. Refinement Criteria:**
- **Remove triggers:** 0% activation rate after 2 weeks
- **Adjust triggers:** <40% relevance rate (too many false positives)
- **Add triggers:** >20% manual invocations after failed auto-trigger (false negatives)
- **Split skills:** High activation but low relevance suggests skill is too broad

**4. Conflict Resolution:**
- When multiple skills match, highest precedence wins (project > user/infra > framework)
- Priority levels as tiebreaker (critical > high > medium > low)
- Log decision in context/decisions.md with rationale for pattern learning

### Deployment Checklist for New Skills

When adding new skills with auto-triggers:

1. **Define Skill Type:**
   - [ ] ANALYSIS-ONLY (safe in all modes) or WRITE-CAPABLE (IMPLEMENT only)?
   - [ ] Allowed DAIC modes documented in skill file and skill-rules.json

2. **Design Triggers:**
   - [ ] 5-15 keywords covering common terms and synonyms
   - [ ] 3-8 intent patterns for question/action variations
   - [ ] Patterns tested against false positive phrases
   - [ ] Patterns tested against expected true positive phrases

3. **Assess Value:**
   - [ ] Evaluated against Guardrails/Frequency/Convenience framework
   - [ ] Token cost calculated and value score computed
   - [ ] Decision logged in context/decisions.md

4. **Configure & Document:**
   - [ ] Added to skill-rules.json with proper skillType, daicMode, priority
   - [ ] Skill file created with Trigger Reference section
   - [ ] Test cases added to testing guide

5. **Deploy & Monitor:**
   - [ ] Restart Claude Code to load new configuration
   - [ ] Test 10-20 natural language phrases manually
   - [ ] Monitor activation rates for 1-2 weeks
   - [ ] Refine triggers based on real usage data

### Lessons Learned (2025-11-15)

1. **Keyword expansion is critical:**
   - Existing skills had 2-3x fewer keywords than needed
   - Users express intent in many different ways
   - Comprehensive synonym coverage dramatically improves discoverability

2. **Intent patterns catch question variations:**
   - Many users phrase requests as questions ("How do I...?", "What are the...?")
   - Regex patterns like `how.*(do I|implement|use)` capture these variations
   - Question-based patterns were previously missing from most skills

3. **Workflow-trigger skills bridge command gap:**
   - 18 high-value slash commands lacked natural language invocation
   - Creating lightweight trigger skills enables conversational access
   - 9 new workflow-trigger skills provide 85%+ command coverage via natural language

4. **DAIC mode awareness prevents errors:**
   - WRITE-CAPABLE skills must enforce IMPLEMENT mode restriction
   - Attempting writes in DISCUSS/ALIGN/CHECK modes causes framework violations
   - Proper enforcement in skill-rules.json prevents these issues

5. **Testing guide prevents regression:**
   - 100+ documented test cases ensure trigger accuracy
   - Provides validation checklist for future trigger additions
   - Helps identify conflicts and overlaps before deployment

### Future Opportunities

1. **Automated Testing:** Build test suite to validate trigger matching logic programmatically
2. **Usage Analytics Dashboard:** Real-time visualization of skill activation patterns
3. **User Feedback Loop:** Allow users to report missed or incorrect triggers
4. **A/B Testing:** Experiment with different trigger patterns to optimize relevance
5. **Machine Learning:** Train model on user interaction patterns to suggest new triggers
6. **Context-Aware Triggers:** Trigger skills based on current DAIC mode, recent actions, or file context

---

## System Boundary Clarification: cc-sessions as Both SoT and Execution Spine

**Date:** 2025-11-16
**Context:** REPAIR-hook-system-agent-conflicts task
**Impact:** Clarified system architecture and control boundaries

### Key Insight: Internal vs External System Conflicts

When debugging system conflicts, it's critical to distinguish between:

**Internal Conflicts** - Different components of the SAME system conflicting
- Example: cc-sessions protocols (instructional layer) vs cc-sessions hooks (mechanical layer)
- Resolution: The SoT system resolves internally (instructional layer wins)

**External Conflicts** - Two DIFFERENT systems with competing authority
- Example: cc-sessions rules vs Claude Code permissions
- Resolution: Higher-priority system wins (explicit hierarchy needed)

### The REPAIR-hook-system-agent-conflicts Case

**Initial Framing (Incorrect):**
"The hook system (Claude Code) conflicts with agent instructions (cc-sessions)"
- This framed it as Claude Code vs cc-sessions (external conflict)
- Led to questions about permission systems and cross-system coordination

**Correct Framing:**
"The cc-sessions hooks (mechanical layer) conflict with cc-sessions protocols (instructional layer)"
- This is an INTERNAL cc-sessions conflict
- Both layers are part of the same system
- cc-sessions is both the SoT AND the execution spine

**Claude Code's Role:**
- Provides hook infrastructure (PreToolUse, PostToolUse events)
- Provides tool system (Task, Bash, Edit, etc.)
- Makes NO workflow decisions
- Is passive infrastructure, not an active decision-maker

### System Architecture Layers

```
cc-sessions (Control/SoT System)
├── Instructional Layer (Protocols/Agents)
│   ├── Defines WHAT should happen
│   └── Says: "WAIT for user", "Your choice:"
│
├── Mechanical Layer (Hooks)
│   ├── Enforces HOW it happens
│   └── Does: Auto-advances workflows, cleans up subagents
│
└── When they conflict → Instructional layer wins

Claude Code (Infrastructure Only)
├── Provides hook system
├── Provides tool system
└── Makes no workflow decisions
```

### Decision Framework for System Conflicts

When encountering apparent system conflicts:

1. **Identify the systems involved**
   - What are the competing authorities?
   - Are they separate systems or layers within one system?

2. **Check if it's an internal conflict**
   - Do both components belong to the same system?
   - If YES → System should resolve internally using its own rules
   - If NO → Need explicit cross-system priority hierarchy

3. **For internal conflicts**
   - Which layer is instructional (defines goals)?
   - Which layer is mechanical (executes goals)?
   - Instructional layer wins

4. **For external conflicts**
   - Consult CLAUDE.md Section 2.3 "Decision Priority (North Star)"
   - Apply priority order: Tier-1 SoT → DAIC → Task manifest → User instructions → Correctness → Simplicity → Performance

### Lessons Learned

**1. System Role Clarity Matters**
- Know which systems make decisions vs provide infrastructure
- Claude Code is infrastructure (passive)
- cc-sessions is control/SoT (active)

**2. Layer Conflicts Are Common**
- Instructional vs mechanical layers naturally conflict
- Design for this: instructional should override mechanical
- Example: Agent says "wait" → Hook should detect and respect it

**3. Framing Affects Solutions**
- Incorrect framing (external conflict) → complex cross-system coordination
- Correct framing (internal conflict) → simpler internal resolution
- Always verify system boundaries before designing solutions

### Related Files

- `sessions/tasks/REPAIR-hook-system-agent-conflicts.md` - Task that clarified this
- `CLAUDE.md` Section 2 - SoT Tiers and Decision Priority
- `sessions/hooks/post_tool_use.js` - Hook system (mechanical layer)
- `sessions/protocols/` - Protocol files (instructional layer)

