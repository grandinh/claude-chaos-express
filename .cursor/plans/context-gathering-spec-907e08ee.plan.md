<!-- 907e08ee-f5f7-4781-b08d-ce02ef840d01 2b071e94-f866-4f54-924b-b28b7fa5bd9e -->
# Context Gathering Agent Invocation Specification

## Purpose

Ensure Claude Code reliably invokes the context-gathering agent when tasks lack context manifests, preventing implementation errors due to missing context.

## Scope

- Task creation workflow (optional but recommended)
- Task startup workflow (mandatory if missing)
- Edge cases and validation
- Error handling and recovery
- Cursor swarm alternative approach
- Context gathered flag enforcement
- Backward compatibility (missing flag = false)
- Unified workflow for both Cursor and Claude Code

## Specification Document Structure

### 1. Core Requirements

- **Mandatory Invocation**: When starting a task without a context manifest, the context-gathering agent MUST be invoked before any implementation work begins
- **Optional During Creation**: During task creation, user may defer context gathering, but it becomes mandatory at startup
- **Validation Check**: Before proceeding to implementation mode, verify context manifest exists and is complete
- **Context Gathered Flag**: All systems (Cursor, Claude Code, Cloud Agents) MUST check `context_gathered: true` in task frontmatter before working on a task
- **Backward Compatibility**: Missing `context_gathered` flag MUST be treated as `false` - triggers automatic context gathering
- **Unified Workflow**: Both Cursor and Claude Code follow the same workflow pattern for context gathering

### 1.1 Context Gathered Flag Requirement

**CRITICAL**: A task cannot be worked on by ANY system until context is gathered.

**Frontmatter Flag**:

```yaml
---
name: [task-name]
status: pending|in-progress|completed|blocked
context_gathered: false|true  # REQUIRED field (defaults to false if missing)
created: YYYY-MM-DD
---
```

**Enforcement Rules**:

1. **Default State**: New tasks MUST have `context_gathered: false` in frontmatter (or omit field, which equals false)
2. **Backward Compatibility**: If `context_gathered` field is missing, treat as `false` and trigger context gathering
3. **Blocking Behavior**: 

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Cursor: Cannot edit task-related files or start work if `context_gathered: false` or missing
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Claude Code: Cannot enter IMPLEMENT mode if `context_gathered: false` or missing
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Cloud Agents: Must check flag before starting work (treat missing as false)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - All systems: Must display clear error message explaining context must be gathered first

4. **Flag Update**: Only context-gathering agent (Claude subagent or Cursor swarm agent) can set `context_gathered: true`
5. **Validation**: Flag can only be set to `true` if:

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Context Manifest section exists in task file
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Context Manifest contains narrative explanation (not just placeholder)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Context Manifest contains technical reference details

**Unified Workflow Pattern** (Both Cursor and Claude Code):

1. Check task frontmatter for `context_gathered` flag
2. If missing or `false`:

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Invoke context-gathering agent (Claude subagent or Cursor swarm)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Agent gathers context and writes Context Manifest section
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Agent sets `context_gathered: true` in frontmatter
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Agent saves task file

3. If `true`: Verify Context Manifest exists and is complete
4. Only then allow work to proceed

**Error Messages**:

- Cursor: "Task context not gathered. `context_gathered` flag is false or missing. Gathering context now..."
- Claude Code: "Cannot proceed: `context_gathered` flag is false or missing. Invoking context-gathering agent..."
- Cloud Agents: "Task blocked: `context_gathered=false` or missing. Context must be gathered before automation."

**Backward Compatibility Handling**:

- Existing tasks without `context_gathered` field: Treat as `false`, trigger context gathering on first access
- Context-gathering agent MUST add the flag when creating/updating context manifest
- Migration: When context-gathering agent runs on old task, it adds `context_gathered: true` after manifest is written

### 1.2 Cursor Swarm Alternative Approach

**Answer to user question**: Yes, Cursor CAN use swarm agents for context gathering.

**How It Works**:

1. Cursor spawns a dedicated context-gathering agent using swarm capability
2. The swarm agent operates in its own context window (isolated from main conversation)
3. Swarm agent reads extensively across codebase without polluting main Cursor context
4. Swarm agent writes context manifest to task file
5. Swarm agent sets `context_gathered: true` in frontmatter
6. Swarm agent returns summary to main Cursor conversation

**Advantages**:

- Avoids context window pollution in main Cursor conversation
- Can work in parallel with other Cursor activities
- Each agent has separate context window
- Can gather context for multiple tasks simultaneously
- Follows same workflow pattern as Claude Code (unified behavior)

