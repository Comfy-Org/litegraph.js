# Subgraph Testing Fixtures and Utilities

This directory contains the foundational testing infrastructure for subgraph functionality. All developers working on subgraph tests should use these utilities to ensure consistency and avoid code duplication.

## Quick Start

```typescript
// Import the helpers you need
import { createTestSubgraph, assertSubgraphStructure } from "./fixtures/subgraphHelpers"
import { subgraphTest } from "./fixtures/subgraphFixtures"

// Use fixtures in your tests
subgraphTest("my test", ({ simpleSubgraph, eventCapture }) => {
  // Your test logic here
})
```

## Files Overview

### `subgraphHelpers.ts` - Core Utilities
The main helper functions that all developers should use:

**Factory Functions:**
- `createTestSubgraph(options?)` - Creates configured test subgraphs
- `createTestSubgraphNode(subgraph, options?)` - Creates SubgraphNode instances
- `createNestedSubgraphs(options?)` - Creates nested hierarchies

**Assertion Helpers:**
- `assertSubgraphStructure(subgraph, expected)` - Validates subgraph structure
- `verifyEventSequence(events, expectedSequence)` - Validates event ordering

**Test Data Generators:**
- `createTestSubgraphData(overrides?)` - Raw subgraph data
- `createComplexSubgraphData(nodeCount?)` - Complex scenarios

### `subgraphFixtures.ts` - Vitest Fixtures
Pre-configured test fixtures using Vitest's extend functionality:

**Available Fixtures:**
- `emptySubgraph` - Minimal subgraph with no I/O
- `simpleSubgraph` - Basic subgraph with 1 input, 1 output
- `complexSubgraph` - Multiple inputs, outputs, and nodes
- `nestedSubgraph` - 3-level nested structure
- `subgraphWithNode` - Subgraph + SubgraphNode + parent graph
- `eventCapture` - Event monitoring system

### `testSubgraphs.json` - Sample Data
JSON fixtures for serialization/deserialization testing and edge cases.

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

### `createNestedSubgraphs(options)`
```typescript
interface NestedSubgraphOptions {
  depth?: number              // Nesting depth (default: 2)
  nodesPerLevel?: number      // Nodes per subgraph (default: 2)
  inputsPerSubgraph?: number  // Inputs per subgraph (default: 1)
  outputsPerSubgraph?: number // Outputs per subgraph (default: 1)
}
```

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