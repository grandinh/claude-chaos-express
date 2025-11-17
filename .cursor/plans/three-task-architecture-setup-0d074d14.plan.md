<!-- 0d074d14-b36a-4570-8f0f-8150ddc267c3 1df817f2-b461-404c-93c4-8fe29c7d0748 -->
# Three-Task Architecture Setup Plan

## Overview

Create and update three task manifests to implement the multi-agent orchestration system with strict role separation:

- **Task 1**: File watcher (detection only, no auto-implementation)
- **Task 2**: Context gathering enforcement (gating logic)
- **Task 3**: Multi-agent orchestration (agent pool + queue management)

## Task 1: Update m-unified-cursor-automation.md

**Current State**: Task includes auto-implementation via trigger files (Phase 3)

**Changes Needed**:

- Remove Phase 3 (Handoff Trigger Detection & Auto-Implementation)
- Keep Phase 1 (Unified File Watcher) and Phase 2 (Task File Detection & Notification)
- Update Phase 4 to remove trigger-related monitoring
- Remove trigger-related code modules (Module B: Cursor Rules Enhancement, Module C: Handoff Creation Enhancement)
- Update architecture to show watcher feeds queue manager (not direct implementation)
- Update success criteria to remove auto-implementation requirements
- Add note that this feeds Task 3's queue manager

**Files to Modify**:

- `sessions/tasks/m-unified-cursor-automation.md` - Remove auto-implementation sections, update scope

**Key Changes**:

- Remove `.cursor/triggers/` monitoring
- Remove handoff trigger detection logic
- Keep only `sessions/tasks/*.md` file watching
- Update output description: "Detects new tasks → logs them → notifies user → ready for queue manager"

## Task 2: Create h-enforce-context-gathering.md

**Source**: `.cursor/plans/context-gathering-spec-907e08ee.plan.md`

**Scope**:

- Enforce `context_gathered` flag requirement before implementation
- Update task-startup and task-creation protocols
- Create validation hooks
- Implement queue gating logic (context → implementation transition)

**Task Manifest Structure**:

- Frontmatter: `priority: high`, `depends_on: []`
- Problem/Goal: Context must be gathered before any implementation work
- Success Criteria: Flag enforcement, protocol updates, validation hooks, queue gating
- Implementation: Protocol updates, hook creation, template updates
- Dependencies: None (framework-level enforcement)

**Files to Create/Modify**:

- `sessions/tasks/h-enforce-context-gathering.md` (new)
- `sessions/protocols/task-startup/task-startup.md` (update)
- `sessions/protocols/task-creation/task-creation.md` (update)
- `sessions/hooks/context_validation.js` (new)
- `sessions/tasks/TEMPLATE.md` (update frontmatter)
- `docs/context-gathering-enforcement.md` (new spec doc)

**Key Requirements from Spec**:

- `context_gathered: false|true` flag in frontmatter (defaults to false if missing)
- Blocking behavior: All systems check flag before work
- Backward compatibility: Missing flag = false
- Unified workflow: Both Cursor and Claude Code follow same pattern

## Task 3: Create h-multi-agent-orchestration.md

**Scope**:

- Agent pool management (3 agents)
- Task queue manager (context queue + implementation queue)
- Load balancing logic
- Agent lifecycle (spawn → work → terminate)

**Task Manifest Structure**:

- Frontmatter: `priority: ultra-high`, `depends_on: [m-unified-cursor-automation.md, h-enforce-context-gathering.md]`
- Problem/Goal: Automated distribution of context-gathering and implementation work
- Success Criteria: 3-agent pool, dual queues, load balancing, role separation
- Architecture: Queue manager, orchestrator, agent pool
- Implementation: Queue manager script, orchestrator script, state tracking

**Files to Create**:

- `sessions/tasks/h-multi-agent-orchestration.md` (new)
- `scripts/task-queue-manager.js` (new)
- `scripts/agent-orchestrator.js` (new)
- `sessions/tasks/.task-queues.json` (new state file)
- `docs/multi-agent-orchestration.md` (new architecture doc)

**Key Architecture Components**:

- **Context Queue**: Tasks with `context_gathered: false` or missing
- **Implementation Queue**: Tasks with `context_gathered: true` and ready to implement
- **Load Balancing**: Priority based on queue depth ratio (contextRatio > 0.6 → assign context gathering)
- **Agent Roles**: Strict separation (context XOR implementation, never both)
- **Queue Transitions**: Context queue → (context gathered) → Implementation queue

**Load Balancing Logic**:

The load balancer uses a multi-factor scoring system that:

1. **Prefers implementation queue** to keep tasks completing consistently
2. **Prevents context backlog** with threshold-based balancing
3. **Prioritizes high-impact tasks** based on priority/leverage fields
4. **Prioritizes blocking tasks** that unblock high-impact work
```javascript
function assignNextTask(agents, contextQueue, implementationQueue, dependencyGraph) {
    const availableAgent = agents.find(a => a.status === 'idle');
    if (!availableAgent) return null;
    
    // Score and sort queues by priority
    const scoredContextQueue = scoreTasks(contextQueue, dependencyGraph, 'context');
    const scoredImplQueue = scoreTasks(implementationQueue, dependencyGraph, 'implementation');
    
    // Calculate queue balance
    const contextRatio = contextQueue.length / (contextQueue.length + implementationQueue.length);
    const contextBacklogThreshold = 0.7; // If context queue > 70%, prioritize context
    const minContextRatio = 0.3; // Keep at least 30% context work to prevent backlog
    
    // Decision logic
    let shouldAssignContext = false;
    
    // Rule 1: If context queue is critically high, assign context
    if (contextRatio > contextBacklogThreshold) {
        shouldAssignContext = true;
    }
    // Rule 2: If implementation queue is empty, assign context (if available)
    else if (implementationQueue.length === 0 && contextQueue.length > 0) {
        shouldAssignContext = true;
    }
    // Rule 3: If context ratio is below minimum, ensure some context work
    else if (contextRatio < minContextRatio && contextQueue.length > 0) {
        // Alternate: assign context every 3rd task to maintain balance
        const contextAssignmentCount = getContextAssignmentCount();
        if (contextAssignmentCount % 3 === 0) {
            shouldAssignContext = true;
        }
    }
    // Rule 4: Default: prefer implementation (keeps tasks completing)
    // But check if top context task has higher priority than top impl task
    else if (scoredContextQueue.length > 0 && scoredImplQueue.length > 0) {
        const topContextTask = scoredContextQueue[0];
        const topImplTask = scoredImplQueue[0];
        
        // If context task is significantly higher priority, do context
        if (topContextTask.score > topImplTask.score * 1.5) {
            shouldAssignContext = true;
        }
    }
    
    // Assign from appropriate queue
    if (shouldAssignContext && scoredContextQueue.length > 0) {
        return assignContextGathering(availableAgent, scoredContextQueue[0].task);
    } else if (scoredImplQueue.length > 0) {
        return assignImplementation(availableAgent, scoredImplQueue[0].task);
    }
    
    return null;
}

function scoreTasks(tasks, dependencyGraph, queueType) {
    return tasks.map(task => {
        let score = 0;
        
        // Priority scoring (higher = better)
        const priority = task.priority || 'medium';
        const leverage = task.leverage || 'medium';
        
        const priorityScores = { 'ultra-high': 100, 'high': 50, 'medium': 25, 'low': 10 };
        const leverageScores = { 'ultra-high': 100, 'high': 50, 'medium': 25, 'low': 10 };
        
        score += priorityScores[priority] || 25;
        score += leverageScores[leverage] || 25;
        
        // Blocking task bonus: if this task blocks high-priority tasks, boost score
        if (dependencyGraph) {
            const blockingTasks = getBlockingTasks(task, dependencyGraph);
            const highPriorityBlocked = blockingTasks.filter(t => 
                (t.priority === 'high' || t.priority === 'ultra-high') ||
                (t.leverage === 'high' || t.leverage === 'ultra-high')
            );
            score += highPriorityBlocked.length * 30; // +30 per high-priority blocked task
        }
        
        // Context queue bonus: tasks that unblock many others get priority
        if (queueType === 'context') {
            const unblockedCount = getUnblockedTaskCount(task, dependencyGraph);
            score += unblockedCount * 15; // +15 per unblocked task
        }
        
        // Age penalty: older tasks get slight boost (prevent starvation)
        const ageDays = (Date.now() - new Date(task.addedAt)) / (1000 * 60 * 60 * 24);
        score += Math.min(ageDays * 2, 20); // Max +20 for very old tasks
        
        return { task, score };
    }).sort((a, b) => b.score - a.score); // Sort descending (highest score first)
}

function getBlockingTasks(task, dependencyGraph) {
    // Find all tasks that depend on this task
    const taskId = path.basename(task.path, '.md');
    return dependencyGraph.edges
        .filter(edge => edge.from === taskId)
        .map(edge => dependencyGraph.nodes.get(edge.to))
        .filter(Boolean);
}

function getUnblockedTaskCount(task, dependencyGraph) {
    // Count how many tasks depend on this task
    const taskId = path.basename(task.path, '.md');
    return dependencyGraph.edges.filter(edge => edge.from === taskId).length;
}
```


