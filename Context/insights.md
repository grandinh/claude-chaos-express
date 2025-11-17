# Context Insights

This file documents patterns, learnings, and insights discovered during framework development and usage.

---

## Orchestrator Health Verification: Evidence-Based Validation

**Date:** 2025-11-16
**Context:** REPAIR-orchestrator-health-2025-11-16 task completion
**Impact:** Prevented prolonged system failure by implementing health check protocol

### Key Insight: Queue State Reset as Surgical Intervention

When the multi-agent orchestrator experiences complete task execution deadlock (0% completion rate despite processed tasks), the fastest recovery path is **queue state reset** rather than dependency untangling:

**Quick Recovery Protocol:**
1. Backup current queue state with timestamp
2. Delete `.task-queues.json` file
3. Restart orchestrator to rebuild queues from task files
4. Verify agents assign tasks within 10 seconds

**Why This Works:**
- Task metadata still exists in individual task files (source of truth)
- Queue files are derived state (can be regenerated)
- Circular dependency cycles get broken when queue rebuilds from scratch
- Faster than manually editing multiple `depends_on` fields

**When to Use:**
- Circular dependency deadlock detected (run `node scripts/dependency-graph.js`)
- 100+ tasks processed but 0 completed
- All tasks showing "blocked by dependencies" status
- After fixing YAML frontmatter errors in multiple tasks

**Prevention Checklist:**
- Run `node scripts/dependency-graph.js` before starting orchestrator (detect cycles)
- Validate TEMPLATE.md YAML frontmatter (quote special characters)
- Use `depends_on` sparingly (prefer priority/leverage ordering)
- Test frontmatter changes with `npm run validate-frontmatter`

**Related:** See `context/gotchas.md` entries "Task Dependency Circular References" and "Task TEMPLATE YAML Parsing Failure" for specific issues resolved.

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

---

## Continuous Worker False Positive Pattern

**Date:** 2025-11-16
**Context:** Multi-agent task distribution investigation and automation simplification
**Impact:** Identified critical pattern for evaluating automation systems

### Key Insight: Task Assignment Tracking ≠ Task Execution Automation

Systems can appear fully operational while accomplishing zero actual work. The continuous worker system demonstrated this perfectly:

**What Appeared Functional:**
- ✓ Agents assigned to tasks
- ✓ Lock files created correctly
- ✓ Progress tracking updated
- ✓ Assignment queue managed
- ✓ Notification files generated

**What Actually Happened:**
- ❌ Zero commits from agents
- ❌ Zero file modifications
- ❌ Zero completed tasks
- ❌ 4+ hours with no progress

### Pattern Discovered

**The False Automation Pattern:**
```
System tracks WHAT should happen
    ↓
Creates metadata about work
    ↓
Updates status files
    ↓
Appears operational (metrics look good)
    ↓
But NEVER triggers actual execution
```

**vs. Real Automation:**
```
System detects trigger
    ↓
Actually starts execution
    ↓
Work happens (commits, changes, outputs)
    ↓
Evidence-based progress (not just metadata)
```

### Why This Matters

**False automation is worse than no automation:**
1. **False Confidence** - Appears working, so problems go undetected
2. **Wasted Resources** - Maintaining broken system costs time
3. **Confused Users** - "Why is nothing happening?" despite status showing "in progress"
4. **Delayed Detection** - Can run for hours/days before someone checks actual output

**Real automation has evidence:**
- Commits with timestamps
- File modifications
- Created artifacts (PRs, builds, deployments)
- Observable side effects

### How to Detect False Automation

**1. Time-Box Verification**
```bash
# If >1 hour with "in-progress" status but no output → broken
git log --since="1 hour ago" --oneline
# Empty = broken automation

ls -lt <work-directory> | head -5
# No recent files = broken automation
```

**2. Evidence-Based Metrics**
```
❌ Don't trust: "Task assigned", "In progress", "Agent working"
✅ Do verify: Commits, file changes, PRs created, tests run
```

**3. Mechanism vs. Outcome**
```
❌ Mechanism metrics: "Assigned 10 tasks", "3 agents active"
✅ Outcome metrics: "5 PRs created", "20 tests passing", "3 features deployed"
```

### Application: Evaluating Any Automation

