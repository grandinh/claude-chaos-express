---
name: REPAIR-agent-registry-sot
branch: feature/REPAIR-agent-registry-sot
status: pending
created: 2025-11-16
priority: high
---

# REPAIR: Restore Agent Registry Source of Truth

## Problem/Goal
`scripts/agent-registry.js` and multiple docs expect `repo_state/agent-registry.json` plus a schema, but those files are absent, causing the CLI to crash and auto-generated docs to be stale. Recreate the registry SoT and bootstrap logic so the registry pipeline works end-to-end.

## Success Criteria
- [ ] Create `repo_state/agent-registry-schema.json` describing the registry structure and validation rules.
- [ ] Generate an initial `repo_state/agent-registry.json` from `.claude/agents/**` and `.cursor/cloud-agents/*.json`, capturing IDs, categories, automation flags, and links.
- [ ] Update `scripts/agent-registry.js` to bootstrap when missing (e.g., `node scripts/agent-registry.js init`) and to fail gracefully with actionable messaging.
- [ ] Regenerate auto-generated sections in `docs/agent-system-audit.md` and `docs/claude-cursor-agent-alignment.md` from the registry, documenting the command used.
- [ ] Add a `node scripts/agent-registry.js validate` command and record the SoT decision in `context/decisions.md`.

## Context Manifest
- `scripts/agent-registry.js`
- `.claude/agents/**`
- `.cursor/cloud-agents/**`
- `docs/agent-system-audit.md`
- `docs/claude-cursor-agent-alignment.md`
- `repo_state/metadata.json`

## User Notes
- Created by a third-party AI; Claude must validate the plan, summarize benefits/risks to the user, recommend whether to proceed, and wait for explicit user permission before implementation.
- Benefit: unblocks registry CLI and keeps agent docs truthful. Risk: schema mistakes could freeze automation or misreport agent metadata.

## Implementation Instructions

### Step 1: Create Agent Registry Schema

**File:** `repo_state/agent-registry-schema.json`

