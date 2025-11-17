#!/usr/bin/env node

const DependencyGraph = require('./dependency-graph.js');

const graph = new DependencyGraph();
console.log('🔍 Building graph...\n');
graph.buildFromDirectory();

const task = 'm-create-handoff-protocol.md';
console.log(`📊 Analyzing: ${task}\n`);

// Check if task exists in graph
if (!graph.adjacencyList.has(task)) {
  console.log('❌ Task not found in graph!');
  process.exit(1);
}

// Show direct dependencies
const deps = graph.adjacencyList.get(task) || [];
console.log('Direct dependencies:');
if (deps.length === 0) {
  console.log('  (none)');
} else {
  deps.forEach(dep => {
    const exists = graph.adjacencyList.has(dep);
    console.log(`  - ${dep} ${exists ? '✅' : '❌ NOT IN GRAPH'}`);
  });
}
console.log('');

// Show dependents (tasks that depend on this one)
const dependents = graph.reverseList.get(task) || [];
console.log('Dependents (tasks depending on this):');
if (dependents.length === 0) {
  console.log('  (none)');
} else {
  dependents.forEach(dep => {
    console.log(`  - ${dep}`);
  });
}
console.log('');

// Run topological sort
console.log('🔄 Running topological sort...');
const topoResult = graph.topologicalSort();
console.log(`  Result: ${topoResult.hasCycle ? '❌ CYCLE DETECTED' : '✅ NO CYCLE'}`);
console.log(`  Sorted count: ${topoResult.sorted.length} / ${graph.adjacencyList.size}`);
console.log(`  Nodes in cycle: ${topoResult.cycleNodes.join(', ')}`);
console.log('');

// Run DFS circular dependency check
console.log('🔄 Running DFS cycle detection...');
const dfsResult = graph.detectCircularDependencies();
console.log(`  Result: ${dfsResult.hasCycle ? '❌ CYCLE DETECTED' : '✅ NO CYCLE'}`);
if (dfsResult.hasCycle) {
  console.log(`  Cycle path: ${dfsResult.cycle.join(' → ')}`);
}
console.log('');

// Manual cycle trace for the suspicious task
console.log('🔍 Manual dependency trace:');
let visited = new Set();
let path = [];

function trace(t, depth = 0) {
  if (depth > 10) {
    console.log('  '.repeat(depth) + '⚠️  Max depth reached');
    return;
  }

  if (visited.has(t)) {
    console.log('  '.repeat(depth) + `🔁 ${t} (already visited - potential cycle!)`);
    return;
  }

  visited.add(t);
  console.log('  '.repeat(depth) + `→ ${t}`);

  const taskDeps = graph.adjacencyList.get(t) || [];
  taskDeps.forEach(dep => {
    if (graph.adjacencyList.has(dep)) {
      trace(dep, depth + 1);
    } else {
      console.log('  '.repeat(depth + 1) + `→ ${dep} ❌ (not in graph)`);
    }
  });
}

trace(task);
