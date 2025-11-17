---
name: h-breach-telemetry-ledger
branch: feature/h-breach-telemetry-ledger
status: pending
created: 2025-11-16
priority: medium
---

# Build Automated Breach Telemetry Ledger

## Problem/Goal
Incident templates capture anomaly checklists and severity, but there is no aggregated ledger to track veil integrity over time. Create an automated ledger under `/hazards` to summarize incidents and open breaches.

## Success Criteria
- [ ] Implement `scripts/anomaly-ledger.js` to parse `incidents/*.md`, extract checklist/severity/status, and generate `hazards/anomaly-ledger.md` with counts, MTTR per anomaly type, and top open breaches.
- [ ] Add `npm run anomalies:sync` to refresh the ledger during CHECK or on demand.
- [ ] Update `docs/ai_handoffs.md` to require linking the latest ledger snapshot in each handoff.
- [ ] Record the new ritual and any assumptions in `context/decisions.md` and `Context/insights.md`.
- [ ] Provide sample output and safeguards for missing or malformed incidents.

## Context Manifest
- `scripts/anomaly-ledger.js`
- `hazards/`
- `incidents/`
- `docs/ai_handoffs.md`
- `Context/insights.md`
- `context/decisions.md`

## User Notes
- Created by a third-party AI; Claude must validate the plan, summarize benefits/risks to the user, recommend whether to proceed, and wait for explicit user permission before implementation.
- Benefit: centralized breach visibility and trends. Risk: inaccurate parsing could misrepresent incident data.

## Complete Implementation Code

### Step 1: Create Anomaly Ledger Script

**File:** `scripts/anomaly-ledger.js`

**Complete Code:**

