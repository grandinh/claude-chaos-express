#!/usr/bin/env node

/**
 * Agent Orchestrator
 *
 * Manages agent pool and assigns tasks with load balancing.
 * Supports both local Claude CLI and Cursor Cloud Agent API.
 *
 * @module agent-orchestrator
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const https = require('https');
const TaskQueueManager = require('./task-queue-manager');
const { detectProjectRoot } = require('./utils');

const PROJECT_ROOT = detectProjectRoot();
const ORCHESTRATOR_STATE = path.join(PROJECT_ROOT, 'sessions', 'tasks', '.orchestrator-state.json');
const AGENT_POOL_SIZE = 3;

// Configuration
const CONFIG = {
    // Agent execution mode: 'local' (Claude CLI) or 'cloud' (Cursor Cloud Agent API)
    agentMode: process.env.AGENT_MODE || 'local',
    
    // Cloud Agent API settings
    cursorApiKey: process.env.CURSOR_API_TOKEN || process.env.CURSOR_API_KEY,
    cursorApiUrl: 'https://api.cursor.com',
    githubRepo: process.env.GITHUB_REPO || process.env.GITHUB_REPOSITORY,
    githubRef: process.env.GITHUB_REF || 'main',
    
    // Timeouts (in milliseconds)
    contextTaskTimeout: 30 * 60 * 1000,  // 30 minutes
    implementationTaskTimeout: 60 * 60 * 1000,  // 60 minutes
    
    // Polling intervals
    queuePollInterval: 5000,  // 5 seconds
    statusReportInterval: 30000,  // 30 seconds
};

/**
 * AgentOrchestrator class
 * Manages agent pool and task assignment
 */
class AgentOrchestrator {
    constructor() {
        this.queueManager = new TaskQueueManager();
        this.agents = [];
        this.completedTasks = new Set();
        this.loadState();
        this.initializeAgents();
        this.isRunning = false;
    }

    /**
     * Load orchestrator state from disk
     */
    loadState() {
        if (fs.existsSync(ORCHESTRATOR_STATE)) {
            try {
                const state = JSON.parse(fs.readFileSync(ORCHESTRATOR_STATE, 'utf8'));
                this.agents = state.agents || [];
                this.completedTasks = new Set(state.completedTasks || []);
            } catch (error) {
                console.error(`Failed to load orchestrator state: ${error.message}`);
                this.agents = [];
                this.completedTasks = new Set();
            }
        }

        // Ensure we have the right number of agents
        if (this.agents.length !== AGENT_POOL_SIZE) {
            this.agents = Array(AGENT_POOL_SIZE).fill(null).map((_, i) => {
                const existing = this.agents[i];
                return existing || {
                    id: `agent-${i + 1}`,
                    status: 'idle',
                    currentTask: null,
                    role: null,
                    startedAt: null,
                    completedTasks: existing?.completedTasks || 0,
                    pid: null,
                    cloudAgentId: null
                };
            });
        }
    }

    /**
     * Save orchestrator state to disk
     */
    saveState() {
        const state = {
            agents: this.agents.map(a => ({
                id: a.id,
                status: a.status,
                currentTask: a.currentTask,
                role: a.role,
                startedAt: a.startedAt,
                completedTasks: a.completedTasks,
                pid: a.pid,
                cloudAgentId: a.cloudAgentId
            })),
            completedTasks: Array.from(this.completedTasks),
            lastUpdated: new Date().toISOString()
        };
        fs.writeFileSync(ORCHESTRATOR_STATE, JSON.stringify(state, null, 2), 'utf8');
    }

    /**
     * Initialize agent pool
     */
    initializeAgents() {
        console.log(`\n🚀 Initializing Agent Pool (${AGENT_POOL_SIZE} agents, mode: ${CONFIG.agentMode})\n`);
        this.agents.forEach(agent => {
            const statusIcon = agent.status === 'working' ? '⚙️' : agent.status === 'failed' ? '❌' : '💤';
            console.log(`  ${statusIcon} ${agent.id}: ${agent.status} (${agent.completedTasks} tasks completed)`);
        });
    }

