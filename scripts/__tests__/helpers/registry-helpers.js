const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '../..');
const REGISTRY_PATH = path.join(REPO_ROOT, 'repo_state', 'agent-registry.json');

/**
 * Sets up per-test registry backup/restore hooks to prevent test pollution.
 * 
 * Tests that create agents (e.g., create, warn, deprecate) modify the registry,
 * and without per-test cleanup, agents created in test 1 persist into test 2.
 * This helper ensures each test starts with a clean registry state.
 * 
 * Usage:
 *   const { setupRegistryBackup } = require('./helpers/registry-helpers');
 *   setupRegistryBackup();
 */
function setupRegistryBackup() {
  let backup = null;
  
  beforeEach(() => {
    // Backup registry state before each test to prevent test pollution.
    // Tests that create agents (e.g., create, warn, deprecate) modify the registry,
    // and without per-test cleanup, agents created in test 1 persist into test 2.
    if (fs.existsSync(REGISTRY_PATH)) {
      backup = fs.readFileSync(REGISTRY_PATH, 'utf8');
    }
  });
  
  afterEach(() => {
    // Restore registry state after each test
    if (backup) {
      fs.writeFileSync(REGISTRY_PATH, backup, 'utf8');
      backup = null;
    }
  });
}

module.exports = {
  setupRegistryBackup,
  REGISTRY_PATH
};