**Action:** Create the JSON schema file that validates the registry structure:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Agent Registry Schema",
  "description": "Schema for validating agent-registry.json structure",
  "type": "object",
  "required": ["$schema", "metadata", "agents"],
  "properties": {
    "$schema": {
      "type": "string",
      "description": "Reference to this schema file"
    },
    "metadata": {
      "type": "object",
      "required": ["version", "description", "lastSyncAt", "totalAgents"],
      "properties": {
        "version": {
          "type": "string",
          "pattern": "^\\d+\\.\\d+\\.\\d+$",
          "description": "Schema version (semver)"
        },
        "description": {
          "type": "string",
          "description": "Registry description"
        },
        "lastSyncAt": {
          "type": "string",
          "format": "date-time",
          "description": "ISO 8601 timestamp of last sync"
        },
        "totalAgents": {
          "type": "integer",
          "minimum": 0,
          "description": "Total number of agents in registry"
        },
        "claudeAgents": {
          "type": "integer",
          "minimum": 0,
          "description": "Number of Claude agents"
        },
        "cloudAgents": {
          "type": "integer",
          "minimum": 0,
          "description": "Number of Cloud agents"
        },
        "deprecatedAgents": {
          "type": "integer",
          "minimum": 0,
          "description": "Number of deprecated agents"
        },
        "note": {
          "type": "string",
          "description": "Optional note about the registry"
        }
      }
    },
    "agents": {
      "type": "array",
      "items": {
        "oneOf": [
          {
            "$ref": "#/definitions/claudeAgent"
          },
          {
            "$ref": "#/definitions/cloudAgent"
          }
        ]
      }
    }
  },
  "definitions": {
    "claudeAgent": {
      "type": "object",
      "required": ["id", "name", "type", "filePath", "category", "deprecated"],
      "properties": {
        "id": {
          "type": "string",
          "pattern": "^[a-z0-9-]+$",
          "description": "Unique agent identifier (lowercase, hyphens)"
        },
        "name": {
          "type": "string",
          "description": "Agent name"
        },
        "type": {
          "type": "string",
          "enum": ["claude"],
          "description": "Agent type"
        },
        "filePath": {
          "type": "string",
          "pattern": "^\\.claude/agents/.+\\.md$",
          "description": "Relative path to agent file"
        },
        "category": {
          "type": "string",
          "description": "Agent category (framework, devops, general, etc.)"
        },
        "description": {
          "type": "string",
          "description": "Agent description"
        },
        "tools": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "List of tools available to agent"
        },
        "model": {
          "type": ["string", "null"],
          "enum": ["sonnet", "inherit", null],
          "description": "Model preference (sonnet, inherit, or null)"
        },
        "cloudAgentId": {
          "type": ["string", "null"],
          "description": "Linked Cloud Agent ID (if any)"
        },
        "automationCandidate": {
          "type": "boolean",
          "description": "Whether agent is candidate for automation"
        },
        "deprecated": {
          "type": "boolean",
          "description": "Whether agent is deprecated"
        },
        "deprecatedAt": {
          "type": ["string", "null"],
          "format": "date-time",
          "description": "When agent was deprecated (ISO 8601)"
        },
        "deprecationReason": {
          "type": ["string", "null"],
          "description": "Reason for deprecation"
        },
        "deprecated_until": {
          "type": ["string", "null"],
          "format": "date",
          "description": "Date when agent will be archived (YYYY-MM-DD)"
        }
      }
    },
    "cloudAgent": {
      "type": "object",
      "required": ["id", "name", "type", "filePath", "category", "trigger", "deprecated"],
      "properties": {
        "id": {
          "type": "string",
          "pattern": "^[a-z0-9-]+$",
          "description": "Unique agent identifier"
        },
        "name": {
          "type": "string",
          "description": "Agent display name"
        },
        "type": {
          "type": "string",
          "enum": ["cloud"],
          "description": "Agent type"
        },
        "filePath": {
          "type": "string",
          "pattern": "^\\.cursor/cloud-agents/.+\\.json$",
          "description": "Relative path to Cloud Agent config"
        },
        "category": {
          "type": "string",
          "description": "Agent category"
        },
        "description": {
          "type": "string",
          "description": "Agent description"
        },
        "claudeAgentId": {
          "type": ["string", "null"],
          "description": "Linked Claude Agent ID"
        },
        "trigger": {
          "type": "string",
          "enum": ["scheduled", "webhook", "manual"],
          "description": "Trigger type"
        },
        "schedule": {
          "type": ["string", "null"],
          "pattern": "^([0-9*]+\\s+){4}[0-9*]+$",
          "description": "Cron expression (if scheduled)"
        },
        "webhookEvent": {
          "type": ["string", "null"],
          "enum": ["pull_request", "push", "issue", null],
          "description": "Webhook event type (if webhook trigger)"
        },
        "deprecated": {
          "type": "boolean",
          "description": "Whether agent is deprecated"
        },
        "deprecatedAt": {
          "type": ["string", "null"],
          "format": "date-time",
          "description": "When agent was deprecated"
        },
        "deprecationReason": {
          "type": ["string", "null"],
          "description": "Reason for deprecation"
        },
        "lastRunAt": {
          "type": ["string", "null"],
          "format": "date-time",
          "description": "Last execution time"
        },
        "runCount": {
          "type": "integer",
          "minimum": 0,
          "description": "Total number of executions"
        },
        "recentRuns": {
          "type": "array",
          "items": {
            "type": "string",
            "format": "date-time"
          },
          "description": "Recent execution timestamps"
        },
        "deprecated_until": {
          "type": ["string", "null"],
          "format": "date",
          "description": "Date when agent will be archived"
        }
      }
    }
  }
}
```

### Step 2: Add Bootstrap Logic to agent-registry.js

**File:** `scripts/agent-registry.js`

**Location:** Replace the schema loading section (lines 42-53) with graceful error handling and bootstrap:

```javascript
// Initialize schema validator (compile once)
let schemaValidator = null;

