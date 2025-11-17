# Review & Improve: Unified Cursor Automation Task Specification

## Context

Review and improve the task specification at `sessions/tasks/m-unified-cursor-automation.md`. This task defines a unified file watcher system that detects both new task files and handoff triggers for Cursor automation.

## Critical Issues to Address

### 1. Handoff Protocol Alignment (MUST FIX)

**Problem:** The spec assumes Claude creates trigger files (`.cursor/triggers/implement-*.md`) and handoff JSON files (`.cursor/handoffs/active/*.json`), but the actual handoff protocol uses:
- `docs/ai_handoffs.md` with structured YAML entries (not JSON files)
- Schema defined in `docs/agent_bridge_protocol.md`

**Action Required:**
- Review how handoffs are actually created in the codebase (check `sessions/api/` and `.claude/skills/`)
- Update Module C (`sessions/api/handoff_commands.js`) to align with actual handoff creation mechanism
- Either:
  - **Option A:** Have watcher monitor `docs/ai_handoffs.md` for new entries where `from: claude` and `to: cursor`
  - **Option B:** Document the trigger file pattern as a valid extension to the protocol
- Clarify the relationship between YAML handoff log and any JSON handoff files

**References:**
- `docs/ai_handoffs.md` - Handoff log schema
- `docs/agent_bridge_protocol.md` - Protocol definition
- `claude-reference.md` - Handoff examples

### 2. Cursor Rules Integration (MUST FIX)

**Problem:** Module B references `.cursorrules`, but the project uses `.cursor/rules/*.mdc` format.

**Action Required:**
- Verify which Cursor rules format is active
- If `.mdc` format: Create `.cursor/rules/auto-implementation-detection.mdc` instead
- Reference existing rules structure (check `.cursor/rules/` directory)

### 3. Agent Bridge Protocol Compliance (MUST FIX)

**Problem:** Missing integration with `repo_state/metadata.json` which is required by `docs/agent_bridge_protocol.md`.

**Action Required:**
- Add validation that `repo_state/metadata.json` exists before processing triggers
- Update `docs/ai_handoffs.md` when automation triggers (append structured YAML entry)
- Validate handoff JSON against schema from `docs/ai_handoffs.md`

### 4. Cursor Auto-Start Mechanism (MUST CLARIFY)

**Problem:** Spec says "Cursor rules auto-start implementation" but doesn't explain HOW Cursor detects triggers.

**Action Required:**
- Document the exact detection mechanism:
  - Does Cursor scan on workspace open?
  - Does watcher notify Cursor via file/API?
  - Does Cursor poll periodically?
- Document the complete flow: trigger detection → Composer start → implementation

### 5. Error Handling & State Recovery (SHOULD FIX)

**Problem:** Missing critical error handling scenarios.

**Action Required:**
- Add state file (`.cursor/automation-logs/watcher-state.json`) to track processed files
- Implement deduplication (file hashes or timestamps) to prevent reprocessing
- Add debounce/cooldown for rapid file creation events
- Handle watcher crashes/restarts with state recovery

### 6. Testing Gaps (SHOULD FIX)

**Problem:** Missing important test scenarios.

**Action Required:**
- Add test for watcher restart/recovery
- Add test for concurrent trigger processing
- Add test for invalid handoff schema
- Add test for missing handoff files

### 7. Documentation Integration (NICE TO HAVE)

**Problem:** New guide may duplicate existing automation docs.

**Action Required:**
- Check for existing automation documentation (`docs/automation-strategy.md`, `docs/multi-agent-task-distribution.md`)
- Ensure new guide links to related docs
- Avoid duplication

## Review Process

1. **Read the task spec:** `sessions/tasks/m-unified-cursor-automation.md`
2. **Review handoff protocol:** `docs/ai_handoffs.md`, `docs/agent_bridge_protocol.md`
3. **Check actual handoff creation:** Search codebase for how handoffs are created
4. **Verify Cursor rules format:** Check `.cursor/rules/` directory
5. **Update the spec** with fixes addressing all issues above
6. **Add a "Protocol Integration" section** explaining how this fits with existing protocols
7. **Create a flow diagram** showing: Claude → Handoff → Trigger → Cursor → Implementation

## Expected Output

Update `sessions/tasks/m-unified-cursor-automation.md` with:
- Aligned handoff mechanism (Issue #1)
- Correct Cursor rules format (Issue #2)
- Agent bridge protocol compliance (Issue #3)
- Clear auto-start mechanism documentation (Issue #4)
- Enhanced error handling (Issue #5)
- Expanded testing plan (Issue #6)
- Documentation links (Issue #7)

## Priority

- **MUST FIX:** Issues #1-4 (protocol alignment, correctness)
- **SHOULD FIX:** Issues #5-6 (robustness, testing)
- **NICE TO HAVE:** Issue #7 (documentation polish)

## Questions to Answer

1. How does Claude currently create handoffs? (Check `sessions/api/` and `.claude/skills/`)
2. What is the actual relationship between `docs/ai_handoffs.md` (YAML) and any JSON handoff files?
3. Which Cursor rules format is active: `.cursorrules` or `.cursor/rules/*.mdc`?
4. How should Cursor detect triggers: on open, polling, or file notification?

---

**Note:** This is a review task. Update the specification document, don't implement yet. Implementation should happen in a separate task after the spec is approved.

