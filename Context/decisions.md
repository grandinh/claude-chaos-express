# Context Decisions

This file documents important decisions made during framework development and usage, along with their rationale.

---

## Agent Pause Detection: Pattern-Based vs Protocol-Level Flags

**Decision Date:** 2025-11-16
**Context:** REPAIR-hook-system-agent-conflicts task
**Decision Made By:** Framework implementation

### The Problem

Hook system needed to detect when agents/protocols request user input (pause markers like "WAIT for user response", "Your choice:") to prevent automatic workflow advancement that conflicts with agent instructions.

### Options Considered

**Option A: Pattern-Based Detection (Chosen)**
- Parse agent output using regex patterns to detect pause markers
- Three marker categories: explicit waits, decision prompts, special cases
- Flexible, works with existing protocols without modification

**Option B: Protocol-Level Pause Flags**
- Protocols set explicit flags in state or return structured data
- Requires modifying all protocols/agents to use new flag system
- More explicit but requires coordination across 20+ protocol files

### Decision

**Chose Option A: Pattern-Based Detection**

### Rationale

1. **Consistency** - All protocols already use consistent patterns ("WAIT for user", "[DECISION: ...]", "Your choice:")
2. **No Protocol Changes** - Works with existing protocols without requiring modifications
3. **Flexible** - Easy to add new patterns as needed without touching protocol files
4. **Maintainability** - Centralized detection logic in one place (post_tool_use.js)
5. **Backward Compatible** - Existing workflows don't need updates

**Trade-offs Accepted:**
- Slightly more fragile than explicit flags (patterns could be missed)
- Requires regex maintenance if marker conventions change
- Could have false positives if patterns appear in narrative text

### Implementation

Three pause marker categories:

1. **Explicit Wait Instructions:**
   - `WAIT for user response`
   - `Wait for user confirmation`
   - `execution MUST stop here`

2. **Decision Prompts:**
   - `[DECISION: ...]` + `Your choice:`
   - `[PROPOSAL: ...]` (sometimes)

3. **Special Cases:**
   - `[FINDINGS: Code Review]` - code-review findings

**Detection Function:** `shouldPauseForUserInput()` in `sessions/hooks/post_tool_use.js`

### Consequences

**Positive:**
- Immediate compatibility with all 7 identified conflict scenarios
- No protocol refactoring needed
- Centralized, easy-to-update detection logic

**Negative:**
- Relies on convention adherence by protocol authors
- Could miss pauses if protocols use non-standard phrasing
- False positives possible (though unlikely in practice)

### Future Considerations

If pattern-based detection proves too fragile:
- Extract pause markers to configuration file (easier maintenance)
- Add protocol linting to enforce standard pause marker usage
- Consider hybrid approach (pattern detection + optional explicit flags)

### Related Files

- `sessions/hooks/post_tool_use.js` - Pause detection implementation
- `CLAUDE.md` Section 3.4 - Pause/resume documentation
- `sessions/tasks/REPAIR-hook-system-agent-conflicts.md` - Task that made this decision

---

## Agent Registry Source of Truth

**Decision Date:** 2025-11-17
**Context:** REPAIR-agent-registry-sot task
**Decision Made By:** Framework implementation

### The Problem

The agent registry CLI (`scripts/agent-registry.js`) was crashing because critical files were missing:
- `repo_state/agent-registry-schema.json` - JSON schema for validation
- Bootstrap logic to initialize the system when files are missing

This blocked agent management workflows and prevented documentation auto-generation.

### Decision

**Made `repo_state/agent-registry.json` the canonical source of truth** for all agent metadata, validated by `repo_state/agent-registry-schema.json`.

### Implementation

1. **Created JSON Schema** - Defines structure and validation rules for registry
2. **Added Bootstrap Command** - `init` command creates schema and generates initial registry
3. **Added Validation Command** - `validate` command verifies registry integrity
4. **Made Schema Loading Non-Fatal** - Allows `init` command to run when schema is missing
5. **Graceful Error Messages** - Clear instructions when files are missing

### Key Commands

- `node scripts/agent-registry.js init` - Bootstrap registry system
- `node scripts/agent-registry.js validate` - Verify registry integrity
- `node scripts/agent-registry.js sync` - Update registry from agent files
- `node scripts/agent-registry.js generate-docs` - Auto-update documentation

### Benefits

