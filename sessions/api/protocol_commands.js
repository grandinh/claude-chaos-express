#!/usr/bin/env node

// ==== IMPORTS ===== //

// ===== STDLIB ===== //
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
//--//

// ===== LOCAL ===== //
const { loadState, editState, TaskState, SessionsProtocol, PROJECT_ROOT, loadConfig } = require('../hooks/shared_state.js');
//--//

//-#

// ==== GLOBALS ===== //
//-#

// ==== FUNCTIONS ===== //

function handleProtocolCommand(args, jsonOutput = false, fromSlash = false) {
    /**
     * Handle protocol-specific commands that are only available during certain protocols.
     *
     * Usage:
     *     protocol startup-load <task-file>  - Load a task during task-startup protocol
     */
    if (!args || args.length === 0) {
        return formatProtocolHelp(jsonOutput);
    }

    const subcommand = args[0];

    if (subcommand === 'startup-load') {
        return handleStartupLoad(args.slice(1), jsonOutput);
    } else {
        const errorMsg = `Unknown protocol command: ${subcommand}`;
        if (jsonOutput) {
            return { error: errorMsg };
        }
        return errorMsg;
    }
}

function formatProtocolHelp(jsonOutput) {
    /**Format help for protocol commands.*/
    const commands = {
        'startup-load': 'Load a task file during task-startup protocol (requires active protocol)'
    };

    if (jsonOutput) {
        return { available_commands: commands };
    }

    const lines = ['Protocol Commands:'];
    for (const [cmd, desc] of Object.entries(commands)) {
        lines.push(`  ${cmd}: ${desc}`);
    }
    return lines.join('\n');
}