**Before trusting automation:**
1. **Check the evidence** - What actual work artifacts does it produce?
2. **Time-box test** - Run for 30-60 minutes, verify real output
3. **Trace the execution** - Does it actually trigger work or just track assignments?
4. **Compare metrics** - Are "in progress" counts growing faster than "completed" counts?

**Red flags for false automation:**
- Status tracking without execution triggering
- Metadata updates without file changes
- "Assignment" logic without "execution" logic
- Hours of "in progress" with zero commits

### Real-World Example: Continuous Worker

**System Design:**
```javascript
// Continuous worker ONLY did this:
function assignNextTask(agentId) {
    const task = getNextTask();
    createLockFile(task);
    updateProgressJson(agentId, task);
    writeNotificationFile(agentId, task);
    // ❌ Missing: Actually start Cursor with this task!
}
```

**What It Should Have Done:**
```javascript
function assignAndExecuteTask(agentId, task) {
    createLockFile(task);
    updateProgressJson(agentId, task);

    // ✅ Actually trigger work:
    createTriggerFile(task);  // Cursor detects → auto-starts
    // or
    triggerCursorAgent(task); // API call → starts implementation
}
```

### Lessons for Future Automation

**When designing automation:**
1. **Start with execution** - How does work actually happen?
2. **Then add tracking** - Metadata comes second, not first
3. **Verify end-to-end** - Test that work completes, not just starts
4. **Evidence-based monitoring** - Track outcomes, not just assignments

**When evaluating existing automation:**
1. **Demand evidence** - Don't trust status files, check actual output
2. **Time-box tests** - If no output after reasonable time, it's broken
3. **Trace execution path** - Follow code from trigger to work completion
4. **Ask "What if it fails?"** - Does silence mean success or failure?

### Related Files

- `sessions/tasks/m-unified-cursor-automation.md` - Replacement automation that works
- `context/decisions.md` - "Deprecate Continuous Worker System" decision
- `context/gotchas.md` - "Continuous Worker Appears Active But Does Nothing"
- `docs/automation-strategy.md` - Contrast with broken continuous worker

---

## Trigger File Pattern for IDE Automation

**Date:** 2025-11-16
**Context:** Unified cursor automation design
**Impact:** Established superior pattern for cross-tool automation

### Key Insight: Explicit Trigger Files > Polling/Daemons for IDE Automation

When automating work handoffs between tools (e.g., Claude → Cursor), trigger files provide a superior mechanism to polling, daemons, or webhooks.

### Pattern

**Trigger File Workflow:**
```
Tool A (Claude) completes planning
    ↓
Creates handoff.json (work specification)
    ↓
Creates trigger.md (notification + pointer)
    ↓
Tool B (Cursor) detects trigger on workspace open
    ↓
Reads handoff.json → starts work
    ↓
Archives trigger.md after processing
```

**vs. Polling Approach:**
```
Background daemon polls for new handoffs every N seconds
    ↓
Resource intensive, can miss events if daemon crashes
    ↓
Hard to debug (no visible state)
```

**vs. Webhook Approach:**
```
Tool A sends HTTP request to Tool B
    ↓
Requires Tool B running HTTP server
    ↓
Network dependency, firewall issues
    ↓
Lost if Tool B not running
```

### Why Trigger Files Work Better

**1. Explicit and Visible**
```bash
# Easy to debug: "Does trigger file exist?"
ls .cursor/triggers/
# implement-auth-2025-11-16.md

# Easy to inspect:
cat .cursor/triggers/implement-auth-2025-11-16.md
# See exactly what's queued
```

**2. Natural Queue Mechanism**
```bash
# Multiple triggers = natural queue
ls .cursor/triggers/
# implement-auth.md
# implement-logging.md
# implement-tests.md

# Process in order (FIFO)
```

**3. Human-Cancellable**
```bash
# Cancel automation: just delete trigger
rm .cursor/triggers/implement-auth.md
# Done! No API calls, no daemon to stop
```

**4. Survives Restarts**
```bash
# Cursor crashed? No problem
# Trigger file persists on disk
# Will be picked up on next workspace open
```

**5. No Background Processes**
```
# IDE workspace initialization hook detects triggers
# No polling daemon needed
# No resource overhead when idle
```

**6. Debuggable State**
```bash
# What's queued?
ls .cursor/triggers/

# What failed?
ls .cursor/triggers/failed/

# What completed?
ls .cursor/triggers/archive/

# Full audit trail on filesystem
```