1. **Unblocks Workflows** - Registry CLI now works end-to-end
2. **Single Source of Truth** - Centralized agent metadata prevents drift
3. **Schema Validation** - Catches corruption early with clear error messages
4. **Bootstrap Support** - Easy initialization for new environments
5. **Documentation Automation** - Auto-generates agent catalogs from registry

### Related Files

- `repo_state/agent-registry.json` - Registry database (SoT)
- `repo_state/agent-registry-schema.json` - Validation schema
- `scripts/agent-registry.js` - Registry management CLI
- `docs/agent-system-audit.md` - Auto-generated from registry
- `docs/claude-cursor-agent-alignment.md` - Auto-generated from registry
- `sessions/tasks/REPAIR-agent-registry-sot.md` - Task that made this decision

---

## Test Isolation Strategy: Per-Test vs Per-Suite

**Decision Date:** 2025-11-17
**Context:** m-fix-test-failures-orchestrator-agent-registry task
**Decision Made By:** Test infrastructure design

### The Problem

Agent registry tests were failing due to state pollution between tests. Tests that created agents caused subsequent tests to fail because the registry wasn't reset between individual tests.

### Options Considered

**Option A: Per-Suite Isolation (Original)**
```javascript
beforeAll(() => backupRegistry());
afterAll(() => restoreRegistry());
```
- Backup/restore once per test suite
- Tests run faster (less I/O)
- State persists across tests (causes pollution)

**Option B: Per-Test Isolation (Chosen)**
```javascript
beforeEach(() => backupRegistry());
afterEach(() => restoreRegistry());
```
- Backup/restore before/after each test
- Tests fully isolated
- Slightly slower (more I/O)

### Decision

**Chose Option B: Per-Test Isolation**

### Rationale

1. **Correctness Over Speed** - Test reliability is more important than test speed
2. **True Independence** - Each test starts with clean state, prevents false failures
3. **Parallel Safe** - Tests can run in any order without issues
4. **Prevents Pollution** - Agents created in one test don't affect others
5. **Easier Debugging** - Failures are isolated to single tests, not cascading

**Trade-offs Accepted:**
- Slightly slower test runs (acceptable - tests still run in <10 seconds)
- More I/O operations (minimal impact with modern SSDs)
- Slightly more complex test setup (worth it for reliability)

### Implementation

**Per-Test Backup/Restore:**
```javascript
let testRegistryBackup;

beforeEach(() => {
    if (fs.existsSync(REGISTRY_PATH)) {
        testRegistryBackup = fs.readFileSync(REGISTRY_PATH, 'utf8');
    }
});

afterEach(() => {
    if (testRegistryBackup) {
        fs.writeFileSync(REGISTRY_PATH, testRegistryBackup, 'utf8');
        testRegistryBackup = null;
    }
    cleanupTestFiles(testFiles);
    testFiles = [];
});
```

### Guidelines for Other Tests

**Use per-test isolation when tests:**
- Modify files (registry, configs, state files)
- Create/delete resources (agents, tasks, locks)
- Change global state (environment variables, singletons)
- Have order-dependent assertions (expect specific counts)

**Use per-suite isolation when tests:**
- Only read data (no modifications)
- Use mocks/stubs (no real file I/O)
- Are truly stateless (no side effects)

### Results

**Before fix:**
- 9 test failures in agent-registry.test.js
- Tests passed individually but failed in suite
- 13 orphaned test agents in registry

**After fix:**
- All 163 tests passing consistently
- Tests pass in any order
- No orphaned test agents
- Clean test runs (can run multiple times without issues)

### Related Files

- `scripts/__tests__/agent-registry.test.js` - Implements per-test isolation (lines 88-99)
- `scripts/README.md` - Documents test isolation requirement (lines 251-252)
- `context/gotchas.md` - "Test Pollution: Agent Registry Tests" entry
- `sessions/tasks/m-fix-test-failures-orchestrator-agent-registry.md` - Task that made this decision

---

## Unified Cursor Automation vs. Separate Watchers

**Decision Date:** 2025-11-16
**Context:** Cursor automation simplification and continuous worker investigation
**Decision Made By:** Framework implementation

### The Problem

Three overlapping automation approaches created confusion and duplication:
1. **m-implement-cursor-automation** - Trigger-based handoff execution
2. **m-implement-cursor-auto-task-pickup** - File watcher for new tasks
3. **agent-continuous-worker.sh** - Task assignment tracking (non-functional)

