import { describe, expect, it } from "vitest"

import { LGraph } from "@/litegraph"

import { createTestSubgraph, createTestSubgraphNode } from "./fixtures/subgraphHelpers"

describe("Subgraph Serialization", () => {
  describe("LGraph.asSerialisable", () => {
    it("should not include unused subgraph definitions", () => {
      const rootGraph = new LGraph()

      // Create subgraphs
      const usedSubgraph = createTestSubgraph({ name: "Used Subgraph" })
      const unusedSubgraph = createTestSubgraph({ name: "Unused Subgraph" })

      // Add both to registry
      rootGraph._subgraphs.set(usedSubgraph.id, usedSubgraph)
      rootGraph._subgraphs.set(unusedSubgraph.id, unusedSubgraph)

      // Only add node for used subgraph
      const node = createTestSubgraphNode(usedSubgraph)
      rootGraph.add(node)

      // Serialize
      const serialized = rootGraph.asSerialisable()

      // Check that only used subgraph is included
      expect(serialized.definitions?.subgraphs).toBeDefined()
      expect(serialized.definitions!.subgraphs!.length).toBe(1)
      expect(serialized.definitions!.subgraphs![0].id).toBe(usedSubgraph.id)
      expect(serialized.definitions!.subgraphs![0].name).toBe("Used Subgraph")
    })

    it("should include nested subgraphs", () => {
      const rootGraph = new LGraph()

      // Create nested subgraphs
      const level1Subgraph = createTestSubgraph({ name: "Level 1" })
      const level2Subgraph = createTestSubgraph({ name: "Level 2" })

      // Add to registry
      rootGraph._subgraphs.set(level1Subgraph.id, level1Subgraph)
      rootGraph._subgraphs.set(level2Subgraph.id, level2Subgraph)

      // Add level1 to root
      const level1Node = createTestSubgraphNode(level1Subgraph)
      rootGraph.add(level1Node)

      // Add level2 to level1
      const level2Node = createTestSubgraphNode(level2Subgraph)
      level1Subgraph.add(level2Node)

      // Serialize
      const serialized = rootGraph.asSerialisable()

      // Both subgraphs should be included
      expect(serialized.definitions?.subgraphs).toBeDefined()
      expect(serialized.definitions!.subgraphs!.length).toBe(2)

      const ids = serialized.definitions!.subgraphs!.map(s => s.id)
      expect(ids).toContain(level1Subgraph.id)
      expect(ids).toContain(level2Subgraph.id)
    })

    it("should handle circular subgraph references", () => {
      const rootGraph = new LGraph()

      // Create two subgraphs that reference each other
      const subgraph1 = createTestSubgraph({ name: "Subgraph 1" })
      const subgraph2 = createTestSubgraph({ name: "Subgraph 2" })

      // Add to registry
      rootGraph._subgraphs.set(subgraph1.id, subgraph1)
      rootGraph._subgraphs.set(subgraph2.id, subgraph2)

      // Add subgraph1 to root
      const node1 = createTestSubgraphNode(subgraph1)
      rootGraph.add(node1)

      // Add subgraph2 to subgraph1
      const node2 = createTestSubgraphNode(subgraph2)
      subgraph1.add(node2)

      // Add subgraph1 to subgraph2 (circular)
      const node3 = createTestSubgraphNode(subgraph1, { id: 3 })
      subgraph2.add(node3)

      // Serialize - should not hang
      const serialized = rootGraph.asSerialisable()

      // Both should be included
      expect(serialized.definitions?.subgraphs).toBeDefined()
      expect(serialized.definitions!.subgraphs!.length).toBe(2)
    })

    it("should handle empty subgraph registry", () => {
      const rootGraph = new LGraph()

      // Serialize with no subgraphs
      const serialized = rootGraph.asSerialisable()

      // Should not include definitions
      expect(serialized.definitions).toBeUndefined()
    })

    it("should only serialize from root graph", () => {
      const rootGraph = new LGraph()
      const subgraph = createTestSubgraph({ name: "Parent Subgraph" })

      // Add subgraph to root registry
      rootGraph._subgraphs.set(subgraph.id, subgraph)

      // Try to serialize from subgraph (not root)
      const serialized = subgraph.asSerialisable()

      // Should not include definitions since it's not the root
      expect(serialized.definitions).toBeUndefined()
    })

    it("should handle multiple instances of same subgraph", () => {
      const rootGraph = new LGraph()
      const subgraph = createTestSubgraph({ name: "Reused Subgraph" })

      // Add to registry
      rootGraph._subgraphs.set(subgraph.id, subgraph)

      // Add multiple instances
      const node1 = createTestSubgraphNode(subgraph, { id: 1 })
      const node2 = createTestSubgraphNode(subgraph, { id: 2 })
      const node3 = createTestSubgraphNode(subgraph, { id: 3 })

      rootGraph.add(node1)
      rootGraph.add(node2)
      rootGraph.add(node3)

      // Serialize
      const serialized = rootGraph.asSerialisable()

      // Should only include one definition
      expect(serialized.definitions?.subgraphs).toBeDefined()
      expect(serialized.definitions!.subgraphs!.length).toBe(1)
      expect(serialized.definitions!.subgraphs![0].id).toBe(subgraph.id)
    })
  })
})
