#!/usr/bin/env node

/**
 * Agent Registry Management CLI
 *
 * Commands:
 * - sync: Scan .claude/agents/ and update registry
 * - check <agent-name>: Check for duplicates before creation
 * - create claude --name <name> --category <cat>: Create new Claude agent
 * - create cloud --name <name> --trigger <type>: Create new Cloud Agent
 * - link <claude-agent> <cloud-agent>: Link agents
 * - warn <agent> --reason <reason>: Deprecate agent (30-day grace period)
 * - archive <agent>: Archive agent after grace period
 * - deprecate <agent> --reason <reason>: Alias for warn (backward compatibility)
 * - generate-docs: Regenerate documentation from registry
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const yaml = require('js-yaml');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

// Paths
const REPO_ROOT = path.resolve(__dirname, '..');
const REGISTRY_PATH = path.join(REPO_ROOT, 'repo_state', 'agent-registry.json');
const SCHEMA_PATH = path.join(REPO_ROOT, 'repo_state', 'agent-registry-schema.json');
const CLAUDE_AGENTS_DIR = path.join(REPO_ROOT, '.claude', 'agents');
const CLOUD_AGENTS_DIR = path.join(REPO_ROOT, '.cursor', 'cloud-agents');
const ARCHIVE_DIR = path.join(CLAUDE_AGENTS_DIR, 'archive');
const SKILL_RULES_BASE_PATH = path.join(REPO_ROOT, '.claude', 'skills', 'skill-rules.json');
const SKILL_RULES_GENERATED_PATH = path.join(REPO_ROOT, '.claude', 'skills', 'skill-rules.generated.json');
const AGENT_AUDIT_DOC_PATH = path.join(REPO_ROOT, 'docs', 'agent-system-audit.md');
const AGENT_ALIGNMENT_DOC_PATH = path.join(REPO_ROOT, 'docs', 'claude-cursor-agent-alignment.md');

// Documentation generation constants
// Truncate agent descriptions in catalog table to fit table width while preserving readability
const MAX_CATALOG_DESCRIPTION_LENGTH = 80;
const MAX_TRIGGERS_PER_SKILL = 100; // Limit skill trigger count to prevent bloat

// Initialize schema validator (compile once)
let schemaValidator = null;
try {
  const schemaContent = fs.readFileSync(SCHEMA_PATH, 'utf8');
  const schema = JSON.parse(schemaContent);
  const ajv = new Ajv({ allErrors: true, verbose: true });
  addFormats(ajv);
  schemaValidator = ajv.compile(schema);
} catch (err) {
  console.error(`Failed to load schema: ${err.message}`);
  process.exit(1);
}

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  log(`✗ ${message}`, 'red');
}

function success(message) {
  log(`✓ ${message}`, 'green');
}

function warning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ ${message}`, 'cyan');
}

// Normalize and deduplicate strings with lowercasing and trimming
function normalizeStringArray(items, limit = 40) {
  const normalized = items
    .map(s => (s || '').toString().toLowerCase().trim())
    .filter(Boolean);
  const unique = Array.from(new Set(normalized));
  return unique.slice(0, limit);
}

// Validate agent name
function validateAgentName(name, source = 'command') {
  if (!name) {
    error('Agent name is required');
    process.exit(1);
  }

  // Check max length
  if (name.length > 64) {
    error(`Agent name too long (max 64 chars): '${name}' (${name.length} chars)`);
    process.exit(1);
  }

  // Check kebab-case format (no leading/trailing hyphens)
  const kebabPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  if (!kebabPattern.test(name)) {
    error(`Invalid agent name: '${name}'`);
    console.log('');
    console.log('Agent names must be:');
    console.log('  - Lowercase letters (a-z)');
    console.log('  - Numbers (0-9)');
    console.log('  - Hyphens (-) to separate words');
    console.log('  - No leading or trailing hyphens');
    console.log('  - Max 64 characters');
    console.log('');
    console.log('Valid examples: my-agent, code-review-expert, test-runner-2');
    console.log(`Invalid: ${name}`);
    console.log('');
    process.exit(1);
  }

  return name;
}

// Load registry
function loadRegistry() {
  if (!fs.existsSync(REGISTRY_PATH)) {
    error(`Registry not found at ${REGISTRY_PATH}`);
    process.exit(1);
  }

  try {
    const content = fs.readFileSync(REGISTRY_PATH, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    error(`Failed to parse registry: ${err.message}`);
    process.exit(1);
  }
}

// Validate registry against schema
function validateRegistry(registry) {
  if (!schemaValidator) {
    error('Schema validator not initialized');
    process.exit(1);
  }

  const valid = schemaValidator(registry);

  if (!valid) {
    error('Registry validation failed:');
    console.log('');

    schemaValidator.errors.forEach((err, index) => {
      // Extract agent ID from path if available
      const pathMatch = err.instancePath.match(/\/agents\/(\d+)/);
      const agentIndex = pathMatch ? parseInt(pathMatch[1]) : null;
      const agentId = agentIndex !== null && registry.agents[agentIndex]
        ? registry.agents[agentIndex].id
        : 'unknown';

      error(`  [${index + 1}] Agent '${agentId}' at ${err.instancePath || 'root'}: ${err.message}`);
      if (err.params && Object.keys(err.params).length > 0) {
        console.log(`      Params: ${JSON.stringify(err.params)}`);
      }
    });

    console.log('');
    process.exit(1);
  }
}

// Save registry
function saveRegistry(registry) {
  // Validate before saving
  validateRegistry(registry);

  try {
    const content = JSON.stringify(registry, null, 2);
    fs.writeFileSync(REGISTRY_PATH, content, 'utf8');
    success('Registry saved successfully');
  } catch (err) {
    error(`Failed to save registry: ${err.message}`);
    process.exit(1);
  }
}

// Parse frontmatter from agent file
function parseFrontmatter(content) {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return null;
  }

  // Use js-yaml for robust YAML parsing
  let frontmatter;
  try {
    frontmatter = yaml.load(match[1]);
  } catch (err) {
    // Return null on parse error (caller will handle)
    return null;
  }

  // Ensure frontmatter is an object
  if (!frontmatter || typeof frontmatter !== 'object') {
    return null;
  }

  // Normalize tools field to array (for backward compatibility)
  if (frontmatter.tools) {
    if (typeof frontmatter.tools === 'string') {
      // Handle comma-separated string: "Read, Write, Edit"
      frontmatter.tools = frontmatter.tools.split(',').map(s => s.trim()).filter(Boolean);
    } else if (!Array.isArray(frontmatter.tools)) {
      // Convert single value to array
      frontmatter.tools = [frontmatter.tools];
    }
  }

  return frontmatter;
}

// Extract description from agent file content
function extractDescription(content) {
  // Look for first paragraph after frontmatter
  const withoutFrontmatter = content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
  const firstParagraph = withoutFrontmatter.split('\n\n')[0];

  // Clean up markdown formatting
  return firstParagraph
    .replace(/^#+\s+/, '') // Remove headers
    .replace(/\*\*/g, '') // Remove bold
    .replace(/\*/g, '') // Remove italic
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove links
    .trim()
    .substring(0, 200); // Limit length
}