Each had different infrastructure and approaches, creating maintenance burden.

### Options Considered

**Option A: Unified Watcher (Chosen)**
- Single file watcher monitors both patterns
- Shared infrastructure (logging, notifications, error handling)
- Single process, lower resource overhead

**Option B: Separate Watchers**
- Two independent watchers for each pattern
- Separate logging and notification systems
- Higher resource usage but simpler individual components

**Option C: Keep Continuous Worker**
- Continue using agent-continuous-worker.sh
- Add file watching on top
- Preserve existing assignment tracking

### Decision

**Chose Option A: Unified Watcher**

### Rationale

1. **Shared Infrastructure** - Logging, notifications, error handling used by both patterns
2. **Lower Resource Overhead** - One chokidar instance vs. two separate processes
3. **Easier Maintenance** - Single codebase for file watching logic
4. **Natural Fit** - Both patterns are file-based detection, similar architecture
5. **Proven Non-Functional** - Continuous worker (Option C) was broken (see Gotchas)

**Trade-offs Accepted:**
- Slightly more complex routing logic (pattern detection)
- Single point of failure (watcher down = both patterns fail)
- More complex testing (must verify both patterns work together)

### Implementation

**File:** `scripts/watch-cursor-automation.js`
**Watches:**
- `sessions/tasks/*.md` → New task detection workflow
- `.cursor/triggers/implement-*.md` → Handoff auto-implementation workflow

**Shared Infrastructure:**
- chokidar watcher with awaitWriteFinish
- Unified logging system (.cursor/automation-logs/)
- Desktop notification system
- Error handling and archiving

### Consequences

**Positive:**
- Eliminated duplication between two automation tasks
- Deprecated broken continuous worker system
- Reduced complexity from 3 systems → 1 system
- Complete implementation code already written

**Negative:**
- Must verify both patterns don't conflict
- Failure affects both workflows
- Slightly harder to debug (must identify which pattern triggered)

### Future Considerations

If patterns diverge significantly:
- Easy to split back into separate watchers
- Shared infrastructure can remain as library
- Pattern detection already modular

### Related Files

- `sessions/tasks/m-unified-cursor-automation.md` - Implementation spec
- `sessions/tasks/m-implement-cursor-automation.md` - Deprecated (merged)
- `sessions/tasks/m-implement-cursor-auto-task-pickup.md` - Deprecated (merged)
- `sessions/tasks/l-document-continuous-worker-scope.md` - Deprecated (system non-functional)
- `.cursor/plans/cursor-automation-flow-spec-9b54aa1a.plan.md` - Architectural analysis

---

## Cursor Automation: Sequential vs. Concurrent Trigger Processing

**Decision Date:** 2025-11-16
**Context:** Cursor automation flow design
**Decision Made By:** Framework implementation

### The Problem

When multiple handoff triggers exist simultaneously, system must decide: process them all at once (concurrent) or one at a time (sequential)?

### Decision

**Sequential (FIFO) processing for MVP, with priority support deferred to future phase**

### Rationale

