import { beforeEach, describe, expect, it, vi } from "vitest"

import { LGraph, LGraphNode, LiteGraph } from "@/litegraph"

describe("Node Property Instrumentation", () => {
  beforeEach(() => {
    // Register a test node type
    class TestNode extends LGraphNode {
      static override title = "Test"
      constructor() {
        super("Test")
        this.addOutput("out", "number")
      }
    }
    LiteGraph.registerNodeType("test/node", TestNode)
  })

  it("should emit events when node title changes", () => {
    const graph = new LGraph()
    const mockTrigger = vi.fn()
    graph.onTrigger = mockTrigger

    const node = LiteGraph.createNode("test/node")
    graph.add(node!)

    node!.title = "New Title"

    expect(mockTrigger).toHaveBeenCalledWith("node:property:changed", {
      nodeId: node!.id,
      property: "title",
      oldValue: "Test",
      newValue: "New Title",
    })
  })

  it("should emit events when node collapsed state changes", () => {
    const graph = new LGraph()
    const mockTrigger = vi.fn()
    graph.onTrigger = mockTrigger

    const node = LiteGraph.createNode("test/node")
    graph.add(node!)

    node!.flags.collapsed = true

    expect(mockTrigger).toHaveBeenCalledWith("node:property:changed", {
      nodeId: node!.id,
      property: "flags.collapsed",
      oldValue: undefined,
      newValue: true,
    })
  })

  it("should not emit events when setting same value", () => {
    const graph = new LGraph()
    const mockTrigger = vi.fn()
    graph.onTrigger = mockTrigger

    const node = LiteGraph.createNode("test/node")
    graph.add(node!)

    // Set same title
    const currentTitle = node!.title
    node!.title = currentTitle

    expect(mockTrigger).not.toHaveBeenCalled()
  })

  it("should track multiple property changes", () => {
    const graph = new LGraph()
    const mockTrigger = vi.fn()
    graph.onTrigger = mockTrigger

    const node = LiteGraph.createNode("test/node")
    graph.add(node!)

    // Change title
    node!.title = "Title 1"
    // Toggle collapsed state
    node!.flags.collapsed = true
    node!.flags.collapsed = false

    expect(mockTrigger).toHaveBeenCalledTimes(3)

    // Verify each call in order
    expect(mockTrigger).toHaveBeenNthCalledWith(1, "node:property:changed", {
      nodeId: node!.id,
      property: "title",
      oldValue: "Test",
      newValue: "Title 1",
    })
    expect(mockTrigger).toHaveBeenNthCalledWith(2, "node:property:changed", {
      nodeId: node!.id,
      property: "flags.collapsed",
      oldValue: undefined,
      newValue: true,
    })
    expect(mockTrigger).toHaveBeenNthCalledWith(3, "node:property:changed", {
      nodeId: node!.id,
      property: "flags.collapsed",
      oldValue: true,
      newValue: false,
    })
  })

  it("should not emit events for nodes without a graph", () => {
    const node = LiteGraph.createNode("test/node")

    // Node has no graph, so no events should be emitted
    node!.title = "New Title"
    node!.flags.collapsed = true

    // Now add to graph and verify events work
    const graph = new LGraph()
    const mockTrigger = vi.fn()
    graph.onTrigger = mockTrigger
    graph.add(node!)

    node!.title = "Another Title"

    expect(mockTrigger).toHaveBeenCalledOnce()
    expect(mockTrigger).toHaveBeenCalledWith("node:property:changed", {
      nodeId: node!.id,
      property: "title",
      oldValue: "New Title",
      newValue: "Another Title",
    })
  })

  it("should preserve existing property behavior", () => {
    const graph = new LGraph()
    const node = LiteGraph.createNode("test/node")
    graph.add(node!)

    // Verify properties work as expected
    node!.title = "Custom Title"
    expect(node!.title).toBe("Custom Title")

    node!.flags.collapsed = true
    expect(node!.flags.collapsed).toBe(true)

    // Verify properties are enumerable
    expect(Object.keys(node!)).toContain("title")
    expect(node!.flags.collapsed).toBe(true)
  })

  describe("Generic property tracking", () => {
    it("should allow tracking custom properties", async () => {
      // Dynamically import to get fresh module state
      const { instrumentNodeProperties, addTrackedProperty } = await import(
        "@/nodePropertyInstrumentation",
      )

      // Add custom tracked properties that don't exist on the node
      addTrackedProperty({ path: "customData", type: "object" })
      addTrackedProperty({ path: "priority", defaultValue: 0, type: "number" })
      addTrackedProperty({ path: "flags.readonly", defaultValue: false, type: "boolean" })

      const graph = new LGraph()
      const mockTrigger = vi.fn()
      graph.onTrigger = mockTrigger

      const node = LiteGraph.createNode("test/node") as any
      graph.add(node!)

      // Re-instrument the node with the new properties
      instrumentNodeProperties(node!)

      // Test custom properties
      node!.customData = { value: 42 }
      expect(mockTrigger).toHaveBeenCalledWith("node:property:changed", {
        nodeId: node!.id,
        property: "customData",
        oldValue: undefined,
        newValue: { value: 42 },
      })

      node!.priority = 5
      expect(mockTrigger).toHaveBeenCalledWith("node:property:changed", {
        nodeId: node!.id,
        property: "priority",
        oldValue: undefined,
        newValue: 5,
      })

      node!.flags.readonly = true
      expect(mockTrigger).toHaveBeenCalledWith("node:property:changed", {
        nodeId: node!.id,
        property: "flags.readonly",
        oldValue: undefined,
        newValue: true,
      })
    })

    it("should support deeply nested properties", async () => {
      const { instrumentNodeProperties } = await import("@/nodePropertyInstrumentation")

      const graph = new LGraph()
      const mockTrigger = vi.fn()
      graph.onTrigger = mockTrigger

      const node = LiteGraph.createNode("test/node") as any
      graph.add(node!)

      // Track a deeply nested property
      const customProperties: Array<{
        path: string
        defaultValue?: any
        type?: "string" | "boolean" | "number" | "object"
      }> = [{ path: "config.ui.theme.color", defaultValue: "light", type: "string" }]

      instrumentNodeProperties(node!, customProperties)

      // Test deeply nested property
      node!.config.ui.theme.color = "dark"
      expect(mockTrigger).toHaveBeenCalledWith("node:property:changed", {
        nodeId: node!.id,
        property: "config.ui.theme.color",
        oldValue: undefined,
        newValue: "dark",
      })

      // Verify nested structure was created
      expect(node!.config).toBeDefined()
      expect(node!.config.ui).toBeDefined()
      expect(node!.config.ui.theme).toBeDefined()
      expect(node!.config.ui.theme.color).toBe("dark")
    })

    it("should handle property array configuration", async () => {
      const { instrumentNodeProperties } = await import("@/nodePropertyInstrumentation")

      const graph = new LGraph()
      const mockTrigger = vi.fn()
      graph.onTrigger = mockTrigger

      const node = LiteGraph.createNode("test/node") as any
      graph.add(node!)

      // Define multiple properties at once
      const trackedProperties: Array<{
        path: string
        defaultValue?: any
        type?: "string" | "boolean" | "number" | "object"
      }> = [
        { path: "category", defaultValue: "default", type: "string" },
        { path: "metadata", defaultValue: {}, type: "object" },
        { path: "flags.pinned", defaultValue: false, type: "boolean" },
      ]

      instrumentNodeProperties(node!, trackedProperties)

      // Test all tracked properties
      node!.category = "advanced"
      node!.metadata = { version: 1, author: "test" }
      node!.flags.pinned = true

      expect(mockTrigger).toHaveBeenCalledTimes(3)
      expect(mockTrigger).toHaveBeenNthCalledWith(1, "node:property:changed", {
        nodeId: node!.id,
        property: "category",
        oldValue: undefined,
        newValue: "advanced",
      })
      expect(mockTrigger).toHaveBeenNthCalledWith(2, "node:property:changed", {
        nodeId: node!.id,
        property: "metadata",
        oldValue: undefined,
        newValue: { version: 1, author: "test" },
      })
      expect(mockTrigger).toHaveBeenNthCalledWith(3, "node:property:changed", {
        nodeId: node!.id,
        property: "flags.pinned",
        oldValue: undefined,
        newValue: true,
      })
    })
  })
})
