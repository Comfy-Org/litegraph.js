/**
 * Cycle Detection Utility Tests
 *
 * Tests for cycle detection during subgraph creation to prevent
 * infinite recursion issues.
 */

import { describe, expect, it } from "vitest"

import { RecursionError } from "@/infrastructure/RecursionError"
import { LGraph, LGraphNode } from "@/litegraph"
import { validateNoSubgraphCycles, validateSubgraphAddition } from "@/subgraph/utils/cycleDetection"

import { createTestSubgraph, createTestSubgraphNode } from "../fixtures/subgraphHelpers"

describe("Cycle Detection Utilities", () => {
  describe("validateNoSubgraphCycles", () => {
    it("should allow adding regular nodes without issues", () => {
      const node1 = new LGraphNode("Test Node 1")
      const node2 = new LGraphNode("Test Node 2")

      expect(() => {
        validateNoSubgraphCycles([node1, node2])
      }).not.toThrow()
    })

    it("should allow adding subgraph nodes that don't create cycles", () => {
      const parentGraph = new LGraph()
      const childSubgraph = createTestSubgraph({ name: "Child Subgraph" })
      const subgraphNode = createTestSubgraphNode(childSubgraph)

      expect(() => {
        validateNoSubgraphCycles([subgraphNode], parentGraph)
      }).not.toThrow()
    })

    it("should detect direct self-reference cycles", () => {
      const subgraph = createTestSubgraph({ name: "Self Reference" })
      const subgraphNode = createTestSubgraphNode(subgraph)

      expect(() => {
        validateNoSubgraphCycles([subgraphNode], subgraph)
      }).toThrow(RecursionError)

      expect(() => {
        validateNoSubgraphCycles([subgraphNode], subgraph)
      }).toThrow(/Circular reference detected.*because its subgraph would contain its parent subgraph/)
    })

    it("should detect indirect cycles through nested subgraphs", () => {
      // Create subgraph A
      const subgraphA = createTestSubgraph({ name: "Subgraph A" })

      // Create subgraph B that contains A
      const subgraphB = createTestSubgraph({ name: "Subgraph B" })
      const nodeAinB = createTestSubgraphNode(subgraphA)
      subgraphB.add(nodeAinB)

      // Now try to add B to A (would create A -> B -> A cycle)
      const nodeBinA = createTestSubgraphNode(subgraphB)

      expect(() => {
        validateNoSubgraphCycles([nodeBinA], subgraphA)
      }).toThrow(RecursionError)
    })

    it("should handle mixed node types correctly", () => {
      const parentGraph = new LGraph()
      const subgraph = createTestSubgraph({ name: "Mixed Test" })

      const regularNode = new LGraphNode("Regular Node")
      const subgraphNode = createTestSubgraphNode(subgraph)

      // Should allow mixed nodes when no cycle exists
      expect(() => {
        validateNoSubgraphCycles([regularNode, subgraphNode], parentGraph)
      }).not.toThrow()
    })

    it("should include node information in error messages", () => {
      const subgraph = createTestSubgraph({ name: "Error Test" })
      const subgraphNode = createTestSubgraphNode(subgraph)
      subgraphNode.id = 123
      subgraphNode.title = "My Subgraph Instance"

      expect(() => {
        validateNoSubgraphCycles([subgraphNode], subgraph)
      }).toThrow(/Cannot add node 123 \(My Subgraph Instance\)/)
    })
  })

  describe("validateSubgraphAddition", () => {
    it("should validate nodes being added to a subgraph", () => {
      const targetSubgraph = createTestSubgraph({ name: "Target" })
      const node = new LGraphNode()

      expect(() => {
        validateSubgraphAddition([node], targetSubgraph)
      }).not.toThrow()
    })

    it("should detect cycles when adding to subgraph", () => {
      const subgraph = createTestSubgraph({ name: "Cyclic" })
      const subgraphNode = createTestSubgraphNode(subgraph)

      expect(() => {
        validateSubgraphAddition([subgraphNode], subgraph)
      }).toThrow(RecursionError)
    })
  })
})