### Implementation Pattern

**Trigger File Format:**
```markdown
---
task_id: m-implement-auth
handoff: ../handoffs/active/m-implement-auth.json
created: 2025-11-16T10:00:00Z
auto_implement: true
priority: high
---

# AUTO-IMPLEMENT: Implement Authentication

This is an automated implementation trigger.
Cursor will detect this file and begin work.

## Instructions
1. Read handoff JSON for full spec
2. Implement todos sequentially
3. Commit after each module
4. Archive this trigger when done
```

**IDE Detection (Cursor Rules):**
```markdown
## Automated Implementation Detection

On workspace open, check for:
- Pattern: `.cursor/triggers/implement-*.md`

If found:
1. Read trigger frontmatter
2. Load handoff JSON
3. Start Composer with spec
4. Archive trigger to `.cursor/triggers/archive/`
```

**Handoff Creation:**
```javascript
function createHandoff(taskId, spec) {
    // Create handoff JSON (data)
    const handoffPath = `.cursor/handoffs/active/${taskId}.json`;
    fs.writeFileSync(handoffPath, JSON.stringify(spec));

    // Create trigger file (notification)
    const triggerPath = `.cursor/triggers/implement-${taskId}.md`;
    const trigger = generateTriggerMarkdown(taskId, handoffPath);
    fs.writeFileSync(triggerPath, trigger);

    console.log(`🚀 Trigger created: ${triggerPath}`);
}
```

### When to Use Trigger Files

**Good For:**
- Handing off work between AI tools (Claude → Cursor)
- Queueing automation tasks
- Triggering IDE-based workflows
- Any scenario where:
  - Work can wait until tool opens
  - Explicit > implicit preferred
  - Human oversight desired

**Not Good For:**
- Real-time critical operations (use webhooks/API)
- High-frequency events (use event streams)
- Cross-network coordination (use proper messaging)

### Application Examples

**1. Claude → Cursor Handoff**
```
Claude (ALIGN phase) → Creates handoff + trigger
Cursor (workspace open) → Detects trigger → Implements
```

**2. CI/CD Trigger**
```
CI passes → Creates deploy-trigger.md
Deployment tool → Detects trigger → Deploys
```

**3. Code Review Queue**
```
Developer → Creates review-request-trigger.md
Reviewer → Opens IDE → Sees trigger → Reviews
```

**4. Task Assignment**
```
PM → Creates task-trigger.md
Developer → Opens IDE → Gets notification → Starts work
```

### Comparison with Other Patterns

| Pattern | Visibility | Survivability | Resource Use | Debuggability |
|---------|-----------|---------------|--------------|---------------|
| **Trigger Files** | ✅ Explicit | ✅ Persists | ✅ Zero overhead | ✅ Filesystem audit trail |
| Polling Daemon | ❌ Hidden | ❌ Lost if crashes | ❌ Constant CPU/mem | ❌ Check logs |
| Webhooks | ❌ Network only | ❌ Lost if offline | ✅ Event-driven | ❌ Check server logs |
| Database Queue | ⚠️ Query needed | ✅ Persists | ⚠️ DB overhead | ⚠️ Query logs |

### Related Files

- `sessions/tasks/m-unified-cursor-automation.md` - Uses trigger file pattern
- `.cursor/plans/cursor-automation-flow-spec-9b54aa1a.plan.md` - Architectural analysis
- `context/decisions.md` - "Unified Cursor Automation" decision

## Three-Task Decomposition Pattern for Multi-Component Systems

**Date:** 2025-11-16
**Context:** Multi-agent orchestration architecture design
**Impact:** Reusable pattern for breaking down complex automation systems

### Key Insight: Detection → Enforcement → Orchestration Pattern

Complex automation systems benefit from three-layer decomposition that separates input detection, validation/gating, and work coordination into independent components.

### The Pattern

```
Layer 1: Detection (Input Layer)
    ↓ Feeds
Layer 2: Enforcement (Gating Layer)
    ↓ Routes
Layer 3: Orchestration (Coordination Layer)
```

**Layer Responsibilities:**

1. **Detection** - Single responsibility: detect new work, minimal logic, no decision-making
2. **Enforcement** - Validates prerequisites, framework-level gating, determines routing  
3. **Orchestration** - Manages distribution, coordinates workers, depends on both layers

