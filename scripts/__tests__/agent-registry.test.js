/**
 * Unit tests for agent-registry.js
 *
 * Run with: npm test or jest
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Paths
const REPO_ROOT = path.resolve(__dirname, '../..');
const REGISTRY_PATH = path.join(REPO_ROOT, 'repo_state', 'agent-registry.json');
const TEST_REGISTRY_PATH = path.join(REPO_ROOT, 'repo_state', 'agent-registry.test.json');
const SCRIPT_PATH = path.join(REPO_ROOT, 'scripts', 'agent-registry.js');

// Helper: Run CLI command
function runCLI(args, expectError = false) {
  try {
    const output = execSync(`node ${SCRIPT_PATH} ${args}`, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: 'pipe'
    });
    return { success: true, output };
  } catch (error) {
    if (expectError) {
      return { success: false, output: error.stdout || error.stderr, error };
    }
    throw error;
  }
}

// Helper: Load registry
function loadRegistry() {
  const content = fs.readFileSync(REGISTRY_PATH, 'utf8');
  return JSON.parse(content);
}

function saveRegistry(registry) {
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
}

// Helper: Create test agent file
function createTestAgentFile(name, frontmatter, content = '') {
  const filePath = path.join(REPO_ROOT, '.claude', 'agents', `${name}.md`);
  const fm = Object.entries(frontmatter)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}: [${value.join(', ')}]`;
      }
      return `${key}: ${value}`;
    })
    .join('\n');

  const fileContent = `---\n${fm}\n---\n\n${content}`;
  fs.writeFileSync(filePath, fileContent, 'utf8');
  return filePath;
}

// Helper: Clean up test files
function cleanupTestFiles(files) {
  files.forEach(file => {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  });
}

describe('Agent Registry CLI', () => {
  let originalRegistry;
  let testFiles = [];

  beforeAll(() => {
    // Backup original registry
    if (fs.existsSync(REGISTRY_PATH)) {
      originalRegistry = fs.readFileSync(REGISTRY_PATH, 'utf8');
    }
  });

  afterAll(() => {
    // Restore original registry
    if (originalRegistry) {
      fs.writeFileSync(REGISTRY_PATH, originalRegistry, 'utf8');
    }

    // Clean up test files
    cleanupTestFiles(testFiles);
  });

  afterEach(() => {
    // Clean up test files after each test
    cleanupTestFiles(testFiles);
    testFiles = [];
  });

  describe('sync command', () => {
    test('should scan and populate registry with valid agents', () => {
      const result = runCLI('sync');
      expect(result.success).toBe(true);
      expect(result.output).toContain('Sync complete');

      const registry = loadRegistry();
      expect(registry.metadata.totalAgents).toBeGreaterThan(0);
      expect(registry.metadata.claudeAgents).toBeGreaterThan(0);
      expect(registry.agents).toBeInstanceOf(Array);
    });

    test('should update lastSyncAt timestamp', () => {
      const before = Date.now();
      runCLI('sync');
      const after = Date.now();

      const registry = loadRegistry();
      const syncTime = new Date(registry.metadata.lastSyncAt).getTime();

      expect(syncTime).toBeGreaterThanOrEqual(before);
      expect(syncTime).toBeLessThanOrEqual(after);
    });

    test('should skip agents with missing frontmatter', () => {
      // Create agent without frontmatter
      const testFile = path.join(REPO_ROOT, '.claude', 'agents', 'test-no-frontmatter.md');
      fs.writeFileSync(testFile, '# Test Agent\n\nNo frontmatter here.', 'utf8');
      testFiles.push(testFile);

      const result = runCLI('sync');
      expect(result.output).toContain('Skipped');
    });

    test('should skip agents with missing name field', () => {
      const testFile = createTestAgentFile('test-no-name', {
        category: 'test',
        tools: ['Read', 'Write']
      });
      testFiles.push(testFile);

      const result = runCLI('sync');
      expect(result.output).toContain('Skipped');
    });

    test('should mark automation candidates correctly', () => {
      runCLI('sync');
      const registry = loadRegistry();

      const automationCandidates = registry.agents.filter(a => a.automationCandidate);
      const expectedCandidates = [
        'service-documentation',
        'code-review-expert'
      ];

      expectedCandidates.forEach(id => {
        const agent = registry.agents.find(a => a.id === id);
        if (agent) {
          expect(agent.automationCandidate).toBe(true);
        }
      });
    });

    test('should handle partial sync failures gracefully', () => {
      // Create one valid and one invalid agent
      const validFile = createTestAgentFile('test-valid', {
        name: 'test-valid',
        category: 'test',
        tools: ['Read']
      }, 'Valid agent description');
      testFiles.push(validFile);

      const invalidFile = path.join(REPO_ROOT, '.claude', 'agents', 'test-invalid.md');
      fs.writeFileSync(invalidFile, '---\nno-closing-frontmatter\n', 'utf8');
      testFiles.push(invalidFile);

      const result = runCLI('sync');
      expect(result.output).toContain('Skipped');

      // Valid agent should still be added
      const registry = loadRegistry();
      const validAgent = registry.agents.find(a => a.id === 'test-valid');
      expect(validAgent).toBeDefined();
    });
  });

  describe('check command', () => {
    beforeEach(() => {
      // Ensure registry is synced
      runCLI('sync');
    });

    test('should detect existing agent', () => {
      const result = runCLI('check code-review-expert', true);
      expect(result.success).toBe(false);
      expect(result.output).toContain('already exists');
    });

    test('should confirm available agent name', () => {
      const result = runCLI('check test-nonexistent-agent-xyz');
      expect(result.success).toBe(true);
      expect(result.output).toContain('available');
    });

    test('should find similar agent names', () => {
      const result = runCLI('check code-reviw'); // Typo: missing 'e'
      expect(result.output).toContain('Similar agents');
    });

    test('should require agent name argument', () => {
      const result = runCLI('check', true);
      expect(result.success).toBe(false);
      expect(result.output).toContain('Agent name required');
    });
  });

  describe('create claude command', () => {
    test('should create new Claude agent file and registry entry', () => {
      const agentName = 'test-new-agent';
      const agentFile = path.join(REPO_ROOT, '.claude', 'agents', `${agentName}.md`);
      testFiles.push(agentFile);

      const result = runCLI(`create claude --name ${agentName} --category test`);
      expect(result.success).toBe(true);
      expect(result.output).toContain('Created Claude agent');

      // Verify file was created
      expect(fs.existsSync(agentFile)).toBe(true);

      // Verify registry entry
      const registry = loadRegistry();
      const agent = registry.agents.find(a => a.id === agentName);
      expect(agent).toBeDefined();
      expect(agent.type).toBe('claude');
      expect(agent.category).toBe('test');
    });

    test('should prevent duplicate agent creation', () => {
      const result = runCLI('create claude --name code-review-expert --category test', true);
      expect(result.success).toBe(false);
      expect(result.output).toContain('already exists');
    });

    test('should require name and category arguments', () => {
      const result = runCLI('create claude --name test-only-name', true);
      expect(result.success).toBe(false);
      expect(result.output).toContain('Usage');
    });
  });

  describe('create cloud command', () => {
    test('should create new Cloud Agent config and registry entry', () => {
      const agentName = 'test-cloud-agent';
      const configFile = path.join(REPO_ROOT, '.cursor', 'cloud-agents', `${agentName}.json`);
      testFiles.push(configFile);

      const result = runCLI(`create cloud --name ${agentName} --trigger scheduled`);
      expect(result.success).toBe(true);
      expect(result.output).toContain('Created Cloud Agent config');

      // Verify config file was created
      expect(fs.existsSync(configFile)).toBe(true);

      // Verify registry entry
      const registry = loadRegistry();
      const agent = registry.agents.find(a => a.id === agentName);
      expect(agent).toBeDefined();
      expect(agent.type).toBe('cloud');
      expect(agent.trigger).toBe('scheduled');
    });

    test('should validate trigger type', () => {
      const result = runCLI('create cloud --name test-invalid-trigger --trigger invalid', true);
      expect(result.success).toBe(false);
      expect(result.output).toContain('Trigger must be');
    });
  });

  describe('link command', () => {
    beforeEach(() => {
      runCLI('sync');
    });

    test('should link Claude agent to Cloud agent', () => {
      // Create a test Cloud agent first
      const cloudAgentName = 'test-link-cloud';
      const cloudConfigFile = path.join(REPO_ROOT, '.cursor', 'cloud-agents', `${cloudAgentName}.json`);
      testFiles.push(cloudConfigFile);

      runCLI(`create cloud --name ${cloudAgentName} --trigger manual`);

      // Link to existing Claude agent
      const result = runCLI(`link code-review-expert ${cloudAgentName}`);
      expect(result.success).toBe(true);
      expect(result.output).toContain('Linked');

      // Verify linkage in registry
      const registry = loadRegistry();
      const claudeAgent = registry.agents.find(a => a.id === 'code-review-expert');
      const cloudAgent = registry.agents.find(a => a.id === cloudAgentName);

      expect(claudeAgent.cloudAgentId).toBe(cloudAgentName);
      expect(cloudAgent.claudeAgentId).toBe('code-review-expert');
    });

    test('should fail if agents do not exist', () => {
      const result = runCLI('link nonexistent1 nonexistent2', true);
      expect(result.success).toBe(false);
      expect(result.output).toContain('not found');
    });
  });

  describe('deprecate command', () => {
    beforeEach(() => {
      runCLI('sync');
    });

    test('should mark agent as deprecated', () => {
      // Create a test agent to deprecate
      const agentName = 'test-deprecate-agent';
      const agentFile = path.join(REPO_ROOT, '.claude', 'agents', `${agentName}.md`);
      testFiles.push(agentFile);

      runCLI(`create claude --name ${agentName} --category test`);

      const result = runCLI(`deprecate ${agentName} --reason "No longer needed"`);
      expect(result.success).toBe(true);
      expect(result.output).toContain('marked as deprecated');

      // Verify deprecation in registry
      const registry = loadRegistry();
      const agent = registry.agents.find(a => a.id === agentName);
      expect(agent.deprecated).toBe(true);
      expect(agent.deprecationReason).toBe('No longer needed');
      expect(agent.deprecatedAt).toBeTruthy();
    });

    test('should require reason argument', () => {
      const result = runCLI('deprecate test-agent', true);
      expect(result.success).toBe(false);
      expect(result.output).toContain('Usage');
    });
  });

  describe('warn command', () => {
    beforeEach(() => {
      runCLI('sync');
    });

    test('should mark agent as deprecated with 30-day deadline', () => {
      const agentName = 'test-warn-agent';
      const agentFile = path.join(REPO_ROOT, '.claude', 'agents', `${agentName}.md`);
      testFiles.push(agentFile);

      runCLI(`create claude --name ${agentName} --category test`);

      const result = runCLI(`warn ${agentName} --reason "Testing warn command"`);
      expect(result.success).toBe(true);
      expect(result.output).toContain('marked as deprecated');
      expect(result.output).toContain('Grace period: 30 days');

      // Verify deprecation in registry
      const registry = loadRegistry();
      const agent = registry.agents.find(a => a.id === agentName);
      expect(agent.deprecated).toBe(true);
      expect(agent.deprecationReason).toBe('Testing warn command');
      expect(agent.deprecatedAt).toBeTruthy();
      expect(agent.deprecated_until).toBeTruthy();

      // Verify deadline is 30 days from now
      const now = new Date();
      const deadline = new Date(agent.deprecated_until);
      const daysDiff = Math.round((deadline - now) / (24 * 60 * 60 * 1000));
      expect(daysDiff).toBeGreaterThanOrEqual(29);
      expect(daysDiff).toBeLessThanOrEqual(30);
    });

    test('should be idempotent - warning already-warned agent', () => {
      const agentName = 'test-idempotent-warn';
      const agentFile = path.join(REPO_ROOT, '.claude', 'agents', `${agentName}.md`);
      testFiles.push(agentFile);

      runCLI(`create claude --name ${agentName} --category test`);
      runCLI(`warn ${agentName} --reason "First warning"`);

      // Warn again - should be no-op
      const result = runCLI(`warn ${agentName} --reason "Second warning"`, true);
      expect(result.success).toBe(true);
      expect(result.output).toContain('already deprecated');

      // Verify original reason is preserved
      const registry = loadRegistry();
      const agent = registry.agents.find(a => a.id === agentName);
      expect(agent.deprecationReason).toBe('First warning');
    });

    test('should require reason argument', () => {
      const result = runCLI('warn test-agent', true);
      expect(result.success).toBe(false);
      expect(result.output).toContain('Usage');
    });
  });

  describe('archive command', () => {
    beforeEach(() => {
      runCLI('sync');
    });

    test('should archive agent after grace period', () => {
      const agentName = 'test-archive-agent';
      const agentFile = path.join(REPO_ROOT, '.claude', 'agents', `${agentName}.md`);
      testFiles.push(agentFile);

      // Create and deprecate agent
      runCLI(`create claude --name ${agentName} --category test`);

      // Manually set deprecated_until to yesterday (grace period expired)
      const registry = loadRegistry();
      const agent = registry.agents.find(a => a.id === agentName);
      agent.deprecated = true;
      agent.deprecatedAt = new Date().toISOString();
      agent.deprecationReason = 'Test archival';
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      agent.deprecated_until = yesterday.toISOString().split('T')[0];
      saveRegistry(registry);

      const result = runCLI(`archive ${agentName}`);
      expect(result.success).toBe(true);
      expect(result.output).toContain('archived and removed from registry');

      // Verify removed from registry
      const updatedRegistry = loadRegistry();
      const archivedAgent = updatedRegistry.agents.find(a => a.id === agentName);
      expect(archivedAgent).toBeUndefined();

      // Verify file moved to archive
      const archiveDir = path.join(REPO_ROOT, '.claude', 'agents', 'archive');
      const archiveFiles = fs.readdirSync(archiveDir);
      const archivedFile = archiveFiles.find(f => f.startsWith(agentName));
      expect(archivedFile).toBeTruthy();
      expect(archivedFile).toMatch(/^test-archive-agent-deprecated-\d{4}-\d{2}-\d{2}\.md$/);

      // Clean up archive file
      if (archivedFile) {
        const archivePath = path.join(archiveDir, archivedFile);
        fs.unlinkSync(archivePath);
      }
    });

    test('should fail if grace period has not expired', () => {
      const agentName = 'test-early-archive';
      const agentFile = path.join(REPO_ROOT, '.claude', 'agents', `${agentName}.md`);
      testFiles.push(agentFile);

      // Create and deprecate agent
      runCLI(`create claude --name ${agentName} --category test`);
      runCLI(`warn ${agentName} --reason "Testing early archive"`);

      // Try to archive immediately (grace period not expired)
      const result = runCLI(`archive ${agentName}`, true);
      expect(result.success).toBe(false);
      expect(result.output).toContain('grace period has not expired');
    });

    test('should fail if agent is not deprecated', () => {
      const agentName = 'test-not-deprecated';
      const agentFile = path.join(REPO_ROOT, '.claude', 'agents', `${agentName}.md`);
      testFiles.push(agentFile);

      runCLI(`create claude --name ${agentName} --category test`);

      // Try to archive without deprecating first
      const result = runCLI(`archive ${agentName}`, true);
      expect(result.success).toBe(false);
      expect(result.output).toContain('is not deprecated');
    });

    test('should fail if agent does not exist', () => {
      const result = runCLI('archive nonexistent-agent', true);
      expect(result.success).toBe(false);
      expect(result.output).toContain('not found');
    });

    test('should handle missing source file gracefully', () => {
      const agentName = 'test-missing-file';
      const agentFile = path.join(REPO_ROOT, '.claude', 'agents', `${agentName}.md`);

      // Create and deprecate agent
      runCLI(`create claude --name ${agentName} --category test`);

      // Manually set deprecated_until to yesterday
      const registry = loadRegistry();
      const agent = registry.agents.find(a => a.id === agentName);
      agent.deprecated = true;
      agent.deprecatedAt = new Date().toISOString();
      agent.deprecationReason = 'Test missing file';
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      agent.deprecated_until = yesterday.toISOString().split('T')[0];
      saveRegistry(registry);

      // Delete the file manually
      fs.unlinkSync(agentFile);

      // Archive should proceed without the file
      const result = runCLI(`archive ${agentName}`);
      expect(result.success).toBe(true);
      expect(result.output).toContain('File may have been manually deleted');
      expect(result.output).toContain('archived and removed from registry');

      // Verify removed from registry
      const updatedRegistry = loadRegistry();
      const archivedAgent = updatedRegistry.agents.find(a => a.id === agentName);
      expect(archivedAgent).toBeUndefined();
    });
  });

  describe('schema validation', () => {
    test('registry should match schema structure', () => {
      const registry = loadRegistry();

      // Check metadata structure
      expect(registry.metadata).toBeDefined();
      expect(registry.metadata.version).toBeDefined();
      expect(registry.metadata.lastSyncAt).toBeTruthy();
      expect(registry.metadata.totalAgents).toBeGreaterThanOrEqual(0);

      // Check agents array
      expect(Array.isArray(registry.agents)).toBe(true);

      // Check required fields on first agent
      if (registry.agents.length > 0) {
        const agent = registry.agents[0];
        expect(agent.id).toBeDefined();
        expect(agent.name).toBeDefined();
        expect(agent.type).toMatch(/^(claude|cloud)$/);
        expect(agent.filePath).toBeDefined();
        expect(agent.category).toBeDefined();
        expect(agent.description).toBeDefined();
      }
    });
  });

  describe('generate-docs command', () => {
    const AUDIT_DOC_PATH = path.join(REPO_ROOT, 'docs', 'agent-system-audit.md');
    const ALIGNMENT_DOC_PATH = path.join(REPO_ROOT, 'docs', 'claude-cursor-agent-alignment.md');
    let auditDocBackup;
    let alignmentDocBackup;

    beforeEach(() => {
      // Backup original docs
      if (fs.existsSync(AUDIT_DOC_PATH)) {
        auditDocBackup = fs.readFileSync(AUDIT_DOC_PATH, 'utf8');
      }
      if (fs.existsSync(ALIGNMENT_DOC_PATH)) {
        alignmentDocBackup = fs.readFileSync(ALIGNMENT_DOC_PATH, 'utf8');
      }

      // Ensure registry is synced
      runCLI('sync');
    });

    afterEach(() => {
      // Restore original docs
      if (auditDocBackup) {
        fs.writeFileSync(AUDIT_DOC_PATH, auditDocBackup, 'utf8');
      }
      if (alignmentDocBackup) {
        fs.writeFileSync(ALIGNMENT_DOC_PATH, alignmentDocBackup, 'utf8');
      }
    });

    test('should generate all blocks successfully', () => {
      const result = runCLI('generate-docs');
      expect(result.success).toBe(true);
      expect(result.output).toContain('✓ Validated registry schema');
      expect(result.output).toContain('✓ Generated agent-count block');
      expect(result.output).toContain('✓ Generated agent-catalog block');
      expect(result.output).toContain('✓ Generated automation-candidates block');
      expect(result.output).toContain('✓ Generated agent-mapping block');
      expect(result.output).toContain('✓ Generated registry-reference block');
      expect(result.output).toContain('✓ Documentation generation complete');
    });

    test('should fail with clear error when registry is empty', () => {
      // Create empty registry
      const registryBackup = fs.readFileSync(REGISTRY_PATH, 'utf8');
      const emptyRegistry = {
        metadata: {
          version: '1.0.0',
          description: 'Agent Registry',
          lastSyncAt: new Date().toISOString(),
          totalAgents: 0,
          claudeAgents: 0,
          cloudAgents: 0
        },
        agents: []
      };
      fs.writeFileSync(REGISTRY_PATH, JSON.stringify(emptyRegistry, null, 2), 'utf8');

      // Run generate-docs and expect failure
      const result = runCLI('generate-docs', true);
      expect(result.success).toBe(false);
      expect(result.output).toContain('[generate-docs] Error: No agents found in registry');
      expect(result.output).toContain('Run \'sync\' first');

      // Restore registry
      fs.writeFileSync(REGISTRY_PATH, registryBackup, 'utf8');
    });

    test('should update agent-count block with correct format', () => {
      runCLI('generate-docs');

      const content = fs.readFileSync(AUDIT_DOC_PATH, 'utf8');
      const registry = loadRegistry();

      // Check that block exists and contains correct data
      expect(content).toContain('<!-- AUTO-GENERATED:START:agent-count -->');
      expect(content).toContain('<!-- AUTO-GENERATED:END:agent-count -->');
      expect(content).toContain(`**Total Agents:** ${registry.metadata.totalAgents}`);
      expect(content).toContain(`**Claude Agents:** ${registry.metadata.claudeAgents}`);
      expect(content).toContain(`**Cloud Agents:** ${registry.metadata.cloudAgents}`);
      expect(content).toContain('Auto-generated from `repo_state/agent-registry.json`');
    });

    test('should update agent-catalog table with correct columns', () => {
      runCLI('generate-docs');

      const content = fs.readFileSync(AUDIT_DOC_PATH, 'utf8');
      const registry = loadRegistry();

      // Check table headers
      expect(content).toContain('| ID | Category | Type | Description | Automation Candidate |');
      expect(content).toContain('|---|---|---|---|---|');

      // Check that agents appear in table
      const firstAgent = registry.agents[0];
      if (firstAgent) {
        expect(content).toContain(`| ${firstAgent.id} | ${firstAgent.category} | ${firstAgent.type} |`);
      }

      // Check automation candidate marker
      const autoCandidate = registry.agents.find(a => a.automationCandidate);
      if (autoCandidate) {
        const regex = new RegExp(`\\| ${autoCandidate.id} \\|.*\\| ✓ \\|`);
        expect(content).toMatch(regex);
      }
    });

    test('should update automation-candidates list correctly', () => {
      runCLI('generate-docs');

      const content = fs.readFileSync(AUDIT_DOC_PATH, 'utf8');
      const registry = loadRegistry();
      const candidates = registry.agents.filter(a => a.automationCandidate);

      expect(content).toContain('<!-- AUTO-GENERATED:START:automation-candidates -->');
      expect(content).toContain('<!-- AUTO-GENERATED:END:automation-candidates -->');
      expect(content).toContain('### Automation Candidates');

      // Check that each candidate appears
      candidates.forEach(agent => {
        expect(content).toContain(`**${agent.id}**`);
        expect(content).toContain(`File: \`${agent.filePath}\``);
      });
    });

  describe('generate-skill-rules command', () => {
    const SKILL_RULES_BASE_PATH = path.join(REPO_ROOT, '.claude', 'skills', 'skill-rules.json');
    const SKILL_RULES_GENERATED_PATH = path.join(REPO_ROOT, '.claude', 'skills', 'skill-rules.generated.json');
    let generatedBackup;

    beforeAll(() => {
      if (!fs.existsSync(SKILL_RULES_BASE_PATH)) {
        throw new Error(`Base skill rules not found at ${SKILL_RULES_BASE_PATH}`);
      }
      if (fs.existsSync(SKILL_RULES_GENERATED_PATH)) {
        generatedBackup = fs.readFileSync(SKILL_RULES_GENERATED_PATH, 'utf8');
      }
    });

    afterAll(() => {
      if (generatedBackup !== undefined) {
        fs.writeFileSync(SKILL_RULES_GENERATED_PATH, generatedBackup, 'utf8');
      } else if (fs.existsSync(SKILL_RULES_GENERATED_PATH)) {
        fs.unlinkSync(SKILL_RULES_GENERATED_PATH);
      }
    });

    test('should generate skill-rules.generated.json with preserved base skills', () => {
      const result = runCLI('generate-skill-rules');
      expect(result.success).toBe(true);
      expect(result.output).toContain('Generating skill-rules from agent registry');

      expect(fs.existsSync(SKILL_RULES_GENERATED_PATH)).toBe(true);

      const base = JSON.parse(fs.readFileSync(SKILL_RULES_BASE_PATH, 'utf8'));
      const generated = JSON.parse(fs.readFileSync(SKILL_RULES_GENERATED_PATH, 'utf8'));

      // Top-level skills set should be identical
      expect(Object.keys(generated.skills).sort()).toEqual(Object.keys(base.skills).sort());

      // For each skill, promptTriggers must be preserved exactly
      Object.keys(base.skills).forEach(skillId => {
        const baseSkill = base.skills[skillId];
        const generatedSkill = generated.skills[skillId];

        expect(generatedSkill).toBeDefined();
        expect(generatedSkill.promptTriggers).toEqual(baseSkill.promptTriggers);
      });
    });

    test('should add registryTriggers for known mapping targets', () => {
      const result = runCLI('generate-skill-rules');
      expect(result.success).toBe(true);

      const generated = JSON.parse(fs.readFileSync(SKILL_RULES_GENERATED_PATH, 'utf8'));
      const codeReviewSkill = generated.skills['code-review-trigger'];
      const testingSkill = generated.skills['testing-trigger'];

      expect(codeReviewSkill).toBeDefined();
      expect(testingSkill).toBeDefined();

      // Registry triggers should exist and be arrays (may be empty if filters change)
      expect(codeReviewSkill.registryTriggers).toBeDefined();
      expect(Array.isArray(codeReviewSkill.registryTriggers.keywords)).toBe(true);
      expect(Array.isArray(codeReviewSkill.registryTriggers.intentPatterns)).toBe(true);

      expect(testingSkill.registryTriggers).toBeDefined();
      expect(Array.isArray(testingSkill.registryTriggers.keywords)).toBe(true);
      expect(Array.isArray(testingSkill.registryTriggers.intentPatterns)).toBe(true);

      // With current registry snapshot, we expect at least one registry keyword for each
      expect(codeReviewSkill.registryTriggers.keywords.length).toBeGreaterThan(0);
      expect(testingSkill.registryTriggers.keywords.length).toBeGreaterThan(0);
    });
  });

    test('should update agent-mapping table in alignment doc', () => {
      runCLI('generate-docs');

      const content = fs.readFileSync(ALIGNMENT_DOC_PATH, 'utf8');
      const registry = loadRegistry();
      const candidates = registry.agents.filter(a => a.automationCandidate);

      expect(content).toContain('<!-- AUTO-GENERATED:START:agent-mapping -->');
      expect(content).toContain('<!-- AUTO-GENERATED:END:agent-mapping -->');
      expect(content).toContain('| Claude Agent | Category | Cloud Agent Use Case | Trigger | File |');

      // Check that candidates appear
      candidates.forEach(agent => {
        expect(content).toContain(`| **${agent.id}** |`);
        expect(content).toContain(`\`${agent.filePath}\``);
      });
    });

    test('should update registry-reference block in alignment doc', () => {
      runCLI('generate-docs');

      const content = fs.readFileSync(ALIGNMENT_DOC_PATH, 'utf8');

      expect(content).toContain('<!-- AUTO-GENERATED:START:registry-reference -->');
      expect(content).toContain('<!-- AUTO-GENERATED:END:registry-reference -->');
      expect(content).toContain('**Source of Truth:**');
      expect(content).toContain('`repo_state/agent-registry.json`');
      expect(content).toContain('node scripts/agent-registry.js sync');
    });

    test('should be idempotent - running twice produces same output', () => {
      // Run generate-docs twice
      runCLI('generate-docs');
      const firstRun = fs.readFileSync(AUDIT_DOC_PATH, 'utf8');

      runCLI('generate-docs');
      const secondRun = fs.readFileSync(AUDIT_DOC_PATH, 'utf8');

      // Normalize timestamps for comparison
      const normalize = (content) => {
        return content.replace(/Last updated: [^\*]+/g, 'Last updated: TIMESTAMP');
      };

      expect(normalize(firstRun)).toBe(normalize(secondRun));
    });

    test('should preserve manual sections outside markers', () => {
      const originalContent = fs.readFileSync(AUDIT_DOC_PATH, 'utf8');

      // Check for a manual section
      const manualSection = '## System Comparison';
      expect(originalContent).toContain(manualSection);

      // Run generate-docs
      runCLI('generate-docs');

      const updatedContent = fs.readFileSync(AUDIT_DOC_PATH, 'utf8');

      // Manual section should still exist
      expect(updatedContent).toContain(manualSection);

      // Other manual sections should also be preserved
      expect(updatedContent).toContain('## Cursor Cloud Agents API');
      expect(updatedContent).toContain('## Agent Selection Decision Tree');
    });

    test('should warn when markers are not found', () => {
      // Create a temporary doc without markers
      const tempDocPath = path.join(REPO_ROOT, 'docs', 'temp-test-doc.md');
      fs.writeFileSync(tempDocPath, '# Test Doc\n\nNo markers here.', 'utf8');
      testFiles.push(tempDocPath);

      // This test just verifies the command runs without error when markers are missing
      // The actual warning is shown in stdout, which we can check
      const result = runCLI('generate-docs');
      expect(result.success).toBe(true);
      // The command should complete but note that some sections were skipped
    });

    test('should fail with clear error on unpaired markers', () => {
      // Create a temporary doc with unpaired markers (START without END)
      const tempContent = `
# Test Doc

<!-- AUTO-GENERATED:START:agent-count -->
Some content
<!-- Missing END marker -->
`;

      fs.writeFileSync(AUDIT_DOC_PATH, tempContent, 'utf8');

      const result = runCLI('generate-docs', true);
      expect(result.success).toBe(false);
      expect(result.output).toContain('Unpaired markers');
      expect(result.output).toContain('agent-count');
    });

    test('should fail with clear error when END marker exists without START', () => {
      // Create a temporary doc with END marker but no START marker
      const tempContent = `
# Test Doc

Some content
<!-- AUTO-GENERATED:END:agent-count -->
`;

      fs.writeFileSync(AUDIT_DOC_PATH, tempContent, 'utf8');

      const result = runCLI('generate-docs', true);
      expect(result.success).toBe(false);
      expect(result.output).toContain('[generate-docs] Error: Found END marker');
      expect(result.output).toContain('agent-count');
      expect(result.output).toContain('without matching START marker');
    });

    test('should validate registry schema before generating', () => {
      // Save current registry
      const registryBackup = fs.readFileSync(REGISTRY_PATH, 'utf8');

      try {
        // Create invalid registry (missing required field)
        const invalidRegistry = {
          metadata: {
            // Missing required fields
          },
          agents: []
        };

        fs.writeFileSync(REGISTRY_PATH, JSON.stringify(invalidRegistry), 'utf8');

        const result = runCLI('generate-docs', true);
        expect(result.success).toBe(false);
        expect(result.output).toContain('validation failed');
      } finally {
        // Restore registry
        fs.writeFileSync(REGISTRY_PATH, registryBackup, 'utf8');
      }
    });
  });
});
