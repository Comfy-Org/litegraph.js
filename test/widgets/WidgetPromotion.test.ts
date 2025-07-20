import type { IBaseWidget } from "@/types/widgets"

import { describe, expect, it } from "vitest"

import { LGraphNode } from "@/litegraph"
import { BaseWidget } from "@/widgets/BaseWidget"

// Mock node for testing
class MockNode extends LGraphNode {
  constructor(title = "Test Node") {
    super(title)
  }
}

describe("Widget Promotion - parentSubgraphNode property", () => {
  it("should have parentSubgraphNode property on BaseWidget", () => {
    const node = new MockNode()
    const widget = new BaseWidget({
      name: "test",
      type: "number",
      value: 42,
      y: 0,
      options: {},
      node,
    })

    // Property should exist and be undefined by default
    expect("parentSubgraphNode" in widget).toBe(true)
    expect(widget.parentSubgraphNode).toBeUndefined()
  })

  it("should allow setting parentSubgraphNode", () => {
    const node = new MockNode()
    const subgraphNode = new MockNode("Subgraph Node")

    const widget = new BaseWidget({
      name: "test",
      type: "number",
      value: 42,
      y: 0,
      options: {},
      node,
    })

    // Should be able to set parentSubgraphNode
    widget.parentSubgraphNode = subgraphNode
    expect(widget.parentSubgraphNode).toBe(subgraphNode)
  })

  it("should preserve parentSubgraphNode in widget interface", () => {
    const baseWidget: IBaseWidget = {
      name: "test",
      type: "number",
      value: 42,
      y: 0,
      options: {},
    }

    // Should be able to set parentSubgraphNode on interface
    const node = new MockNode()
    baseWidget.parentSubgraphNode = node
    expect(baseWidget.parentSubgraphNode).toBe(node)
  })

  it("should support DOM widgets with parentSubgraphNode", () => {
    const node = new MockNode()
    const subgraphNode = new MockNode("Subgraph Node")

    // Create a widget with element (DOM widget)
    const widget = new BaseWidget({
      name: "dom_widget",
      type: "custom",
      value: "test",
      y: 0,
      options: {},
      node,
    })

    // Add element to make it a DOM widget
    widget.element = document.createElement("div")

    // Should work the same for DOM widgets
    widget.parentSubgraphNode = subgraphNode
    expect(widget.parentSubgraphNode).toBe(subgraphNode)
    expect(widget.isDOMWidget()).toBe(true)
  })
})
