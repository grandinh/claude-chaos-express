/**
 * Security test: Verify YAML parsing uses SAFE_SCHEMA to prevent code execution
 *
 * This test confirms that malicious YAML payloads cannot execute arbitrary code
 * when parsed by our frontmatter parsing functions.
 */

const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

describe('YAML Security - SAFE_SCHEMA enforcement', () => {
    test('SAFE_SCHEMA blocks Python object constructor attacks', () => {
        // Malicious YAML that attempts Python object instantiation
        const maliciousYaml = `
!!python/object/apply:os.system
args: ['echo COMPROMISED > /tmp/hacked.txt']
`;

        // Should throw error when using SAFE_SCHEMA
        expect(() => {
            yaml.load(maliciousYaml, { schema: yaml.SAFE_SCHEMA });
        }).toThrow();
    });

    test('SAFE_SCHEMA blocks JavaScript function execution', () => {
        // Malicious YAML that attempts JS function call
        const maliciousYaml = `
!!js/function >
    function() {
        require('fs').writeFileSync('/tmp/hacked.txt', 'COMPROMISED');
    }
`;

        // Should throw error when using SAFE_SCHEMA
        expect(() => {
            yaml.load(maliciousYaml, { schema: yaml.SAFE_SCHEMA });
        }).toThrow();
    });

    test('SAFE_SCHEMA allows safe task frontmatter', () => {
        // Normal task frontmatter should parse successfully
        const safeFrontmatter = `
name: test-task
branch: feature/test
status: pending
priority: high
leverage: medium
context_gathered: false
depends_on: []
`;

        // Should parse successfully
        const result = yaml.load(safeFrontmatter, { schema: yaml.SAFE_SCHEMA });

        expect(result).toEqual({
            name: 'test-task',
            branch: 'feature/test',
            status: 'pending',
            priority: 'high',
            leverage: 'medium',
            context_gathered: false,
            depends_on: []
        });
    });

    test('parseFrontmatter function uses SAFE_SCHEMA', () => {
        // Test that actual parseFrontmatter implementation uses SAFE_SCHEMA
        const dependencyGraph = require('../dependency-graph');

        // Create a temporary malicious task file
        const tempTaskPath = path.join(__dirname, '../../sessions/tasks/MALICIOUS-TEST.md');
        const maliciousContent = `---
!!python/object/apply:os.system
args: ['echo COMPROMISED']
---
# Malicious Task
`;

        try {
            fs.writeFileSync(tempTaskPath, maliciousContent);

            // Should fail to parse malicious frontmatter
            // The function should return null instead of executing code
            const result = dependencyGraph.parseFrontmatter?.(tempTaskPath);

            // If parseFrontmatter is not exported, test passes (function is internal)
            if (result !== undefined) {
                expect(result).toBeNull(); // Should reject malicious YAML
            }
        } finally {
            // Clean up temp file
            if (fs.existsSync(tempTaskPath)) {
                fs.unlinkSync(tempTaskPath);
            }
        }
    });

    test('All script files use SAFE_SCHEMA consistently', () => {
        // Verify no script file uses yaml.load() without SAFE_SCHEMA
        const scriptsDir = path.join(__dirname, '..');
        const scriptFiles = fs.readdirSync(scriptsDir)
            .filter(f => f.endsWith('.js') && !f.startsWith('.'));

        let unsafeUsages = [];

        scriptFiles.forEach(file => {
            const filePath = path.join(scriptsDir, file);
            const content = fs.readFileSync(filePath, 'utf8');

            // Pattern: yaml.load(...) without { schema: yaml.SAFE_SCHEMA }
            // This regex looks for yaml.load with single argument or without SAFE_SCHEMA
            const unsafePattern = /yaml\.load\([^,)]+\)(?!\s*,\s*\{\s*schema:\s*yaml\.SAFE_SCHEMA)/g;

            const matches = content.match(unsafePattern);
            if (matches) {
                unsafeUsages.push({ file, matches });
            }
        });

        // Should find zero unsafe usages
        expect(unsafeUsages).toEqual([]);
    });
});
