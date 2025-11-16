const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const { validateCronExpression } = require('../validate-cron-expressions');
const { validateRegistryLinks } = require('../validate-registry-links');

describe('Cloud Agent Validation', () => {
  const REPO_ROOT = path.join(__dirname, '../..');
  const SCHEMA_PATH = path.join(REPO_ROOT, 'schemas', 'cloud-agent-config.json');
  const CLOUD_AGENTS_DIR = path.join(REPO_ROOT, '.cursor', 'cloud-agents');
  const REGISTRY_PATH = path.join(REPO_ROOT, 'repo_state', 'agent-registry.json');

  let schema;
  let ajv;
  let validate;

  beforeAll(() => {
    // Load and compile schema
    const schemaContent = fs.readFileSync(SCHEMA_PATH, 'utf8');
    schema = JSON.parse(schemaContent);

    ajv = new Ajv({ allErrors: true, verbose: true });
    addFormats(ajv);
    validate = ajv.compile(schema);
  });

  describe('Cloud Agent Config Schema', () => {
    test('schema should be valid JSON Schema', () => {
      expect(schema).toBeDefined();
      expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
      expect(schema.type).toBe('object');
    });

    test('schema should require essential fields', () => {
      expect(schema.required).toContain('$schema');
      expect(schema.required).toContain('name');
      expect(schema.required).toContain('description');
      expect(schema.required).toContain('claudeAgentId');
      expect(schema.required).toContain('trigger');
      expect(schema.required).toContain('model');
      expect(schema.required).toContain('prompt');
      expect(schema.required).toContain('output');
      expect(schema.required).toContain('metadata');
    });

    test('schema should define trigger types', () => {
      const triggerProp = schema.properties.trigger;
      expect(triggerProp).toBeDefined();
      expect(triggerProp.type).toBe('object');
    });
  });

  describe('Production Cloud Agent Configs', () => {
    const productionConfigs = [
      'doc-sync.json',
      'debt-scanner.json',
      'a11y-guard.json',
      'modernize-bot.json',
      'commit-gen.json',
      'review-bot.json'
    ];

    productionConfigs.forEach(configFile => {
      describe(configFile, () => {
        let config;

        beforeAll(() => {
          const configPath = path.join(CLOUD_AGENTS_DIR, configFile);
          const configContent = fs.readFileSync(configPath, 'utf8');
          config = JSON.parse(configContent);
        });

        test('should be valid JSON', () => {
          expect(config).toBeDefined();
        });

        test('should pass schema validation', () => {
          const valid = validate(config);
          if (!valid) {
            console.error('Validation errors:', validate.errors);
          }
          expect(valid).toBe(true);
        });

        test('should have required top-level fields', () => {
          expect(config.$schema).toBeDefined();
          expect(config.name).toBeDefined();
          expect(config.description).toBeDefined();
          expect(config.claudeAgentId).toBeDefined();
          expect(config.trigger).toBeDefined();
          expect(config.model).toBeDefined();
          expect(config.prompt).toBeDefined();
          expect(config.output).toBeDefined();
          expect(config.metadata).toBeDefined();
        });

        test('should have valid trigger type', () => {
          expect(['schedule', 'webhook', 'manual']).toContain(config.trigger.type);
        });

        test('should have valid model', () => {
          expect(['claude-opus-4', 'claude-sonnet-4', 'claude-haiku-4']).toContain(config.model);
        });

        test('should have valid trigger-specific fields', () => {
          if (config.trigger.type === 'schedule') {
            expect(config.trigger.schedule).toBeDefined();
            const result = validateCronExpression(config.trigger.schedule);
            if (!result.valid) {
              console.error('Cron validation errors:', result.errors);
            }
            expect(result.valid).toBe(true);

            expect(config.trigger.description).toBeDefined();
            expect(config.trigger.description.length).toBeGreaterThan(10);
          }

          if (config.trigger.type === 'webhook') {
            expect(config.trigger.events).toBeDefined();
            expect(Array.isArray(config.trigger.events)).toBe(true);
            expect(config.trigger.events.length).toBeGreaterThan(0);

            config.trigger.events.forEach(event => {
              expect(event).toMatch(/^[a-z_]+\.[a-z_]+$/);
            });
          }
        });

        test('should have non-empty prompt template', () => {
          expect(config.prompt.template).toBeDefined();
          expect(config.prompt.template.length).toBeGreaterThan(50);
        });

        test('should have valid metadata', () => {
          expect(config.metadata.category).toBeDefined();
          expect(config.metadata.priority).toBeDefined();
          expect(['critical', 'high', 'medium', 'low']).toContain(config.metadata.priority);
        });
      });
    });
  });

  describe('Cron Expression Validation', () => {
    test('should validate basic cron expressions', () => {
      expect(validateCronExpression('0 9 * * 1').valid).toBe(true);
      expect(validateCronExpression('0 10 1 * *').valid).toBe(true);
      expect(validateCronExpression('0 11 1 1,4,7,10 *').valid).toBe(true);
    });

    test('should reject invalid cron expressions', () => {
      expect(validateCronExpression('invalid').valid).toBe(false);
      expect(validateCronExpression('60 25 32 13 8').valid).toBe(false);
      expect(validateCronExpression('* * *').valid).toBe(false); // too few fields
    });

    test('should validate cron ranges', () => {
      expect(validateCronExpression('0-30 * * * *').valid).toBe(true);
      expect(validateCronExpression('0 9-17 * * *').valid).toBe(true);
    });

    test('should validate cron lists', () => {
      expect(validateCronExpression('0 9,12,15 * * *').valid).toBe(true);
      expect(validateCronExpression('* * * 1,4,7,10 *').valid).toBe(true);
    });

    test('should validate cron step values', () => {
      expect(validateCronExpression('*/5 * * * *').valid).toBe(true);
      expect(validateCronExpression('0 */2 * * *').valid).toBe(true);
    });
  });

  describe('Registry Link Validation', () => {
    let registry;

    beforeAll(() => {
      const registryContent = fs.readFileSync(REGISTRY_PATH, 'utf8');
      registry = JSON.parse(registryContent);
    });

    test('should load registry successfully', () => {
      expect(registry).toBeDefined();
      expect(registry.agents).toBeDefined();
      expect(Array.isArray(registry.agents)).toBe(true);
    });

    test('should have bidirectional links for project agents', () => {
      const results = validateRegistryLinks({ silent: true, exitOnError: false });

      // We expect 2 valid bidirectional links (doc-sync ↔ service-documentation, review-bot ↔ code-review-expert)
      expect(results.validLinks).toBe(2);
    });

    test('should identify expected parent workspace references', () => {
      const results = validateRegistryLinks({ silent: true, exitOnError: false });

      // 4 Cloud Agents reference parent workspace agents (not in project registry)
      // This is expected and documented in the registry
      expect(results.brokenLinks).toBe(4);
    });

    test('should have Cloud Agents in registry', () => {
      const cloudAgents = registry.agents.filter(a => a.type === 'cloud');
      expect(cloudAgents.length).toBe(6);
    });

    test('all Cloud Agents should reference Claude agents', () => {
      const cloudAgents = registry.agents.filter(a => a.type === 'cloud');
      cloudAgents.forEach(agent => {
        expect(agent.claudeAgentId).toBeDefined();
        expect(agent.claudeAgentId.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Config File Completeness', () => {
    test('should have 6 production Cloud Agent configs', () => {
      const configFiles = fs.readdirSync(CLOUD_AGENTS_DIR)
        .filter(file => file.endsWith('.json') && !file.includes('test') && !file.includes('package'));

      expect(configFiles.length).toBeGreaterThanOrEqual(6);
    });

    test('all configs should reference the schema', () => {
      const configFiles = fs.readdirSync(CLOUD_AGENTS_DIR)
        .filter(file => file.endsWith('.json') && !file.includes('test') && !file.includes('package'));

      configFiles.forEach(file => {
        const configPath = path.join(CLOUD_AGENTS_DIR, file);
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

        if (file !== 'test-cloud-debug.json') {
          expect(config.$schema).toBe('../schemas/cloud-agent-config.json');
        }
      });
    });
  });
});