    /**
     * Assign next task to available agent
     * @returns {boolean} - Success status
     */
    assignNextTask() {
        // Find available agent
        const availableAgent = this.agents.find(a => a.status === 'idle');
        if (!availableAgent) {
            return false;
        }

        // Get queue status for load balancing
        const queueStatus = this.queueManager.getStatus();
        const contextQueueLength = queueStatus.contextQueue.length;
        const implementationQueueLength = queueStatus.implementationQueue.length;
        const totalLength = contextQueueLength + implementationQueueLength;

        if (totalLength === 0) {
            return false;
        }

        // Calculate context ratio
        const contextRatio = totalLength > 0 ? contextQueueLength / totalLength : 0;

        // Load balancing logic
        let task, queueName;
        if (contextRatio > 0.6 || implementationQueueLength === 0) {
            // High context backlog or no implementation tasks
            task = this.queueManager.getNextTask('context', this.completedTasks);
            queueName = 'context';
        } else {
            // Balanced or implementation backlog
            task = this.queueManager.getNextTask('implementation', this.completedTasks);
            queueName = 'implementation';
        }

        if (!task) {
            return false;
        }

        // Defensive check: prevent duplicate assignment (belt-and-suspenders)
        const alreadyAssigned = this.agents.some(a =>
            a.currentTask === task.path && a.status === 'working'
        );
        if (alreadyAssigned) {
            console.warn(`⚠️  Task ${task.relativePath} already assigned to another agent, skipping`);
            return false;
        }

        // Assign task to agent
        this.assignTaskToAgent(availableAgent, task, queueName);
        return true;
    }

    /**
     * Assign task to specific agent
     * @param {Object} agent - Agent object
     * @param {Object} task - Task object
     * @param {string} queueName - 'context' or 'implementation'
     */
    assignTaskToAgent(agent, task, queueName) {
        // CRITICAL: Validate context gathering before implementation
        if (queueName === 'implementation') {
            const frontmatter = this.queueManager.parseFrontmatter(task.path);
            if (!frontmatter) {
                console.error(`❌ Cannot parse frontmatter for ${task.relativePath}, skipping assignment`);
                return;
            }
            
            const contextGathered = frontmatter.context_gathered === true;
            if (!contextGathered) {
                console.error(`❌ BLOCKED: Task ${task.relativePath} cannot be implemented - context_gathered is false or missing`);
                console.error(`   This task must complete context gathering first. Moving to context queue.`);
                
                // Remove from implementation queue if mistakenly there
                this.queueManager.removeFromQueue(task.path, 'implementation');
                
                // Route to context queue if not already there
                const inContextQueue = this.queueManager.contextQueue.some(t => 
                    t.path === task.path || t.relativePath === task.relativePath
                );
                if (!inContextQueue) {
                    this.queueManager.routeTask(task.path);
                }
                
                // Log violation
                this.logContextViolation(task, 'Attempted to assign implementation task without context_gathered flag');
                return;
            }
            
            // Verify Context Manifest section exists using queue manager validation
            const hasContextManifest = this.queueManager.validateContextManifest(task.path);
            if (!hasContextManifest) {
                console.error(`❌ BLOCKED: Task ${task.relativePath} has context_gathered=true but no Context Manifest section found`);
                console.error(`   This task must complete context gathering first. Moving to context queue.`);
                
                // Remove from implementation queue if mistakenly there
                this.queueManager.removeFromQueue(task.path, 'implementation');
                
                // Route to context queue if not already there
                const inContextQueue = this.queueManager.contextQueue.some(t => 
                    t.path === task.path || t.relativePath === task.relativePath
                );
                if (!inContextQueue) {
                    this.queueManager.routeTask(task.path);
                }
                
                // Log violation
                this.logContextViolation(task, 'Attempted to assign implementation task without Context Manifest section');
                return;
            }
        }

        agent.status = 'working';
        agent.currentTask = task.path;
        agent.role = queueName;
        agent.startedAt = new Date().toISOString();

        // Remove from queue immediately upon assignment to prevent race condition
        this.queueManager.removeFromQueue(task.path, queueName);

        console.log(`\n🎯 Assigning Task to ${agent.id}`);
        console.log(`  Role: ${queueName === 'context' ? 'Context Gathering' : 'Implementation'}`);
        console.log(`  Task: ${task.relativePath}`);
        console.log(`  Queue: ${queueName}\n`);

        this.saveState();

        // Spawn agent based on mode
        if (CONFIG.agentMode === 'cloud') {
            this.spawnCloudAgent(agent, task, queueName);
        } else {
            this.spawnLocalAgent(agent, task, queueName);
        }
    }