**Limitations**:

- Doesn't integrate with cc-sessions workflow state (sessions-state.json)
- Context manifest still needs validation when Claude Code picks up task
- No direct access to cc-sessions DAIC workflow state

**When to Use**:

- Cursor is preparing task files for handoff to Claude Code
- Multiple tasks need context gathering in parallel
- Cursor wants to prepare context before handing off
- User wants Cursor to handle context gathering instead of waiting for Claude Code

**Implementation Pattern**:

```markdown
Cursor spawns swarm agent with prompt:
"You are a context-gathering agent. Your task:
1. Read task file: [path]
2. Check frontmatter for context_gathered flag (if missing, treat as false)
3. If context_gathered is false or missing:
   - Analyze codebase to understand task requirements
   - Gather comprehensive context (architecture, patterns, dependencies)
   - Write '## Context Manifest' section to task file
   - Set context_gathered: true in frontmatter
   - Save task file
4. Return summary of context gathered"
```

**Unified Behavior with Claude Code**:

- Both systems check `context_gathered` flag the same way
- Both treat missing flag as `false`
- Both invoke context-gathering agent if flag is false/missing
- Both set flag to `true` after manifest is written
- Same validation rules apply to both systems

### 1.3 Why Cursor Cloud Agents Cannot Replace Claude Subagent

**Answer to user question**: No, Cursor Cloud Agents cannot serve the same purpose as the Claude context-gathering subagent because:

1. **Interactive Task Setup Required**: Context gathering is part of the synchronous task startup workflow, requiring immediate feedback and integration with cc-sessions state
2. **Synchronous Execution**: Must complete before task work begins; Cloud Agents are asynchronous
3. **Deep cc-sessions Integration**: Needs access to task files, sessions-state.json, and DAIC workflow state
4. **Local Task State**: Must read and write to local task manifests immediately; Cloud Agents work on branches/PRs
5. **Workflow Blocking**: Task startup cannot proceed without context; Cloud Agents cannot block local workflows

**However**:

- Cursor (the editor AI) can use swarm agents for context gathering (see section 1.2)
- Cursor swarm agents have separate context windows, solving the pollution problem
- Cursor swarm can prepare context manifests for handoff to Claude Code

**Conclusion**: Context gathering can be done by:

1. **Claude Code subagent** (preferred for cc-sessions integration)
2. **Cursor swarm agent** (acceptable for preparation/handoff scenarios)
3. **NOT Cloud Agents** (too asynchronous, no local state access)

This is already documented in `docs/claude-cursor-agent-alignment.md` (lines 70-81) which explicitly lists context-gathering as NOT a Cloud Agent candidate.

### 2. Protocol Enhancements

Update `sessions/protocols/task-startup/task-startup.md`:

- Make step 3 (context manifest verification) more explicit with failure modes
- Add validation checklist before proceeding to step 4
- Include error recovery instructions if agent invocation fails
- **Add context_gathered flag check**: Verify flag is `true` before allowing any work
- **Blocking behavior**: If `context_gathered: false` or missing, automatically invoke context-gathering agent and wait for completion
- **Backward compatibility**: If flag is missing, treat as `false` and trigger context gathering

Update `sessions/protocols/task-creation/task-creation.md`:

- Clarify that step 4 decision affects startup requirements
- Add note that skipping during creation makes it mandatory at startup
- **Add context_gathered flag**: Set to `false` by default in new task frontmatter (or omit, which equals false)
- **Document flag requirement**: Explain that flag must be `true` before any system can work on task

### 3. Agent Invocation Pattern

Specify exact invocation format:

- Agent name: `context-gathering` (Claude subagent) or swarm agent (Cursor)
- Required parameter: task file path
- Expected output: 
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Updated task file with "Context Manifest" section
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - `context_gathered: true` set in frontmatter
- Validation: Check for both:
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - "## Context Manifest" header in task file
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - `context_gathered: true` in frontmatter

### 4. Validation Rules

- **Pre-Implementation Check**: Before entering IMPLEMENT mode, verify:

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                1. Context manifest exists
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                2. `context_gathered: true` in frontmatter (or missing flag treated as false)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                3. Context manifest contains narrative explanation and technical references

- **Flag Validation**: 
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - If `context_gathered` field is missing, treat as `false` and block work
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - If `context_gathered: false`, block ALL work (read-only operations allowed for context gathering only)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - If `context_gathered: true` but manifest is missing/incomplete, reset flag to `false` and block work
- **Completeness Check**: Context manifest should contain narrative explanation and technical references
- **Failure Handling**: If agent fails or produces incomplete manifest, block implementation and request manual intervention

