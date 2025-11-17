<!-- 306b3154-ab86-4886-8a54-b5b080ceaef9 f4bc0c95-40b7-4b0f-81ee-20ffdfe8243c -->
# Enrich Cloud Agent API Call

## Overview

Refactor `spawnCloudAgent()` and `assignNextTask()` to ensure cloud agents receive fully enriched task data when spawned. The API call should include complete task content, validated branch names, and enriched prompts with task metadata.

## Current Issues

1. **Task content not included**: Line 332 reads `taskContent` but it's never used - only task path is in prompt
2. **No branch validation**: Branch names generated without checking uniqueness or Git validity
3. **Minimal prompt**: Only references task file path, forcing agent to read file from repo
4. **Agent-first assignment**: Code finds agent slot before finding task, making flow unclear
5. **No pre-flight validation**: API call made without validating all required data exists

## Changes

### 1. Refactor `assignNextTask()` - Task-First Flow

**File**: `scripts/agent-orchestrator.js` (lines 145-193)

Reverse the flow to find task first, then allocate agent slot:

```javascript
assignNextTask() {
    // 1. Find next task from queue
    const task = this.getNextTaskFromQueue();
    if (!task) return false;
    
    // 2. Find/create available agent slot
    const availableAgent = this.agents.find(a => a.status === 'idle');
    if (!availableAgent) return false;
    
    // 3. Validate task and enrich before assignment
    if (!this.validateAndEnrichTask(task)) {
        return false; // Task invalid, remove from queue
    }
    
    // 4. Assign and spawn
    this.assignTaskToAgent(availableAgent, task, queueName);
    return true;
}
```

### 2. Enrich `spawnCloudAgent()` with Full Task Content

**File**: `scripts/agent-orchestrator.js` (lines 304-411)

**Changes**:

- Include full task file content directly in prompt (not just path reference)
- Add task metadata (priority, leverage, dependencies) to prompt
- Validate branch name uniqueness and Git validity before API call
- Add pre-flight validation method

**Prompt Structure**:

```
Gather context for task: {taskName}

**Task Metadata:**
- Priority: {priority}
- Leverage: {leverage}
- Dependencies: {dependsOn}
- Task File: {task.path}

**Task Content:**
{full task file content}

**Instructions:**
Create a comprehensive "Context Manifest" section...
```

### 3. Add Branch Name Validation

**File**: `scripts/agent-orchestrator.js` (new method)

Create `validateBranchName(branchName)` method:

- Check Git branch naming rules (no spaces, no special chars except `-`, `_`, `/`)
- Check if branch already exists in repo (via `git ls-remote`)
- If exists, append suffix (e.g., `-1`, `-2`)
- Ensure uniqueness before spawning

### 4. Add Pre-Flight Validation Method

**File**: `scripts/agent-orchestrator.js` (new method)

Create `validateTaskForSpawn(task, queueName)` method:

- Verify task file exists and is readable
- Verify task content is not empty
- Parse and validate frontmatter
- Check required config (CURSOR_API_TOKEN, GITHUB_REPO)
- Validate branch name
- Return validation result with error details

### 5. Update Prompt Generation

**File**: `scripts/agent-orchestrator.js` (lines 330-341)

Enhance prompt to include:

- Full task file content (already read at line 332)
- Task metadata from frontmatter (priority, leverage, dependencies)
- Role-specific instructions (context vs implementation)
- Better structured format for agent consumption

## Implementation Details

### Task Content Inclusion

Use the `taskContent` already read at line 332, include it directly in prompt text with markdown code blocks for clarity.

### Branch Validation

Use `execSync('git ls-remote --heads origin ' + branchName)` to check if branch exists remotely. If local branch check needed, use `git branch --list`.

### Metadata Extraction

Already available in `task` object from queue:

- `task.priority`
- `task.leverage`  
- `task.dependsOn`
- `task.branch` (from frontmatter)

### Error Handling

Pre-flight validation should log detailed errors and remove invalid tasks from queue before attempting spawn.

## Testing Considerations

- Verify branch name uniqueness handling
- Test with duplicate branch names
- Verify task content appears correctly in API requests
- Ensure validation errors are logged appropriately
- Test with missing/invalid task files

## Files to Modify

1. `scripts/agent-orchestrator.js`

   - Refactor `assignNextTask()` (lines 145-193)
   - Enhance `spawnCloudAgent()` (lines 304-411)
   - Add `validateBranchName()` (new method)
   - Add `validateTaskForSpawn()` (new method)
   - Update prompt generation (lines 330-341)

## Expected Outcome

- Cloud agents receive full task content at spawn time
- Branch names are guaranteed unique and valid
- API calls fail fast with clear errors if data invalid
- Task-first assignment flow is clearer and more logical
- Prompts are enriched with all relevant task metadata

### To-dos

- [ ] Refactor assignNextTask() to find task first, then allocate agent slot (task-first flow)
- [ ] Add validateBranchName() method to check uniqueness and Git validity before spawning
- [ ] Add validateTaskForSpawn() method for comprehensive pre-flight checks before API call
- [ ] Update spawnCloudAgent() to include full task file content directly in prompt (not just path reference)
- [ ] Enhance prompt generation to include task metadata (priority, leverage, dependencies) from frontmatter