    /**
     * Spawn local Claude CLI agent
     * @param {Object} agent - Agent object
     * @param {Object} task - Task object
     * @param {string} queueName - 'context' or 'implementation'
     */
    spawnLocalAgent(agent, task, queueName) {
        const taskPath = path.relative(PROJECT_ROOT, task.path);
        const claudeCmd = process.env.CLAUDE_CMD || 'claude';

        console.log(`⏱️  ${agent.id} starting work (local mode)\n`);

        const agentProcess = spawn(claudeCmd, [
            '--dangerously-skip-permissions',
            `@sessions/tasks/${task.relativePath}`
        ], {
            cwd: PROJECT_ROOT,
            env: {
                ...process.env,
                ORCHESTRATOR_AGENT_ID: agent.id,
                ORCHESTRATOR_ROLE: queueName,
                ORCHESTRATOR_TASK_PATH: task.path
            },
            stdio: 'pipe'
        });

        agent.pid = agentProcess.pid;

        // Set timeout
        const timeout = queueName === 'context' 
            ? CONFIG.contextTaskTimeout 
            : CONFIG.implementationTaskTimeout;

        const timeoutId = setTimeout(() => {
            if (agentProcess.killed === false) {
                console.error(`⏰ ${agent.id} timed out after ${timeout / 1000 / 60} minutes`);
                agentProcess.kill('SIGTERM');
                setTimeout(() => {
                    if (!agentProcess.killed) {
                        agentProcess.kill('SIGKILL');
                    }
                }, 5000);
                this.handleAgentFailure(agent, task, queueName, 'timeout');
            }
        }, timeout);

        // Handle process exit
        agentProcess.on('exit', (code, signal) => {
            clearTimeout(timeoutId);
            
            if (code === 0) {
                this.handleAgentCompletion(agent, task, queueName);
            } else {
                console.error(`❌ ${agent.id} exited with code ${code} (signal: ${signal})`);
                this.handleAgentFailure(agent, task, queueName, `exit code ${code}`);
            }
        });

        // Log stdout/stderr
        agentProcess.stdout.on('data', (data) => {
            // Optionally log agent output
            // console.log(`[${agent.id}] ${data.toString()}`);
        });

        agentProcess.stderr.on('data', (data) => {
            console.error(`[${agent.id} stderr] ${data.toString()}`);
        });

        this.saveState();
    }