function loadSchema() {
  try {
    if (!fs.existsSync(SCHEMA_PATH)) {
      error(`Schema file not found: ${SCHEMA_PATH}`);
      info('Run "node scripts/agent-registry.js init" to bootstrap the registry');
      return null;
    }
    const schemaContent = fs.readFileSync(SCHEMA_PATH, 'utf8');
    const schema = JSON.parse(schemaContent);
    const ajv = new Ajv({ allErrors: true, verbose: true });
    addFormats(ajv);
    return ajv.compile(schema);
  } catch (err) {
    error(`Failed to load schema: ${err.message}`);
    if (err.code === 'ENOENT') {
      info('Run "node scripts/agent-registry.js init" to bootstrap the registry');
    }
    return null;
  }
}

// Load schema on startup (but don't exit if missing - allow init command)
schemaValidator = loadSchema();
```

**Location:** Add `init` command handler in the `main()` function (around line 1333, add before `case 'sync':`):

```javascript
switch (command) {
  case 'init':
    cmdInit();
    break;

  case 'sync':
    // ... existing code ...
```

**Location:** Add `cmdInit()` function before the `main()` function (around line 1300):

```javascript
//!> Initialize registry (bootstrap)
function cmdInit() {
  info('Initializing agent registry...');
  
  // Check if schema exists
  if (fs.existsSync(SCHEMA_PATH)) {
    warning(`Schema already exists: ${SCHEMA_PATH}`);
    info('Skipping schema creation. Use "sync" to update registry.');
    return;
  }
  
  // Create schema file
  const schema = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "Agent Registry Schema",
    "description": "Schema for validating agent-registry.json structure",
    "type": "object",
    "required": ["$schema", "metadata", "agents"],
    // ... (use full schema from Step 1)
  };
  
  // Ensure repo_state directory exists
  const repoStateDir = path.dirname(SCHEMA_PATH);
  if (!fs.existsSync(repoStateDir)) {
    fs.mkdirSync(repoStateDir, { recursive: true });
  }
  
  fs.writeFileSync(SCHEMA_PATH, JSON.stringify(schema, null, 2));
  success(`Created schema: ${SCHEMA_PATH}`);
  
  // Check if registry exists
  if (fs.existsSync(REGISTRY_PATH)) {
    info(`Registry already exists: ${REGISTRY_PATH}`);
    info('Use "sync" to update registry from agent files.');
  } else {
    // Generate initial registry
    info('Generating initial registry from agent files...');
    cmdSync({});
    success(`Created registry: ${REGISTRY_PATH}`);
  }
  
  // Reload schema validator
  schemaValidator = loadSchema();
  if (schemaValidator) {
    success('Registry initialized successfully!');
  } else {
    error('Failed to load schema after creation');
    process.exit(1);
  }
}
//!<
```

**Location:** Update `main()` to handle missing schema gracefully (modify the switch statement to check schema before operations):

```javascript
// Main CLI
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Agent Registry Management CLI');
    console.log('');
    console.log('Commands:');
    console.log('  init                                     - Bootstrap registry (create schema and initial registry)');
    console.log('  sync                                     - Scan .claude/agents/ and update registry');
    console.log('  validate                                 - Validate registry against schema');
    console.log('  check <agent-name>                       - Check for duplicates before creation');
    // ... rest of commands ...
    process.exit(0);
  }

  const command = args[0];
  
  // Allow init command even if schema is missing
  if (command !== 'init' && !schemaValidator) {
    error('Schema not found. Run "node scripts/agent-registry.js init" first.');
    process.exit(1);
  }

  switch (command) {
    case 'init':
      cmdInit();
      break;
    
    case 'validate':
      cmdValidate();
      break;
    
    // ... rest of cases ...
  }
}
```

**Location:** Add `cmdValidate()` function (before `main()`, around line 1300):

```javascript
//!> Validate registry against schema
function cmdValidate() {
  if (!schemaValidator) {
    error('Schema validator not initialized');
    process.exit(1);
  }
  
  if (!fs.existsSync(REGISTRY_PATH)) {
    error(`Registry file not found: ${REGISTRY_PATH}`);
    info('Run "node scripts/agent-registry.js init" to create it');
    process.exit(1);
  }
  
  try {
    const registryContent = fs.readFileSync(REGISTRY_PATH, 'utf8');
    const registry = JSON.parse(registryContent);
    
    const valid = schemaValidator(registry);
    
    if (valid) {
      success('Registry is valid!');
      info(`Total agents: ${registry.metadata.totalAgents}`);
      info(`  Claude agents: ${registry.metadata.claudeAgents || 0}`);
      info(`  Cloud agents: ${registry.metadata.cloudAgents || 0}`);
      info(`  Deprecated: ${registry.metadata.deprecatedAgents || 0}`);
    } else {
      error('Registry validation failed:');
      schemaValidator.errors.forEach(err => {
        const path = err.instancePath || err.schemaPath;
        error(`  ${path}: ${err.message}`);
      });
      process.exit(1);
    }
  } catch (err) {
    error(`Failed to validate registry: ${err.message}`);
    if (err instanceof SyntaxError) {
      error('Registry file contains invalid JSON');
    }
    process.exit(1);
  }
}
//!<
```

### Step 3: Update Schema Loading to Be Non-Fatal

**File:** `scripts/agent-registry.js`

**Action:** The schema loading is already updated in Step 2. Ensure all commands that require schema check for it:

**Location:** Update any function that uses `schemaValidator` to check if it exists first (search for `schemaValidator(` and add checks):

```javascript
// Example: In any function using schemaValidator
if (!schemaValidator) {
  error('Schema validator not initialized');
  info('Run "node scripts/agent-registry.js init" to bootstrap');
  process.exit(1);
}
```

### Step 4: Record SoT Decision

**File:** `context/decisions.md`

**Action:** Add entry documenting the registry SoT decision:

```markdown
## 2025-01-27: Agent Registry Source of Truth

**Decision:** `repo_state/agent-registry.json` is the canonical source of truth for all agent metadata. The schema file `repo_state/agent-registry-schema.json` validates registry structure.

**Rationale:**
- Centralizes agent information in one place
- Enables automated documentation generation
- Provides validation to prevent registry corruption
- Supports automation pipeline that depends on agent metadata

**Bootstrap:** Run `node scripts/agent-registry.js init` to create schema and initial registry if missing.

**Maintenance:** Run `node scripts/agent-registry.js sync` to update registry from agent files. Run `node scripts/agent-registry.js validate` to verify registry integrity.

**Related Files:**
- `scripts/agent-registry.js` - Registry management CLI
- `repo_state/agent-registry.json` - Registry data
- `repo_state/agent-registry-schema.json` - Validation schema
- `docs/agent-system-audit.md` - Auto-generated from registry
- `docs/claude-cursor-agent-alignment.md` - Auto-generated from registry
```

### Step 5: Testing

1. **Test bootstrap:**
   - Delete `repo_state/agent-registry-schema.json` if it exists
   - Run `node scripts/agent-registry.js init`
   - Verify schema file is created
   - Verify registry is generated if missing

2. **Test graceful failure:**
   - Delete schema file
   - Run any command except `init`
   - Verify error message suggests running `init`

3. **Test validation:**
   - Run `node scripts/agent-registry.js validate`
   - Verify it reports registry status
   - Corrupt registry JSON and verify validation catches it

4. **Test sync:**
   - Run `node scripts/agent-registry.js sync`
   - Verify registry updates from agent files
   - Verify schema validation passes

## Work Log
- [2025-11-16] Task authored during audit; awaiting Claude validation and user permission.