// Command: sync
function cmdSync(options = {}) {
  const dryRun = options.check || false;

  if (dryRun) {
    info('Running sync in dry-run mode (--check)...');
  } else {
    info('Syncing registry with .claude/agents/...');
  }

  const registry = loadRegistry();
  const errors = [];
  const warnings = [];
  let scannedCount = 0;
  let addedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  // Ensure agents directory exists
  if (!fs.existsSync(CLAUDE_AGENTS_DIR)) {
    error(`Claude agents directory not found: ${CLAUDE_AGENTS_DIR}`);
    process.exit(1);
  }

  // Scan for agent files
  const files = fs.readdirSync(CLAUDE_AGENTS_DIR)
    .filter(f => f.endsWith('.md') && !f.startsWith('.'));

  info(`Found ${files.length} agent files to scan`);

  // High-potential automation candidates (from alignment doc)
  const automationCandidates = [
    'service-documentation',
    'check-code-debt',
    'check-accessibility',
    'check-modern-code',
    'commit-changes',
    'code-review-expert'
  ];

  for (const file of files) {
    scannedCount++;
    const filePath = path.join(CLAUDE_AGENTS_DIR, file);
    const relativeFilePath = path.relative(REPO_ROOT, filePath);

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const frontmatter = parseFrontmatter(content);

      if (!frontmatter) {
        warnings.push(`${file}: No frontmatter found`);
        skippedCount++;
        continue;
      }

      if (!frontmatter.name) {
        warnings.push(`${file}: Missing 'name' field in frontmatter`);
        skippedCount++;
        continue;
      }

      const id = frontmatter.name;
      const existingAgent = registry.agents.find(a => a.id === id);

      const agentData = {
        id,
        name: frontmatter.name,
        type: 'claude',
        filePath: relativeFilePath,
        category: frontmatter.category || 'uncategorized',
        description: extractDescription(content),
        tools: frontmatter.tools || [],
        model: frontmatter.model || null,
        cloudAgentId: existingAgent?.cloudAgentId || null,
        automationCandidate: automationCandidates.includes(id),
        deprecated: false,
        deprecatedAt: null,
        deprecationReason: null
      };

      if (existingAgent) {
        // Update existing agent (preserve cloudAgentId and run data)
        Object.assign(existingAgent, agentData);
        updatedCount++;
      } else {
        // Add new agent
        registry.agents.push(agentData);
        addedCount++;
      }

    } catch (err) {
      errors.push(`${file}: ${err.message}`);
      skippedCount++;
    }
  }

  // Update metadata
  registry.metadata.lastSyncAt = new Date().toISOString();
  registry.metadata.totalAgents = registry.agents.length;
  registry.metadata.claudeAgents = registry.agents.filter(a => a.type === 'claude').length;
  registry.metadata.cloudAgents = registry.agents.filter(a => a.type === 'cloud').length;
  registry.metadata.deprecatedAgents = registry.agents.filter(a => a.deprecated).length;

  // Save or validate registry
  if (dryRun) {
    // Dry-run mode: validate without saving
    validateRegistry(registry);
    console.log('');
    success('Validation passed: Registry is valid');
    success(`Sync dry-run complete: ${scannedCount} files scanned`);
  } else {
    // Normal mode: save registry
    saveRegistry(registry);

    // Report results
    console.log('');
    success(`Sync complete: ${scannedCount} files scanned`);
  }
  if (addedCount > 0) success(`  Added: ${addedCount} agents`);
  if (updatedCount > 0) info(`  Updated: ${updatedCount} agents`);
  if (skippedCount > 0) warning(`  Skipped: ${skippedCount} agents`);

  if (warnings.length > 0) {
    console.log('');
    warning('Warnings:');
    warnings.forEach(w => warning(`  ${w}`));
  }

  if (errors.length > 0) {
    console.log('');
    error('Errors:');
    errors.forEach(e => error(`  ${e}`));
    process.exit(1);
  }
}