1. **Safety** - Prevents file editing conflicts when multiple triggers modify same files
2. **Predictability** - FIFO order is simple to understand and debug
3. **Simplicity** - Easier error handling (one failure doesn't cascade)
4. **Sufficient for MVP** - Most workflows don't generate simultaneous triggers
5. **Future-Proof** - Can add priority queue or concurrency later without breaking changes

**Trade-offs Accepted:**
- Slower processing when multiple triggers exist
- No priority support initially (all triggers equal priority)
- Can't parallelize independent tasks (even if safe)

### Implementation

**Processing Order:** FIFO (alphabetical by trigger filename)
**Concurrency:** 1 trigger at a time
**Future Extension Point:** Add priority field to trigger frontmatter

### Consequences

**Positive:**
- No race conditions or file conflicts
- Easy to debug (linear execution trace)
- Predictable behavior for users

**Negative:**
- Suboptimal for high-volume scenarios
- Can't prioritize urgent triggers
- Slower than parallel processing

### Future Enhancements

**Phase 2 (if needed):**
- Add `priority: high|medium|low` to trigger frontmatter
- Process high-priority triggers first
- Still sequential, but priority-ordered

**Phase 3 (if needed):**
- Analyze trigger dependencies (which files they touch)
- Allow concurrent processing of independent triggers
- Requires dependency analysis and conflict detection

### Related Files

- `sessions/tasks/m-unified-cursor-automation.md` - Implementation spec
- `.cursor/plans/cursor-automation-flow-spec-9b54aa1a.plan.md` - Architectural analysis (Q2)

---

## Deprecate Continuous Worker System

**Decision Date:** 2025-11-16
**Context:** Multi-agent task distribution investigation revealed system non-functional
**Decision Made By:** Framework implementation

### The Problem

The `agent-continuous-worker.sh` system appeared functional but was proven non-functional:
- **Symptom:** 3 agents assigned to tasks for 4+ hours with zero progress
- **Evidence:** No commits, no file modifications, no actual work
- **Root Cause:** System only tracked assignment, didn't automate implementation

### Decision

**Archive continuous worker system, start fresh with unified automation**

### Rationale

1. **Proven Non-Functional** - Real-world test showed zero work output after 4+ hours
2. **Fundamental Limitation** - Only tracks "who should work on what", doesn't trigger actual work
3. **False Automation** - Appears operational (progress tracking, lock files) but does nothing
4. **Clean Slate** - Existing assignments are stale and meaningless
5. **Better Replacement** - Unified automation actually automates work execution

**Evidence:**
```bash
# Agent status after 4+ hours
Agent 1: 0 tasks completed (working on first task)
Agent 2: 0 tasks completed (working on first task)
Agent 3: 0 tasks completed (working on first task)

# No evidence of work:
- 0 commits from agents
- 0 task files modified
- 0 help requests
- All still locked on first assigned tasks
```

### Migration Strategy

**Archive, don't migrate:**
```bash
mkdir -p scripts/archive/continuous-worker
mv scripts/agent-continuous-worker.sh scripts/archive/
mv scripts/agent-workflow.sh scripts/archive/
mv sessions/tasks/agent-assignments.json sessions/tasks/archive/
mv sessions/tasks/agent-progress.json sessions/tasks/archive/
```

**No data migration:**
- Existing agent assignments are stale (4+ hours, no progress)
- Fresh start prevents confusion from broken state
- New unified automation works differently (trigger-based, not assignment-based)

### Replacement

**New System:** `m-unified-cursor-automation.md`
- Actually automates implementation (trigger → Cursor auto-start → work happens)
- File watcher detects triggers and handoffs
- Cursor rules trigger real execution
- Evidence of work: commits, file changes, PRs

### Consequences

**Positive:**
- Eliminates false sense of automation
- Removes broken, confusing system
- Unified automation actually works
- Simpler mental model (trigger-based vs. assignment-based)

**Negative:**
- Existing agent assignments lost (acceptable, they were broken)
- Scripts archived (may reference in future for ideas)

### Lessons Learned

**Automation That Tracks ≠ Automation That Executes** (see Gotchas)
- Systems can appear operational while doing nothing
- Metrics like "task assigned" don't indicate progress
- Real evidence: commits, file changes, completed work
- Time-box verification (if >1 hour, no progress = broken)

### Related Files

- `sessions/tasks/m-unified-cursor-automation.md` - Replacement system
- `sessions/tasks/l-document-continuous-worker-scope.md` - Deprecated (system archived)
- `context/insights.md` - "Automation That Tracks But Doesn't Execute" pattern
- `context/gotchas.md` - "Continuous Worker Appears Active But Does Nothing"

---

## Multi-Agent Role Separation: Context-Gathering XOR Implementation

**Decision Date:** 2025-11-16
**Context:** m-unified-cursor-automation task refinement and three-task architecture
**Decision Made By:** Framework implementation

### The Problem

Initial automation design mixed context-gathering and implementation work within single agent sessions, creating unclear responsibility boundaries and potential for role confusion.

### Decision

**Enforce strict role separation: context-gathering XOR implementation (never both)**

### Rationale

1. **Clear Responsibility** - Each agent has single, well-defined purpose
2. **Prevents Role Confusion** - Agent never switches between gathering context and implementing
3. **Clean Agent Lifecycle** - Spawn → single duty → terminate pattern
4. **Queue-Based Orchestration** - Enables dual-queue system (context queue vs. implementation queue)
5. **Error Isolation** - Context gathering failures don't block implementation agents

**Trade-offs Accepted:**
- More agent spawns (one for context, one for implementation)
- Slightly more complex orchestration logic
- Queue transition overhead (context → implementation)

### Implementation

**Agent Lifecycle:**
```
Context-Gathering Agent:
    Initialize → Read task → Gather context → Update manifest → Set flag to true → Terminate

Implementation Agent:
    Initialize → Verify context → Implement task → Complete work → Terminate
```

**Enforcement Points:**
1. **Task-level flag:** `context_gathered: true|false` gates which queue
2. **Queue separation:** Context queue vs. implementation queue
3. **Agent termination:** Agents exit after single duty completion
4. **No role switching:** Once assigned role (context or implementation), agent never changes

### Consequences

**Positive:**
- Clear separation of concerns
- Enables load balancing based on queue depth
- Prevents context/implementation mixing errors
- Scalable (easy to add specialized agent types)

**Negative:**
- Higher overhead (2 agents per task minimum)
- Queue transition adds latency
- More complex orchestration required

### Future Considerations

Could extend pattern to:
- Testing agents (separate from implementation)
- Documentation agents (separate from testing)
- Review agents (separate from implementation)

### Related Files

- `sessions/tasks/m-unified-cursor-automation.md` - Task detection (Task 1)
- `sessions/tasks/h-enforce-context-gathering.md` - Context enforcement (Task 2)
- `sessions/tasks/h-multi-agent-orchestration.md` - Orchestration system (Task 3)

---

## Handoff Protocol: YAML Log + Ephemeral Triggers

**Decision Date:** 2025-11-16
**Context:** Cursor automation protocol alignment and hybrid approach
**Decision Made By:** Framework implementation

### The Problem

Initial automation spec assumed JSON handoff files + trigger files, but actual handoff protocol uses YAML entries in `docs/ai_handoffs.md`. Had to reconcile trigger file pattern with existing YAML log approach.

### Options Considered

**Option A: Monitor YAML Log Only**
- Watch `docs/ai_handoffs.md` for new entries
- Parse YAML to detect Claude → Cursor handoffs
- No trigger files needed

**Option B: Trigger Files Only**
- Keep trigger file pattern as proposed
- Ignore YAML log for automation
- Document as protocol extension

**Option C: Hybrid (Chosen)**
- YAML log remains canonical source of truth
- Ephemeral trigger files act as automation signals
- Best of both: structured log + file-based triggering

### Decision

**Chose Option C: Hybrid Approach**

### Rationale

1. **Preserves SoT** - YAML log in `docs/ai_handoffs.md` remains canonical handoff record
2. **Enables Automation** - Trigger files provide simple detection mechanism for IDE
3. **Minimal Bloat** - Triggers are ephemeral (deleted after processing)
4. **Backward Compatible** - Doesn't break existing YAML log consumers
5. **Debuggable** - Both structured log (YAML) and visible triggers (files) for troubleshooting

**Trade-offs Accepted:**
- Slight duplication (YAML entry + trigger file both created)
- Cleanup required (archive triggers after processing)
- Two systems to maintain (YAML log + trigger detection)

### Implementation

**Creation Flow:**
```
Claude ALIGN Phase
    ↓
1. Append YAML entry to docs/ai_handoffs.md (canonical record)
    ↓
2. Create trigger file in .cursor/triggers/ (automation signal)
    ↓
Watcher detects trigger → Cursor auto-starts → Work happens
    ↓
Archive trigger to .cursor/triggers/archive/ (cleanup)
```

**YAML Log (Canonical):**
```yaml
timestamp: 2025-11-16T10:00:00Z
from: claude
to: cursor
completed: [...]
next: [...]
context_files: [...]
```

**Trigger File (Ephemeral):**
```markdown
---
task_id: example
handoff: docs/ai_handoffs.md#entry-123
created: 2025-11-16T10:00:00Z
---
# AUTO-IMPLEMENT: Example Task
[Cursor will detect and process this]
```

### Consequences

**Positive:**
- Clean protocol alignment (YAML log preserved)
- Practical automation (file-based triggers work well)
- No protocol breaking changes
- Easy to debug (both log and triggers visible)

**Negative:**
- Creates temporary files (cleanup overhead)
- Two representations of same handoff
- Potential drift if trigger/log mismatch

### Prevention of Drift

**Synchronization rules:**
1. Always create trigger from YAML entry (not vice versa)
2. Include YAML entry reference in trigger (handoff field)
3. Archive trigger immediately after processing
4. YAML log is authoritative if discrepancy exists

### Related Files

- `sessions/tasks/m-unified-cursor-automation.md` - Scope reduced to detection only (Task 1)
- `docs/ai_handoffs.md` - Canonical YAML handoff log
- `context/insights.md` - "Trigger File Pattern for IDE Automation"

---

## Mandatory Backlinking in Task Creation Protocol

**Decision Date:** 2025-11-17
**Context:** m-ensure-backlinking-in-task-creation task
**Decision Made By:** Framework implementation

### The Problem

Tasks were duplicating large chunks of context from framework docs, LCMP files, and related tasks instead of linking to canonical sources. This created:

- **Context bloat** - Task files grew unnecessarily large with copied content
- **Maintenance burden** - Updates to canonical docs didn't propagate to tasks
- **Navigation difficulty** - Future agents couldn't easily traverse from task to authoritative source
- **Fidelity drift** - Copied context diverged from canonical sources over time

Without systematic backlinking, tasks became isolated silos of information rather than well-connected nodes in the knowledge graph.

### Decision

**Add mandatory backlinking step to task-creation protocol as step 4** (after spec writing, before context-gathering agent).

### Implementation

**Modified File:** `sessions/protocols/task-creation/task-creation.md`

**New Step 4: Add backlinks to relevant resources**

Task creators must review six categories and add backlinks to directly relevant resources:

1. **Framework & Vision** - `CLAUDE.md`, `claude-reference.md`, vision docs
2. **LCMP Knowledge** - `decisions.md`, `insights.md`, `gotchas.md`
3. **Protocols & Systems** - Protocols, SoT reference map, tiers of context
4. **Related Work** - Related tasks, RFCs, feature specs
5. **Architecture & Systems** - Agent registry, skills, hooks, orchestration
6. **Technical References** - Specific files/functions/line numbers (if known)

**Backlinking Principles:**
- Reference, don't duplicate
- Be specific (include section references where helpful)
- Explain relevance (why each link matters)
- Keep it lean (only include what adds value)

**Format:**
```markdown
## Context Manifest

### Framework & Vision
- `CLAUDE.md` Section X - [Why relevant]

### LCMP Knowledge
- `Context/decisions.md` - [Which decisions are relevant]

### Protocols & Systems
- `sessions/protocols/task-creation/` - [Why relevant]

### Related Work
- `sessions/tasks/example-task.md` - [How it relates]

### Technical References
- [Specific files/functions/line numbers if known]
```

### Rationale

1. **Minimize Duplication** - Link to canonical sources instead of copying large blocks
2. **Maximize Fidelity** - Single source of truth (canonical docs) prevents drift
3. **Enable Navigation** - Backlinks create knowledge graph, making it easy to traverse
4. **Two-Phase Context** - Manual backlinks (conceptual) + context-gathering agent (technical) = comprehensive manifest
5. **Enforce Discipline** - Systematic review of six categories prevents missing critical references

**Trade-offs Accepted:**
- Slight increase in task-creation time (reviewing categories, adding links)
- Requires discipline to maintain (easy to skip or do poorly)
- Backlinking quality varies by task creator's familiarity with codebase

### Consequences

**Positive:**
- Tasks reference canonical sources instead of copying
- Context Manifest serves as knowledge graph hub
- Future agents can navigate from task → authoritative docs
- Updates to canonical docs benefit all referencing tasks
- Reduces task file size and context bloat

**Negative:**
- Extra step in task-creation workflow
- Requires understanding of SoT tiers and canonical sources
- Backlinking quality depends on task creator's diligence
- May feel redundant when context-gathering agent also adds references

### Two-Phase Context Strategy

The backlinking step (step 4) complements the context-gathering agent (step 5):

**Step 4 (Manual Backlinking):**
- Adds conceptual/architectural links
- Links to framework docs, LCMP files, protocols
- Human judgment about relevance and relationships
- Provides "why" context

**Step 5 (Context-Gathering Agent):**
- Adds technical details (code references, function signatures)
- Discovers implementation-level connections
- Analyzes codebase structure
- Provides "how" context

**Result:** Comprehensive Context Manifest with both high-level understanding (backlinks) and technical depth (agent-gathered code context).

### Example Implementation

From this task's own Context Manifest:

```markdown
### Framework & Vision
- `CLAUDE.md` Section 2.1 - SoT Tiers define which files are canonical

### LCMP Knowledge
- `Context/gotchas.md` - "Documentation Path Inconsistency" shows importance of proper referencing

### Protocols & Systems
- `sessions/protocols/task-creation/task-creation.md` - Protocol being modified
- `docs/sot-reference-map.md` - Maps SoT files for backlinking targets

### Related Work
- `sessions/tasks/REPAIR-queue-data-integrity-log-pollution.md` - Example of proper Context Manifest
```

### Related Files

- `sessions/protocols/task-creation/task-creation.md` - Protocol with new step 4
- `sessions/tasks/m-ensure-backlinking-in-task-creation.md` - Task implementing this decision
- `docs/sot-reference-map.md` - Reference for identifying canonical sources
- `docs/tiers_of_context.md` - File hierarchy guide for backlinking

---

## Skill Rules Customization: DAIC-Aware Skill System

**Decision Date:** 2025-11-16
**Context:** m-implement-custom-skill-rules task
**Decision Made By:** Framework implementation

### The Problem

The skill-rules.json system needed customization to match this project's specific patterns:
- Generic skills (frontend-dev-guidelines, blog-api paths) didn't match project structure
- No DAIC mode awareness (skills couldn't check if they should run based on workflow mode)
- No distinction between analysis-only and write-capable skills
- Missing framework management skills (health check, version sync, REPAIR suggestions)

### Decision

**Implement comprehensive DAIC-aware skill system with explicit skill type classification**

### Implementation

**Enhanced Schema (v3.0.0):**
- Added `skillType` field: "ANALYSIS-ONLY" | "WRITE-CAPABLE"
- Added `daicMode.allowedModes` field: array of allowed DAIC modes
- 140+ trigger keywords, 55+ intent patterns for comprehensive coverage

**Skill Categories:**
- **9 WRITE-CAPABLE skills** - Only run in IMPLEMENT mode (cc-sessions-core, hooks, API, skill-developer, plus 5 workflow triggers that modify state)
- **12 ANALYSIS-ONLY skills** - Run in any DAIC mode (framework management, workflow triggers that only read)

**Framework Skills Added:**
- `framework_version_check` - Validates claude.md ↔ claude-reference.md sync
- `framework_health_check` - Runs framework health checklist
- `framework_repair_suggester` - Suggests REPAIR- tasks for framework issues
- `lcmp_recommendation` - Suggests /squish compaction (never auto-runs)
- `daic_mode_guidance` - Explains DAIC modes and restrictions

**Validation Scripts Created:**
- `scripts/validate-skill-daic.js` - Validates DAIC configurations
- `scripts/validate-skill-paths.js` - Validates file path patterns

### Rationale

1. **Machine-Readable Constraints** - `skillType` and `daicMode` fields enable automatic enforcement
2. **Safety** - WRITE-CAPABLE skills restricted to IMPLEMENT mode prevents accidental writes in planning/review modes
3. **Framework Management** - Dedicated skills for health checks, version sync, and repair guidance
4. **Comprehensive Coverage** - 140+ keywords and 55+ patterns ensure natural language triggers work reliably
5. **Validation** - Reusable scripts prevent configuration drift

**Trade-offs Accepted:**
- More complex schema (but machine-readable and enforceable)
- Must maintain trigger keywords as project evolves
- Skills must be restarted to be discovered (Claude Code limitation)

### Validation Results

All success criteria met:
- ✅ JSON syntax valid (21 skills properly configured)
- ✅ WRITE-CAPABLE skills restricted to IMPLEMENT mode only
- ✅ ANALYSIS-ONLY skills allow all DAIC modes
- ✅ File path patterns match project structure (sessions/**, .claude/)
- ✅ Framework skills properly tagged
- ✅ Documentation updated (CLAUDE.md Section 4.1)

### Consequences

**Positive:**
- Skills respect DAIC workflow discipline automatically
- Framework can suggest health checks and repairs without auto-executing
- Clear distinction between analysis and modification skills
- Comprehensive trigger coverage for natural language activation
- Reusable validation scripts catch configuration errors

**Negative:**
- Skill trigger maintenance required as project evolves
- Must restart Claude Code after skill modifications
- Complex schema may be harder for new contributors to understand

### File Organization Standard

**Each skill MUST follow this structure:**
- Directory: `.claude/skills/<skill-name>/`
- File: `SKILL.md` with YAML frontmatter (`name`, `description`)
- Configuration: Entry in `skill-rules.json` with `skillType` and `daicMode`

**Example:**
```
.claude/skills/
  ├── error-tracking/
  │   └── SKILL.md (ANALYSIS-ONLY)
  ├── cc-sessions-core/
  │   └── SKILL.md (WRITE-CAPABLE)
  └── skill-rules.json (21 skills configured)
```

### Related Files

- `.claude/skills/skill-rules.json` - v3.0.0 configuration with DAIC awareness
- `scripts/validate-skill-daic.js` - DAIC validation script
- `scripts/validate-skill-paths.js` - Path validation script
- `CLAUDE.md` Section 4.1 - Updated skill documentation
- `Context/Features/001-CustomizeSkillRules.md` - ContextKit planning document
- `sessions/tasks/m-implement-custom-skill-rules.md` - Implementation task

---

## Orchestration: Cloud Agents Only (Removal of Claude CLI Support)

**Decision Date:** 2025-11-17
**Context:** Orchestration workflow cleanup
**Decision Made By:** User requirement

### The Problem

The agent orchestration system (`scripts/agent-orchestrator.js`) was incorrectly configured to support both local Claude CLI execution and cloud agent execution via the Cursor Cloud Agent API. However, the workflow was always intended to use only cloud agents. The local mode support was never part of the intended design and added unnecessary complexity.

### Options Considered

**Option A: Remove Claude CLI Support (Chosen)**
- Remove all local mode code (`spawnLocalAgent` method)
- Remove `AGENT_MODE` configuration option
- Remove `CLAUDE_CMD` environment variable
- Always use cloud agents via Cursor Cloud Agent API
- Update all documentation to reflect cloud-only execution

**Option B: Keep Both Modes**
- Maintain dual-mode support for flexibility
- Keep local mode as development option
- Continue supporting both execution paths

### Decision

**Chose Option A: Remove Claude CLI Support**

### Rationale

1. **Original Intent** - The orchestration workflow was always designed for cloud agents only
2. **Simplification** - Removing unused code paths reduces complexity and maintenance burden
3. **Clarity** - Single execution mode makes documentation and configuration clearer
4. **Consistency** - All agent execution goes through the same cloud API, ensuring consistent behavior
5. **Validation** - Orchestrator now fails fast at startup if cloud agent configuration is missing

**Trade-offs Accepted:**
- No local development option (must use cloud agents for all testing)
- Requires API token and GitHub repository configuration
- Cannot test without network access to Cursor API

### Implementation

**Code Changes:**
- Removed `spawnLocalAgent()` method from `scripts/agent-orchestrator.js`
- Removed `AGENT_MODE` configuration option
- Removed `CLAUDE_CMD` environment variable references
- Removed `spawn` import from `child_process` module
- Removed conditional mode selection logic
- Added startup validation for required cloud agent configuration (`CURSOR_API_TOKEN`, `GITHUB_REPO`)
- Updated `assignTaskToAgent()` to directly call `spawnCloudAgent()` without conditional

**Documentation Updates:**
- Updated `CLAUDE.md` to remove all local mode references
- Updated `scripts/README.md` to remove local mode mentions
- Rewrote `scripts/ORCHESTRATOR_CONFIG.md` for cloud-only configuration
- Updated `scripts/ORCHESTRATOR_TESTING.md` to remove Claude CLI requirements
- Updated `docs/multi-agent-orchestration-operator-guide.md` to remove local mode setup
- Updated `docs/orchestrator-implementation-summary.md` to reflect cloud-only execution

**Preserved:**
- All cloud agent code (`spawnCloudAgent` method) remains intact
- Cloud agent API integration fully preserved
- Cloud agent error handling and lifecycle management unchanged

### Consequences

**Positive:**
- Simpler codebase with single execution path
- Clearer documentation and configuration requirements
- Fail-fast validation prevents misconfiguration
- Consistent execution model across all agents

**Negative:**
- Cannot run orchestrator without cloud agent API access
- Requires API token and GitHub repository setup for all use cases
- No local development/testing option without network access

### Future Considerations

If local development capability is needed in the future:
- Could create a separate development orchestrator script
- Could use cloud agent API with local repository for testing
- Could implement a mock/test mode that simulates cloud agent responses

### Related Files

- `scripts/agent-orchestrator.js` - Core orchestrator implementation
- `CLAUDE.md` - Main operator spec (updated)
- `scripts/ORCHESTRATOR_CONFIG.md` - Configuration guide (rewritten)
- `docs/orchestrator-implementation-summary.md` - Implementation summary (updated)

---

*Decisions will be added here as they are made and documented during framework development and usage.*

