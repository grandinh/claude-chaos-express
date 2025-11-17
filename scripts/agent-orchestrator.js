#!/usr/bin/env node

/**
 * Agent Orchestrator
 *
 * Manages agent pool and assigns tasks with load balancing.
 * Uses Cursor Cloud Agent API for task execution.
 *
 * @module agent-orchestrator
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');
const TaskQueueManager = require('./task-queue-manager');
const { detectProjectRoot } = require('./utils');

const PROJECT_ROOT = detectProjectRoot();
const ORCHESTRATOR_STATE = path.join(PROJECT_ROOT, 'sessions', 'tasks', '.orchestrator-state.json');
const AGENT_POOL_SIZE = 3;

// Log directory setup
const LOGS_DIR = path.join(PROJECT_ROOT, '.cursor', 'automation-logs');
if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
}
const ORCHESTRATOR_ERROR_LOG = path.join(LOGS_DIR, 'orchestrator-errors.log');

// Configuration
const CONFIG = {
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
                    cloudAgentId: null,
                    branchName: null
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
                cloudAgentId: a.cloudAgentId,
                branchName: a.branchName
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
        // Validate required cloud agent configuration
        if (!CONFIG.cursorApiKey) {
            console.error('❌ CURSOR_API_TOKEN not set. Cannot start orchestrator without cloud agent API key.');
            process.exit(1);
        }

        if (!CONFIG.githubRepo) {
            console.error('❌ GITHUB_REPO not set. Cannot start orchestrator without GitHub repository.');
            process.exit(1);
        }

        console.log(`\n🚀 Initializing Agent Pool (${AGENT_POOL_SIZE} agents)\n`);
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
        // 1. Get queue status for load balancing
        const queueStatus = this.queueManager.getStatus();
        const contextQueueLength = queueStatus.contextQueue.length;
        const implementationQueueLength = queueStatus.implementationQueue.length;
        const totalLength = contextQueueLength + implementationQueueLength;

        if (totalLength === 0) {
            return false;
        }

        // 2. Calculate context ratio for load balancing
        const contextRatio = totalLength > 0 ? contextQueueLength / totalLength : 0;

        // 3. Find next task from queue (task-first flow)
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

        // 4. Validate and enrich task before assignment
        const validationResult = this.validateTaskForSpawn(task, queueName);
        if (!validationResult.valid) {
            console.error(`❌ VALIDATION ERROR: ${validationResult.error}`);
            console.error(`   Action: Task ${task.relativePath || task.path} removed from ${queueName} queue`);
            // Remove invalid task from queue
            this.queueManager.removeFromQueue(task.path, queueName);
            return false;
        }

        // 5. Find available agent slot
        const availableAgent = this.agents.find(a => a.status === 'idle');
        if (!availableAgent) {
            return false;
        }

        // 6. Defensive check: prevent duplicate assignment (belt-and-suspenders)
        const alreadyAssigned = this.agents.some(a =>
            a.currentTask === task.path && a.status === 'working'
        );
        if (alreadyAssigned) {
            console.warn(`⚠️  Task ${task.relativePath} already assigned to another agent, skipping`);
            return false;
        }

        // 7. Assign task to agent
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
        // CRITICAL: Validate file exists before assignment
        if (!fs.existsSync(task.path)) {
            console.error(`❌ CRITICAL ERROR: Task file does not exist: ${task.path}`);
            console.error(`   Task: ${task.relativePath}`);
            console.error(`   Queue: ${queueName}`);
            console.error(`   Agent: ${agent.id}`);

            // Log to gotchas.md
            this.logFileValidationFailure(task, `File not found at assignment time in ${queueName} queue`);

            // Remove from queue to prevent re-assignment
            this.queueManager.removeFromQueue(task.path, queueName);

            // Return agent to idle state
            console.log(`↩️  Returning ${agent.id} to idle state (task file missing)`);
            
            // CRITICAL: Actually update agent state and persist it
            agent.status = 'idle';
            agent.currentTask = null;
            agent.role = null;
            this.saveState();
            
            return;
        }

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

        // Spawn cloud agent
        this.spawnCloudAgent(agent, task, queueName);
    }

    /**
     * Validate branch name for Git compatibility and uniqueness
     * @param {string} branchName - Proposed branch name
     * @returns {Object} - Validation result with valid flag and final branch name
     */
    validateBranchName(branchName) {
        // Git branch naming rules: no spaces, no special chars except -, _, /
        const gitBranchPattern = /^[a-zA-Z0-9._/-]+$/;
        
        if (!branchName || typeof branchName !== 'string') {
            return { valid: false, error: 'Branch name must be a non-empty string', branchName: null };
        }

        // Check Git validity
        if (!gitBranchPattern.test(branchName)) {
            return { 
                valid: false, 
                error: `Branch name contains invalid characters: ${branchName}`,
                branchName: null 
            };
        }

        // Check if branch already exists remotely
        try {
            const result = execSync(`git ls-remote --heads origin ${branchName}`, { 
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: PROJECT_ROOT
            });
            
            if (result.trim()) {
                // Branch exists, try to find unique suffix
                let suffix = 1;
                let uniqueBranchName = `${branchName}-${suffix}`;
                
                while (suffix < 100) { // Safety limit
                    const checkResult = execSync(`git ls-remote --heads origin ${uniqueBranchName}`, {
                        encoding: 'utf8',
                        stdio: ['pipe', 'pipe', 'pipe'],
                        cwd: PROJECT_ROOT
                    });
                    
                    if (!checkResult.trim()) {
                        // Found unique branch name
                        return { 
                            valid: true, 
                            error: null, 
                            branchName: uniqueBranchName,
                            wasModified: true
                        };
                    }
                    
                    suffix++;
                    uniqueBranchName = `${branchName}-${suffix}`;
                }
                
                return { 
                    valid: false, 
                    error: `Could not find unique branch name after 100 attempts`,
                    branchName: null 
                };
            }
        } catch (error) {
            // If git ls-remote fails (e.g., no remote, network issue), check local branches
            try {
                const localBranches = execSync('git branch --list', {
                    encoding: 'utf8',
                    stdio: ['pipe', 'pipe', 'pipe'],
                    cwd: PROJECT_ROOT
                });
                
                if (localBranches.includes(branchName)) {
                    // Branch exists locally, try to find unique suffix
                    let suffix = 1;
                    let uniqueBranchName = `${branchName}-${suffix}`;
                    
                    while (suffix < 100) {
                        if (!localBranches.includes(uniqueBranchName)) {
                            return { 
                                valid: true, 
                                error: null, 
                                branchName: uniqueBranchName,
                                wasModified: true
                            };
                        }
                        suffix++;
                        uniqueBranchName = `${branchName}-${suffix}`;
                    }
                }
            } catch (localError) {
                // If local check also fails, log warning but allow (might be in CI/CD without git)
                console.warn(`⚠️  Could not validate branch uniqueness: ${localError.message}`);
            }
        }

        return { valid: true, error: null, branchName: branchName, wasModified: false };
    }

    /**
     * Validate task before spawning cloud agent (pre-flight checks)
     * @param {Object} task - Task object
     * @param {string} queueName - 'context' or 'implementation'
     * @returns {Object} - Validation result with valid flag and error message
     */
    validateTaskForSpawn(task, queueName) {
        // Verify task file exists and is readable
        if (!task.path) {
            return { valid: false, error: 'Task path is missing' };
        }

        const taskPath = path.isAbsolute(task.path) ? task.path : path.join(PROJECT_ROOT, task.path);
        
        if (!fs.existsSync(taskPath)) {
            return { valid: false, error: `Task file does not exist: ${task.path}` };
        }

        try {
            // Verify task content is not empty
            const taskContent = fs.readFileSync(taskPath, 'utf8');
            if (!taskContent || taskContent.trim().length === 0) {
                return { valid: false, error: `Task file is empty: ${task.path}` };
            }

            // Parse and validate frontmatter
            const frontmatter = this.queueManager.parseFrontmatter(taskPath);
            if (!frontmatter) {
                return { valid: false, error: `Task file has invalid or missing frontmatter: ${task.path}` };
            }

            // Enrich task object with frontmatter data if missing
            if (!task.branch && frontmatter.branch) {
                task.branch = frontmatter.branch;
            }
            if (!task.priority && frontmatter.priority) {
                task.priority = frontmatter.priority;
            }
            if (!task.leverage && frontmatter.leverage) {
                task.leverage = frontmatter.leverage;
            }
            if (!task.dependsOn && frontmatter.depends_on) {
                task.dependsOn = frontmatter.depends_on;
            }

            // Check required config
            if (!CONFIG.cursorApiKey) {
                return { valid: false, error: 'CURSOR_API_TOKEN not set' };
            }

            if (!CONFIG.githubRepo) {
                return { valid: false, error: 'GITHUB_REPO not set' };
            }

            // Validate branch name
            const taskName = task.name || path.basename(task.path, '.md');
            const proposedBranch = task.branch || `feature/${taskName.replace(/[^a-z0-9-]/gi, '-').toLowerCase()}`;
            const branchValidation = this.validateBranchName(proposedBranch);
            
            if (!branchValidation.valid) {
                return { valid: false, error: `Branch validation failed: ${branchValidation.error}` };
            }

            // Store validated branch name in task for later use
            task.validatedBranch = branchValidation.branchName;

            return { valid: true, error: null };
        } catch (error) {
            return { valid: false, error: `Error reading task file: ${error.message}` };
        }
    }

    async spawnCloudAgent(agent, task, queueName) {
        // FAIL-FAST: Final validation before spawning
        if (!fs.existsSync(task.path)) {
            console.error(`❌ FAIL-FAST: Task file disappeared before cloud agent spawn: ${task.path}`);
            this.logFileValidationFailure(task, `File disappeared between assignment and cloud spawn`);

            // Return agent to idle state
            agent.status = 'idle';
            agent.currentTask = null;
            agent.role = null;
            this.saveState();
            return;
        }

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
        
        // Parse frontmatter to get metadata
        const frontmatter = this.queueManager.parseFrontmatter(taskPath);
        const priority = task.priority || frontmatter?.priority || 'medium';
        const leverage = task.leverage || frontmatter?.leverage || 'medium';
        const dependsOn = task.dependsOn || frontmatter?.depends_on || [];
        const dependsOnList = Array.isArray(dependsOn) ? dependsOn.join(', ') : (dependsOn || 'none');
        
        // Use validated branch name from pre-flight validation
        const branchName = task.validatedBranch || task.branch || `feature/${taskName.replace(/[^a-z0-9-]/gi, '-').toLowerCase()}`;
        
        // Store branch name in agent state for later fetch
        agent.branchName = branchName;
        
        // Generate enriched prompt with full task content and metadata
        let promptText;
        if (queueName === 'context') {
            promptText = `Gather context for task: ${taskName}

**Task Metadata:**
- Priority: ${priority}
- Leverage: ${leverage}
- Dependencies: ${dependsOnList}
- Task File: ${task.path}

**Task Content:**
\`\`\`markdown
${taskContent}
\`\`\`

**Instructions:**
Create a comprehensive "Context Manifest" section in the task file. Document:
- Current system state
- Relevant files and patterns
- Dependencies and integration points
- Technical constraints

After gathering context, update the task file frontmatter: \`context_gathered: true\``;
        } else {
            promptText = `Implement task: ${taskName}

**Task Metadata:**
- Priority: ${priority}
- Leverage: ${leverage}
- Dependencies: ${dependsOnList}
- Task File: ${task.path}

**Task Content:**
\`\`\`markdown
${taskContent}
\`\`\`

**Instructions:**
Read the task file content above and implement all todos. Ensure \`context_gathered\` is true before starting implementation.`;
        }

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
                const response = await this.getCloudAgentStatus(agent.cloudAgentId);
                const status = response.status;
                
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
     * @returns {Promise<Object>} - Full agent response object
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
                        resolve(response);
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
     * Validate git configuration
     * @returns {boolean} - True if git is properly configured
     */
    validateGitConfig() {
        try {
            // Check if we're in a git repository
            execSync('git rev-parse --git-dir', { 
                cwd: PROJECT_ROOT, 
                stdio: 'ignore' 
            });
            
            // Check if origin remote exists
            const remotes = execSync('git remote', { 
                cwd: PROJECT_ROOT, 
                encoding: 'utf8' 
            });
            
            if (!remotes.includes('origin')) {
                console.error('❌ Git remote "origin" not found');
                return false;
            }
            
            // Verify origin points to correct repo
            const originUrl = execSync('git remote get-url origin', { 
                cwd: PROJECT_ROOT, 
                encoding: 'utf8' 
            }).trim();
            
            const expectedRepo = CONFIG.githubRepo.replace('.git', '').replace('https://github.com/', '');
            if (!originUrl.includes(expectedRepo)) {
                console.warn(`⚠️  Git origin URL (${originUrl}) may not match configured repo (${CONFIG.githubRepo})`);
            }
            
            return true;
        } catch (error) {
            console.error(`❌ Git validation failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Fetch agent branch and checkout task file
     * @param {string} cloudAgentId - Cloud agent ID
     * @param {string} branchName - Branch name to fetch
     * @param {string} taskPath - Path to task file to checkout
     * @returns {Promise<boolean>} - Success status
     */
    async fetchAgentBranch(cloudAgentId, branchName, taskPath) {
        if (!branchName) {
            console.error(`❌ Cannot fetch branch: branch name not available for agent ${cloudAgentId}`);
            return false;
        }

        // Validate git configuration
        if (!this.validateGitConfig()) {
            console.error(`❌ Git not properly configured. Cannot fetch branch ${branchName}`);
            return false;
        }

        const maxRetries = 2;
        let lastError = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`📥 Fetching branch ${branchName} from origin (attempt ${attempt}/${maxRetries})...`);
                
                // Fetch the branch from origin
                execSync(`git fetch origin ${branchName}`, {
                    cwd: PROJECT_ROOT,
                    stdio: 'pipe',
                    timeout: 30000 // 30 second timeout
                });

                // Get relative path from project root for git checkout
                const relativeTaskPath = path.relative(PROJECT_ROOT, taskPath);
                
                console.log(`📋 Checking out ${relativeTaskPath} from branch ${branchName}...`);
                
                // Checkout specific file from that branch
                execSync(`git checkout origin/${branchName} -- ${relativeTaskPath}`, {
                    cwd: PROJECT_ROOT,
                    stdio: 'pipe',
                    timeout: 30000
                });

                // Validate Context Manifest exists after fetch
                const hasContextManifest = this.queueManager.validateContextManifest(taskPath);
                if (!hasContextManifest) {
                    console.warn(`⚠️  Context Manifest not found in ${relativeTaskPath} after fetch`);
                    console.warn(`   The agent may not have written the Context Manifest to the branch`);
                    return false;
                }

                console.log(`✅ Successfully fetched and merged Context Manifest from branch ${branchName}`);
                return true;

            } catch (error) {
                lastError = error;
                const errorMsg = error.message || error.toString();
                
                if (attempt < maxRetries) {
                    console.warn(`⚠️  Fetch attempt ${attempt} failed: ${errorMsg}`);
                    console.warn(`   Retrying in 5 seconds...`);
                    await new Promise(resolve => setTimeout(resolve, 5000));
                } else {
                    console.error(`❌ Failed to fetch branch ${branchName} after ${maxRetries} attempts`);
                    console.error(`   Last error: ${errorMsg}`);
                }
            }
        }

        return false;
    }

    /**
     * Handle agent completion
     * @param {Object} agent - Agent object
     * @param {Object} task - Task object
     * @param {string} queueName - 'context' or 'implementation'
     */
    async handleAgentCompletion(agent, task, queueName) {
        console.log(`\n✅ ${agent.id} completed task: ${task.relativePath}`);

        // Store values before clearing agent state (needed for context gathering fetch)
        const cloudAgentId = agent.cloudAgentId;
        const branchName = agent.branchName;

        // Update agent state
        agent.status = 'idle';
        agent.currentTask = null;
        agent.role = null;
        agent.completedTasks++;
        agent.pid = null;
        agent.cloudAgentId = null;
        agent.branchName = null;

        // Mark task as completed
        this.completedTasks.add(task.relativePath);

        // If context gathering, fetch branch and get Context Manifest before updating flag
        if (queueName === 'context') {
            // Get branch name from stored value or API response
            let finalBranchName = branchName;
            
            // If branch name not in state, try to get it from API response
            if (!finalBranchName && cloudAgentId) {
                try {
                    const agentStatus = await this.getCloudAgentStatus(cloudAgentId);
                    finalBranchName = agentStatus.target?.branchName;
                } catch (error) {
                    console.warn(`⚠️  Could not get branch name from API: ${error.message}`);
                }
            }

            // Fetch branch and checkout task file
            if (finalBranchName) {
                const fetchSuccess = await this.fetchAgentBranch(cloudAgentId, finalBranchName, task.path);
                
                if (!fetchSuccess) {
                    console.error(`❌ Failed to fetch Context Manifest for ${task.relativePath}`);
                    console.error(`   Task will remain in context queue for retry`);
                    
                    // Route back to context queue for retry
                    this.queueManager.routeTask(task.path);
                    this.saveState();
                    setTimeout(() => this.assignNextTask(), 1000);
                    return;
                }
            } else {
                console.warn(`⚠️  Branch name not available for ${task.relativePath}`);
                console.warn(`   Cannot fetch Context Manifest. Task will remain in context queue.`);
                
                // Route back to context queue
                this.queueManager.routeTask(task.path);
                this.saveState();
                setTimeout(() => this.assignNextTask(), 1000);
                return;
            }

            // Update task file flag
            this.updateTaskFlag(task.path, 'context_gathered', true);
            // Re-route task to implementation queue (since it was removed from context queue on assignment)
            // moveToImplementationQueue expects task to be in context queue, so use routeTask instead
            this.queueManager.routeTask(task.path, true); // skipValidation since we just set context_gathered=true
        } else if (queueName === 'implementation') {
            // Implementation task completed - run full completion protocol
            console.log(`\n📋 Starting task completion protocol for: ${task.relativePath}`);
            await this.runTaskCompletionProtocol(task, cloudAgentId, branchName);
        }

        this.saveState();

        // Assign next task if available
        setTimeout(() => this.assignNextTask(), 1000);
    }

    /**
     * Run full task completion protocol per cc-sessions
     * @param {Object} task - Task object
     * @param {string} cloudAgentId - Cloud agent ID that completed the task
     * @param {string} branchName - Branch name used by the agent
     */
    async runTaskCompletionProtocol(task, cloudAgentId, branchName) {
        const taskPath = path.isAbsolute(task.path) ? task.path : path.join(PROJECT_ROOT, task.path);
        
        try {
            // 1. Pre-Completion Checks
            console.log(`\n[STATUS: Pre-Completion Checks]`);
            const preCheckResult = await this.performPreCompletionChecks(taskPath);
            if (!preCheckResult.ready) {
                console.error(`❌ Pre-completion checks failed: ${preCheckResult.reason}`);
                console.error(`   Task will not be marked complete. Please address remaining work.`);
                return;
            }
            console.log(`✓ All success criteria checked off in task file`);
            console.log(`✓ No unaddressed work remaining`);
            console.log(`Ready to proceed with task completion.\n`);

            // 2-4. Run Completion Agents
            console.log(`[STATUS: Running Completion Agents]`);
            
            // 2. Code Review Agent
            console.log(`[RUNNING: Code Review Agent]`);
            await this.runCodeReviewAgent(task, cloudAgentId, branchName);
            
            // 3. Service Documentation Agent
            console.log(`[RUNNING: Service-Documentation Agent]`);
            await this.runServiceDocumentationAgent(task, cloudAgentId, branchName);
            
            // 4. Logging Agent
            console.log(`[RUNNING: Logging Agent]`);
            await this.runLoggingAgent(task, cloudAgentId, branchName);
            
            console.log(`✓ All completion agents finished\n`);

            // 5. Update Index Files
            console.log(`[STATUS: Updating Index Files]`);
            await this.updateTaskIndexes(task);

            // 6. Task Archival
            console.log(`[STATUS: Archiving Task]`);
            await this.archiveTask(task);

            // 7. Git Operations
            console.log(`[STATUS: Git Operations]`);
            await this.performGitOperations(task, branchName);

            console.log(`\n✅ Task completion protocol finished for: ${task.relativePath}`);
        } catch (error) {
            console.error(`❌ Error in task completion protocol: ${error.message}`);
            console.error(`   Task completion may be incomplete. Please review manually.`);
        }
    }

    /**
     * Perform pre-completion checks
     * @param {string} taskPath - Path to task file
     * @returns {Promise<Object>} - Check result with ready flag and reason
     */
    async performPreCompletionChecks(taskPath) {
        try {
            const taskContent = fs.readFileSync(taskPath, 'utf8');
            
            // Check for success criteria - look for unchecked boxes
            const uncheckedCriteria = taskContent.match(/^-\s+\[ \]\s+/gm);
            if (uncheckedCriteria && uncheckedCriteria.length > 0) {
                return { 
                    ready: false, 
                    reason: `Found ${uncheckedCriteria.length} unchecked success criteria` 
                };
            }

            // Check for TODO markers that might indicate unaddressed work
            const todoMarkers = taskContent.match(/TODO|FIXME|XXX/gi);
            if (todoMarkers && todoMarkers.length > 0) {
                // Allow some TODOs if they're in completed sections or notes
                const contextManifestMatch = taskContent.match(/## Context Manifest[\s\S]*?##/);
                const workLogMatch = taskContent.match(/## Work Log[\s\S]*?##/);
                // If TODOs are only in context/work log, that's okay
                // But if they're in main sections, flag it
                const mainSectionMatch = taskContent.match(/## (Problem|Goal|Success Criteria|Implementation)[\s\S]*?##/);
                if (mainSectionMatch) {
                    return { 
                        ready: false, 
                        reason: `Found TODO/FIXME markers in main task sections` 
                    };
                }
            }

            return { ready: true, reason: null };
        } catch (error) {
            return { ready: false, reason: `Error reading task file: ${error.message}` };
        }
    }

    /**
     * Run code review agent via cloud agent
     * @param {Object} task - Task object
     * @param {string} cloudAgentId - Original cloud agent ID
     * @param {string} branchName - Branch name
     */
    async runCodeReviewAgent(task, cloudAgentId, branchName) {
        const taskPath = path.isAbsolute(task.path) ? task.path : path.join(PROJECT_ROOT, task.path);
        const taskContent = fs.readFileSync(taskPath, 'utf8');
        const taskName = task.name || path.basename(task.path, '.md');

        // Get agent status to see what files were changed
        let changedFiles = [];
        let summary = '';
        try {
            const agentStatus = await this.getCloudAgentStatus(cloudAgentId);
            summary = agentStatus.summary || '';
            // Try to get PR URL to identify changed files
            if (agentStatus.target?.prUrl) {
                // Note: We can't easily get changed files from API, so we'll ask agent to review the branch
                changedFiles = [`Branch: ${branchName}`];
            }
        } catch (error) {
            console.warn(`⚠️  Could not get agent status for code review: ${error.message}`);
        }

        const promptText = `Review code changes for completed task: ${taskName}

**Task Context:**
\`\`\`markdown
${taskContent}
\`\`\`

**Implementation Summary:**
${summary || 'See branch changes'}

**Branch:** ${branchName}

**Instructions:**
Review all implemented code for security, quality, and best practices. Focus on:
- Security vulnerabilities and threat model (consider actual environment context)
- Code quality and maintainability
- Error handling and edge cases
- Performance considerations
- Testing coverage

After review, report findings using this format:

[FINDINGS: Code Review]
Critical Issues:
□ [None found / Description]

Warnings:
□ [Description]

Suggestions:
□ [Optional improvements]

Note: This is a code review task. Review the branch changes and provide actionable feedback.`;

        // Spawn code review cloud agent
        await this.spawnCompletionAgent('code-review', task, branchName, promptText);
    }

    /**
     * Run service documentation agent via cloud agent
     * @param {Object} task - Task object
     * @param {string} cloudAgentId - Original cloud agent ID
     * @param {string} branchName - Branch name
     */
    async runServiceDocumentationAgent(task, cloudAgentId, branchName) {
        const taskPath = path.isAbsolute(task.path) ? task.path : path.join(PROJECT_ROOT, task.path);
        const taskContent = fs.readFileSync(taskPath, 'utf8');
        const taskName = task.name || path.basename(task.path, '.md');

        const promptText = `Update service documentation for completed task: ${taskName}

**Task Context:**
\`\`\`markdown
${taskContent}
\`\`\`

**Branch:** ${branchName}

**Instructions:**
Update CLAUDE.md files and module documentation to reflect current implementation. Focus on:
- Services modified during this task
- API changes or new endpoints
- Configuration updates
- Architectural modifications
- New features or deprecations

Review the branch changes and update relevant documentation files.`;

        // Spawn service documentation cloud agent
        await this.spawnCompletionAgent('service-documentation', task, branchName, promptText);
    }

    /**
     * Run logging agent via cloud agent
     * @param {Object} task - Task object
     * @param {string} cloudAgentId - Original cloud agent ID
     * @param {string} branchName - Branch name
     */
    async runLoggingAgent(task, cloudAgentId, branchName) {
        const taskPath = path.isAbsolute(task.path) ? task.path : path.join(PROJECT_ROOT, task.path);
        const taskContent = fs.readFileSync(taskPath, 'utf8');
        const taskName = task.name || path.basename(task.path, '.md');

        const promptText = `Finalize task documentation for completed task: ${taskName}

**Task File:** ${task.path}

**Task Content:**
\`\`\`markdown
${taskContent}
\`\`\`

**Branch:** ${branchName}

**Instructions:**
Consolidate and organize work logs into the task's Work Log section. Update:
- Success Criteria checkboxes based on work completed
- Work Log with consolidated entries from this session
- Remove outdated information and redundant entries
- Update Next Steps to reflect current state
- Clean up Context Manifest if needed

Maintain strict chronological order and preserve important decisions.`;

        // Spawn logging cloud agent
        await this.spawnCompletionAgent('logging', task, branchName, promptText);
    }

    /**
     * Spawn a completion agent (code-review, service-documentation, or logging)
     * @param {string} agentType - Type of completion agent
     * @param {Object} task - Task object
     * @param {string} branchName - Branch name
     * @param {string} promptText - Prompt for the agent
     */
    async spawnCompletionAgent(agentType, task, branchName, promptText) {
        const taskName = task.name || path.basename(task.path, '.md');
        const completionBranchName = `${branchName}-${agentType}`;

        const requestData = JSON.stringify({
            prompt: {
                text: promptText
            },
            source: {
                repository: CONFIG.githubRepo,
                ref: branchName // Review the implementation branch
            },
            target: {
                branchName: completionBranchName,
                autoCreatePr: false, // Completion agents work on separate branches
                openAsCursorGithubApp: false,
                skipReviewerRequest: true
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

            console.log(`  ✓ ${agentType} agent spawned: ${cloudAgentId}`);
            // Note: We don't wait for completion agents to finish - they run asynchronously
            // The main task completion continues
        } catch (error) {
            console.error(`  ❌ Failed to spawn ${agentType} agent: ${error.message}`);
            // Continue with completion protocol even if agent spawn fails
        }
    }

    /**
     * Update task indexes if task is listed
     * @param {Object} task - Task object
     */
    async updateTaskIndexes(task) {
        const indexesDir = path.join(PROJECT_ROOT, 'sessions', 'tasks', 'indexes');
        if (!fs.existsSync(indexesDir)) {
            return; // No indexes to update
        }

        const indexFiles = fs.readdirSync(indexesDir).filter(f => f.endsWith('.md'));
        const taskFileName = path.basename(task.path);

        for (const indexFile of indexFiles) {
            const indexPath = path.join(indexesDir, indexFile);
            try {
                let indexContent = fs.readFileSync(indexPath, 'utf8');
                let updated = false;

                // Look for task in "Active Tasks" sections
                const activeTasksRegex = /(## Active Tasks[\s\S]*?)(### [^\n]+[\s\S]*?)(?=##|$)/g;
                let match;
                while ((match = activeTasksRegex.exec(indexContent)) !== null) {
                    const sectionContent = match[2];
                    if (sectionContent.includes(taskFileName)) {
                        // Move task entry to Completed Tasks
                        const taskEntryMatch = sectionContent.match(new RegExp(`\\\`${taskFileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\\`[^\n]*`, 'g'));
                        if (taskEntryMatch) {
                            const taskEntry = taskEntryMatch[0];
                            // Remove from active section
                            indexContent = indexContent.replace(taskEntry + '\n', '');
                            // Add to completed section
                            if (indexContent.includes('## Completed Tasks')) {
                                indexContent = indexContent.replace(
                                    /(## Completed Tasks[\s\S]*?)(?=##|$)/,
                                    `$1${taskEntry}\n`
                                );
                            } else {
                                indexContent += `\n## Completed Tasks\n\n${taskEntry}\n`;
                            }
                            updated = true;
                        }
                    }
                }

                if (updated) {
                    fs.writeFileSync(indexPath, indexContent, 'utf8');
                    console.log(`  ✓ Updated index: ${indexFile}`);
                }
            } catch (error) {
                console.warn(`  ⚠️  Error updating index ${indexFile}: ${error.message}`);
            }
        }
    }

    /**
     * Archive task by updating status and moving to done/
     * @param {Object} task - Task object
     */
    async archiveTask(task) {
        const taskPath = path.isAbsolute(task.path) ? task.path : path.join(PROJECT_ROOT, task.path);
        const tasksDir = path.dirname(taskPath);
        const doneDir = path.join(tasksDir, 'done');
        
        // Ensure done/ directory exists
        if (!fs.existsSync(doneDir)) {
            fs.mkdirSync(doneDir, { recursive: true });
        }

        // Update task file status to 'completed'
        try {
            let taskContent = fs.readFileSync(taskPath, 'utf8');
            
            // Update status in frontmatter
            taskContent = taskContent.replace(
                /(^---[\s\S]*?status:\s*)([^\n]+)/m,
                `$1completed`
            );

            // Write updated content
            fs.writeFileSync(taskPath, taskContent, 'utf8');
            
            // Move to done/ directory
            const taskFileName = path.basename(taskPath);
            const donePath = path.join(doneDir, taskFileName);
            fs.renameSync(taskPath, donePath);
            
            console.log(`  ✓ Task archived to: done/${taskFileName}`);
        } catch (error) {
            console.error(`  ❌ Error archiving task: ${error.message}`);
            throw error;
        }
    }

    /**
     * Perform git operations (commit and optionally merge)
     * @param {Object} task - Task object
     * @param {string} branchName - Branch name
     */
    async performGitOperations(task, branchName) {
        if (!this.validateGitConfig()) {
            console.warn(`  ⚠️  Git not configured, skipping git operations`);
            return;
        }

        try {
            // Stage all changes (including archived task file)
            execSync('git add -A', {
                cwd: PROJECT_ROOT,
                stdio: 'pipe'
            });

            // Commit changes
            const taskFileName = path.basename(task.path);
            const commitMessage = `Complete task: ${task.relativePath || taskFileName}\n\nTask completed and archived to done/`;
            
            execSync(`git commit -m "${commitMessage}"`, {
                cwd: PROJECT_ROOT,
                stdio: 'pipe'
            });

            console.log(`  ✓ Changes committed`);

            // Note: Auto-merge is handled by the cloud agent's autoCreatePr setting
            // The PR was already created when the agent finished
            console.log(`  ✓ Pull request available for review`);
        } catch (error) {
            console.error(`  ❌ Error in git operations: ${error.message}`);
            // Don't throw - git errors shouldn't block completion
        }
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
     * Log file validation failure to gotchas.md
     * @param {Object} task - Task object
     * @param {string} reason - Validation failure reason
     */
    logFileValidationFailure(task, reason) {
        const gotchasPath = path.join(PROJECT_ROOT, 'Context', 'gotchas.md');
        const failureEntry = `\n## ${new Date().toISOString()} - File Validation Failure\n\n- Task: ${task.relativePath}\n- Path: ${task.path}\n- Reason: ${reason}\n- Action: Task removed from queue, agent returned to idle\n- Recommendation: Check if file was moved, renamed, or deleted. Remove stale references from logs.\n`;

        if (fs.existsSync(gotchasPath)) {
            fs.appendFileSync(gotchasPath, failureEntry, 'utf8');
        } else {
            console.warn(`⚠️  Gotchas file not found, cannot log failure: ${gotchasPath}`);
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
        agent.branchName = null;

        // Log to orchestrator error log file
        const logEntry = `[${new Date().toISOString()}] Orchestrator Agent Failure\n  Agent: ${agent.id}\n  Task: ${task.relativePath}\n  Role: ${queueName}\n  Reason: ${reason}\n\n`;
        try {
            fs.appendFileSync(ORCHESTRATOR_ERROR_LOG, logEntry, 'utf8');
        } catch (error) {
            console.error(`Failed to write to orchestrator error log: ${error.message}`);
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
                // SECURITY: Use SAFE_SCHEMA to prevent arbitrary code execution from malicious YAML
                const frontmatter = yaml.load(frontmatterMatch[1], { schema: yaml.SAFE_SCHEMA });
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

        // CRITICAL: Validate queues at startup to remove invalid references
        const validationStats = this.queueManager.validateQueues();
        if (validationStats.systemicIssue) {
            console.error('❌ CRITICAL: More than 10% of queued tasks are invalid.');
            console.error('   This indicates a systemic problem with task management.');
            console.error('   Please investigate and consider rebuilding queues.');
            console.error('\n   To rebuild queues from scratch:');
            console.error('   1. Backup: cp sessions/tasks/.task-queues.json sessions/tasks/.task-queues.json.backup');
            console.error('   2. Delete: rm sessions/tasks/.task-queues.json');
            console.error('   3. Restart: npm run orchestrator\n');
            process.exit(1);
        }

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