// Command: check
function cmdCheck(agentName) {
  if (!agentName) {
    error('Agent name required: agent-registry check <agent-name>');
    process.exit(1);
  }

  // Validate agent name format
  agentName = validateAgentName(agentName);

  const registry = loadRegistry();
  const existing = registry.agents.find(a => a.id === agentName || a.name === agentName);

  if (existing) {
    warning(`Agent '${agentName}' already exists:`);
    console.log(`  ID: ${existing.id}`);
    console.log(`  Type: ${existing.type}`);
    console.log(`  Category: ${existing.category}`);
    console.log(`  File: ${existing.filePath}`);

    if (existing.deprecated) {
      warning(`  Status: DEPRECATED (${existing.deprecationReason})`);
    }

    process.exit(1);
  }

  // Check for similar names
  const similar = registry.agents.filter(a => {
    const similarity = levenshteinDistance(a.id.toLowerCase(), agentName.toLowerCase());
    return similarity <= 3; // Allow up to 3 character difference
  });

  if (similar.length > 0) {
    warning(`Similar agents found:`);
    similar.forEach(a => {
      console.log(`  - ${a.id} (${a.category})`);
    });
  } else {
    success(`No duplicate found. Agent name '${agentName}' is available.`);
  }
}

// Levenshtein distance for similarity checking
function levenshteinDistance(str1, str2) {
  const m = str1.length;
  const n = str2.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

// Command: create claude
function cmdCreateClaude(args) {
  const name = args.name;
  const category = args.category;

  if (!name || !category) {
    error('Usage: agent-registry create claude --name <name> --category <category>');
    process.exit(1);
  }

  // Validate agent name format
  const validatedName = validateAgentName(name);

  // Check for duplicates first
  const registry = loadRegistry();
  const existing = registry.agents.find(a => a.id === name);

  if (existing) {
    error(`Agent '${name}' already exists`);
    process.exit(1);
  }

  // Create agent file
  const fileName = `${name}.md`;
  const filePath = path.join(CLAUDE_AGENTS_DIR, fileName);

  if (fs.existsSync(filePath)) {
    error(`Agent file already exists: ${filePath}`);
    process.exit(1);
  }

  const template = `---
name: ${name}
category: ${category}
tools: [Read, Grep, Glob, Edit]
model: sonnet
---

# ${name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}

[Agent description and purpose]

## Capabilities

- [Capability 1]
- [Capability 2]

## Usage

[Usage instructions]
`;

  fs.writeFileSync(filePath, template, 'utf8');
  success(`Created Claude agent: ${fileName}`);

  // Add to registry
  registry.agents.push({
    id: name,
    name: name,
    type: 'claude',
    filePath: path.relative(REPO_ROOT, filePath),
    category: category,
    description: '[Agent description]',
    tools: ['Read', 'Grep', 'Glob', 'Edit'],
    model: 'sonnet',
    cloudAgentId: null,
    automationCandidate: false,
    deprecated: false,
    deprecatedAt: null,
    deprecationReason: null
  });

  registry.metadata.totalAgents++;
  registry.metadata.claudeAgents++;

  saveRegistry(registry);
  info('Run agent-registry sync to update description from file');
}

// Command: create cloud
function cmdCreateCloud(args) {
  const name = args.name;
  const trigger = args.trigger;

  if (!name || !trigger) {
    error('Usage: agent-registry create cloud --name <name> --trigger <scheduled|webhook|manual>');
    process.exit(1);
  }

  if (!['scheduled', 'webhook', 'manual'].includes(trigger)) {
    error('Trigger must be: scheduled, webhook, or manual');
    process.exit(1);
  }

  // Validate agent name format
  const validatedName = validateAgentName(name);

  // Check for duplicates
  const registry = loadRegistry();
  const existing = registry.agents.find(a => a.id === name);

  if (existing) {
    error(`Agent '${name}' already exists`);
    process.exit(1);
  }

  // Ensure cloud agents directory exists
  if (!fs.existsSync(CLOUD_AGENTS_DIR)) {
    fs.mkdirSync(CLOUD_AGENTS_DIR, { recursive: true });
  }

  // Create Cloud Agent config file
  const fileName = `${name}.json`;
  const filePath = path.join(CLOUD_AGENTS_DIR, fileName);

  if (fs.existsSync(filePath)) {
    error(`Cloud Agent config already exists: ${filePath}`);
    process.exit(1);
  }

  const config = {
    name: name,
    model: 'claude-sonnet-4',
    trigger: trigger,
    schedule: trigger === 'scheduled' ? 'weekly' : null,
    webhookEvent: trigger === 'webhook' ? 'pull_request' : null,
    prompt: `You are ${name}, a Cloud Agent responsible for [purpose].`,
    instructions: [
      '[Step 1]',
      '[Step 2]',
      '[Step 3]'
    ]
  };

  fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf8');
  success(`Created Cloud Agent config: ${fileName}`);

  // Add to registry
  registry.agents.push({
    id: name,
    name: name,
    type: 'cloud',
    filePath: path.relative(REPO_ROOT, filePath),
    category: 'automation',
    description: '[Cloud Agent description]',
    claudeAgentId: null,
    trigger: trigger,
    schedule: trigger === 'scheduled' ? 'weekly' : null,
    webhookEvent: trigger === 'webhook' ? 'pull_request' : null,
    deprecated: false,
    deprecatedAt: null,
    deprecationReason: null,
    lastRunAt: null,
    runCount: 0,
    recentRuns: []
  });

  registry.metadata.totalAgents++;
  registry.metadata.cloudAgents++;

  saveRegistry(registry);
}

// Command: link
function cmdLink(claudeAgent, cloudAgent) {
  if (!claudeAgent || !cloudAgent) {
    error('Usage: agent-registry link <claude-agent> <cloud-agent>');
    process.exit(1);
  }

  // Validate agent names
  claudeAgent = validateAgentName(claudeAgent);
  cloudAgent = validateAgentName(cloudAgent);

  const registry = loadRegistry();
  const claude = registry.agents.find(a => a.id === claudeAgent && a.type === 'claude');
  const cloud = registry.agents.find(a => a.id === cloudAgent && a.type === 'cloud');

  if (!claude) {
    error(`Claude agent '${claudeAgent}' not found`);
    process.exit(1);
  }

  if (!cloud) {
    error(`Cloud agent '${cloudAgent}' not found`);
    process.exit(1);
  }

  claude.cloudAgentId = cloudAgent;
  cloud.claudeAgentId = claudeAgent;

  saveRegistry(registry);
  success(`Linked ${claudeAgent} ↔ ${cloudAgent}`);
}

// Command: deprecate
function cmdWarn(agentName, reason) {
  if (!agentName || !reason) {
    error('Usage: agent-registry warn <agent> --reason <reason>');
    process.exit(1);
  }

  // Validate agent name
  agentName = validateAgentName(agentName);

  const registry = loadRegistry();
  const agent = registry.agents.find(a => a.id === agentName);

  if (!agent) {
    error(`Agent '${agentName}' not found`);
    process.exit(1);
  }

  // Idempotent: if already deprecated, show message and exit
  if (agent.deprecated) {
    const deadline = agent.deprecated_until || 'unknown';
    warning(`Agent '${agentName}' is already deprecated (grace period ends: ${deadline})`);
    info(`Deprecation reason: ${agent.deprecationReason}`);
    info(`Use 'archive' command after ${deadline} to complete archival`);
    process.exit(0);
  }

  // Calculate 30-day deadline (ISO 8601 date-only format)
  const now = new Date();
  const deadline = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const deadlineDate = deadline.toISOString().split('T')[0]; // YYYY-MM-DD

  // Mark as deprecated
  agent.deprecated = true;
  agent.deprecatedAt = now.toISOString();
  agent.deprecationReason = reason;
  agent.deprecated_until = deadlineDate;

  registry.metadata.deprecatedAgents++;

  saveRegistry(registry);
  success(`Agent '${agentName}' marked as deprecated`);
  info(`Grace period: 30 days (ends ${deadlineDate})`);
  info(`Reason: ${reason}`);
  info('');
  info(`After ${deadlineDate}, use: node scripts/agent-registry.js archive ${agentName}`);
}

// Backward compatibility: deprecate is an alias for warn
function cmdDeprecate(agentName, reason) {
  warning('Note: "deprecate" is deprecated. Use "warn" instead (same behavior)');
  cmdWarn(agentName, reason);
}

// Command: archive
function cmdArchive(agentName) {
  if (!agentName) {
    error('Usage: agent-registry archive <agent>');
    process.exit(1);
  }

  // Validate agent name
  agentName = validateAgentName(agentName);

  const registry = loadRegistry();
  const agentIndex = registry.agents.findIndex(a => a.id === agentName);
  const agent = registry.agents[agentIndex];

  if (!agent) {
    error(`Agent '${agentName}' not found in registry`);
    info('Agent may already be archived. Check .claude/agents/archive/ directory.');
    process.exit(1);
  }

  // Validate agent is deprecated
  if (!agent.deprecated) {
    error(`Agent '${agentName}' is not deprecated`);
    info('Use "warn" command first to start 30-day grace period');
    process.exit(1);
  }

  // Validate grace period has passed
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const deadline = agent.deprecated_until;

  if (!deadline) {
    error(`Agent '${agentName}' has no grace period deadline`);
    info('This agent was deprecated before the deadline system was implemented');
    info('Proceeding with archival...');
  } else if (today < deadline) {
    error(`Cannot archive '${agentName}' - grace period has not expired`);
    info(`Grace period ends: ${deadline}`);
    info(`Today: ${today}`);
    const daysRemaining = Math.ceil((new Date(deadline) - new Date(today)) / (24 * 60 * 60 * 1000));
    info(`Days remaining: ${daysRemaining}`);
    process.exit(1);
  }

  // Only archive Claude agents (Cloud agents don't have files to move)
  if (agent.type === 'claude') {
    const sourceFile = path.join(REPO_ROOT, agent.filePath);

    // Check if source file exists
    if (!fs.existsSync(sourceFile)) {
      error(`Source file not found: ${agent.filePath}`);
      info('File may have been manually deleted or moved');
      info('Proceeding to remove from registry only...');
    } else {
      // Create archive directory if it doesn't exist
      if (!fs.existsSync(ARCHIVE_DIR)) {
        fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
      }

      // Build archive filename with deprecation date
      const deprecatedDate = agent.deprecatedAt
        ? new Date(agent.deprecatedAt).toISOString().split('T')[0]
        : today;
      const archiveFilename = `${agentName}-deprecated-${deprecatedDate}.md`;
      const archivePath = path.join(ARCHIVE_DIR, archiveFilename);

      // Check if already archived (idempotent check)
      if (fs.existsSync(archivePath)) {
        warning(`Archive file already exists: ${archiveFilename}`);
        info('Proceeding to remove from registry...');
      } else {
        // Move file to archive with error recovery
        try {
          fs.renameSync(sourceFile, archivePath);
          success(`Moved ${agent.filePath} → .claude/agents/archive/${archiveFilename}`);
        } catch (err) {
          // Handle specific error cases
          if (err.code === 'EEXIST') {
            // File was created between existsSync check and rename (race condition)
            warning(`Archive file was just created: ${archiveFilename}`);
            info('Proceeding to remove from registry...');
          } else if (err.code === 'EACCES' || err.code === 'EPERM') {
            // Permission denied - critical error
            error(`Permission denied when archiving: ${err.message}`);
            info('Cannot complete archival - registry NOT updated');
            process.exit(1);
          } else if (err.code === 'ENOSPC') {
            // Disk full - critical error
            error(`Disk full when archiving: ${err.message}`);
            info('Cannot complete archival - registry NOT updated');
            process.exit(1);
          } else {
            // Unexpected error - don't corrupt registry
            error(`Failed to move file to archive: ${err.message}`);
            info('Cannot complete archival - registry NOT updated');
            process.exit(1);
          }
        }
      }
    }
  }

  // Remove from registry
  registry.agents.splice(agentIndex, 1);
  registry.metadata.totalAgents--;
  registry.metadata.deprecatedAgents--;

  if (agent.type === 'claude') {
    registry.metadata.claudeAgents--;
  } else {
    registry.metadata.cloudAgents--;
  }

  saveRegistry(registry);
  success(`Agent '${agentName}' archived and removed from registry`);
  info('');
  info('Next steps:');
  info('1. Run: node scripts/agent-registry.js generate-docs');
  info('2. Commit changes to complete archival');
}

// Helper: Generate timestamp with disclaimer
function generateTimestamp(registry) {
  const now = new Date().toISOString();
  const version = registry.metadata.version || '1.0.0';
  return `*Last updated: ${now} | Auto-generated from \`repo_state/agent-registry.json\` (v${version})*`;
}

// Helper: Replace markered section in content
function replaceMarkeredSection(content, sectionName, newContent, docPath) {
  const startMarker = `<!-- AUTO-GENERATED:START:${sectionName} -->`;
  const endMarker = `<!-- AUTO-GENERATED:END:${sectionName} -->`;

  // Check if markers exist
  const hasStart = content.includes(startMarker);
  const hasEnd = content.includes(endMarker);

  if (hasStart && !hasEnd) {
    error(`[generate-docs] Error: Unpaired markers in ${docPath}: found START but no END for section '${sectionName}'`);
    process.exit(1);
  }

  if (!hasStart && hasEnd) {
    error(`[generate-docs] Error: Found END marker for '${sectionName}' without matching START marker in ${docPath}`);
    process.exit(1);
  }

  if (!hasStart && !hasEnd) {
    // Markers don't exist - return content unchanged
    // The caller should decide whether to create them or fail
    return { updated: false, content };
  }

  // Replace content between markers
  const regex = new RegExp(
    `${startMarker}[\\s\\S]*?${endMarker}`,
    'g'
  );

  const replacement = `${startMarker}\n${newContent}\n${endMarker}`;
  const updatedContent = content.replace(regex, replacement);

  return { updated: true, content: updatedContent };
}

// Block generator: Agent count summary
function generateAgentCountBlock(registry) {
  const automationCount = registry.agents.filter(a => a.automationCandidate).length;

  return `**Total Agents:** ${registry.metadata.totalAgents}
**Claude Agents:** ${registry.metadata.claudeAgents}
**Cloud Agents:** ${registry.metadata.cloudAgents}
**Automation Candidates:** ${automationCount}
**Deprecated:** ${registry.metadata.deprecatedAgents}

${generateTimestamp(registry)}`;
}

// Block generator: Agent catalog table
function generateAgentCatalogTable(registry) {
  const rows = registry.agents
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(agent => {
      const desc = agent.description.length > MAX_CATALOG_DESCRIPTION_LENGTH
        ? agent.description.substring(0, MAX_CATALOG_DESCRIPTION_LENGTH) + '...'
        : agent.description;
      const autoMarker = agent.automationCandidate ? '✓' : '';
      return `| ${agent.id} | ${agent.category} | ${agent.type} | ${desc} | ${autoMarker} |`;
    });

  return `| ID | Category | Type | Description | Automation Candidate |
|---|---|---|---|---|
${rows.join('\n')}

${generateTimestamp(registry)}`;
}

// Block generator: Automation candidates list
function generateAutomationCandidatesBlock(registry) {
  const candidates = registry.agents.filter(a => a.automationCandidate);

  if (candidates.length === 0) {
    return `No automation candidates identified yet.

${generateTimestamp(registry)}`;
  }

  const items = candidates.map(agent => {
    const toolsList = agent.tools && agent.tools.length > 0
      ? agent.tools.join(', ')
      : 'None specified';
    const model = agent.model || 'inherit';

    return `- **${agent.id}** (${agent.category}) - ${agent.description}
  - File: \`${agent.filePath}\`
  - Model: ${model}
  - Tools: ${toolsList}`;
  });

  return `### Automation Candidates

Agents identified for potential Cursor Cloud Agent automation:

${items.join('\n')}

${generateTimestamp(registry)}`;
}

// Block generator: Agent mapping table
function generateAgentMappingTable(registry) {
  const candidates = registry.agents.filter(a => a.automationCandidate);

  if (candidates.length === 0) {
    return `*No automation candidates identified yet.*

${generateTimestamp(registry)}`;
  }

  const rows = candidates.map(agent => {
    return `| **${agent.id}** | ${agent.category} | [Manual: TBD] | [Manual: TBD] | \`${agent.filePath}\` |`;
  });

  return `### High-Potential Automation Candidates

*Source: \`repo_state/agent-registry.json\` (automationCandidate === true)*

| Claude Agent | Category | Cloud Agent Use Case | Trigger | File |
|---|---|---|---|---|
${rows.join('\n')}

**Note:** Cloud Agent use cases and triggers are maintained manually. Agent definitions are sourced from the registry.

${generateTimestamp(registry)}`;
}

// Block generator: Registry reference note
function generateRegistryReferenceBlock(registry) {
  const version = registry.metadata.version || '1.0.0';
  const now = new Date().toISOString();

  return `**Source of Truth:** All Claude agent definitions are maintained in \`repo_state/agent-registry.json\`. Use \`node scripts/agent-registry.js sync\` to update the registry from \`.claude/agents/\` changes.

*Last updated: ${now} | Registry version ${version}*`;
}

// Helper: Build registry-driven triggers for selected skills
function buildRegistrySkillTriggerMap(registry) {
  const categoryWhitelist = new Set(['general', 'framework', 'automation', 'testing', 'documentation']);

  // Initialize maps for the skills we currently augment
  const skillMaps = {
    'code-review-trigger': {
      keywords: new Set(),
      intentPatterns: new Set()
    },
    'testing-trigger': {
      keywords: new Set(),
      intentPatterns: new Set()
    }
  };

  const escapeForRegex = (value) =>
    value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

  for (const agent of registry.agents || []) {
    if (!agent || agent.deprecated) continue;

    const includeAgent =
      agent.automationCandidate === true ||
      agent.type === 'cloud' ||
      (agent.category && categoryWhitelist.has(agent.category));

    if (!includeAgent) continue;

    const id = agent.id || agent.name;
    if (!id) continue;

    const lowerId = id.toLowerCase();
    let targetSkill = null;

    // Map by id/category heuristics
    if (lowerId.includes('review')) {
      targetSkill = 'code-review-trigger';
    } else if (lowerId.includes('test')) {
      targetSkill = 'testing-trigger';
    } else if (agent.category === 'testing') {
      targetSkill = 'testing-trigger';
    }

    if (!targetSkill || !skillMaps[targetSkill]) {
      continue;
    }

    const target = skillMaps[targetSkill];
    const kw = target.keywords;
    const patterns = target.intentPatterns;

    // Core keywords
    kw.add(id);
    if (agent.name && agent.name !== id) kw.add(agent.name);
    kw.add(`${id} agent`);

    if (agent.type === 'cloud') {
      kw.add(`${id} cloud agent`);
      if (agent.trigger) kw.add(`${id} ${agent.trigger}`);
      if (agent.webhookEvent) kw.add(`${id} ${agent.webhookEvent}`);
    }

    if (agent.category) {
      kw.add(`${agent.category} agent`);
    }

    if (agent.cloudAgentId) {
      kw.add(agent.cloudAgentId);
    }
    if (agent.claudeAgentId) {
      kw.add(agent.claudeAgentId);
    }

    // Special-case enrichment for known high-value agents
    if (id === 'code-review-expert') {
      kw.add('pr review bot');
      kw.add('cloud code review');
    }

    if (id === 'service-documentation') {
      kw.add('service documentation automation');
      kw.add('service docs automation');
    }

    if (id === 'test-runner') {
      kw.add('test runner');
      kw.add('run test-runner');
    }

    // Intent patterns
    const escapedId = escapeForRegex(id);
    patterns.add(`(run|trigger|use).*${escapedId}`);
    patterns.add(`use.*${escapedId}`);

    if (agent.type === 'cloud' && agent.trigger) {
      const escapedTrigger = escapeForRegex(agent.trigger);
      patterns.add(`(run|trigger).*${escapedId}.*${escapedTrigger}`);
    }
  }

  const result = {};
  for (const [skillId, { keywords, intentPatterns }] of Object.entries(skillMaps)) {
    const normalizedKeywords = normalizeStringArray(Array.from(keywords));
    const normalizedPatterns = Array.from(new Set(
      Array.from(intentPatterns)
        .map(p => (p || '').toString().trim())
        .filter(Boolean)
    )).slice(0, 40);

    // Warn if keyword count exceeds reasonable limit
    if (normalizedKeywords.length > MAX_TRIGGERS_PER_SKILL) {
      warning(`⚠️  Skill '${skillId}': ${normalizedKeywords.length} keywords exceeds limit (${MAX_TRIGGERS_PER_SKILL})`);
      info(`   Consider using more selective filters in buildRegistrySkillTriggerMap()`);
      info(`   Excess keywords may bloat context windows and slow down skill matching`);
    }

    // Apply limit to prevent bloat
    const limitedKeywords = normalizedKeywords.slice(0, MAX_TRIGGERS_PER_SKILL);

    if (limitedKeywords.length || normalizedPatterns.length) {
      result[skillId] = {
        keywords: limitedKeywords,
        intentPatterns: normalizedPatterns
      };
    }
  }

  return result;
}

// Command: generate-docs
function cmdGenerateDocs() {
  info('Generating documentation from registry...');

  // Step 1: Load and validate registry
  const registry = loadRegistry();
  validateRegistry(registry);
  success('✓ Validated registry schema');

  // Check for empty registry
  if (!registry.agents || registry.agents.length === 0) {
    error('[generate-docs] Error: No agents found in registry. Run \'sync\' first.');
    process.exit(1);
  }

  // Check for description truncation in agent catalog
  const truncatedAgents = registry.agents.filter(
    agent => agent.description && agent.description.length > MAX_CATALOG_DESCRIPTION_LENGTH
  );

  if (truncatedAgents.length > 0) {
    warning(`⚠️  ${truncatedAgents.length} agent description(s) will be truncated in catalog table:`);
    truncatedAgents.forEach(agent => {
      const excess = agent.description.length - MAX_CATALOG_DESCRIPTION_LENGTH;
      info(`   • ${agent.id} (${agent.description.length} chars, ${excess} over limit)`);
    });
    info(`\nConsider shortening descriptions to ${MAX_CATALOG_DESCRIPTION_LENGTH} characters or less.`);
    info('');
  }

  // Step 2: Define target documents and their sections
  const docs = [
    {
      path: AGENT_AUDIT_DOC_PATH,
      name: 'agent-system-audit.md',
      sections: [
        { name: 'agent-count', generator: () => generateAgentCountBlock(registry) },
        { name: 'agent-catalog', generator: () => generateAgentCatalogTable(registry) },
        { name: 'automation-candidates', generator: () => generateAutomationCandidatesBlock(registry) }
      ]
    },
    {
      path: AGENT_ALIGNMENT_DOC_PATH,
      name: 'claude-cursor-agent-alignment.md',
      sections: [
        { name: 'agent-mapping', generator: () => generateAgentMappingTable(registry) },
        { name: 'registry-reference', generator: () => generateRegistryReferenceBlock(registry) }
      ]
    }
  ];

  // Step 3: Process each document
  const results = [];

  for (const doc of docs) {
    // Check if document exists
    if (!fs.existsSync(doc.path)) {
      error(`[generate-docs] Error: Target document not found: ${doc.path}`);
      process.exit(1);
    }

    // Read document
    let content;
    try {
      content = fs.readFileSync(doc.path, 'utf8');
    } catch (err) {
      error(`[generate-docs] Error: Cannot read ${doc.name}: ${err.message}`);
      process.exit(1);
    }

    // Process each section
    let hasChanges = false;
    for (const section of doc.sections) {
      const newContent = section.generator();
      const result = replaceMarkeredSection(content, section.name, newContent, doc.name);

      if (result.updated) {
        content = result.content;
        hasChanges = true;
        success(`✓ Generated ${section.name} block (${doc.name})`);
      } else {
        warning(`⚠ Markers not found for section '${section.name}' in ${doc.name} - skipping`);
      }
    }

    // Write updated document if changes were made
    if (hasChanges) {
      try {
        fs.writeFileSync(doc.path, content, 'utf8');
        results.push({ doc: doc.name, updated: true });
      } catch (err) {
        error(`[generate-docs] Error: Cannot write to ${doc.name}: ${err.message}`);
        process.exit(1);
      }
    } else {
      results.push({ doc: doc.name, updated: false });
    }
  }

  // Step 4: Report results
  console.log('');
  success('✓ Documentation generation complete');

  const updatedDocs = results.filter(r => r.updated);
  if (updatedDocs.length > 0) {
    info(`Updated: ${updatedDocs.map(r => r.doc).join(', ')}`);
  }

  const skippedDocs = results.filter(r => !r.updated);
  if (skippedDocs.length > 0) {
    warning(`No markers found in: ${skippedDocs.map(r => r.doc).join(', ')}`);
  }
}

// Command: generate-skill-rules
function cmdGenerateSkillRules() {
  info('Generating skill-rules from agent registry...');

  // Load and validate registry first; fail-fast on schema issues
  const registry = loadRegistry();
  validateRegistry(registry);
  success('✓ Validated registry schema');

  // Load base skill rules
  if (!fs.existsSync(SKILL_RULES_BASE_PATH)) {
    error(`Base skill rules not found: ${SKILL_RULES_BASE_PATH}`);
    process.exit(1);
  }

  let base;
  try {
    const content = fs.readFileSync(SKILL_RULES_BASE_PATH, 'utf8');
    base = JSON.parse(content);
  } catch (err) {
    error(`Failed to read base skill rules: ${err.message}`);
    process.exit(1);
  }

  if (!base.skills || typeof base.skills !== 'object') {
    error('Base skill-rules.json is missing a top-level "skills" object');
    process.exit(1);
  }

  // Compute registry-driven triggers
  const registryTriggerMap = buildRegistrySkillTriggerMap(registry);

  if (Object.keys(registryTriggerMap).length === 0) {
    warning('No registry-driven triggers to add (no matching agents found).');
  }

  // Start from the base config and enrich selected skills
  const generated = {
    ...base,
    skills: { ...base.skills }
  };

  for (const [skillId, triggers] of Object.entries(registryTriggerMap)) {
    const skill = generated.skills[skillId];
    if (!skill) {
      warning(`Skill '${skillId}' not found in base skill-rules.json; skipping registryTriggers for it`);
      continue;
    }

    const existingKeywords = Array.isArray(skill.registryTriggers?.keywords)
      ? skill.registryTriggers.keywords
      : [];
    const existingPatterns = Array.isArray(skill.registryTriggers?.intentPatterns)
      ? skill.registryTriggers.intentPatterns
      : [];

    const mergedKeywords = normalizeStringArray(
      existingKeywords.concat(triggers.keywords || [])
    );

    const mergedPatterns = Array.from(new Set(
      existingPatterns
        .concat(triggers.intentPatterns || [])
        .map(p => (p || '').toString().trim())
        .filter(Boolean)
    )).slice(0, 40);

    skill.registryTriggers = {
      keywords: mergedKeywords,
      intentPatterns: mergedPatterns
    };
  }

  // Write generated file atomically-ish: only after all processing succeeds
  try {
    const content = JSON.stringify(generated, null, 2);
    fs.writeFileSync(SKILL_RULES_GENERATED_PATH, content, 'utf8');
    success(`✓ Wrote generated skill rules to ${path.relative(REPO_ROOT, SKILL_RULES_GENERATED_PATH)}`);
  } catch (err) {
    error(`Failed to write generated skill rules: ${err.message}`);
    process.exit(1);
  }
}

// Parse arguments
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const nextArg = argv[i + 1];

      // Check if this is a boolean flag (no value) or has a value
      if (!nextArg || nextArg.startsWith('--')) {
        // Boolean flag with no value
        args[key] = true;
      } else {
        // Flag with value
        args[key] = nextArg;
        i++;
      }
    }
  }
  return args;
}

