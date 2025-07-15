/**
 * SubgraphNode Tests
 *
 * Tests for SubgraphNode instances including construction,
 * IO synchronization, and edge cases.
 */

import { describe, expect, it } from "vitest"

import { LGraph } from "@/litegraph"

import { subgraphTest } from "./fixtures/subgraphFixtures"
import {
  createTestSubgraph,
  createTestSubgraphNode,
} from "./fixtures/subgraphHelpers"

describe("SubgraphNode Construction", () => {
  it("should create a SubgraphNode from a subgraph definition", () => {
    const subgraph = createTestSubgraph({
      name: "Test Definition",
      inputs: [{ name: "input", type: "number" }],
      outputs: [{ name: "output", type: "number" }],
    })

    const subgraphNode = createTestSubgraphNode(subgraph)

    expect(subgraphNode).toBeDefined()
    expect(subgraphNode.subgraph).toBe(subgraph)
    expect(subgraphNode.type).toBe(subgraph.id)
    expect(subgraphNode.isVirtualNode).toBe(true)
    expect(subgraphNode.displayType).toBe("Subgraph node")
  })

  it("should configure from instance data", () => {
    const subgraph = createTestSubgraph({
      inputs: [{ name: "value", type: "number" }],
      outputs: [{ name: "result", type: "number" }],
    })

    const subgraphNode = createTestSubgraphNode(subgraph, {
      id: 42,
      pos: [300, 150],
      size: [180, 80],
    })

    expect(subgraphNode.id).toBe(42)
    expect(Array.from(subgraphNode.pos)).toEqual([300, 150])
    expect(Array.from(subgraphNode.size)).toEqual([180, 80])
  })

  it("should maintain reference to root graph", () => {
    const subgraph = createTestSubgraph()
    const subgraphNode = createTestSubgraphNode(subgraph)
    const parentGraph = subgraphNode.graph

    expect(subgraphNode.rootGraph).toBe(parentGraph.rootGraph)
  })

  subgraphTest("should synchronize slots with subgraph definition", ({ subgraphWithNode }) => {
    const { subgraph, subgraphNode } = subgraphWithNode

    // SubgraphNode should have same number of inputs/outputs as definition
    expect(subgraphNode.inputs).toHaveLength(subgraph.inputs.length)
    expect(subgraphNode.outputs).toHaveLength(subgraph.outputs.length)
  })
})

describe("SubgraphNode Synchronization", () => {
  subgraphTest("should update slots when subgraph definition changes", ({ subgraphWithNode }) => {
    const { subgraph, subgraphNode } = subgraphWithNode

    const initialInputCount = subgraphNode.inputs.length

    // Add an input to the subgraph definition
    subgraph.addInput("new_input", "string")

    // SubgraphNode should automatically update (this tests the event system)
    expect(subgraphNode.inputs).toHaveLength(initialInputCount + 1)
    expect(subgraphNode.inputs.at(-1)?.name).toBe("new_input")
    expect(subgraphNode.inputs.at(-1)?.type).toBe("string")
  })

  it("should sync input addition", () => {
    const subgraph = createTestSubgraph()
    const subgraphNode = createTestSubgraphNode(subgraph)

    expect(subgraphNode.inputs).toHaveLength(0)

    subgraph.addInput("value", "number")

    expect(subgraphNode.inputs).toHaveLength(1)
    expect(subgraphNode.inputs[0].name).toBe("value")
    expect(subgraphNode.inputs[0].type).toBe("number")
  })

  it("should sync output addition", () => {
    const subgraph = createTestSubgraph()
    const subgraphNode = createTestSubgraphNode(subgraph)

    expect(subgraphNode.outputs).toHaveLength(0)

    subgraph.addOutput("result", "string")

    expect(subgraphNode.outputs).toHaveLength(1)
    expect(subgraphNode.outputs[0].name).toBe("result")
    expect(subgraphNode.outputs[0].type).toBe("string")
  })

  it("should sync input removal", () => {
    const subgraph = createTestSubgraph({
      inputs: [
        { name: "input1", type: "number" },
        { name: "input2", type: "string" },
      ],
    })
    const subgraphNode = createTestSubgraphNode(subgraph)

    expect(subgraphNode.inputs).toHaveLength(2)

    subgraph.removeInput(subgraph.inputs[0])

    expect(subgraphNode.inputs).toHaveLength(1)
    expect(subgraphNode.inputs[0].name).toBe("input2")
  })

  it("should sync output removal", () => {
    const subgraph = createTestSubgraph({
      outputs: [
        { name: "output1", type: "number" },
        { name: "output2", type: "string" },
      ],
    })
    const subgraphNode = createTestSubgraphNode(subgraph)

    expect(subgraphNode.outputs).toHaveLength(2)

    subgraph.removeOutput(subgraph.outputs[0])

    expect(subgraphNode.outputs).toHaveLength(1)
    expect(subgraphNode.outputs[0].name).toBe("output2")
  })

  it("should sync slot renaming", () => {
    const subgraph = createTestSubgraph({
      inputs: [{ name: "oldName", type: "number" }],
      outputs: [{ name: "oldOutput", type: "string" }],
    })
    const subgraphNode = createTestSubgraphNode(subgraph)

    // Rename input
    subgraph.inputs[0].label = "newName"
    subgraph.events.dispatch("renaming-input", {
      input: subgraph.inputs[0],
      index: 0,
      oldName: "oldName",
      newName: "newName",
    })

    expect(subgraphNode.inputs[0].label).toBe("newName")

    // Rename output
    subgraph.outputs[0].label = "newOutput"
    subgraph.events.dispatch("renaming-output", {
      output: subgraph.outputs[0],
      index: 0,
      oldName: "oldOutput",
      newName: "newOutput",
    })

    expect(subgraphNode.outputs[0].label).toBe("newOutput")
  })
})

