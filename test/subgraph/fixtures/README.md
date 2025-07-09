# Subgraph Testing Fixtures and Utilities

This directory contains the foundational testing infrastructure for LiteGraph's subgraph functionality. A subgraph is a graph-within-a-graph that can be reused as a single node, with input/output slots mapping to internal IO nodes. All developers working on subgraph tests should use these utilities to ensure consistency and avoid code duplication.

## Quick Start

```typescript
// Import the helpers you need
import { createTestSubgraph, assertSubgraphStructure } from "./fixtures/subgraphHelpers"
import { subgraphTest } from "./fixtures/subgraphFixtures"

// Option 1: Create a subgraph manually
it("should do something", () => {
  const subgraph = createTestSubgraph({
    name: "My Test Subgraph",
    inputCount: 2,
    outputCount: 1
  })
  
  // Test your functionality
  expect(subgraph.inputs).toHaveLength(2)
})

// Option 2: Use pre-configured fixtures
subgraphTest("should handle events", ({ simpleSubgraph, eventCapture }) => {
  // simpleSubgraph comes pre-configured with 1 input, 1 output, and 2 nodes
  expect(simpleSubgraph.inputs).toHaveLength(1)
  // Your test logic here
})
```

## Files Overview

### `subgraphHelpers.ts` - Core Helper Functions

**Main Factory Functions:**
- `createTestSubgraph(options?)` - Creates a fully configured Subgraph instance with root graph
- `createTestSubgraphNode(subgraph, options?)` - Creates a SubgraphNode (instance of a subgraph)
- `createNestedSubgraphs(options?)` - Creates nested subgraph hierarchies for testing deep structures

**Assertion & Validation:**
- `assertSubgraphStructure(subgraph, expected)` - Validates subgraph has expected inputs/outputs/nodes
- `verifyEventSequence(events, expectedSequence)` - Ensures events fired in correct order
- `logSubgraphStructure(subgraph, label?)` - Debug helper to print subgraph structure

**Test Data & Events:**
- `createTestSubgraphData(overrides?)` - Creates raw ExportedSubgraph data for serialization tests
- `createComplexSubgraphData(nodeCount?)` - Generates complex subgraph with internal connections
- `createEventCapture(eventTarget, eventTypes)` - Sets up event monitoring with automatic cleanup

### `subgraphFixtures.ts` - Vitest Fixtures

Pre-configured test scenarios that automatically set up and tear down:

**Basic Fixtures (`subgraphTest`):**
- `emptySubgraph` - Minimal subgraph with no inputs/outputs/nodes
- `simpleSubgraph` - 1 input ("input": number), 1 output ("output": number), 2 internal nodes
- `complexSubgraph` - 3 inputs (data, control, text), 2 outputs (result, status), 5 nodes
- `nestedSubgraph` - 3-level deep hierarchy with 2 nodes per level
- `subgraphWithNode` - Complete setup: subgraph definition + SubgraphNode instance + parent graph
- `eventCapture` - Subgraph with event monitoring for all I/O events

**Edge Case Fixtures (`edgeCaseTest`):**
- `circularSubgraph` - Two subgraphs set up for circular reference testing
- `deeplyNestedSubgraph` - 50 levels deep for performance/limit testing
- `maxIOSubgraph` - 20 inputs and 20 outputs for stress testing

### `testSubgraphs.json` - Sample Test Data
Pre-defined subgraph configurations for consistent testing across different scenarios.

**Note on Static UUIDs**: The hardcoded UUIDs in this file (e.g., "simple-subgraph-uuid", "complex-subgraph-uuid") are intentionally static to ensure test reproducibility and snapshot testing compatibility.

## Usage Examples

### Basic Test Creation

```typescript
import { describe, expect, it } from "vitest"
import { createTestSubgraph, assertSubgraphStructure } from "./fixtures/subgraphHelpers"

describe("My Subgraph Feature", () => {
  it("should work correctly", () => {
    const subgraph = createTestSubgraph({
      name: "My Test",
      inputCount: 2,
      outputCount: 1,
      nodeCount: 3
    })
    
    assertSubgraphStructure(subgraph, {
      inputCount: 2,
      outputCount: 1,
      nodeCount: 3,
      name: "My Test"
    })
    
    // Your specific test logic...
  })
})
```

