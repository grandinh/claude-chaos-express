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

*Decisions will be added here as they are made and documented during framework development and usage.*