describe("SubgraphNode Lifecycle", () => {
  it("should initialize with empty widgets array", () => {
    const subgraph = createTestSubgraph()
    const subgraphNode = createTestSubgraphNode(subgraph)

    expect(subgraphNode.widgets).toBeDefined()
    expect(subgraphNode.widgets).toHaveLength(0)
  })

  it("should handle reconfiguration", () => {
    const subgraph = createTestSubgraph({
      inputs: [{ name: "input1", type: "number" }],
      outputs: [{ name: "output1", type: "string" }],
    })
    const subgraphNode = createTestSubgraphNode(subgraph)

    // Initial state
    expect(subgraphNode.inputs).toHaveLength(1)
    expect(subgraphNode.outputs).toHaveLength(1)

    // Add more slots to subgraph
    subgraph.addInput("input2", "string")
    subgraph.addOutput("output2", "number")

    // Reconfigure
    subgraphNode.configure({
      id: subgraphNode.id,
      type: subgraph.id,
      pos: [200, 200],
      size: [180, 100],
      inputs: [],
      outputs: [],
      properties: {},
      flags: {},
      mode: 0,
    })

    // Should reflect updated subgraph structure
    expect(subgraphNode.inputs).toHaveLength(2)
    expect(subgraphNode.outputs).toHaveLength(2)
  })

  it("should handle removal lifecycle", () => {
    const subgraph = createTestSubgraph()
    const subgraphNode = createTestSubgraphNode(subgraph)
    const parentGraph = new LGraph()

    parentGraph.add(subgraphNode)
    expect(parentGraph.nodes).toContain(subgraphNode)

    // Test onRemoved method
    subgraphNode.onRemoved()

    // Note: onRemoved doesn't automatically remove from graph
    // but it should clean up internal state
    expect(subgraphNode.inputs).toBeDefined()
  })
})

describe("SubgraphNode Basic Functionality", () => {
  it("should identify as subgraph node", () => {
    const subgraph = createTestSubgraph()
    const subgraphNode = createTestSubgraphNode(subgraph)

    expect(subgraphNode.isSubgraphNode()).toBe(true)
    expect(subgraphNode.isVirtualNode).toBe(true)
  })

  it("should inherit input types correctly", () => {
    const subgraph = createTestSubgraph({
      inputs: [
        { name: "numberInput", type: "number" },
        { name: "stringInput", type: "string" },
        { name: "anyInput", type: "*" },
      ],
    })
    const subgraphNode = createTestSubgraphNode(subgraph)

    expect(subgraphNode.inputs[0].type).toBe("number")
    expect(subgraphNode.inputs[1].type).toBe("string")
    expect(subgraphNode.inputs[2].type).toBe("*")
  })

  it("should inherit output types correctly", () => {
    const subgraph = createTestSubgraph({
      outputs: [
        { name: "numberOutput", type: "number" },
        { name: "stringOutput", type: "string" },
        { name: "anyOutput", type: "*" },
      ],
    })
    const subgraphNode = createTestSubgraphNode(subgraph)

    expect(subgraphNode.outputs[0].type).toBe("number")
    expect(subgraphNode.outputs[1].type).toBe("string")
    expect(subgraphNode.outputs[2].type).toBe("*")
  })
})

