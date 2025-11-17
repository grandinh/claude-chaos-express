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

*Decisions will be added here as they are made and documented during framework development and usage.*