```javascript
#!/usr/bin/env node

/**
 * Anomaly Ledger Generator
 * Parses incidents/*.md files and generates hazards/anomaly-ledger.md
 * with aggregated breach telemetry, MTTR, and open breach summaries.
 */

const fs = require('fs');
const path = require('path');

// Find project root
function findProjectRoot() {
    if (process.env.CLAUDE_PROJECT_DIR) {
        return process.env.CLAUDE_PROJECT_DIR;
    }
    let cur = process.cwd();
    while (cur !== path.dirname(cur)) {
        if (fs.existsSync(path.join(cur, '.claude')) || fs.existsSync(path.join(cur, 'incidents'))) {
            return cur;
        }
        cur = path.dirname(cur);
    }
    throw new Error('Could not find project root');
}

const PROJECT_ROOT = findProjectRoot();
const INCIDENTS_DIR = path.join(PROJECT_ROOT, 'incidents');
const HAZARDS_DIR = path.join(PROJECT_ROOT, 'hazards');
const LEDGER_FILE = path.join(HAZARDS_DIR, 'anomaly-ledger.md');

// Anomaly types from incident template
const ANOMALY_TYPES = [
    'Temporal inconsistencies',
    'Unauthorized route formation',
    'Track 7 manifestation',
    'Log entries in unknown languages',
    'Self-healing code',
    'Middleware executing before definition',
    'Bidirectional observation events',
    'Geometric pattern emergence',
    'Conductor communication attempts',
    'Veil integrity degradation',
    'Glyph corruption or unexpected sigil activation',
    'Other'
];

// Severity levels
const SEVERITY_LEVELS = ['LOW', 'MODERATE', 'HIGH', 'BREACH', 'CONDUCTOR-ADJACENT'];

// Status values
const STATUS_VALUES = ['OPEN', 'INVESTIGATING', 'CONTAINED', 'RESOLVED', 'ACCEPTED'];

/**
 * Parse incident file and extract structured data
 */
function parseIncident(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const filename = path.basename(filePath);
        
        // Skip template
        if (filename === 'INCIDENT-TEMPLATE.md') {
            return null;
        }
        
        const incident = {
            file: filename,
            number: null,
            date: null,
            severity: null,
            status: null,
            reporter: null,
            anomalies: [],
            tags: [],
            cosmicSignificance: null,
            resolutionDate: null,
            mttr: null
        };
        
        // Extract frontmatter-like fields
        const dateMatch = content.match(/\*\*Date:\*\*\s*(.+)/);
        if (dateMatch) {
            incident.date = dateMatch[1].trim();
        }
        
        const severityMatch = content.match(/\*\*Severity:\*\*\s*`?([^`\n]+)`?/);
        if (severityMatch) {
            incident.severity = severityMatch[1].trim();
        }
        
        const statusMatch = content.match(/\*\*Status:\*\*\s*`?([^`\n]+)`?/);
        if (statusMatch) {
            incident.status = statusMatch[1].trim();
        }
        
        const reporterMatch = content.match(/\*\*Reporter:\*\*\s*(.+)/);
        if (reporterMatch) {
            incident.reporter = reporterMatch[1].trim();
        }
        
        // Extract incident number from filename or content
        const numberMatch = filename.match(/INCIDENT-(\d+)/) || content.match(/#\s*INCIDENT-(\d+)/);
        if (numberMatch) {
            incident.number = numberMatch[1];
        }
        
        // Parse Phenomena Checklist
        const checklistMatch = content.match(/## Phenomena Checklist\s*\n([\s\S]*?)(?=\n---|\n##|$)/);
        if (checklistMatch) {
            const checklistContent = checklistMatch[1];
            ANOMALY_TYPES.forEach(anomaly => {
                // Match checked items: - [x] or - [X]
                const regex = new RegExp(`-\\s*\\[xX]\\s*${anomaly.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
                if (regex.test(checklistContent)) {
                    incident.anomalies.push(anomaly);
                }
            });
        }
        
        // Extract tags
        const tagsMatch = content.match(/\*\*Tags:\*\*\s*`([^`]+)`/);
        if (tagsMatch) {
            incident.tags = tagsMatch[1].split(/\s+/).filter(t => t);
        }
        
        // Extract cosmic significance
        const cosmicMatch = content.match(/\*\*Cosmic Significance:\*\*\s*(LOW|MODERATE|HIGH|EXISTENTIAL)/);
        if (cosmicMatch) {
            incident.cosmicSignificance = cosmicMatch[1];
        }
        
        // Try to extract resolution date from containment/resolution section
        const resolutionMatch = content.match(/## Containment Strategy[\s\S]*?Resolution Status:[\s\S]*?(\d{4}-\d{2}-\d{2})/i);
        if (resolutionMatch) {
            incident.resolutionDate = resolutionMatch[1];
        }
        
        // Calculate MTTR if we have both dates
        if (incident.date && incident.resolutionDate && incident.status === 'RESOLVED') {
            try {
                const startDate = new Date(incident.date);
                const endDate = new Date(incident.resolutionDate);
                if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && endDate > startDate) {
                    incident.mttr = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)); // days
                }
            } catch (e) {
                // Date parsing failed, skip MTTR
            }
        }
        
        return incident;
    } catch (error) {
        console.warn(`Warning: Failed to parse ${filePath}: ${error.message}`);
        return null;
    }
}

/**
 * Load all incidents from directory
 */
function loadIncidents() {
    const incidents = [];
    
    if (!fs.existsSync(INCIDENTS_DIR)) {
        console.warn(`Warning: Incidents directory not found: ${INCIDENTS_DIR}`);
        return incidents;
    }
    
    const files = fs.readdirSync(INCIDENTS_DIR);
    
    for (const file of files) {
        if (!file.endsWith('.md')) {
            continue;
        }
        
        const filePath = path.join(INCIDENTS_DIR, file);
        const stats = fs.statSync(filePath);
        
        if (!stats.isFile()) {
            continue;
        }
        
        const incident = parseIncident(filePath);
        if (incident) {
            incidents.push(incident);
        }
    }
    
    return incidents;
}

/**
 * Calculate statistics
 */
function calculateStats(incidents) {
    const stats = {
        total: incidents.length,
        bySeverity: {},
        byStatus: {},
        byAnomaly: {},
        openBreaches: [],
        mttrByAnomaly: {},
        cosmicSignificance: {}
    };
    
    incidents.forEach(incident => {
        // Count by severity
        if (incident.severity) {
            stats.bySeverity[incident.severity] = (stats.bySeverity[incident.severity] || 0) + 1;
        }
        
        // Count by status
        if (incident.status) {
            stats.byStatus[incident.status] = (stats.byStatus[incident.status] || 0) + 1;
        }
        
        // Count by anomaly type
        incident.anomalies.forEach(anomaly => {
            stats.byAnomaly[anomaly] = (stats.byAnomaly[anomaly] || 0) + 1;
        });
        
        // Track open breaches
        if (incident.severity === 'BREACH' && (incident.status === 'OPEN' || incident.status === 'INVESTIGATING')) {
            stats.openBreaches.push(incident);
        }
        
        // MTTR by anomaly type
        if (incident.mttr !== null) {
            incident.anomalies.forEach(anomaly => {
                if (!stats.mttrByAnomaly[anomaly]) {
                    stats.mttrByAnomaly[anomaly] = [];
                }
                stats.mttrByAnomaly[anomaly].push(incident.mttr);
            });
        }
        
        // Cosmic significance
        if (incident.cosmicSignificance) {
            stats.cosmicSignificance[incident.cosmicSignificance] = (stats.cosmicSignificance[incident.cosmicSignificance] || 0) + 1;
        }
    });
    
    // Calculate average MTTR per anomaly type
    Object.keys(stats.mttrByAnomaly).forEach(anomaly => {
        const mttrs = stats.mttrByAnomaly[anomaly];
        const avg = mttrs.reduce((a, b) => a + b, 0) / mttrs.length;
        stats.mttrByAnomaly[anomaly] = {
            count: mttrs.length,
            avgDays: Math.round(avg * 10) / 10
        };
    });
    
    // Sort open breaches by date (newest first)
    stats.openBreaches.sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(b.date) - new Date(a.date);
    });
    
    return stats;
}

/**
 * Generate ledger markdown
 */
function generateLedger(incidents, stats) {
    const now = new Date().toISOString().split('T')[0];
    
    let markdown = `# Anomaly Ledger\n\n`;
    markdown += `**Last Updated:** ${now}\n`;
    markdown += `**Total Incidents:** ${stats.total}\n\n`;
    markdown += `---\n\n`;
    
    // Summary
    markdown += `## Summary\n\n`;
    markdown += `- **Total Incidents:** ${stats.total}\n`;
    markdown += `- **Open Breaches:** ${stats.openBreaches.length}\n`;
    markdown += `- **Resolved:** ${stats.byStatus.RESOLVED || 0}\n`;
    markdown += `- **Accepted:** ${stats.byStatus.ACCEPTED || 0}\n\n`;
    
    // Severity Breakdown
    markdown += `## Severity Breakdown\n\n`;
    SEVERITY_LEVELS.forEach(severity => {
        const count = stats.bySeverity[severity] || 0;
        if (count > 0) {
            markdown += `- **${severity}:** ${count}\n`;
        }
    });
    markdown += `\n`;
    
    // Status Breakdown
    markdown += `## Status Breakdown\n\n`;
    STATUS_VALUES.forEach(status => {
        const count = stats.byStatus[status] || 0;
        if (count > 0) {
            markdown += `- **${status}:** ${count}\n`;
        }
    });
    markdown += `\n`;
    
    // Anomaly Type Counts
    markdown += `## Anomaly Type Frequency\n\n`;
    const sortedAnomalies = Object.entries(stats.byAnomaly)
        .sort((a, b) => b[1] - a[1]);
    
    if (sortedAnomalies.length > 0) {
        sortedAnomalies.forEach(([anomaly, count]) => {
            markdown += `- **${anomaly}:** ${count}\n`;
        });
    } else {
        markdown += `*No anomalies recorded*\n`;
    }
    markdown += `\n`;
    
    // MTTR by Anomaly Type
    markdown += `## Mean Time to Resolution (MTTR) by Anomaly Type\n\n`;
    const mttrEntries = Object.entries(stats.mttrByAnomaly)
        .filter(([_, data]) => data.count > 0)
        .sort((a, b) => a[1].avgDays - b[1].avgDays);
    
    if (mttrEntries.length > 0) {
        mttrEntries.forEach(([anomaly, data]) => {
            markdown += `- **${anomaly}:** ${data.avgDays} days (${data.count} resolved)\n`;
        });
    } else {
        markdown += `*No MTTR data available (no resolved incidents with anomalies)*\n`;
    }
    markdown += `\n`;
    
    // Top Open Breaches
    markdown += `## Top Open Breaches\n\n`;
    if (stats.openBreaches.length > 0) {
        stats.openBreaches.slice(0, 10).forEach(incident => {
            markdown += `### ${incident.number ? `INCIDENT-${incident.number}` : incident.file}\n\n`;
            if (incident.date) markdown += `- **Date:** ${incident.date}\n`;
            if (incident.reporter) markdown += `- **Reporter:** ${incident.reporter}\n`;
            if (incident.anomalies.length > 0) {
                markdown += `- **Anomalies:** ${incident.anomalies.join(', ')}\n`;
            }
            if (incident.tags.length > 0) {
                markdown += `- **Tags:** ${incident.tags.join(', ')}\n`;
            }
            markdown += `\n`;
        });
        
        if (stats.openBreaches.length > 10) {
            markdown += `*... and ${stats.openBreaches.length - 10} more open breaches*\n\n`;
        }
    } else {
        markdown += `*No open breaches at this time.*\n\n`;
    }
    
    // Cosmic Significance
    if (Object.keys(stats.cosmicSignificance).length > 0) {
        markdown += `## Cosmic Significance Distribution\n\n`;
        Object.entries(stats.cosmicSignificance)
            .sort((a, b) => b[1] - a[1])
            .forEach(([level, count]) => {
                markdown += `- **${level}:** ${count}\n`;
            });
        markdown += `\n`;
    }
    
    // Footer
    markdown += `---\n\n`;
    markdown += `*This ledger is auto-generated by \`scripts/anomaly-ledger.js\`.*\n`;
    markdown += `*Run \`npm run anomalies:sync\` to refresh.*\n`;
    
    return markdown;
}