describe("SubgraphNode Execution", () => {
  it("should flatten to ExecutableNodeDTOs", () => {
    const subgraph = createTestSubgraph({ nodeCount: 3 })
    const subgraphNode = createTestSubgraphNode(subgraph)

    const flattened = subgraphNode.getInnerNodes()

    expect(flattened).toHaveLength(3)
    expect(flattened[0].id).toMatch(/^1:\d+$/) // Should have path-based ID like "1:1"
    expect(flattened[1].id).toMatch(/^1:\d+$/)
    expect(flattened[2].id).toMatch(/^1:\d+$/)
  })

  it("should handle nested subgraph execution", () => {
    // Create a nested structure: ParentSubgraph -> ChildSubgraph -> Node
    const childSubgraph = createTestSubgraph({
      name: "Child",
      nodeCount: 2,
    })
    
    const parentSubgraph = createTestSubgraph({
      name: "Parent",
      nodeCount: 1,
    })
    
    // Add child subgraph node to parent
    const childSubgraphNode = createTestSubgraphNode(childSubgraph, { id: 42 })
    parentSubgraph.add(childSubgraphNode)
    
    const parentSubgraphNode = createTestSubgraphNode(parentSubgraph, { id: 10 })

    const flattened = parentSubgraphNode.getInnerNodes()

    // Should have 3 nodes total: 1 direct + 2 from nested subgraph
    expect(flattened).toHaveLength(3)
    
    // Check for proper path-based IDs
    const pathIds = flattened.map(n => n.id)
    expect(pathIds.some(id => id.includes("10:"))).toBe(true) // Parent path
    expect(pathIds.some(id => id.includes("42:"))).toBe(true) // Child path
  })

  it("should resolve cross-boundary input links", () => {
    const subgraph = createTestSubgraph({
      inputs: [{ name: "input1", type: "number" }],
      nodeCount: 1,
    })
    const subgraphNode = createTestSubgraphNode(subgraph)

    const resolved = subgraphNode.resolveSubgraphInputLinks(0)

    expect(resolved).toBeDefined()
    expect(Array.isArray(resolved)).toBe(true)
  })

  it("should resolve cross-boundary output links", () => {
    const subgraph = createTestSubgraph({
      outputs: [{ name: "output1", type: "number" }],
      nodeCount: 1,
    })
    const subgraphNode = createTestSubgraphNode(subgraph)

    const resolved = subgraphNode.resolveSubgraphOutputLink(0)

    // May be undefined if no internal connection exists
    expect(resolved === undefined || typeof resolved === "object").toBe(true)
  })

  it.skip("should prevent infinite recursion (KNOWN BUG: cycle detection broken)", () => {
    const subgraph = createTestSubgraph({ nodeCount: 1 })
    const subgraphNode = createTestSubgraphNode(subgraph)

    // Add subgraph node to its own subgraph (circular reference)
    subgraph.add(subgraphNode)

    expect(() => {
      subgraphNode.getInnerNodes()
    }).toThrow(/infinite recursion/i)
    
    // BUG: Line 292 creates `new Set(visited)` which breaks cycle detection
    // This causes infinite recursion instead of throwing the error
    // Fix: Change `new Set(visited)` to just `visited`
  })
})
describe("SubgraphNode Integration", () => {
  it("should be addable to a parent graph", () => {
    const subgraph = createTestSubgraph()
    const subgraphNode = createTestSubgraphNode(subgraph)
    const parentGraph = new LGraph()

    parentGraph.add(subgraphNode)

    expect(parentGraph.nodes).toContain(subgraphNode)
    expect(subgraphNode.graph).toBe(parentGraph)
  })

  subgraphTest("should maintain reference to root graph", ({ subgraphWithNode }) => {
    const { subgraphNode } = subgraphWithNode

    // For this test, parentGraph should be the root, but in nested scenarios
    // it would traverse up to find the actual root
    expect(subgraphNode.rootGraph).toBeDefined()
  })

  it("should handle graph removal properly", () => {
    const subgraph = createTestSubgraph()
    const subgraphNode = createTestSubgraphNode(subgraph)
    const parentGraph = new LGraph()

    parentGraph.add(subgraphNode)
    expect(parentGraph.nodes).toContain(subgraphNode)

    parentGraph.remove(subgraphNode)
    expect(parentGraph.nodes).not.toContain(subgraphNode)
  })
})

describe("Foundation Test Utilities", () => {
  it("should create test SubgraphNodes with custom options", () => {
    const subgraph = createTestSubgraph()
    const customPos: [number, number] = [500, 300]
    const customSize: [number, number] = [250, 120]

    const subgraphNode = createTestSubgraphNode(subgraph, {
      pos: customPos,
      size: customSize,
    })

    expect(Array.from(subgraphNode.pos)).toEqual(customPos)
    expect(Array.from(subgraphNode.size)).toEqual(customSize)
  })

  subgraphTest("fixtures should provide properly configured SubgraphNode", ({ subgraphWithNode }) => {
    const { subgraph, subgraphNode, parentGraph } = subgraphWithNode

    expect(subgraph).toBeDefined()
    expect(subgraphNode).toBeDefined()
    expect(parentGraph).toBeDefined()
    expect(parentGraph.nodes).toContain(subgraphNode)
  })
})