    /**
     * Spawn Cursor Cloud Agent
     * @param {Object} agent - Agent object
     * @param {Object} task - Task object
     * @param {string} queueName - 'context' or 'implementation'
     */
    async spawnCloudAgent(agent, task, queueName) {
        if (!CONFIG.cursorApiKey) {
            console.error('❌ CURSOR_API_TOKEN not set. Cannot spawn cloud agent.');
            this.handleAgentFailure(agent, task, queueName, 'missing API key');
            return;
        }

        if (!CONFIG.githubRepo) {
            console.error('❌ GITHUB_REPO not set. Cannot spawn cloud agent.');
            this.handleAgentFailure(agent, task, queueName, 'missing GitHub repo');
            return;
        }

        // Read task file to generate prompt (resolve to absolute path)
        const taskPath = path.isAbsolute(task.path) ? task.path : path.join(PROJECT_ROOT, task.path);
        const taskContent = fs.readFileSync(taskPath, 'utf8');
        const taskName = task.name || path.basename(task.path, '.md');
        
        // Generate prompt based on role
        let promptText;
        if (queueName === 'context') {
            promptText = `Gather context for task: ${taskName}\n\nTask file: ${task.path}\n\nRead the task file and create a comprehensive "Context Manifest" section. Document:\n- Current system state\n- Relevant files and patterns\n- Dependencies and integration points\n- Technical constraints\n\nAfter gathering context, update the task file frontmatter: context_gathered: true`;
        } else {
            promptText = `Implement task: ${taskName}\n\nTask file: ${task.path}\n\nRead the task file and implement all todos. Ensure context_gathered is true before starting implementation.`;
        }

        // Generate branch name from task
        const branchName = task.branch || `feature/${taskName.replace(/[^a-z0-9-]/gi, '-').toLowerCase()}`;

        const requestData = JSON.stringify({
            prompt: {
                text: promptText
            },
            source: {
                repository: CONFIG.githubRepo,
                ref: CONFIG.githubRef
            },
            target: {
                branchName: branchName,
                autoCreatePr: true,
                openAsCursorGithubApp: false,
                skipReviewerRequest: false
            }
        });

        const options = {
            hostname: 'api.cursor.com',
            path: '/v0/agents',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': requestData.length,
                'Authorization': `Basic ${Buffer.from(`${CONFIG.cursorApiKey}:`).toString('base64')}`
            }
        };

        console.log(`⏱️  ${agent.id} starting work (cloud mode)\n`);