### Real-World Application

**Multi-Agent Task Automation (3 independent tasks):**
- Task 1 (Detection): File watcher monitors for new tasks
- Task 2 (Enforcement): `context_gathered` flag validation and queue routing
- Task 3 (Orchestration): 3-agent pool with dual queues and load balancing

### Why This Works

**Clear Separation:** "What work?" → "Ready?" → "Who does it?"
**Independent Development:** Each layer has standalone value
**Scalability:** Easy to swap or enhance individual layers
**Testability:** Each layer testable independently

### Related Files

- `sessions/tasks/m-unified-cursor-automation.md` - Detection layer
- `sessions/tasks/h-enforce-context-gathering.md` - Enforcement layer
- `sessions/tasks/h-multi-agent-orchestration.md` - Orchestration layer

---

## Task Path Handling in Multi-Agent Systems

**Date:** 2025-11-17
**Context:** REPAIR-orchestrator-queue-path-format task (orchestrator path bug fixes)
**Impact:** Prevents subtle path doubling and resolution bugs in agent spawning

### Key Insight: Dual Path Representation

Queue data structures should maintain both absolute and relative path representations for different use cases.

**Pattern Discovered:**
```javascript
// Task queue object structure
{
  "path": "/full/absolute/path/to/sessions/tasks/filename.md",  // For file I/O
  "relativePath": "filename.md",                                  // For CLI args
  "name": "task-name",
  // ... other fields
}
```

### Why This Matters

**Different operations need different path formats:**

1. **CLI Arguments** need relative filenames:
   ```javascript
   // ✅ CORRECT - Use relativePath for CLI args
   spawn('claude', [`@sessions/tasks/${task.relativePath}`]);
   // Result: @sessions/tasks/filename.md

   // ❌ WRONG - Computing from absolute path
   const computed = path.relative(PROJECT_ROOT, task.path);
   spawn('claude', [`@sessions/tasks/${computed}`]);
   // Result: @sessions/tasks/sessions/tasks/filename.md (doubled!)
   ```

2. **File I/O** needs absolute paths:
   ```javascript
   // ✅ CORRECT - Resolve to absolute before reading
   const absPath = path.isAbsolute(task.path)
     ? task.path
     : path.join(PROJECT_ROOT, task.path);
   const content = fs.readFileSync(absPath, 'utf8');

   // ❌ WRONG - Assuming path is always absolute
   const content = fs.readFileSync(task.path, 'utf8');
   // Fails if working directory != PROJECT_ROOT
   ```

### Common Pitfalls

**Path Doubling:**
- Computing relative path from absolute path, then prepending directory again
- Example: `path.relative()` → `sessions/tasks/file.md` + `sessions/tasks/` prefix → doubled path

**Relative Path Assumptions:**
- Assuming `task.path` is always absolute
- Queue rebuilds may use relative paths
- Always check with `path.isAbsolute()` before file operations

**Working Directory Dependencies:**
- Relative paths break when working directory changes
- Orchestrator runs from `scripts/`, tasks are in `../sessions/tasks/`
- Always resolve to absolute paths for file I/O

### Application

**When designing queue data structures:**
```javascript
// ✅ DO: Maintain both representations
const task = {
  path: path.resolve(PROJECT_ROOT, 'sessions/tasks', filename),  // Absolute
  relativePath: filename,                                         // Relative
};

// ✅ DO: Use appropriate format for each use case
spawn(cmd, [`@sessions/tasks/${task.relativePath}`]);  // CLI
fs.readFileSync(task.path, 'utf8');                     // File I/O

// ❌ DON'T: Compute paths on-the-fly
const computed = path.relative(PROJECT_ROOT, task.path);
spawn(cmd, [`@sessions/tasks/${computed}`]);  // Risk of doubling
```

**When reading files from queue:**
```javascript
// ✅ DO: Defensive path resolution
const absPath = path.isAbsolute(task.path)
  ? task.path
  : path.join(PROJECT_ROOT, task.path);
const content = fs.readFileSync(absPath, 'utf8');

// ❌ DON'T: Trust path is absolute
const content = fs.readFileSync(task.path, 'utf8');
```

### Related Files

