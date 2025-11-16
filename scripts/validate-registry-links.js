#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Paths
const REPO_ROOT = path.join(__dirname, '..');
const REGISTRY_PATH = path.join(REPO_ROOT, 'repo_state', 'agent-registry.json');

// Color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function validateRegistryLinks(options = {}) {
  const { silent = false, exitOnError = true } = options;

  function conditionalLog(message, color = 'reset') {
    if (!silent) {
      log(message, color);
    }
  }

  conditionalLog('\nValidating Bidirectional Registry Links...', 'cyan');
  conditionalLog('='.repeat(50), 'cyan');

  // Load registry
  let registry;
  try {
    const registryContent = fs.readFileSync(REGISTRY_PATH, 'utf8');
    registry = JSON.parse(registryContent);
    conditionalLog(`✓ Loaded registry with ${registry.agents.length} agents`, 'green');
  } catch (error) {
    conditionalLog(`✗ Failed to load registry: ${error.message}`, 'red');
    if (exitOnError) process.exit(1);
    throw error;
  }

  const results = {
    totalLinks: 0,
    validLinks: 0,
    brokenLinks: 0,
    orphanedLinks: 0,
    errors: []
  };

  // Create agent lookup maps
  const claudeAgents = new Map();
  const cloudAgents = new Map();

  registry.agents.forEach(agent => {
    if (agent.type === 'claude') {
      claudeAgents.set(agent.id, agent);
    } else if (agent.type === 'cloud') {
      cloudAgents.set(agent.id, agent);
    }
  });

  conditionalLog(`\nFound ${claudeAgents.size} Claude agents and ${cloudAgents.size} Cloud agents\n`, 'cyan');

  // Check Cloud Agent → Claude Agent links
  conditionalLog('Checking Cloud Agent → Claude Agent links:', 'cyan');
  cloudAgents.forEach((cloudAgent, cloudId) => {
    const claudeAgentId = cloudAgent.claudeAgentId;

    if (!claudeAgentId) {
      conditionalLog(`⚠ ${cloudId} - No Claude agent link`, 'yellow');
      return;
    }

    results.totalLinks++;

    const claudeAgent = claudeAgents.get(claudeAgentId);

    if (!claudeAgent) {
      conditionalLog(`✗ ${cloudId} → ${claudeAgentId} - BROKEN (Claude agent not found)`, 'red');
      results.brokenLinks++;
      results.errors.push({
        type: 'broken-link',
        from: cloudId,
        to: claudeAgentId,
        message: 'Referenced Claude agent does not exist'
      });
    } else {
      // Check bidirectional link
      if (claudeAgent.cloudAgentId === cloudId) {
        conditionalLog(`✓ ${cloudId} ↔ ${claudeAgentId} - BIDIRECTIONAL`, 'green');
        results.validLinks++;
      } else {
        conditionalLog(`⚠ ${cloudId} → ${claudeAgentId} - ORPHANED (no back-link)`, 'yellow');
        results.orphanedLinks++;
        results.errors.push({
          type: 'orphaned-link',
          from: cloudId,
          to: claudeAgentId,
          backLink: claudeAgent.cloudAgentId,
          message: 'Claude agent does not link back to this Cloud agent'
        });
      }
    }
  });

  // Check Claude Agent → Cloud Agent links
  conditionalLog('\nChecking Claude Agent → Cloud Agent links:', 'cyan');
  claudeAgents.forEach((claudeAgent, claudeId) => {
    const cloudAgentId = claudeAgent.cloudAgentId;

    if (!cloudAgentId) {
      // No Cloud agent link (normal for many agents)
      return;
    }

    const cloudAgent = cloudAgents.get(cloudAgentId);

    if (!cloudAgent) {
      conditionalLog(`✗ ${claudeId} → ${cloudAgentId} - BROKEN (Cloud agent not found)`, 'red');
      results.brokenLinks++;
      results.errors.push({
        type: 'broken-link',
        from: claudeId,
        to: cloudAgentId,
        message: 'Referenced Cloud agent does not exist'
      });
    } else {
      // Already counted in Cloud → Claude check
      if (cloudAgent.claudeAgentId !== claudeId) {
        conditionalLog(`⚠ ${claudeId} → ${cloudAgentId} - ORPHANED (no back-link)`, 'yellow');
        results.orphanedLinks++;
        results.errors.push({
          type: 'orphaned-link',
          from: claudeId,
          to: cloudAgentId,
          backLink: cloudAgent.claudeAgentId,
          message: 'Cloud agent does not link back to this Claude agent'
        });
      }
    }
  });

  // Print summary
  conditionalLog('\n' + '='.repeat(50), 'cyan');
  conditionalLog('Link Validation Summary:', 'cyan');
  conditionalLog(`Total links checked: ${results.totalLinks}`, 'cyan');
  conditionalLog(`Valid bidirectional: ${results.validLinks}`, results.validLinks === results.totalLinks ? 'green' : 'yellow');
  conditionalLog(`Broken links: ${results.brokenLinks}`, results.brokenLinks === 0 ? 'green' : 'red');
  conditionalLog(`Orphaned links: ${results.orphanedLinks}`, results.orphanedLinks === 0 ? 'green' : 'yellow');

  if (results.errors.length > 0) {
    conditionalLog('\nDetailed Errors:', 'red');
    results.errors.forEach((err, index) => {
      conditionalLog(`\n${index + 1}. ${err.type.toUpperCase()}: ${err.from} → ${err.to}`, 'yellow');
      conditionalLog(`   ${err.message}`, 'yellow');
      if (err.backLink) {
        conditionalLog(`   Back-link: ${err.backLink}`, 'yellow');
      }
    });
  }

  conditionalLog('\n' + '='.repeat(50) + '\n', 'cyan');

  if (results.brokenLinks > 0) {
    conditionalLog('⚠ Found broken links - registry integrity compromised', 'red');
    if (exitOnError) process.exit(1);
  }

  if (results.orphanedLinks > 0) {
    conditionalLog('⚠ Found orphaned links - consider updating registry for consistency', 'yellow');
  }

  return results;
}

// Run validation
if (require.main === module) {
  validateRegistryLinks();
}

module.exports = { validateRegistryLinks };
