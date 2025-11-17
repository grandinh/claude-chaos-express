#!/usr/bin/env node

// ===== IMPORTS ===== //

/// ===== STDLIB ===== ///
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
///-///

/// ===== 3RD-PARTY ===== ///
///-///

/// ===== LOCAL ===== ///
const {
    loadState,
    editState,
    Mode,
    PROJECT_ROOT,
    SessionsProtocol,
    listOpenTasks,
    TaskState,
    StateError
} = require('./shared_state.js');
const {
    syncTaskToEpic,
    updateEpicTaskStatus,
    syncToGitHub
} = require('./pm_sync.js');
const { parseFrontmatter } = require('../lib/frontmatter-sync.js');
///-///

//-//

// ===== GLOBALS ===== //

/// ===== CI DETECTION ===== ///
function isCIEnvironment() {
    // Check if running in a CI environment (GitHub Actions)
    const ciIndicators = [
        'GITHUB_ACTIONS',         // GitHub Actions
        'GITHUB_WORKFLOW',        // GitHub Actions workflow
        'CI',                     // Generic CI indicator (set by GitHub Actions)
        'CONTINUOUS_INTEGRATION', // Generic CI (alternative)
    ];
    return ciIndicators.some(indicator => process.env[indicator]);
}

// Skip post tool use hook in CI environments
if (isCIEnvironment()) {
    process.exit(0);
}
///-///

// Read stdin synchronously
let inputData = {};
try {
    const stdin = fs.readFileSync(0, 'utf-8');
    inputData = JSON.parse(stdin);
} catch (e) {
    // If no stdin or invalid JSON, use empty
    inputData = {};
}

const toolName = inputData.tool_name || "";
const toolInput = inputData.tool_input || {};
const toolResponse = inputData.tool_response || {};
// Extract output from tool_response (may be string or object)
// Handles edge cases: null, arrays, unexpected types
const toolOutput =
    typeof toolResponse === 'string' ? toolResponse :
    (toolResponse && typeof toolResponse === 'object' && !Array.isArray(toolResponse))
        ? (toolResponse.output || toolResponse.content || "")
        : "";
const cwd = inputData.cwd || "";
let mod = false;

const STATE = loadState();
//-//

/*
╔════════════════════════════════════════════════════════════════════════════════════════╗
║ ██████╗  █████╗ ██████╗██████╗  ██████╗ █████╗  █████╗ ██╗       ██╗ ██╗██████╗██████╗ ║
║ ██╔══██╗██╔══██╗██╔═══╝╚═██╔═╝  ╚═██╔═╝██╔══██╗██╔══██╗██║       ██║ ██║██╔═══╝██╔═══╝ ║
║ ██████╔╝██║  ██║██████╗  ██║      ██║  ██║  ██║██║  ██║██║       ██║ ██║██████╗█████╗  ║
║ ██╔═══╝ ██║  ██║╚═══██║  ██║      ██║  ██║  ██║██║  ██║██║       ██║ ██║╚═══██║██╔══╝  ║
║ ██║     ╚█████╔╝██████║  ██║      ██║  ╚█████╔╝╚█████╔╝███████╗  ╚████╔╝██████║██████╗ ║
║ ╚═╝      ╚════╝ ╚═════╝  ╚═╝      ╚═╝   ╚════╝  ╚════╝ ╚══════╝   ╚═══╝ ╚═════╝╚═════╝ ║
╚════════════════════════════════════════════════════════════════════════════════════════╝
Handles post-tool execution cleanup and state management:
- Cleans up subagent context flags and transcript directories after Task tool completion
- Auto-returns to discussion mode when all todos are marked complete
- Enforces todo-based execution boundaries in implementation mode
- Provides directory navigation feedback after cd commands
*/

// ===== EXECUTION ===== //