- `scripts/agent-orchestrator.js:274` - Local CLI spawning (uses `relativePath`)
- `scripts/agent-orchestrator.js:351` - Cloud agent file reading (resolves to absolute)
- `context/gotchas.md` - "Orchestrator Agent Spawning Path Doubling Bug" (comprehensive gotcha entry)
- `sessions/tasks/REPAIR-orchestrator-queue-path-format.md` - REPAIR task documenting both path bugs

---

## Graph Algorithm Debugging: When Detection Methods Disagree

**Date:** 2025-11-17
**Context:** Orchestrator deadlock investigation (dependency graph false cycle detection)
**Impact:** Established diagnostic pattern for graph algorithm bugs

### Key Insight: Contradictory Results Signal Implementation Bug, Not Data Issue

When two cycle detection algorithms (topological sort and DFS) disagree about circular dependencies, the issue is almost always in the **algorithm implementation**, not the graph structure.

**The Pattern:**
```
Topological Sort: "Cycle detected" (108/109 tasks sorted)
DFS Cycle Detection: "No cycles found"
→ Contradiction = Implementation bug, not circular dependency
```

### Why This Matters

**Initial Instinct (Wrong):**
"The task dependency graph must have a subtle circular reference that DFS can't detect"
- Leads to manually inspecting 109 task files
- Wastes time analyzing task relationships
- Misses the actual bug in topological sort implementation

**Correct Diagnosis:**
"Two well-established algorithms shouldn't disagree - one must be implemented incorrectly"
- Focus on algorithm code, not data
- Compare implementation against textbook algorithm
- Look for state corruption or conditional logic errors

### Root Cause Pattern

**The bug was state corruption in bidirectional graph structure:**
```javascript
// BUG: Unconditional overwrite of reverse adjacency list
if (!this.adjacencyList.has(task)) {
    this.adjacencyList.set(task, []);
    this.reverseList.set(task, []);  // ← Overwrites existing entries!
}

// FIX: Conditional initialization preserves existing entries
if (!this.reverseList.has(task)) {
    this.reverseList.set(task, []);
}
```

**Why it caused false cycle detection:**
1. Task A added with dependency on Task B → Reverse list: `B → [A]`
2. Task B added later → Line 84: `reverseList.set(B, [])` ← **Overwrites to empty!**
3. Topological sort can't find Task B's dependents (reverse list empty)
4. Task A's in-degree never decrements to 0
5. Task A never becomes "ready" → reported as false cycle

### Diagnostic Workflow

**When graph algorithms disagree:**

1. **Verify contradiction** - Run both methods, confirm disagreement
2. **Create diagnostic tool** - Build minimal reproduction (`diagnose-cycle.js`)
3. **Inspect algorithm state** - Print intermediate data structures
4. **Compare to reference** - Check against textbook implementation
5. **Test fix** - Verify both methods now agree

### Prevention Checklist

- Never unconditionally overwrite map entries
- Test with different insertion orders
- Verify bidirectional consistency (forward + reverse graphs match)
- Use multiple detection methods (should agree)
- Add state inspection tools

### Work Log (2025-11-17)

**Session Summary:**
- Reproduced orchestrator deadlock (0% completion rate)
- Topological sort reported cycle, DFS found none (contradiction!)
- Created diagnostic tool exposing state corruption
- Fixed unconditional overwrite bug in `dependency-graph.js:84-86`
- Verified: 109/109 tasks sorted correctly, both algorithms agree
- Test suite: 152/152 passing
- Documented pattern for future debugging

**Key Learning:**
Algorithm contradiction points to implementation bug, not data issue. Diagnostic tools tracing intermediate state are essential.

### Related Files

- `scripts/dependency-graph.js:84-86` - Fixed bug
- `scripts/diagnose-cycle.js` - Diagnostic tool
- `scripts/find-missing-deps.js` - Dependency analysis tool
- `context/gotchas.md` - Comprehensive bug documentation
- `sessions/tasks/m-create-handoff-protocol.md` - Task exposing bug

---

## Context Manifest Validation Requires Semantic Understanding

**Date:** 2025-11-17
**Context:** h-enforce-context-gathering task
**Impact:** Prevents false positives in context validation

### Learning

Simple string matching (`content.includes('## Context Manifest')`) creates false positives and validates incomplete context

### Pattern Discovered

Context Manifest validation must check:

1. **Markdown heading structure** (not inside code blocks/comments)
```javascript
const headingRegex = /^#{1,6}\s+Context Manifest\s*$/m;
```

2. **Content extraction between headings**
```javascript
const afterHeading = content.substring(headingIndex);
const nextHeadingMatch = afterHeading.match(/^#{1,6}\s+\w/m);
```

3. **Meaningful content filtering** (exclude empty lines, HTML comments)
```javascript
const meaningfulContent = sectionContent
    .split('\n')
    .filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 0 && !trimmed.startsWith('<!--');
    })
    .join('\n');
```

4. **Sufficiency threshold** (minimum 50 characters)
```javascript
if (meaningfulContent.length < 50) {
    return { valid: false, reason: 'content_insufficient' };
}
```

### Why This Matters

**False Positives Without Semantic Check:**
- Code blocks containing "## Context Manifest" would pass string matching
- HTML comments with the text would pass
- Empty sections with just the heading would pass
- All three create false sense of validation

### Implementation

Shared utility in `sessions/lib/context-validation-utils.js`:

```javascript
function hasValidContextManifest(content, minLength = 50) {
    // 1. Find heading with proper markdown structure
    const headingRegex = /^#{1,6}\s+Context Manifest\s*$/m;
    const match = content.match(headingRegex);
    if (!match) return { valid: false, reason: 'heading_missing' };

    // 2-3. Extract and filter meaningful content
    // 4. Check sufficiency threshold
    return { valid: meaningfulContent.length >= minLength };
}
```

### Application

- Use `hasValidContextManifest()` utility for all Context Manifest checks
- Never use simple string matching for markdown structure validation
- Test with edge cases: code blocks, comments, empty sections
- Document minimum content requirements in validation errors

### Related Files

- `sessions/lib/context-validation-utils.js` - Validation implementation
- `sessions/hooks/context_validation.js` - Uses shared utility
- `scripts/task-queue-manager.js` - Uses shared utility
- `docs/context-gathering-enforcement.md` - Validation specification

---

## Protocol Error Recovery Prevents Deadlock

**Date:** 2025-11-17
**Context:** h-enforce-context-gathering task
**Impact:** Prevents protocol deadlock when agents fail

### Learning

Protocols that invoke agents must handle failures, or agents get stranded waiting indefinitely

### Pattern Discovered

**Original protocols assumed agents always succeed:**
```markdown
- MUST invoke context-gathering agent before proceeding
- Block progression until complete
```

This creates deadlock if agent fails/times out.

### Solution: Explicit Recovery Paths

Add "Error Recovery" section to all agent-invoking protocols:

```markdown
If context-gathering agent fails:
1. Log failure to context/gotchas.md with error details
2. Present options:
   - RETRY: Invoke agent again (recommended for transient failures)
   - MANUAL: Create minimal manifest manually (requires user input)
   - ABORT: Cancel and return to discussion mode
3. Based on user choice, proceed accordingly

**Note:** Manual manifests still require proper context before IMPLEMENT mode
```

### Why This Matters

- **Prevents Deadlock:** Agent doesn't wait forever if invocation fails
- **Actionable Options:** User has clear recovery paths
- **Failure Logging:** Issues captured for debugging
- **Graceful Degradation:** Can continue with manual fallback

### Implementation Example

From `sessions/protocols/task-startup/task-startup.md`:

```markdown
**Error Recovery:**

If context-gathering agent fails:
1. Log failure to `context/gotchas.md` with error details
2. Present options to user [RETRY/MANUAL/ABORT]
3. Based on user choice:
   - RETRY: Invoke agent again
   - MANUAL: Create minimal manifest, set flag to false, warn incomplete
   - ABORT: Exit protocol, return to discussion mode

**Note:** Manual context manifest creation is a fallback only.
```

### Application

- All protocols invoking agents must include "Error Recovery" section
- Provide 3 options: RETRY/MANUAL/ABORT
- Log failures before presenting options
- Document fallback limitations clearly
- Never assume agent invocation will succeed

### Related Files

- `sessions/protocols/task-startup/task-startup.md` - Error recovery section
- `sessions/protocols/task-creation/task-creation.md` - Error recovery section
- `docs/context-gathering-enforcement.md` - Recovery procedures
- `context/gotchas.md` - Protocol error handling gap entry

---