### Using Fixtures

```typescript
import { subgraphTest } from "./fixtures/subgraphFixtures"

subgraphTest("should handle events", ({ eventCapture }) => {
  const { subgraph, capture } = eventCapture
  
  subgraph.addInput("test", "number")
  
  expect(capture.events).toHaveLength(2) // adding-input, input-added
})
```

### Event Testing

```typescript
import { createEventCapture, verifyEventSequence } from "./fixtures/subgraphHelpers"

it("should fire events in correct order", () => {
  const subgraph = createTestSubgraph()
  const capture = createEventCapture(subgraph.events, ["adding-input", "input-added"])
  
  subgraph.addInput("test", "number")
  
  verifyEventSequence(capture.events, ["adding-input", "input-added"])
  
  capture.cleanup() // Important: clean up listeners
})
```

### Nested Structure Testing

```typescript
import { createNestedSubgraphs } from "./fixtures/subgraphHelpers"

it("should handle deep nesting", () => {
  const nested = createNestedSubgraphs({
    depth: 5,
    nodesPerLevel: 2
  })
  
  expect(nested.subgraphs).toHaveLength(5)
  expect(nested.leafSubgraph.nodes).toHaveLength(2)
})
```

## Common Patterns

### 1. Always Use Helper Functions
```typescript
// ✅ Good - uses helper
const subgraph = createTestSubgraph({ inputCount: 1 })

// ❌ Bad - manual creation
const rootGraph = new LGraph()
const data = { /* lots of boilerplate */ }
const subgraph = new Subgraph(rootGraph, data)
```

### 2. Use Fixtures for Setup
```typescript
// ✅ Good - uses fixture
subgraphTest("my test", ({ simpleSubgraph }) => {
  // Test with pre-configured subgraph
})

// ❌ Bad - manual setup in every test
it("my test", () => {
  const subgraph = createTestSubgraph()
  subgraph.addInput("input", "number")
  subgraph.addOutput("output", "number")
  // ... lots of setup
})
```

### 3. Use Assertion Helpers
```typescript
// ✅ Good - uses helper
assertSubgraphStructure(subgraph, { inputCount: 2, outputCount: 1 })

// ❌ Bad - manual assertions
expect(subgraph.inputs.length).toBe(2)
expect(subgraph.outputs.length).toBe(1)
expect(subgraph.inputNode).toBeDefined()
// ... repetitive assertions
```

### 4. Testing SubgraphNode Instances

```typescript
it("should create and configure a SubgraphNode", () => {
  // First create the subgraph definition
  const subgraph = createTestSubgraph({
    inputs: [{ name: "value", type: "number" }],
    outputs: [{ name: "result", type: "number" }]
  })
  
  // Then create an instance of it
  const subgraphNode = createTestSubgraphNode(subgraph, {
    pos: [100, 200],
    size: [180, 100]
  })
  
  // The SubgraphNode will have matching slots
  expect(subgraphNode.inputs).toHaveLength(1)
  expect(subgraphNode.outputs).toHaveLength(1)
  expect(subgraphNode.subgraph).toBe(subgraph)
})
```

### 5. Complete Test with Parent Graph

```typescript
subgraphTest("should work in a parent graph", ({ subgraphWithNode }) => {
  const { subgraph, subgraphNode, parentGraph } = subgraphWithNode
  
  // Everything is pre-configured and connected
  expect(parentGraph.nodes).toContain(subgraphNode)
  expect(subgraphNode.graph).toBe(parentGraph)
  expect(subgraphNode.subgraph).toBe(subgraph)
})
```

## Configuration Options

### `createTestSubgraph(options)`
```typescript
interface TestSubgraphOptions {
  id?: UUID                    // Custom UUID
  name?: string               // Custom name
  nodeCount?: number          // Number of internal nodes
  inputCount?: number         // Number of inputs (uses generic types)
  outputCount?: number        // Number of outputs (uses generic types)
  inputs?: Array<{           // Specific input definitions
    name: string
    type: ISlotType
  }>
  outputs?: Array<{          // Specific output definitions
    name: string
    type: ISlotType
  }>
}
```

