#!/usr/bin/env node

/**
 * Test script for pause detection logic
 * Tests all 7 identified conflict scenarios from REPAIR-hook-system-agent-conflicts.md
 * Also tests tool_response field extraction (string vs object)
 */

// Simulate tool_response extraction logic
function extractToolOutput(toolResponse) {
    return typeof toolResponse === 'string'
        ? toolResponse
        : (toolResponse.output || toolResponse.content || "");
}

// Simulate the shouldPauseForUserInput function
function shouldPauseForUserInput(toolName, toolOutput, isSubagent) {
    if (toolName === "Task" && isSubagent) {
        const output = toolOutput || "";

        // Check for explicit wait instructions
        if (output.match(/WAIT for user|Wait for user|execution MUST stop/i)) {
            return true;
        }

        // Check for decision prompts
        if (output.match(/\[DECISION:/) && output.match(/Your choice:/)) {
            return true;
        }

        // Check for code-review findings
        if (output.match(/\[FINDINGS: Code Review\]/)) {
            return true;
        }
    }

    return false;
}

// Test cases for all 7 scenarios
const testCases = [
    {
        name: "Scenario 1: Code-review agent requesting confirmation",
        output: "[FINDINGS: Code Review]\n\nFound 5 issues that need attention.\n\nWait for user confirmation before proceeding.",
        shouldPause: true
    },
    {
        name: "Scenario 2: Task creation - Smart questions",
        output: "I have some questions about the task:\n\n**WAIT for user response** - execution MUST stop here if questions were asked.\n\n1. What is the priority?\n2. What are the dependencies?",
        shouldPause: true
    },
    {
        name: "Scenario 3: Task creation - Context gathering decision",
        output: "[DECISION: Context Gathering]\nWould you like me to run the context-gathering agent now?\n- YES: I'll run the agent...\n- NO: We'll skip this for now...\n\nYour choice:",
        shouldPause: true
    },
    {
        name: "Scenario 4: Task creation - Task index decision",
        output: "[DECISION: Task Index]\nShould I create a task index file?\n- YES: Create index\n- NO: Skip index\n\nYour choice:",
        shouldPause: true
    },
    {
        name: "Scenario 5: Task completion - Staging decision",
        output: "[DECISION: Staging Changes]\nHow would you like to stage these changes?\n- ALL: Stage all changes\n- SELECTIVE: Review and select specific files\n- REVIEW: Show diffs before deciding\n\nYour choice:",
        shouldPause: true
    },
    {
        name: "Scenario 6: Task completion - Merge decision",
        output: "[DECISION: Merge to main]\nWould you like to merge this branch to main?\n- YES: Merge to main\n- NO: Keep changes on feature branch\n\nYour choice:",
        shouldPause: true
    },
    {
        name: "Scenario 7: Task completion - Push decision",
        output: "[DECISION: Push Changes]\nWould you like to push changes to remote?\n- YES: Push to remote\n- NO: Keep local only\n\nYour choice:",
        shouldPause: true
    },
    {
        name: "Non-pause scenario: Normal subagent completion",
        output: "I have completed the analysis. Here are the results:\n\n- Finding 1\n- Finding 2\n\nPlease review.",
        shouldPause: false
    },
    {
        name: "Non-pause scenario: Regular decision without markers",
        output: "Which approach would you prefer?\n- Option A\n- Option B",
        shouldPause: false
    }
];

// Run tests
console.log("Testing pause detection for all 7 conflict scenarios...\n");

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
    const result = shouldPauseForUserInput("Task", test.output, true);
    const success = result === test.shouldPause;

    if (success) {
        passed++;
        console.log(`✓ Test ${index + 1}: ${test.name}`);
    } else {
        failed++;
        console.log(`✗ Test ${index + 1}: ${test.name}`);
        console.log(`  Expected: ${test.shouldPause}, Got: ${result}`);
    }
});

console.log(`\n${"=".repeat(60)}`);
console.log(`Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);
console.log(`${"=".repeat(60)}\n`);

// Test tool_response extraction (string vs object)
console.log("Testing tool_response extraction logic...\n");

const extractionTests = [
    {
        name: "String tool_response",
        input: "[DECISION: Test]\nYour choice:",
        expected: "[DECISION: Test]\nYour choice:"
    },
    {
        name: "Object with 'output' field",
        input: { output: "[DECISION: Test]\nYour choice:" },
        expected: "[DECISION: Test]\nYour choice:"
    },
    {
        name: "Object with 'content' field",
        input: { content: "[DECISION: Test]\nYour choice:" },
        expected: "[DECISION: Test]\nYour choice:"
    },
    {
        name: "Object with both fields (output preferred)",
        input: { output: "[DECISION: Test]\nYour choice:", content: "Other" },
        expected: "[DECISION: Test]\nYour choice:"
    },
    {
        name: "Empty object",
        input: {},
        expected: ""
    }
];

let extractionPassed = 0;
let extractionFailed = 0;

extractionTests.forEach((test, index) => {
    const result = extractToolOutput(test.input);
    const success = result === test.expected;

    if (success) {
        extractionPassed++;
        console.log(`✓ Extraction Test ${index + 1}: ${test.name}`);
    } else {
        extractionFailed++;
        console.log(`✗ Extraction Test ${index + 1}: ${test.name}`);
        console.log(`  Expected: "${test.expected}", Got: "${result}"`);
    }
});

console.log(`\n${"=".repeat(60)}`);
console.log(`Extraction Results: ${extractionPassed} passed, ${extractionFailed} failed out of ${extractionTests.length} tests`);
console.log(`${"=".repeat(60)}\n`);

// Overall results
const totalTests = testCases.length + extractionTests.length;
const totalPassed = passed + extractionPassed;
const totalFailed = failed + extractionFailed;

console.log(`\n${"=".repeat(60)}`);
console.log(`OVERALL: ${totalPassed} passed, ${totalFailed} failed out of ${totalTests} total tests`);
console.log(`${"=".repeat(60)}\n`);

if (totalFailed === 0) {
    console.log("✓ All tests passed! Pause detection and extraction logic working correctly.");
    process.exit(0);
} else {
    console.log("✗ Some tests failed. Please review the implementation.");
    process.exit(1);
}