**Key Features**:

- **Implementation preference**: Defaults to implementation queue to keep tasks completing
- **Backlog prevention**: If context queue > 70%, prioritize context gathering
- **Minimum context ratio**: Maintains at least 30% context work to prevent backlog
- **Priority-based**: High-priority/high-leverage tasks get assigned first
- **Blocking awareness**: Tasks that block high-priority work get boosted
- **Unblocking bonus**: Context gathering for tasks that unblock many others gets priority
- **Starvation prevention**: Older tasks get slight score boost

## Dependency Flow

```
Task 1 (Watcher)          Task 2 (Enforcement)
       ↓                         ↓
       └─────────┬───────────────┘
                 ↓
         Task 3 (Orchestration)
```

**Execution Order**:

- Tasks 1 & 2 can be developed in parallel (independent)
- Task 3 requires both 1 & 2 complete

## Implementation Steps

1. **Update Task 1**:

   - Remove Phase 3 (auto-implementation)
   - Remove trigger-related modules
   - Update architecture diagram
   - Update success criteria
   - Add dependency note for Task 3

2. **Create Task 2**:

   - Extract requirements from context-gathering-spec plan
   - Structure task manifest with frontmatter
   - Define protocol update requirements
   - Define hook creation requirements
   - Define validation rules

3. **Create Task 3**:

   - Define agent pool architecture
   - Define queue manager structure
   - Define load balancing algorithm
   - Define agent lifecycle management
   - Define state tracking format

## Implementation Decisions for Task 3

**State Isolation Strategy**: Use Git worktrees

- Each agent gets its own git worktree for complete isolation
- Cleanest isolation approach, prevents all race conditions
- Each worktree has its own `sessions/sessions-state.json`
- Setup complexity: Orchestrator must create/manage worktrees per agent
- Worktree structure: `worktrees/agent-{id}/` (separate from main repo)
- Orchestrator responsibilities:
  - Create worktree on agent spawn: `git worktree add worktrees/agent-{id}`
  - Remove worktree on agent termination: `git worktree remove worktrees/agent-{id}`
  - Sync task files to worktree before agent starts
  - Merge results back to main branch after agent completes
- Alternative considered: Per-agent state files (simpler but less isolation)
- Alternative rejected: File locking (risky, potential deadlocks)

**Agent Spawning**: Real Cursor Cloud Agents from the start

- **No simulation**: Start with real Cursor Cloud Agent spawning immediately
- Spawn Cursor Cloud Agents via Cursor Cloud Agent API/CLI
- Each Cloud Agent uses cc-sessions internally to do the actual work
- Each agent runs in its own worktree with isolated state
- Agent invocation:
  - Context gathering: Spawn Cloud Agent with context-gathering role
  - Implementation: Spawn Cloud Agent with implementation role
  - Agent receives task file path and worktree location
  - Cloud Agent internally invokes cc-sessions to execute the work
- Agent lifecycle:
  - Orchestrator creates worktree → Spawns Cloud Agent → Cloud Agent uses cc-sessions to work → Agent completes → Orchestrator merges results → Removes worktree
- Architecture:
  - Orchestrator manages Cloud Agent lifecycle (spawn/terminate)
  - Cloud Agents use cc-sessions (Claude Code) internally for task execution
  - No new Claude spawning mechanism needed - use existing cc-sessions functionality
- Rationale: Real system from day one, validates actual integration, leverages existing cc-sessions infrastructure

**Agent Registry Integration**: Yes, integrate from MVP

- **Required for MVP**: Track orchestrator agents in `scripts/agent-registry.js`
- Register each spawned Cloud Agent in registry with:
  - Agent ID (from orchestrator pool)
  - Role (context-gathering or implementation)
  - Current task
  - Worktree path
  - Status (idle, working, completed, failed)
  - Start/completion timestamps
- Benefits:
  - Agent health monitoring
  - Registry-based agent discovery
  - Integration with existing agent management system
  - Visibility into orchestrator agent activity
- Implementation: Update `scripts/agent-registry.js` to support orchestrator agent registration

## Success Criteria

- [ ] Task 1 updated: Removed auto-implementation, focused on file watching only
- [ ] Task 2 created: Complete spec with protocol updates and validation hooks
- [ ] Task 3 created: Complete spec with queue manager and orchestrator architecture
- [ ] Load balancing logic implements priority-based scoring with implementation preference
- [ ] State isolation strategy documented (per-agent state files)
- [ ] Simulation approach documented for MVP, real spawning for Phase 2
- [ ] Dependencies correctly specified in frontmatter
- [ ] All three tasks ready for implementation (ALIGN phase)