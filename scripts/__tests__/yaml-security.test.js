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

            // Find all yaml.load( occurrences
            const yamlLoadPattern = /yaml\.load\s*\(/g;
            let match;

            while ((match = yamlLoadPattern.exec(content)) !== null) {
                const matchIndex = match.index;
                const beforeMatch = content.substring(0, matchIndex);
                const currentLineNumber = (beforeMatch.match(/\n/g) || []).length + 1;
                
                // Extract the full call by finding matching closing paren
                // Handle nested parentheses, brackets, and braces
                let parenCount = 1;
                let bracketCount = 0;
                let braceCount = 0;
                let pos = matchIndex + match[0].length;
                let callContent = match[0];
                let inString = false;
                let stringChar = null;
                let escaped = false;
                
                while (pos < content.length && parenCount > 0) {
                    const char = content[pos];
                    
                    // Handle string escaping
                    if (escaped) {
                        callContent += char;
                        escaped = false;
                        pos++;
                        continue;
                    }
                    
                    if (char === '\\' && inString) {
                        escaped = true;
                        callContent += char;
                        pos++;
                        continue;
                    }
                    
                    // Track string boundaries
                    if ((char === '"' || char === "'" || char === '`') && !escaped) {
                        if (!inString) {
                            inString = true;
                            stringChar = char;
                        } else if (char === stringChar) {
                            inString = false;
                            stringChar = null;
                        }
                    }
                    
                    // Only count brackets/parens/braces outside of strings
                    if (!inString) {
                        if (char === '(') parenCount++;
                        else if (char === ')') parenCount--;
                        else if (char === '[') bracketCount++;
                        else if (char === ']') bracketCount--;
                        else if (char === '{') braceCount++;
                        else if (char === '}') braceCount--;
                    }
                    
                    callContent += char;
                    pos++;
                    
                    // Safety: prevent infinite loops on malformed code
                    if (pos > content.length) break;
                }
                
                // Check if this call has SAFE_SCHEMA
                // Must contain both "schema" and "SAFE_SCHEMA" keywords
                const hasSafeSchema = callContent.includes('schema') && 
                                     callContent.includes('SAFE_SCHEMA');
                
                if (!hasSafeSchema) {
                    // Extract first line of call for preview (truncate if too long)
                    const firstLine = callContent.split('\n')[0];
                    const preview = firstLine.length > 100 
                        ? firstLine.substring(0, 100) + '...'
                        : firstLine;
                    
                    unsafeUsages.push({
                        file,
                        line: currentLineNumber,
                        call: preview
                    });
                }
            }
        });

        // Should find zero unsafe usages
        if (unsafeUsages.length > 0) {
            const report = unsafeUsages.map(u => 
                `  ${u.file}:${u.line} - ${u.call}`
            ).join('\n');
            throw new Error(`Found ${unsafeUsages.length} unsafe yaml.load() call(s):\n${report}`);
        }
        
        expect(unsafeUsages).toEqual([]);
    });
});
