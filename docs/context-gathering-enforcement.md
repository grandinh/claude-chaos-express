# Context Gathering Enforcement Specification

## Overview

This document defines the enforcement mechanism that ensures all tasks have proper context before implementation.

## Core Principle

**No implementation without context.**

Every task MUST have a context manifest before entering IMPLEMENT mode or being assigned to an implementation agent.

## Enforcement Levels

### Level 1: Task File Flag

**Frontmatter field:** `context_gathered: true|false`

- Default: `false` (if missing)
- Set by: context-gathering agent only
- Required for: Implementation work

### Level 2: Protocol Validation

**Task Startup Protocol:**
- Step 3 (Verify Context Manifest) checks flag
- If `false`, blocks progression to IMPLEMENT
- Invokes context-gathering agent automatically

**Task Creation Protocol:**
- Step 5 allows deferring context gathering
- If deferred, flag remains `false`
- Becomes mandatory at startup

### Level 3: Hook Enforcement

**`sessions/hooks/context_validation.js`:**
- Pre-implementation check
- Blocks IMPLEMENT mode if flag is `false`
- Logs violations to `context/gotchas.md`

### Level 4: Queue Gating

**Multi-Agent Orchestration Integration:**
- Tasks with `context_gathered: false` → Context Queue
- Tasks with `context_gathered: true` → Implementation Queue
- Prevents implementation agents from receiving tasks without context

## Decision Trees

### New Task Created (External)

```
Task File Created → Flag Missing (defaults to false)
    ↓
Watcher Detects → Logs to Queue
    ↓
Queue Manager Reads Flag
    ↓
context_gathered: false → Context Queue
    ↓
Assign Context-Gathering Agent
    ↓
Agent Completes → Sets Flag to true
    ↓
Move to Implementation Queue
```

### Manual Task Startup (User)

```
User Starts Task → Task Startup Protocol Runs
    ↓
Step 3: Check Flag
    ↓
┌─────────────────┬─────────────────┐
│ false/missing   │ true            │
↓                 ↓
Block, Invoke     Proceed to
context agent     next step
    ↓
Agent Completes
    ↓
Resume Startup Protocol
```

### Handoff from Cursor

```
Cursor Creates Task → Sets Flag Based on Work Done
    ↓
┌───────────────────────┬──────────────────────┐
│ Cursor Wrote Spec     │ Cursor Did Research  │
│ (no context gathered) │ (context included)   │
↓                       ↓
Flag: false             Flag: true
    ↓                       ↓
Context Queue           Implementation Queue
```

## Error Recovery

### Scenario 1: Agent Invocation Fails

**Problem:** Context-gathering agent fails or times out

**Recovery:**
1. Log error to `context/gotchas.md`
2. Notify user of failure
3. Provide manual override option (with warning)
4. Option to retry agent invocation

### Scenario 2: Incomplete Manifest

**Problem:** Flag is `true` but manifest section missing/incomplete

**Re-validation:**
1. Hook detects mismatch
2. Blocks IMPLEMENT mode
3. Suggests re-running context-gathering agent
4. Option to manually complete manifest

### Scenario 3: Backward Compatibility

**Problem:** Old tasks without `context_gathered` flag

**Handling:**
1. Missing flag defaults to `false`
2. First startup triggers context gathering
3. Agent adds flag + manifest
4. Task proceeds normally

## Integration Points

### With Task Watcher (Multi-Agent System)

- Watcher logs tasks to `.new-tasks.log`
- Queue manager reads flags from task files
- Routes based on `context_gathered` value

### With Multi-Agent Orchestration

- Queue manager maintains two queues
- Context Queue: `context_gathered: false`
- Implementation Queue: `context_gathered: true`
- Agents transition tasks between queues

### With Hook System

- `context_validation.js` enforces at mode transition
- Integrates with existing hook infrastructure
- Logs violations for monitoring

## Testing

### Test 1: Flag Enforcement

```bash
# Create task without context_gathered flag
# Attempt to enter IMPLEMENT mode
# Expected: Blocked with clear error message
```

### Test 2: Agent Updates Flag

```bash
# Create task with context_gathered: false
# Invoke context-gathering agent
# Expected: Agent sets flag to true after completion
```

### Test 3: Queue Routing

```bash
# Create two tasks: one with true, one with false
# Expected: Route to appropriate queues
```

### Test 4: Backward Compatibility

```bash
# Use old task file without flag
# Expected: Defaults to false, triggers context gathering
```

## Success Metrics

- **Coverage:** 100% of tasks have context before implementation
- **Violations:** Zero IMPLEMENT mode entries without context
- **Agent Success Rate:** >95% context-gathering completions
- **Queue Accuracy:** Zero misrouted tasks
