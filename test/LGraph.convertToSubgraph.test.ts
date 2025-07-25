/**
 * LGraph.convertToSubgraph Tests
 *
 * Tests for converting nodes to subgraphs with cycle detection.
 */

import { describe, expect, it } from "vitest"

import { RecursionError } from "@/infrastructure/RecursionError"
import { LGraph } from "@/litegraph"

import { createTestSubgraph, createTestSubgraphNode } from "./subgraph/fixtures/subgraphHelpers"

describe("LGraph.convertToSubgraph", () => {
  describe("cycle detection", () => {
    it("should prevent creating subgraphs that would contain themselves", () => {
      const parentGraph = new LGraph()

      // Create a subgraph
      const childSubgraph = createTestSubgraph({ name: "Child" })
      const subgraphNode = createTestSubgraphNode(childSubgraph)
      parentGraph.add(subgraphNode)

      // Try to convert the subgraph node back into the child subgraph
      // This would create childSubgraph -> subgraphNode -> childSubgraph
      const nodesToConvert = new Set([subgraphNode])

      expect(() => {
        // This should be caught by our cycle detection
        childSubgraph.convertToSubgraph(nodesToConvert)
      }).toThrow(RecursionError)

      expect(() => {
        childSubgraph.convertToSubgraph(nodesToConvert)
      }).toThrow(/Circular reference detected.*because its subgraph would contain its parent subgraph/)
    })

    it("should prevent complex nested cycles", () => {
      const rootGraph = new LGraph()

      // Create subgraph A
      const subgraphA = createTestSubgraph({ name: "Subgraph A" })

      // Create subgraph B that contains A
      const subgraphB = createTestSubgraph({ name: "Subgraph B" })
      const nodeAinB = createTestSubgraphNode(subgraphA)
      subgraphB.add(nodeAinB)

      // Add B to root
      const nodeBinRoot = createTestSubgraphNode(subgraphB)
      rootGraph.add(nodeBinRoot)

      // Now try to convert nodeBinRoot into subgraphA
      // This would create A -> B -> A cycle
      const nodesToConvert = new Set([nodeBinRoot])

      expect(() => {
        subgraphA.convertToSubgraph(nodesToConvert)
      }).toThrow(RecursionError)
    })

    it("should allow valid nodes when no cycles exist", () => {
      const parentGraph = new LGraph()

      // Create a subgraph that has no relationship to parentGraph
      const independentSubgraph = createTestSubgraph({ name: "Independent" })
      const subgraphNode = createTestSubgraphNode(independentSubgraph)

      // This should not throw because there's no cycle
      expect(() => {
        parentGraph.convertToSubgraph(new Set([subgraphNode]))
      }).not.toThrow(RecursionError)
    })
  })
})
