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
      oldValue: false,
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

    // Set same collapsed state
    node!.flags.collapsed = false

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
      oldValue: false,
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
    expect(Object.keys(node!.flags)).toContain("collapsed")
  })
})