### 5. Integration Points

- Hook system: Ensure todos are properly set during task startup
- State management: Track context manifest status in `sessions-state.json`
- Error reporting: Log context gathering failures to `context/gotchas.md`
- **Frontmatter validation**: All systems must check `context_gathered` flag before task operations
- **Cursor rules**: Add validation to `.cursor/rules/` to check flag before edits
- **Cloud Agent validation**: Add flag check to Cloud Agent startup logic
- **Unified workflow enforcement**: Both Cursor and Claude Code follow same flag-checking pattern

### 6. Edge Cases

- Task file created by Cursor (handoff scenario) - flag defaults to `false` or missing
- Task file manually edited (context manifest removed) - flag should be reset to `false` or task blocked
- Agent invocation timeout or failure - flag remains `false` or missing, task blocked
- Partial context manifest (incomplete) - flag should not be set to `true` until complete
- **Flag missing**: If frontmatter lacks `context_gathered` field, treat as `false` and block work
- **Flag tampering**: If flag is `true` but manifest is missing/incomplete, reset flag to `false` and block work
- **Backward compatibility**: Existing tasks without flag - treat as `false` on first access, trigger context gathering
- **Migration**: When context-gathering agent runs on old task, it adds `context_gathered: true` after manifest is written

## Implementation Files

1. **New spec document**: `docs/context-gathering-enforcement.md`

- Complete specification with examples
- Decision trees for different scenarios
- Validation checklist
- **Context gathered flag specification**
- **Cursor swarm approach documentation**
- **Backward compatibility handling**
- **Unified workflow pattern**

2. **Protocol updates**: 

- `sessions/protocols/task-startup/task-startup.md` (enhance step 3, add flag check)
- `sessions/protocols/task-creation/task-creation.md` (clarify step 4, add flag requirement)

3. **Validation hooks**: 

- `sessions/hooks/context_validation.js` - Pre-implementation check for flag and manifest
- **Cursor rule**: `.cursor/rules/context-gathered-check.mdc` - Block edits if flag is false or missing

4. **Template update**:

- `sessions/tasks/TEMPLATE.md` - Add `context_gathered: false` to frontmatter (or document that missing = false)

5. **API updates**:

- `sessions/api/task_commands.js` - Add flag validation to task operations
- Cloud Agent configs - Add flag check to startup logic

## Success Criteria

- Context manifest always present before implementation work begins
- Clear error messages when context gathering fails
- No implementation work proceeds without context
- Handoff scenarios (Cursor → Claude) properly handled
- **All systems respect context_gathered flag**
- **Flag prevents work until context is gathered**
- **Backward compatibility: missing flag treated as false**
- **Cursor swarm approach documented and validated**
- **Unified workflow: both Cursor and Claude Code follow same pattern**

### To-dos

- [ ] Create `docs/context-gathering-enforcement.md` with complete specification including requirements, patterns, validation rules, edge cases, context_gathered flag, Cursor swarm approach, backward compatibility, and unified workflow
- [ ] Update `sessions/protocols/task-startup/task-startup.md` step 3 to include explicit validation checks, failure handling, context_gathered flag verification, and backward compatibility handling
- [ ] Update `sessions/protocols/task-creation/task-creation.md` step 4 to clarify startup requirements when context gathering is deferred, and add context_gathered flag requirement
- [ ] Update `sessions/tasks/TEMPLATE.md` to include `context_gathered: false` in frontmatter (or document missing = false)
- [ ] Create `sessions/hooks/context_validation.js` hook that validates context manifest AND context_gathered flag before IMPLEMENT mode
- [ ] Create `.cursor/rules/context-gathered-check.mdc` rule that blocks Cursor edits if context_gathered flag is false or missing
- [ ] Update `sessions/api/task_commands.js` to validate context_gathered flag in all task operations
- [ ] Update Cloud Agent configs to check context_gathered flag before starting work
- [ ] Review and potentially enhance `.claude/agents/context-gathering.md` description to emphasize mandatory nature during task startup, flag update responsibility, and backward compatibility handling
- [ ] Document Cursor swarm approach for context gathering in spec document with unified workflow pattern
- [ ] Test backward compatibility: verify existing tasks without flag are treated as false and trigger context gathering
- [ ] Test unified workflow: verify both Cursor and Claude Code follow same flag-checking and context-gathering pattern