**Note**: Cannot specify both `inputs` array and `inputCount` (or `outputs` array and `outputCount`) - the function will throw an error with details.

### `createNestedSubgraphs(options)`
```typescript
interface NestedSubgraphOptions {
  depth?: number              // Nesting depth (default: 2)
  nodesPerLevel?: number      // Nodes per subgraph (default: 2)
  inputsPerSubgraph?: number  // Inputs per subgraph (default: 1)
  outputsPerSubgraph?: number // Outputs per subgraph (default: 1)
}
```

## Important Architecture Notes

### Subgraph vs SubgraphNode
- **Subgraph**: The definition/template (like a class definition)
- **SubgraphNode**: An instance of a subgraph placed in a graph (like a class instance)
- One Subgraph can have many SubgraphNode instances

### Special Node IDs
- Input node always has ID `-10` (SUBGRAPH_INPUT_ID)
- Output node always has ID `-20` (SUBGRAPH_OUTPUT_ID)
- These are virtual nodes that exist in every subgraph

### Common Pitfalls

1. **Array items don't have index property** - Use `indexOf()` instead
2. **IO nodes have `subgraph` property** - Not `graph` like regular nodes
3. **Links are stored in a Map** - Use `.size` not `.length`
4. **Event detail structures** - Check exact property names:
   - `"adding-input"`: `{ name, type }`
   - `"input-added"`: `{ input, index }`

## Testing Guidelines

### 1. Test Isolation
- Each test should be independent
- Use fixtures to avoid shared state
- Clean up event listeners with `capture.cleanup()`

### 2. Event Testing
- Always verify event sequences with `verifyEventSequence()`
- Test both successful and cancelled events
- Check event detail payloads

### 3. Memory Management
- Test cleanup scenarios (removal, destruction)
- Verify no memory leaks in event listeners
- Use WeakRef patterns where appropriate

### 4. Error Conditions
- Test invalid inputs and edge cases
- Verify proper error messages
- Use `.todo()` for known issues that need fixing

## Known Issues to Document

When you encounter these issues in your tests, use `.todo()` and reference them:

1. **UUID Registration Bug**: `LiteGraph.createNode(subgraph.id)` returns null
2. **MAX_NESTED_SUBGRAPHS**: Constant defined but not enforced
3. **Memory Leaks**: Event listeners not cleaned up in SubgraphNode
4. **Performance Issues**: O(D²) link resolution complexity

Example:
```typescript
it.todo("should fix UUID registration bug", () => {
  // Documents the known issue where createNode() returns null
  // See: https://github.com/Comfy-Org/litegraph.js/issues/XXX
})
```

## Developer Responsibilities

### Developer 1 (Foundation Lead) - ✅ COMPLETE
- [x] Core helper functions
- [x] Test fixtures
- [x] Basic Subgraph tests
- [x] Documentation and patterns

### Developer 2 (Core Functionality)
- [ ] SubgraphNode execution and flattening
- [ ] Link resolution across boundaries
- [ ] ExecutableNodeDTO tests
- [ ] Performance optimization tests

### Developer 3 (Events & I/O)
- [ ] Comprehensive event system tests
- [ ] I/O management edge cases
- [ ] Widget promotion tests
- [ ] Memory leak detection tests

### Developer 4 (Edge Cases & Integration)
- [ ] Circular reference detection
- [ ] Deep nesting edge cases
- [ ] Serialization/deserialization
- [ ] Integration with LiteGraph core

## Getting Help

If you need additional helper functions or fixtures:

1. Check if existing utilities can be extended
2. Add new helpers to `subgraphHelpers.ts`
3. Update this README with usage examples
4. Coordinate with other developers to avoid duplication

## Performance Notes

- Helper functions are optimized for test clarity, not performance
- Use `structuredClone()` for deep copying test data
- Event capture systems automatically clean up listeners
- Fixtures are created fresh for each test to avoid state contamination