//!> Pause detection for agent instructions
function shouldPauseForUserInput(toolName, toolOutput) {
    if (toolName === "Task" && STATE.flags.subagent) {
        // Check subagent output for pause markers
        // Ensure output is always a string for .match() calls
        const output = String(toolOutput || "");

        // Check for explicit wait instructions
        if (output.match(/WAIT for user|Wait for user|execution MUST stop/i)) {
            return true;
        }

        // Check for decision prompts
        if (output.match(/\[DECISION:/) && output.match(/Your choice:/)) {
            return true;
        }

        // Check for code-review findings
        if (output.match(/\[FINDINGS: Code Review\]/)) {
            return true;
        }
    }

    return false;
}
//!<

//!> Claude compass (directory position reminder)
if (toolName === "Bash") {
    const command = toolInput.command || "";
    if (command.includes("cd ")) {
        console.error(`[You are in: ${cwd}]`);
        mod = true;
    }
}
//!<

//!> Subagent cleanup
if (toolName === "Task" && STATE.flags.subagent) {
    // Check if agent requested pause before cleaning up
    if (shouldPauseForUserInput(toolName, toolOutput)) {
        // Set pause flag instead of cleaning up
        // Note: subagent flag remains true to preserve context for resume
        editState(s => {
            s.flags.waiting_for_user_input = true;
            s.flags.pause_reason = "agent_requested";
        });
        console.error("[PAUSE] Agent requested user input. Waiting for response...");
        // Exit before cleanup - transcript directories preserved for resume
        process.exit(0);
    }

    // Otherwise proceed with normal cleanup
    editState(s => {
        s.flags.subagent = false;
    });
    // Clean up agent transcript directory
    const subagentType = toolInput.subagent_type || "shared";
    const agentDir = path.join(PROJECT_ROOT, 'sessions', 'transcripts', subagentType);
    if (fs.existsSync(agentDir)) {
        try {
            fs.rmSync(agentDir, { recursive: true, force: true });
        } catch (error) {
            // Ignore errors
        }
    }
    process.exit(0);
}
//!<

//!> Todo completion
if (STATE.mode === Mode.GO && toolName === "TodoWrite" && STATE.todos.allComplete()) {
    // Check if all complete (names already verified to match if active_todos existed)
    console.error("[DAIC: Todos Complete] All todos completed.\n\n");

    if (STATE.active_protocol === SessionsProtocol.COMPLETE) {
        editState(s => {
            s.mode = Mode.NO;
            s.active_protocol = null;
            s.current_task.clearTask();
            s.todos.active = [];
        });
        console.error(listOpenTasks());
        process.exit(0);
    }

    if (STATE.active_protocol !== null) {
        editState(s => {
            s.active_protocol = null;
        });
    }

    if (STATE.todos.stashed && STATE.todos.stashed.length > 0) {
        let numRestored = 0;
        let restored = [];
        editState(s => {
            numRestored = s.todos.restoreStashed();
            restored = s.todos.active.map(t => t.content);
            // Enable the todos clear command for this context
            s.api.todos_clear = true;
        });
        mod = true;
        if (numRestored > 0) {
            // Detect OS for correct sessions command
            const isWindows = process.platform === "win32";
            const sessionsCmd = isWindows ? "sessions/bin/sessions.bat" : "sessions/bin/sessions";

            console.error(`Your previous ${numRestored} todos have been restored:\n\n${JSON.stringify(restored, null, 2)}\n\nIf these todos are no longer relevant, you should clear them using: ${sessionsCmd} todos clear\nNote: You can only use this command immediately - it will be disabled after any other tool use.\n\n`);
        }
    } else {
        editState(s => {
            s.todos.active = [];
            s.mode = Mode.NO;
        });
        console.error("You have returned to discussion mode. You may now discuss next steps with the user.\n\n");
        mod = true;
    }
}
//!<

//!> Implementation mode + no Todos enforcement
if (STATE.mode === Mode.GO && !STATE.flags.subagent && (!STATE.todos.active || STATE.todos.active.length === 0) && STATE.current_task.name) {
    // In implementation mode but no todos - show reminder only during task-based work
    console.error("[Reminder] You're in implementation mode without approved todos. " +
        "If you proposed todos that were approved, add them. " +
        "If the user asked you to do something without todo proposal/approval that is **reasonably complex or multi-step**, translate *only the remaining work* to todos and add them (all 'pending'). ");
    mod = true;
}
//!<

//!> Task file auto-update detection
if (["Edit", "Write", "MultiEdit"].includes(toolName)) {
    // Extract file path from tool input
    const filePathStr = toolInput.file_path;
    if (filePathStr) {
        const filePath = path.resolve(filePathStr);
        const tasksDir = path.join(PROJECT_ROOT, 'sessions', 'tasks');
        
        // Check if file is in sessions/tasks/ directory (new task creation or existing task edit)
        if (filePath.startsWith(tasksDir) && filePath.endsWith('.md')) {
            try {
                const taskFile = path.relative(tasksDir, filePath);
                const content = fs.readFileSync(filePath, 'utf8');
                const { frontmatter } = parseFrontmatter(content);
                
                if (frontmatter) {
                    // PM Sync: Register task with epic if epic metadata exists
                    if (frontmatter.epic) {
                        syncTaskToEpic(filePath, frontmatter);
                    }
                    
                    // If this is the current task, update state and sync status changes
                    if (STATE.current_task.name && STATE.current_task.file === taskFile) {
                        const updatedTask = TaskState.loadTask({ path: filePath });
                        
                        if (updatedTask) {
                            const oldStatus = STATE.current_task.status;
                            const newStatus = updatedTask.status;
                            
                            editState(s => {
                                // Update relevant fields from the re-parsed task
                                if (updatedTask.status !== STATE.current_task.status) {
                                    s.current_task.status = updatedTask.status;
                                }
                                if (updatedTask.updated !== STATE.current_task.updated) {
                                    s.current_task.updated = updatedTask.updated;
                                }
                                if (updatedTask.branch !== STATE.current_task.branch) {
                                    s.current_task.branch = updatedTask.branch;
                                }
                                if (updatedTask.submodules !== STATE.current_task.submodules) {
                                    s.current_task.submodules = updatedTask.submodules;
                                }
                                // Update other relevant fields as needed
                                if (updatedTask.started !== STATE.current_task.started) {
                                    s.current_task.started = updatedTask.started;
                                }
                                if (updatedTask.dependencies !== STATE.current_task.dependencies) {
                                    s.current_task.dependencies = updatedTask.dependencies;
                                }
                            });
                            
                            // PM Sync: Update epic task status if status changed
                            if (oldStatus !== newStatus && frontmatter.epic) {
                                updateEpicTaskStatus(frontmatter.epic, taskFile, newStatus);
                                // Sync to GitHub if applicable
                                if (frontmatter.github_issue) {
                                    syncToGitHub(frontmatter.epic, taskFile, newStatus);
                                }
                            }
                        }
                    }
                }
            } catch (error) {
                // File might be temporarily invalid during editing
                // or frontmatter might be malformed - silently skip
            }
        } else if (STATE.current_task.name && STATE.current_task.file) {
            // Check if the edited file is the current task file (for directory tasks)
            const taskPath = path.resolve(path.join(PROJECT_ROOT, 'sessions', 'tasks', STATE.current_task.file));
            if (filePath === taskPath) {
                try {
                    // Task file was edited - re-parse frontmatter to detect changes
                    const updatedTask = TaskState.loadTask({ path: taskPath });

                    // Update session state with any changes from the re-parsed frontmatter
                    if (updatedTask) {
                        const oldStatus = STATE.current_task.status;
                        const newStatus = updatedTask.status;
                        
                        editState(s => {
                            // Update relevant fields from the re-parsed task
                            if (updatedTask.status !== STATE.current_task.status) {
                                s.current_task.status = updatedTask.status;
                            }
                            if (updatedTask.updated !== STATE.current_task.updated) {
                                s.current_task.updated = updatedTask.updated;
                            }
                            if (updatedTask.branch !== STATE.current_task.branch) {
                                s.current_task.branch = updatedTask.branch;
                            }
                            if (updatedTask.submodules !== STATE.current_task.submodules) {
                                s.current_task.submodules = updatedTask.submodules;
                            }
                            // Update other relevant fields as needed
                            if (updatedTask.started !== STATE.current_task.started) {
                                s.current_task.started = updatedTask.started;
                            }
                            if (updatedTask.dependencies !== STATE.current_task.dependencies) {
                                s.current_task.dependencies = updatedTask.dependencies;
                            }
                        });
                        
                        // PM Sync: Update epic task status if status changed
                        if (oldStatus !== newStatus) {
                            const taskContent = fs.readFileSync(taskPath, 'utf8');
                            const { frontmatter } = parseFrontmatter(taskContent);
                            if (frontmatter?.epic) {
                                updateEpicTaskStatus(frontmatter.epic, STATE.current_task.file, newStatus);
                                // Sync to GitHub if applicable
                                if (frontmatter.github_issue) {
                                    syncToGitHub(frontmatter.epic, STATE.current_task.file, newStatus);
                                }
                            }
                        }
                    }
                } catch (error) {
                    // File might be temporarily invalid during editing
                    // or frontmatter might be malformed - silently skip
                }
            }
        }
    }
}
//!<

//!> New skill file detection
// Performance: O(1) for path checks, single JSON parse (cached by Node.js if repeated reads)
// Typical execution: <5ms for pattern matching + JSON validation
if (["Edit", "Write", "MultiEdit"].includes(toolName)) {
    // Extract file path from tool input
    const filePathStr = toolInput.file_path;
    if (filePathStr) {
        const filePath = path.resolve(filePathStr);
        const skillsPath = path.join(PROJECT_ROOT, '.claude', 'skills');

        // Check if file is in .claude/skills/ and is a .md file
        if (filePath.startsWith(skillsPath) && filePath.endsWith('.md')) {
            const skillFileName = path.basename(filePath);

            // Exclude README.md from triggering assessment
            if (skillFileName !== 'README.md') {
                try {
                    // Check if this skill is already configured in skill-rules.json
                    const rulesPath = path.join(skillsPath, 'skill-rules.json');
                    const rulesContent = fs.readFileSync(rulesPath, 'utf-8');
                    const rules = JSON.parse(rulesContent);
                    const skillName = skillFileName.replace('.md', '');

                    // Only suggest assessment if skill is NOT yet in skill-rules.json
                    if (!rules.skills || !rules.skills[skillName]) {
                        console.error(`
[New Skill Detected] ${skillFileName} created but not yet in skill-rules.json.

💡 Recommendation: Assess this skill for auto-invocation using:
   1. context-gathering agent to understand skill purpose
   2. code-analyzer agent to find codebase patterns
   3. skill-assessor skill (if configured)

This ensures only valuable skills auto-trigger while preventing skill bloat.
`);
                        mod = true;
                    }
                } catch (error) {
                    // If we can't read skill-rules.json, log warning but don't block
                    if (error.code !== 'ENOENT') {  // Only log if NOT a "file not found" error
                        // Distinguish between JSON parse errors and read errors
                        const errorType = error instanceof SyntaxError ? 'Invalid JSON format' : 'Read error';
                        console.error(`
[Warning] Could not parse skill-rules.json (${errorType}): ${error.message}
Skill assessment suggestion skipped for ${skillFileName}.
Check that skill-rules.json is valid JSON.
`);
                        mod = true;
                    }
                    // File not existing is expected for new projects, so silently skip in that case
                }
            }
        }
    }
}
//!<

//!> Disable windowed API permissions after any tool use (except the windowed command itself)
if (STATE.api.todos_clear && toolName === "Bash") {
    // Check if this is the todos clear command
    const command = toolInput.command || '';
    // Check for either Unix or Windows version of the command
    if (!command.includes('sessions/bin/sessions todos clear') && !command.includes('sessions/bin/sessions.bat todos clear')) {
        // Not the todos clear command, disable the permission
        editState(s => {
            s.api.todos_clear = false;
        });
    }
} else if (STATE.api.todos_clear) {
    // Any other tool was used, disable the permission
    editState(s => {
        s.api.todos_clear = false;
    });
}
//!<

//-//

if (mod) {
    process.exit(2);  // Exit code 2 feeds stderr back to Claude
}
process.exit(0);