/**
 * Main execution
 */
function main() {
    try {
        console.log('Loading incidents...');
        const incidents = loadIncidents();
        
        if (incidents.length === 0) {
            console.warn('Warning: No incidents found. Creating empty ledger.');
        }
        
        console.log(`Parsed ${incidents.length} incidents`);
        
        console.log('Calculating statistics...');
        const stats = calculateStats(incidents);
        
        console.log('Generating ledger...');
        const ledger = generateLedger(incidents, stats);
        
        // Ensure hazards directory exists
        if (!fs.existsSync(HAZARDS_DIR)) {
            fs.mkdirSync(HAZARDS_DIR, { recursive: true });
        }
        
        // Write ledger
        fs.writeFileSync(LEDGER_FILE, ledger, 'utf8');
        
        console.log(`✓ Ledger generated: ${LEDGER_FILE}`);
        console.log(`  - Total incidents: ${stats.total}`);
        console.log(`  - Open breaches: ${stats.openBreaches.length}`);
        console.log(`  - Anomaly types tracked: ${Object.keys(stats.byAnomaly).length}`);
        
        process.exit(0);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
}

// Run if executed directly
if (require.main === module) {
    main();
}

module.exports = { parseIncident, loadIncidents, calculateStats, generateLedger };
```

### Step 2: Update package.json

**File:** `scripts/package.json`

**Location:** Add to `scripts` section

**Action:** Add new script entry:

```json
{
  "scripts": {
    "anomalies:sync": "node scripts/anomaly-ledger.js"
  }
}
```

**Complete updated scripts section:**

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "anomalies:sync": "node scripts/anomaly-ledger.js"
  }
}
```

### Step 3: Update AI Handoffs Documentation

**File:** `docs/ai_handoffs.md`

**Location:** After the "Handoff Entry Schema" section (around line 75)

**Action:** Add requirement for ledger snapshot in handoff entries

**Complete addition:**

```markdown
## Handoff Entry Schema

```yaml
schema_version: "1.0"
timestamp: ISO-8601
from: claude|cursor
to: claude|cursor
issue_id: <GitHub Issue number or "none">
branch: <current branch>
repo_state:  # Optional - git repository state
  branch: <branch>
  last_commit: <hash>
  dirty_files: [...]
  changed_files: [...]
completed:
  - <completed task with file paths>
next:
  - <specific next actions with acceptance criteria>
context_files:
  - <paths to Tier-2 docs>
ledger_snapshot:  # Required - Link to latest anomaly ledger
  path: hazards/anomaly-ledger.md
  timestamp: <ISO-8601 timestamp of ledger>
  open_breaches: <count>
```

**Note:** Each handoff entry must include a `ledger_snapshot` field referencing the latest `hazards/anomaly-ledger.md` file. Run `npm run anomalies:sync` before creating handoff entries to ensure the ledger is up to date.
```

### Step 4: Update Context Documentation

**File:** `Context/decisions.md` (or `context/decisions.md` if that's the actual path)

**Location:** Add new entry at the end

**Action:** Add decision entry about anomaly ledger

**Complete addition:**

```markdown
## Anomaly Ledger Automation (2025-01-27)

**Decision:** Implement automated anomaly ledger generation to track veil integrity over time.

**Rationale:**
- Incident templates capture anomaly checklists and severity, but no aggregated view exists
- Centralized breach visibility enables trend analysis and MTTR tracking
- Automated generation reduces manual overhead and ensures consistency

**Implementation:**
- Script: `scripts/anomaly-ledger.js` parses `incidents/*.md` and generates `hazards/anomaly-ledger.md`
- Refresh command: `npm run anomalies:sync`
- Handoff requirement: All handoff entries must reference latest ledger snapshot

**Assumptions:**
- Incident files follow INCIDENT-TEMPLATE.md format
- Date parsing may fail for non-standard formats (gracefully handled)
- MTTR calculation requires both incident date and resolution date

**Risks:**
- Inaccurate parsing could misrepresent incident data
- Malformed incident files are skipped with warnings (non-fatal)
```

**File:** `Context/insights.md` (or `context/insights.md`)

**Location:** Add new entry at the end

**Action:** Add insight about anomaly tracking

**Complete addition:**

```markdown
## Anomaly Ledger Provides Centralized Breach Visibility (2025-01-27)

**Insight:** Automated aggregation of incident data enables pattern detection and trend analysis that individual incident reports cannot provide.

**Benefits:**
- MTTR tracking per anomaly type identifies systemic issues
- Open breach summary provides immediate visibility into active threats
- Severity and status breakdowns enable prioritization
- Cosmic significance distribution tracks existential risk trends

**Usage Pattern:**
- Run `npm run anomalies:sync` during CHECK phase or on demand
- Reference ledger snapshot in all handoff entries
- Review open breaches section for immediate action items
```

### Step 5: Testing

**Test Scenarios:**

1. **Test with no incidents:**
   ```bash
   # Ensure incidents directory exists but is empty (or only has template)
   npm run anomalies:sync
   # Expected: Creates empty ledger with "No incidents found" message
   ```

2. **Test with sample incident:**
   ```bash
   # Create a test incident file in incidents/ following the template
   # Run sync
   npm run anomalies:sync
   # Expected: Parses incident, generates ledger with correct counts
   ```

3. **Test with malformed incident:**
   ```bash
   # Create an incident file with missing required fields
   npm run anomalies:sync
   # Expected: Skips malformed file with warning, continues processing
   ```

4. **Test MTTR calculation:**
   ```bash
   # Create incident with date and resolution date
   # Ensure status is RESOLVED
   npm run anomalies:sync
   # Expected: MTTR calculated and displayed in ledger
   ```

5. **Test open breaches:**
   ```bash
   # Create incident with severity BREACH and status OPEN
   npm run anomalies:sync
   # Expected: Appears in "Top Open Breaches" section
   ```

**Verification Steps:**

1. Check ledger file exists: `hazards/anomaly-ledger.md`
2. Verify ledger has all required sections (Summary, Severity, Status, Anomalies, MTTR, Open Breaches)
3. Verify counts match actual incident files
4. Verify npm script works: `npm run anomalies:sync`
5. Verify handoff documentation updated with ledger requirement

## Dependencies

- Node.js (built-in modules only, no external dependencies)
- Existing `incidents/` directory structure
- Incident files following `INCIDENT-TEMPLATE.md` format

## Backward Compatibility

- Script gracefully handles missing incidents directory (creates empty ledger)
- Malformed incident files are skipped with warnings (non-fatal)
- Missing fields in incidents are handled gracefully (null values)
- Date parsing failures don't crash the script

## Work Log
- [2025-11-16] Task authored from feature suggestions; awaiting Claude validation and user permission.
- [2025-01-27] Complete implementation code prepared with full anomaly ledger script, package.json update, documentation updates, and testing steps.