function handleStartupLoad(args, jsonOutput = false) {
    /**
     * Load a task during the task-startup protocol.
     *
     * This command is only available when:
     * 1. The active_protocol is SessionsProtocol.START
     * 2. The api.startup_load permission is True
     *
     * Usage:
     *     protocol startup-load <task-file>
     *
     * Examples:
     *     protocol startup-load h-fix-auth-bug.md
     *     protocol startup-load implement-feature/README.md
     *     protocol startup-load sessions/tasks/h-fix-auth-bug.md
     *     protocol startup-load /home/user/project/sessions/tasks/h-fix-auth-bug.md
     */
    const state = loadState();

    // Check if we're in the right protocol state
    if (state.active_protocol !== SessionsProtocol.START) {
        const errorMsg = 'startup-load is only available during task-startup protocol';
        if (jsonOutput) {
            return {
                error: errorMsg,
                active_protocol: state.active_protocol ? state.active_protocol.value || state.active_protocol : null
            };
        }
        return `Error: ${errorMsg}`;
    }

    // Check if we have permission
    if (!state.api.startup_load) {
        const errorMsg = 'startup-load permission not granted';
        if (jsonOutput) {
            return { error: errorMsg };
        }
        return `Error: ${errorMsg}`;
    }

    if (!args || args.length === 0) {
        const errorMsg = 'Task file required. Usage: protocol startup-load <task-file>';
        if (jsonOutput) {
            return { error: errorMsg };
        }
        return `Error: ${errorMsg}`;
    }

    const taskFileInput = args[0];
    const taskPath = path.resolve(taskFileInput);

    // Determine the relative path for TaskState.loadTask()
    // This function expects paths relative to sessions/tasks/

    let relativeTaskPath;

    if (path.isAbsolute(taskFileInput)) {
        // Handle absolute path
        const tasksDir = path.join(PROJECT_ROOT, 'sessions', 'tasks');
        try {
            // Get the relative path from sessions/tasks/ directory
            relativeTaskPath = path.relative(tasksDir, taskPath);

            // Check if the path is actually under sessions/tasks/
            if (relativeTaskPath.startsWith('..') || path.isAbsolute(relativeTaskPath)) {
                // Path is not under sessions/tasks/
                const errorMsg = `Task file must be under sessions/tasks/ directory: ${taskFileInput}`;
                if (jsonOutput) {
                    return { error: errorMsg };
                }
                return `Error: ${errorMsg}`;
            }
        } catch (error) {
            // Path is not under sessions/tasks/
            const errorMsg = `Task file must be under sessions/tasks/ directory: ${taskFileInput}`;
            if (jsonOutput) {
                return { error: errorMsg };
            }
            return `Error: ${errorMsg}`;
        }
    } else {
        // Handle relative paths
        if (taskFileInput.startsWith('sessions/tasks/')) {
            // Strip the sessions/tasks/ prefix
            relativeTaskPath = taskFileInput.substring('sessions/tasks/'.length);
        } else if (!taskFileInput.includes('/') || taskFileInput.endsWith('.md')) {
            // Just a filename or a simple relative path
            relativeTaskPath = taskFileInput;
        } else {
            // Some other relative path format
            relativeTaskPath = taskFileInput;
        }
    }

    // Try to load the task
    try {
        const taskData = TaskState.loadTask({ file: relativeTaskPath });

        // Auto-update status and started date
        taskData.status = 'in-progress';
        if (!taskData.started) {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            taskData.started = `${year}-${month}-${day}`;
        }

        // Create/checkout task branch as part of task initialization
        let branchStatus = '';
        if (taskData.branch) {
            try {
                const config = loadConfig();
                const defaultBranch = config.git_preferences.default_branch || 'main';
                
                // Check current branch
                let currentBranch;
                try {
                    currentBranch = execSync('git branch --show-current', { 
                        cwd: PROJECT_ROOT, 
                        encoding: 'utf8' 
                    }).trim();
                } catch (e) {
                    currentBranch = null;
                }

                // Check if task branch exists
                let branchExists = false;
                try {
                    execSync(`git show-ref --verify --quiet refs/heads/${taskData.branch}`, { 
                        cwd: PROJECT_ROOT 
                    });
                    branchExists = true;
                } catch (e) {
                    // Branch doesn't exist locally
                }

                // Check if branch exists on remote
                let remoteBranchExists = false;
                try {
                    execSync(`git show-ref --verify --quiet refs/remotes/origin/${taskData.branch}`, { 
                        cwd: PROJECT_ROOT 
                    });
                    remoteBranchExists = true;
                } catch (e) {
                    // Branch doesn't exist on remote
                }

                if (currentBranch !== taskData.branch) {
                    if (branchExists) {
                        // Branch exists locally, just checkout
                        execSync(`git checkout ${taskData.branch}`, { 
                            cwd: PROJECT_ROOT,
                            stdio: 'pipe'
                        });
                        // Ensure upstream tracking is set up if remote branch exists
                        if (remoteBranchExists) {
                            try {
                                execSync(`git branch --set-upstream-to=origin/${taskData.branch} ${taskData.branch}`, { 
                                    cwd: PROJECT_ROOT,
                                    stdio: 'pipe'
                                });
                            } catch (e) {
                                // Upstream might already be set, ignore
                            }
                        }
                        branchStatus = `Checked out existing branch: ${taskData.branch}${remoteBranchExists ? ' (tracking remote)' : ''}`;
                    } else if (remoteBranchExists) {
                        // Branch exists on remote, create local tracking branch
                        execSync(`git checkout -b ${taskData.branch} origin/${taskData.branch}`, { 
                            cwd: PROJECT_ROOT,
                            stdio: 'pipe'
                        });
                        branchStatus = `Created local branch tracking remote: ${taskData.branch}`;
                    } else {
                        // Create new branch from default branch
                        // First ensure we're on default branch
                        if (currentBranch !== defaultBranch) {
                            execSync(`git checkout ${defaultBranch}`, { 
                                cwd: PROJECT_ROOT,
                                stdio: 'pipe'
                            });
                        }
                        // Pull latest changes
                        try {
                            execSync(`git pull origin ${defaultBranch}`, { 
                                cwd: PROJECT_ROOT,
                                stdio: 'pipe'
                            });
                        } catch (e) {
                            // Ignore pull errors (might be offline or no remote)
                        }
                        // Create new branch
                        execSync(`git checkout -b ${taskData.branch}`, { 
                            cwd: PROJECT_ROOT,
                            stdio: 'pipe'
                        });
                        // Push and set upstream tracking for new branch
                        try {
                            execSync(`git push -u origin ${taskData.branch}`, { 
                                cwd: PROJECT_ROOT,
                                stdio: 'pipe'
                            });
                            branchStatus = `Created new branch: ${taskData.branch} from ${defaultBranch} (pushed to remote with tracking)`;
                        } catch (e) {
                            // Push failed (might be offline or no remote), but branch is created
                            branchStatus = `Created new branch: ${taskData.branch} from ${defaultBranch} (local only - push manually to set up tracking)`;
                        }
                    }
                } else {
                    // Already on the branch, but ensure upstream is set if remote exists
                    if (remoteBranchExists) {
                        try {
                            execSync(`git branch --set-upstream-to=origin/${taskData.branch} ${taskData.branch}`, { 
                                cwd: PROJECT_ROOT,
                                stdio: 'pipe'
                            });
                        } catch (e) {
                            // Upstream might already be set, ignore
                        }
                    }
                    branchStatus = `Already on branch: ${taskData.branch}${remoteBranchExists ? ' (tracking remote)' : ''}`;
                }

                // Handle submodules if configured
                if (config.git_preferences.has_submodules && taskData.submodules && Array.isArray(taskData.submodules)) {
                    for (const submodule of taskData.submodules) {
                        const submodulePath = path.join(PROJECT_ROOT, submodule);
                        if (fs.existsSync(submodulePath)) {
                            try {
                                // Check if submodule branch exists
                                let subBranchExists = false;
                                try {
                                    execSync(`git show-ref --verify --quiet refs/heads/${taskData.branch}`, { 
                                        cwd: submodulePath 
                                    });
                                    subBranchExists = true;
                                } catch (e) {
                                    // Branch doesn't exist
                                }

                                if (!subBranchExists) {
                                    // Get submodule default branch
                                    let subDefaultBranch = defaultBranch;
                                    try {
                                        const result = execSync('git symbolic-ref refs/remotes/origin/HEAD | sed "s@^refs/remotes/origin/@@"', { 
                                            cwd: submodulePath,
                                            encoding: 'utf8',
                                            stdio: 'pipe'
                                        }).trim();
                                        if (result) {
                                            subDefaultBranch = result;
                                        }
                                    } catch (e) {
                                        // Use default branch if detection fails
                                    }
                                    
                                    // Create branch in submodule
                                    execSync(`git checkout -b ${taskData.branch} ${subDefaultBranch}`, { 
                                        cwd: submodulePath,
                                        stdio: 'pipe'
                                    });
                                    branchStatus += `\nCreated branch in submodule ${submodule}: ${taskData.branch}`;
                                } else {
                                    execSync(`git checkout ${taskData.branch}`, { 
                                        cwd: submodulePath,
                                        stdio: 'pipe'
                                    });
                                    branchStatus += `\nChecked out branch in submodule ${submodule}: ${taskData.branch}`;
                                }
                            } catch (e) {
                                branchStatus += `\nWarning: Could not create branch in submodule ${submodule}: ${e.message}`;
                            }
                        }
                    }
                }
            } catch (error) {
                branchStatus = `Warning: Branch creation failed: ${error.message}. You may need to create the branch manually.`;
            }
        }

        // Update the current task in state
        editState(s => {
            s.current_task = taskData;
            // Clear the startup_load permission after use
            s.api.startup_load = false;
        });

        if (jsonOutput) {
            return {
                success: true,
                task: {
                    name: taskData.name,
                    file: taskData.file,
                    branch: taskData.branch,
                    status: taskData.status
                },
                branch_status: branchStatus,
                next_steps: 'If the user has not already shown you the task file with @task-name syntax, read the task file before you continue. Otherwise, you may proceed with the task startup protocol.'
            };
        }

        let output = `Your task data has been loaded into the session state:\nTask Name: ${taskData.name}\nTask File: ${taskData.file}\nBranch To Use: ${taskData.branch}\nTask Status: ${taskData.status}\n`;
        if (branchStatus) {
            output += `\nBranch Status:\n${branchStatus}\n`;
        }
        output += `\nIf the user has not already shown you the task file with @task-name syntax, read the task file before you continue. Otherwise, you may proceed with the task startup protocol.`;
        return output;

    } catch (error) {
        // Differentiate between FileNotFoundError and other exceptions
        let errorMsg;
        if (error.code === 'ENOENT' || error.message.includes('not found') || error.message.includes('ENOENT')) {
            errorMsg = `Task file not found: ${taskFileInput}`;
        } else {
            errorMsg = `Failed to load task: ${error.message || String(error)}`;
        }

        if (jsonOutput) {
            return { error: errorMsg };
        }
        return `Error: ${errorMsg}`;
    }
}

//-#

// ==== EXPORTS ===== //
module.exports = {
    handleProtocolCommand
};
//-#