        try {
            const cloudAgentId = await new Promise((resolve, reject) => {
                const req = https.request(options, (res) => {
                    let data = '';

                    res.on('data', (chunk) => {
                        data += chunk;
                    });

                    res.on('end', () => {
                        if (res.statusCode === 200 || res.statusCode === 201) {
                            const response = JSON.parse(data);
                            resolve(response.id);
                        } else {
                            reject(new Error(`API error: ${res.statusCode} - ${data}`));
                        }
                    });
                });

                req.on('error', reject);
                req.write(requestData);
                req.end();
            });

            agent.cloudAgentId = cloudAgentId;
            this.saveState();

            // Poll for completion
            this.pollCloudAgentStatus(agent, task, queueName);
        } catch (error) {
            console.error(`❌ Failed to spawn cloud agent: ${error.message}`);
            this.handleAgentFailure(agent, task, queueName, error.message);
        }
    }

    /**
     * Poll cloud agent status until completion
     * @param {Object} agent - Agent object
     * @param {Object} task - Task object
     * @param {string} queueName - 'context' or 'implementation'
     */
    async pollCloudAgentStatus(agent, task, queueName) {
        if (!agent.cloudAgentId) {
            return;
        }

        const checkStatus = async () => {
            try {
                const status = await this.getCloudAgentStatus(agent.cloudAgentId);
                
                if (status === 'FINISHED') {
                    this.handleAgentCompletion(agent, task, queueName);
                } else if (status === 'FAILED' || status === 'CANCELLED') {
                    this.handleAgentFailure(agent, task, queueName, `cloud agent ${status}`);
                } else if (status === 'RUNNING' || status === 'CREATING') {
                    // Continue polling
                    setTimeout(checkStatus, 10000); // Check every 10 seconds
                }
            } catch (error) {
                console.error(`❌ Error checking cloud agent status: ${error.message}`);
                setTimeout(checkStatus, 10000); // Retry
            }
        };

        // Start polling
        setTimeout(checkStatus, 5000); // First check after 5 seconds
    }

    /**
     * Get cloud agent status
     * @param {string} agentId - Cloud agent ID
     * @returns {Promise<string>} - Agent status
     */
    async getCloudAgentStatus(agentId) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.cursor.com',
                path: `/v0/agents/${agentId}`,
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${CONFIG.cursorApiKey}:`).toString('base64')}`
                }
            };

            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode === 200) {
                        const response = JSON.parse(data);
                        resolve(response.status);
                    } else {
                        reject(new Error(`API error: ${res.statusCode} - ${data}`));
                    }
                });
            });

            req.on('error', reject);
            req.end();
        });
    }

    /**
     * Handle agent completion
     * @param {Object} agent - Agent object
     * @param {Object} task - Task object
     * @param {string} queueName - 'context' or 'implementation'
     */
    handleAgentCompletion(agent, task, queueName) {
        console.log(`\n✅ ${agent.id} completed task: ${task.relativePath}`);

        // Update agent state
        agent.status = 'idle';
        agent.currentTask = null;
        agent.role = null;
        agent.completedTasks++;
        agent.pid = null;
        agent.cloudAgentId = null;

        // Mark task as completed
        this.completedTasks.add(task.relativePath);

        // If context gathering, move to implementation queue
        if (queueName === 'context') {
            // Update task file flag
            this.updateTaskFlag(task.path, 'context_gathered', true);
            this.queueManager.moveToImplementationQueue(task.path);
        }

        this.saveState();

        // Assign next task if available
        setTimeout(() => this.assignNextTask(), 1000);
    }

    /**
     * Log context gathering violation
     * @param {Object} task - Task object
     * @param {string} reason - Violation reason
     */
    logContextViolation(task, reason) {
        const gotchasPath = path.join(PROJECT_ROOT, 'Context', 'gotchas.md');
        const violationEntry = `\n## ${new Date().toISOString()} - Context Gathering Violation\n\n- Task: ${task.relativePath}\n- Reason: ${reason}\n- Action: Task blocked from implementation queue, routed to context queue\n`;
        
        if (fs.existsSync(gotchasPath)) {
            fs.appendFileSync(gotchasPath, violationEntry, 'utf8');
        } else {
            console.warn(`⚠️  Gotchas file not found, cannot log violation: ${gotchasPath}`);
        }
    }

    /**
     * Handle agent failure
     * @param {Object} agent - Agent object
     * @param {Object} task - Task object
     * @param {string} queueName - 'context' or 'implementation'
     * @param {string} reason - Failure reason
     */
    handleAgentFailure(agent, task, queueName, reason) {
        console.error(`\n❌ ${agent.id} failed: ${reason}`);

        // Mark agent as failed (will retry on next assignment)
        agent.status = 'idle';
        agent.currentTask = null;
        agent.role = null;
        agent.pid = null;
        agent.cloudAgentId = null;

        // Log to gotchas
        const gotchasPath = path.join(PROJECT_ROOT, 'Context', 'gotchas.md');
        const gotchaEntry = `\n## ${new Date().toISOString()} - Orchestrator Agent Failure\n\n- Agent: ${agent.id}\n- Task: ${task.relativePath}\n- Role: ${queueName}\n- Reason: ${reason}\n`;
        
        if (fs.existsSync(gotchasPath)) {
            fs.appendFileSync(gotchasPath, gotchaEntry, 'utf8');
        }

        this.saveState();

        // Retry assignment after delay
        setTimeout(() => this.assignNextTask(), 5000);
    }

    /**
     * Update task file frontmatter flag
     * @param {string} taskPath - Task file path
     * @param {string} flag - Flag name
     * @param {*} value - Flag value
     */
    updateTaskFlag(taskPath, flag, value) {
        try {
            const content = fs.readFileSync(taskPath, 'utf8');
            const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

            if (frontmatterMatch) {
                const yaml = require('js-yaml');
                const frontmatter = yaml.load(frontmatterMatch[1]);
                frontmatter[flag] = value;

                const newFrontmatter = yaml.dump(frontmatter, { lineWidth: -1 });
                const newContent = `---\n${newFrontmatter}---${content.slice(frontmatterMatch[0].length)}`;

                fs.writeFileSync(taskPath, newContent, 'utf8');
            }
        } catch (error) {
            console.error(`Failed to update task flag: ${error.message}`);
        }
    }

    /**
     * Run orchestrator main loop
     */
    run() {
        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`🤖 Agent Orchestrator Started`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

        this.isRunning = true;

        // Initial scan - check if queues are empty, if so, process all tasks
        const queueStatus = this.queueManager.getStatus();
        const totalQueued = queueStatus.contextQueue.length + queueStatus.implementationQueue.length;

        if (totalQueued === 0) {
            console.log(`📋 Queues are empty, scanning all tasks...\n`);
            const stats = this.queueManager.processAllTasks();
            console.log(`   Scanned: ${stats.scanned}, Routed: ${stats.routed}, Skipped: ${stats.skipped}\n`);
        } else {
            // Scan for new tasks from log
            const newTasks = this.queueManager.scanNewTasks();
            if (newTasks.length > 0) {
                console.log(`📋 Scanned ${newTasks.length} new task(s) from log\n`);
                newTasks.forEach(taskPath => {
                    this.queueManager.routeTask(taskPath);
                });
            }
        }

        // Start assignment loop
        this.assignmentLoop();

        // Status reporting
        this.statusReporting();
    }

    /**
     * Main assignment loop
     */
    assignmentLoop() {
        if (!this.isRunning) return;

        const interval = setInterval(() => {
            if (!this.isRunning) {
                clearInterval(interval);
                return;
            }

            // Scan for new tasks from log
            const newTasks = this.queueManager.scanNewTasks();
            if (newTasks.length > 0) {
                console.log(`\n📋 Found ${newTasks.length} new task(s) from log`);
                newTasks.forEach(taskPath => {
                    this.queueManager.routeTask(taskPath);
                });
            }

            // Check if queues are empty and process all tasks if needed
            const queueStatus = this.queueManager.getStatus();
            const totalQueued = queueStatus.contextQueue.length + queueStatus.implementationQueue.length;
            if (totalQueued === 0) {
                // Queues empty, do a full scan (but only once per interval to avoid spam)
                const stats = this.queueManager.processAllTasks();
                if (stats.routed > 0) {
                    console.log(`\n📋 Populated queues: ${stats.routed} task(s) routed`);
                }
            }

            // Try to assign tasks
            this.assignNextTask();
        }, CONFIG.queuePollInterval);
    }

    /**
     * Status reporting loop
     */
    statusReporting() {
        if (!this.isRunning) return;

        const interval = setInterval(() => {
            if (!this.isRunning) {
                clearInterval(interval);
                return;
            }

            const status = this.getStatus();
            console.log(`\n📊 Orchestrator Status:`);
            console.log(`  Agents Working: ${status.agents.filter(a => a.status === 'working').length}/${AGENT_POOL_SIZE}`);
            console.log(`  Context Queue: ${status.queues.contextQueue.length}`);
            console.log(`  Implementation Queue: ${status.queues.implementationQueue.length}\n`);
        }, CONFIG.statusReportInterval);
    }

    /**
     * Stop orchestrator
     */
    stop() {
        console.log('\n🛑 Stopping orchestrator...\n');
        this.isRunning = false;
        this.saveState();
    }

    /**
     * Get orchestrator status
     * @returns {Object} - Status object
     */
    getStatus() {
        const queueStatus = this.queueManager.getStatus();
        return {
            agents: this.agents.map(a => ({
                id: a.id,
                status: a.status,
                role: a.role,
                currentTask: a.currentTask ? path.basename(a.currentTask) : null,
                completedTasks: a.completedTasks
            })),
            queues: queueStatus
        };
    }
}

// CLI usage
if (require.main === module) {
    const orchestrator = new AgentOrchestrator();

    // Handle graceful shutdown
    process.on('SIGINT', () => {
        orchestrator.stop();
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        orchestrator.stop();
        process.exit(0);
    });

    orchestrator.run();
}

module.exports = AgentOrchestrator;

