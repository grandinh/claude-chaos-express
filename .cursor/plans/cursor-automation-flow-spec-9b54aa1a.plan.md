<!-- 9b54aa1a-7101-4968-94c8-e8e2405ee2f5 6be48a12-7d5e-46a6-81f1-e6b2523e20ca -->
# Cursor Automation Flow Specification

## Purpose

This document provides architectural analysis and recommendations for implementing the unified cursor automation system that combines trigger-based handoff execution with new task file detection.

## Current State Analysis

### Existing Tasks

1. **m-implement-cursor-automation.md** (deprecated)

   - Focus: Trigger-based auto-implementation from Claude handoffs
   - Architecture: Trigger files → Cursor rules → Auto-start implementation
   - Status: Deprecated, merged into unified task

2. **m-implement-cursor-auto-task-pickup.md** (deprecated)

   - Focus: File watcher for new task files
   - Architecture: File watcher → Notification → Manual Cursor chat
   - Status: Deprecated, merged into unified task
   - **Has working implementation code** (watch-tasks.js)

3. **m-unified-cursor-automation.md** (active)

   - Combines both patterns into single watcher
   - Status: Pending implementation
   - **Has complete implementation code** ready

### Legacy System to Deprecate

- **agent-continuous-worker.sh**: Only tracks task assignment, doesn't automate actual work
- **agent-workflow.sh**: Manual task assignment workflow
- These should be archived after unified system is operational

## Architectural Recommendations

### 1. Unified File Watcher Pattern (Recommended)

**Why this approach:**

- Single process monitors both patterns (simpler than two separate watchers)
- Shared logging/notification infrastructure
- Lower resource overhead
- Easier to maintain and debug

**Implementation:**

- Use `chokidar` for reliable file watching (already in m-unified-cursor-automation.md)
- Single watcher instance monitors:
  - `sessions/tasks/*.md` (new task files)
  - `.cursor/triggers/implement-*.md` (handoff triggers)
- Pattern detection logic routes to appropriate handler

### 2. Two Distinct Workflows

**Workflow A: New Task Detection**

```
External Event → Task File Created → Watcher Detects
    ↓
Desktop Notification + Log Entry
    ↓
User Opens Cursor → References @task → Begins Work
```

**Key Points:**

- Notification-only (Cursor chat requires manual initiation)
- Logs to `sessions/tasks/.new-tasks.log`
- Clear user guidance on next steps
- Excludes: TEMPLATE.md, done/, indexes/

**Workflow B: Handoff Auto-Implementation**

```
Claude ALIGN → Creates Handoff JSON → Creates Trigger File
    ↓
Watcher Detects Trigger
    ↓
Cursor Rules Read Handoff → Auto-Start Implementation
    ↓
Trigger Archived → Work Proceeds Autonomously
```

**Key Points:**

- Fully automated (no user intervention needed)
- Cursor rules detect trigger on workspace open
- Reads handoff JSON for implementation spec
- Archives trigger after processing
- Error handling moves failed triggers to failed/

### 3. File Structure Organization

```
.cursor/
├── triggers/
│   ├── implement-*.md           # Active triggers (watched)
│   ├── archive/                 # Processed triggers
│   └── failed/                  # Failed triggers (for debugging)
├── handoffs/
│   ├── active/*.json           # Claude-created handoffs
│   └── ready_for_review/*.json # Completed work
└── automation-logs/
    ├── watch.log               # Watcher activity
    ├── triggers.log            # Trigger processing
    └── errors.log              # Error log

sessions/tasks/
├── .new-tasks.log              # New task detection log
├── *.md                        # Task files (monitored)
└── done/                       # Completed tasks (ignored)
```

### 4. Cursor Rules Integration

**Critical Component:** `.cursorrules` must detect trigger files on workspace open

**Recommended Pattern:**

- Check for `.cursor/triggers/implement-*.md` on startup
- If found, read frontmatter → load handoff → start Composer
- Archive trigger after processing
- Error handling with fallback to manual mode

**Why this works:**

- Leverages Cursor's existing workspace initialization
- No polling or background processes needed in Cursor
- Explicit and debuggable (just check trigger file exists)

### 5. Handoff Creation Enhancement

**Location:** `sessions/api/handoff_commands.js`

**Enhancement:** When Claude creates handoff in ALIGN phase:

1. Create handoff JSON (existing behavior)
2. **Also create trigger file** (new behavior)
3. Trigger file contains:

   - Task ID
   - Handoff path (relative)
   - Summary/instructions
   - Auto-implement flag

**Benefits:**

- Single source of truth (handoff JSON)
- Trigger file is just a pointer/notification
- Easy to debug (check if trigger exists)

## Implementation Priority

### Phase 1: Core Infrastructure (MVP)

1. Unified file watcher script (`watch-cursor-automation.js`)
2. Basic logging and notification
3. New task detection (Workflow A)
4. Documentation and setup guide

**Effort:** ~4-6 hours

**Impact:** Enables new task detection workflow

### Phase 2: Handoff Automation

1. Trigger file creation in handoff_commands.js
2. Cursor rules for trigger detection
3. Auto-implementation flow
4. Error handling and archiving

**Effort:** ~4-6 hours

**Impact:** Enables fully automated handoff execution