// Main CLI
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Agent Registry Management CLI');
    console.log('');
    console.log('Commands:');
    console.log('  sync                                     - Scan .claude/agents/ and update registry');
    console.log('  check <agent-name>                       - Check for duplicates before creation');
    console.log('  create claude --name <name> --category <cat> - Create new Claude agent');
    console.log('  create cloud --name <name> --trigger <type>  - Create new Cloud Agent');
    console.log('  link <claude-agent> <cloud-agent>        - Link agents');
    console.log('  warn <agent> --reason <reason>           - Deprecate agent (30-day grace period)');
    console.log('  archive <agent>                          - Archive agent after grace period');
    console.log('  deprecate <agent> --reason <reason>      - Alias for warn (backward compatibility)');
    console.log('  generate-docs                            - Regenerate documentation');
    console.log('  generate-skill-rules                     - Generate skill-rules.generated.json from registry');
    process.exit(0);
  }

  const command = args[0];

  switch (command) {
    case 'sync':
      const syncOptions = parseArgs(args.slice(1));
      cmdSync(syncOptions);
      break;

    case 'check':
      cmdCheck(args[1]);
      break;

    case 'create':
      const subcommand = args[1];
      const parsedArgs = parseArgs(args.slice(2));

      if (subcommand === 'claude') {
        cmdCreateClaude(parsedArgs);
      } else if (subcommand === 'cloud') {
        cmdCreateCloud(parsedArgs);
      } else {
        error('Usage: agent-registry create <claude|cloud> [options]');
        process.exit(1);
      }
      break;

    case 'link':
      cmdLink(args[1], args[2]);
      break;

    case 'warn':
      const warnAgentName = args[1];
      const parsedWarnArgs = parseArgs(args.slice(2));
      cmdWarn(warnAgentName, parsedWarnArgs.reason);
      break;

    case 'deprecate':
      const agentName = args[1];
      const parsedDepArgs = parseArgs(args.slice(2));
      cmdDeprecate(agentName, parsedDepArgs.reason);
      break;

    case 'archive':
      cmdArchive(args[1]);
      break;

    case 'generate-docs':
      cmdGenerateDocs();
      break;

    case 'generate-skill-rules':
      cmdGenerateSkillRules();
      break;

    default:
      error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

// Run CLI
main();