### Phase 3: Status & Monitoring

1. Status dashboard script
2. Manual override capability
3. Enhanced logging and audit trail
4. Migration from continuous worker

**Effort:** ~2-3 hours

**Impact:** Operational visibility and control

## Key Design Decisions

### Decision 1: Single Watcher vs. Two Separate Watchers

**Chosen:** Single unified watcher

**Rationale:**

- Shared infrastructure (logging, notifications, error handling)
- Lower resource usage
- Easier to maintain
- Both patterns are file-based, so natural fit

### Decision 2: Trigger Files vs. Direct Handoff Reading

**Chosen:** Trigger files as notification mechanism

**Rationale:**

- Explicit and visible (easy to debug)
- Natural queue (multiple triggers can exist)
- Human can intervene easily (delete trigger to cancel)
- Works even if Cursor restarts (triggers persist)

### Decision 3: Cursor Rules vs. External Process

**Chosen:** Cursor rules detect triggers on workspace open

**Rationale:**

- No external process needed in Cursor
- Leverages existing workspace initialization
- User can see what's happening (trigger file visible)
- Graceful degradation (if rules fail, user can manually process)

### Decision 4: Notification vs. Auto-Start for New Tasks

**Chosen:** Notification only (requires manual Cursor chat)

**Rationale:**

- Cursor chat cannot be programmatically started
- User needs to review task before starting
- Clear separation: external tasks = manual, handoffs = automated

## Migration Strategy

### Step 1: Archive Old System

- Move `agent-continuous-worker.sh` to `scripts/archive/`
- Move `agent-workflow.sh` to `scripts/archive/`
- Archive `agent-assignments.json` and `agent-progress.json`
- Document why old system is deprecated

### Step 2: Implement Unified System

- Use code from `m-unified-cursor-automation.md` (already complete)
- Install dependencies (`chokidar`)
- Test both workflows
- Update documentation

### Step 3: Update Handoff Protocol

- Enhance `handoff_commands.js` to create triggers
- Test end-to-end: Claude creates handoff → trigger created → Cursor picks up

### Step 4: Update Cursor Rules

- Add trigger detection to `.cursorrules`
- Test auto-implementation flow
- Document error handling

## Risk Mitigation

### Risk 1: Cursor Rules Not Detecting Triggers

**Mitigation:**

- Fallback: User can manually reference trigger file
- Logging: All trigger processing logged
- Visibility: Trigger files remain visible until processed

### Risk 2: File Watcher Missing Events

**Mitigation:**

- Use `chokidar` (more reliable than native fs.watch)
- `awaitWriteFinish` ensures file is fully written
- Log all events for debugging

### Risk 3: Concurrent Trigger Processing

**Mitigation:**

- Archive trigger immediately after detection
- Sequential processing (one trigger at a time)
- Future: Priority queue if needed

### Risk 4: Handoff JSON Missing or Invalid

**Mitigation:**

- Validate trigger frontmatter before processing
- Check handoff file exists before reading
- Move invalid triggers to failed/ with error log

## Success Metrics

1. **New Task Detection:**

   - New tasks detected within 1 second of creation
   - Desktop notification appears
   - Log entry created

2. **Handoff Automation:**

   - Trigger detected within 5 seconds of creation
   - Cursor auto-starts implementation
   - Trigger archived after processing

3. **Error Handling:**

   - Failed triggers moved to failed/
   - Error logged with context
   - User can manually intervene

4. **Operational:**

   - Watcher runs continuously (no crashes)
   - Low resource usage (<50MB RAM)
   - Clear status visibility

## Open Questions for Claude

1. **Trigger Processing Order:** Should triggers be processed in priority order, or FIFO? (Recommendation: FIFO for now, add priority later if needed)

2. **Concurrent Task Handling:** Can Cursor handle multiple triggers simultaneously, or should we enforce sequential processing? (Recommendation: Sequential for safety)

3. **Handoff Format:** Does the existing handoff JSON format contain all needed information for auto-implementation? (Need to verify structure)

4. **Cursor Rules Location:** Should trigger detection be in `.cursorrules` or a separate rule file? (Recommendation: `.cursorrules` for simplicity)

5. **Continuous Worker Migration:** Should we migrate existing agent assignments, or start fresh? (Recommendation: Start fresh, archive old system)

## Next Steps

1. Review this spec with Claude
2. Confirm architectural decisions
3. Implement Phase 1 (unified watcher + new task detection)
4. Test and iterate
5. Implement Phase 2 (handoff automation)
6. Complete migration from continuous worker
7. Document and train

## References

- `sessions/tasks/m-unified-cursor-automation.md` - Complete implementation spec
- `sessions/tasks/m-implement-cursor-automation.md` - Original trigger-based approach
- `sessions/tasks/m-implement-cursor-auto-task-pickup.md` - Original file watcher approach
- `docs/agent_bridge_protocol.md` - Handoff protocol specification
- `CURSOR.md` - Cursor agent operating spec

### To-dos

- [ ] Review this spec document with Claude to confirm architectural decisions and implementation approach
- [ ] Verify existing handoff JSON format contains all information needed for auto-implementation
- [ ] Confirm trigger detection should be in .cursorrules vs separate rule file
- [ ] Plan migration strategy from continuous worker system (archive vs migrate data)