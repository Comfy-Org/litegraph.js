import type { IBaseWidget } from "@/types/widgets"

import { describe, expect, it } from "vitest"

import { LGraphNode } from "@/litegraph"
import { BaseWidget } from "@/widgets/BaseWidget"

import { createEventCapture, createTestSubgraph, createTestSubgraphNode } from "./fixtures/subgraphHelpers"

// Test node with widgets
class TestNodeWithWidget extends LGraphNode {
  constructor(title = "Test Node") {
    super(title)
    const input = this.addInput("in", "number")
    this.addOutput("out", "number")

    // Add a widget
    const widget = new BaseWidget({
      name: "testWidget",
      type: "number",
      value: 42,
      y: 0,
      options: { min: 0, max: 100, step: 1 },
      node: this,
    })
    this.widgets = [widget]

    // Link widget to input slot
    input.widget = { name: widget.name }
  }
}

describe("SubgraphWidgetPromotion", () => {
  describe("Widget Promotion Functionality", () => {
    it("should promote widgets when connecting node to subgraph input", () => {
      // Create a subgraph with an input
      const subgraph = createTestSubgraph({
        inputs: [{ name: "value", type: "number" }],
      })

      // Add a node with a widget to the subgraph
      const nodeWithWidget = new TestNodeWithWidget()
      subgraph.add(nodeWithWidget)

      // Connect the subgraph input to the node's input (which has a widget)
      const link = subgraph.inputNode.slots[0].connect(
        nodeWithWidget.inputs[0],
        nodeWithWidget,
      )
      expect(link).toBeDefined()

      // Create a SubgraphNode instance
      const subgraphNode = createTestSubgraphNode(subgraph)

      // The widget should be promoted to the subgraph node
      expect(subgraphNode.widgets).toHaveLength(1)
      expect(subgraphNode.widgets[0].name).toBe("value") // Uses subgraph input name
      expect(subgraphNode.widgets[0].type).toBe("number")
      expect(subgraphNode.widgets[0].value).toBe(42)
      expect(subgraphNode.widgets[0].parentSubgraphNode).toBe(subgraphNode)
    })

    it("should set parentSubgraphNode for all promoted widget types", () => {
      const subgraph = createTestSubgraph({
        inputs: [
          { name: "numberInput", type: "number" },
          { name: "stringInput", type: "string" },
          { name: "toggleInput", type: "boolean" },
        ],
      })

      // Create nodes with different widget types
      const numberNode = new LGraphNode("Number Node")
      const numberInput = numberNode.addInput("value", "number")
      const numberWidget = new BaseWidget({
        name: "numberWidget",
        type: "number",
        value: 100,
        y: 0,
        options: {},
        node: numberNode,
      })
      numberNode.widgets = [numberWidget]
      numberInput.widget = { name: numberWidget.name }

      const stringNode = new LGraphNode("String Node")
      const stringInput = stringNode.addInput("text", "string")
      const stringWidget = new BaseWidget({
        name: "stringWidget",
        type: "string",
        value: "test",
        y: 0,
        options: {},
        node: stringNode,
      })
      stringNode.widgets = [stringWidget]
      stringInput.widget = { name: stringWidget.name }

      const toggleNode = new LGraphNode("Toggle Node")
      const toggleInput = toggleNode.addInput("bool", "boolean")
      const toggleWidget = new BaseWidget({
        name: "toggleWidget",
        type: "toggle",
        value: true,
        y: 0,
        options: {},
        node: toggleNode,
      })
      toggleNode.widgets = [toggleWidget]
      toggleInput.widget = { name: toggleWidget.name }

      // Add nodes to subgraph
      subgraph.add(numberNode)
      subgraph.add(stringNode)
      subgraph.add(toggleNode)

      // Connect inputs
      subgraph.inputNode.slots[0].connect(numberNode.inputs[0], numberNode)
      subgraph.inputNode.slots[1].connect(stringNode.inputs[0], stringNode)
      subgraph.inputNode.slots[2].connect(toggleNode.inputs[0], toggleNode)

      // Create SubgraphNode
      const subgraphNode = createTestSubgraphNode(subgraph)

      // All widgets should be promoted with parentSubgraphNode set
      expect(subgraphNode.widgets).toHaveLength(3)

      for (const widget of subgraphNode.widgets) {
        expect(widget.parentSubgraphNode).toBe(subgraphNode)
      }

      // Check specific widget values
      expect(subgraphNode.widgets[0].value).toBe(100)
      expect(subgraphNode.widgets[1].value).toBe("test")
      expect(subgraphNode.widgets[2].value).toBe(true)
    })

    it("should fire widget-promoted event when widget is promoted", () => {
      const subgraph = createTestSubgraph({
        inputs: [{ name: "input", type: "number" }],
      })

      // Set up event capture
      const eventCapture = createEventCapture(subgraph.events, [
        "widget-promoted",
        "widget-unpromoted",
      ])

      // Add node with widget
      const nodeWithWidget = new TestNodeWithWidget()
      subgraph.add(nodeWithWidget)

      // Connect to promote widget
      subgraph.inputNode.slots[0].connect(
        nodeWithWidget.inputs[0],
        nodeWithWidget,
      )

      // Create SubgraphNode (this triggers widget promotion)
      const subgraphNode = createTestSubgraphNode(subgraph)

      // Check event was fired
      const promotedEvents = eventCapture.getEventsByType("widget-promoted")
      expect(promotedEvents).toHaveLength(1)
      expect(promotedEvents[0].detail.widget).toBeDefined()
      expect(promotedEvents[0].detail.widget.parentSubgraphNode).toBe(subgraphNode)
      expect(promotedEvents[0].detail.subgraphNode).toBe(subgraphNode)

      eventCapture.cleanup()
    })

    it("should fire widget-unpromoted event when removing promoted widget", () => {
      const subgraph = createTestSubgraph({
        inputs: [{ name: "input", type: "number" }],
      })

      // Add and connect node
      const nodeWithWidget = new TestNodeWithWidget()
      subgraph.add(nodeWithWidget)
      subgraph.inputNode.slots[0].connect(
        nodeWithWidget.inputs[0],
        nodeWithWidget,
      )

      // Create SubgraphNode
      const subgraphNode = createTestSubgraphNode(subgraph)
      expect(subgraphNode.widgets).toHaveLength(1)

      // Set up event capture after promotion
      const eventCapture = createEventCapture(subgraph.events, ["widget-unpromoted"])

      // Remove the widget
      subgraphNode.removeWidgetByName("input")

      // Check event was fired
      const unpromotedEvents = eventCapture.getEventsByType("widget-unpromoted")
      expect(unpromotedEvents).toHaveLength(1)
      expect(unpromotedEvents[0].detail.widget).toBeDefined()
      expect(unpromotedEvents[0].detail.subgraphNode).toBe(subgraphNode)

      // Widget should be removed
      expect(subgraphNode.widgets).toHaveLength(0)

      eventCapture.cleanup()
    })

    it("should handle multiple widgets on same node", () => {
      const subgraph = createTestSubgraph({
        inputs: [
          { name: "input1", type: "number" },
          { name: "input2", type: "string" },
        ],
      })

      // Create node with multiple widgets
      const multiWidgetNode = new LGraphNode("Multi Widget Node")
      const numInput = multiWidgetNode.addInput("num", "number")
      const strInput = multiWidgetNode.addInput("str", "string")

      const widget1 = new BaseWidget({
        name: "widget1",
        type: "number",
        value: 10,
        y: 0,
        options: {},
        node: multiWidgetNode,
      })

      const widget2 = new BaseWidget({
        name: "widget2",
        type: "string",
        value: "hello",
        y: 40,
        options: {},
        node: multiWidgetNode,
      })

      multiWidgetNode.widgets = [widget1, widget2]
      numInput.widget = { name: widget1.name }
      strInput.widget = { name: widget2.name }
      subgraph.add(multiWidgetNode)

      // Connect both inputs
      subgraph.inputNode.slots[0].connect(multiWidgetNode.inputs[0], multiWidgetNode)
      subgraph.inputNode.slots[1].connect(multiWidgetNode.inputs[1], multiWidgetNode)

      // Create SubgraphNode
      const subgraphNode = createTestSubgraphNode(subgraph)

      // Both widgets should be promoted
      expect(subgraphNode.widgets).toHaveLength(2)
      expect(subgraphNode.widgets[0].name).toBe("input1")
      expect(subgraphNode.widgets[0].value).toBe(10)
      expect(subgraphNode.widgets[0].parentSubgraphNode).toBe(subgraphNode)

      expect(subgraphNode.widgets[1].name).toBe("input2")
      expect(subgraphNode.widgets[1].value).toBe("hello")
      expect(subgraphNode.widgets[1].parentSubgraphNode).toBe(subgraphNode)
    })

    it("should clean up parentSubgraphNode on node removal", () => {
      const subgraph = createTestSubgraph({
        inputs: [{ name: "input", type: "number" }],
      })

      const nodeWithWidget = new TestNodeWithWidget()
      subgraph.add(nodeWithWidget)
      subgraph.inputNode.slots[0].connect(
        nodeWithWidget.inputs[0],
        nodeWithWidget,
      )

      const subgraphNode = createTestSubgraphNode(subgraph)
      const promotedWidget = subgraphNode.widgets[0]

      expect(promotedWidget.parentSubgraphNode).toBe(subgraphNode)

      // Set up event capture
      const eventCapture = createEventCapture(subgraph.events, ["widget-unpromoted"])

      // Remove the subgraph node
      subgraphNode.onRemoved()

      // parentSubgraphNode should be cleared
      expect(promotedWidget.parentSubgraphNode).toBeUndefined()

      // Should fire unpromoted events for all widgets
      const unpromotedEvents = eventCapture.getEventsByType("widget-unpromoted")
      expect(unpromotedEvents).toHaveLength(1)

      eventCapture.cleanup()
    })

    it("should handle DOM widgets with parentSubgraphNode", () => {
      const subgraph = createTestSubgraph({
        inputs: [{ name: "domInput", type: "custom" }],
      })

      // Create node with DOM widget
      const domNode = new LGraphNode("DOM Node")
      const domInput = domNode.addInput("custom", "custom")

      const domWidget = new BaseWidget({
        name: "domWidget",
        type: "custom",
        value: "custom value",
        y: 0,
        options: {},
        node: domNode,
      })

      // Make it a DOM widget
      domWidget.element = document.createElement("div")
      domNode.widgets = [domWidget]
      domInput.widget = { name: domWidget.name }

      subgraph.add(domNode)
      subgraph.inputNode.slots[0].connect(domNode.inputs[0], domNode)

      // Create SubgraphNode
      const subgraphNode = createTestSubgraphNode(subgraph)

      // DOM widget should be promoted with parentSubgraphNode
      expect(subgraphNode.widgets).toHaveLength(1)
      const promotedWidget = subgraphNode.widgets[0]
      expect(promotedWidget.isDOMWidget()).toBe(true)
      expect(promotedWidget.parentSubgraphNode).toBe(subgraphNode)
      expect(promotedWidget.name).toBe("domInput")
    })

    it("should not promote widget if input is not connected", () => {
      const subgraph = createTestSubgraph({
        inputs: [{ name: "input", type: "number" }],
      })

      // Add node but don't connect it
      const nodeWithWidget = new TestNodeWithWidget()
      subgraph.add(nodeWithWidget)

      // Create SubgraphNode
      const subgraphNode = createTestSubgraphNode(subgraph)

      // No widgets should be promoted
      expect(subgraphNode.widgets).toHaveLength(0)
    })

    it("should handle disconnection of promoted widget", () => {
      const subgraph = createTestSubgraph({
        inputs: [{ name: "input", type: "number" }],
      })

      const nodeWithWidget = new TestNodeWithWidget()
      subgraph.add(nodeWithWidget)

      // Connect to promote widget
      subgraph.inputNode.slots[0].connect(
        nodeWithWidget.inputs[0],
        nodeWithWidget,
      )

      const subgraphNode = createTestSubgraphNode(subgraph)
      expect(subgraphNode.widgets).toHaveLength(1)

      // Disconnect the link
      subgraph.inputNode.slots[0].disconnect()

      // Widget should be removed (through event listeners)
      expect(subgraphNode.widgets).toHaveLength(0)
    })
  })

  describe("parentSubgraphNode property", () => {
    it("should exist on IBaseWidget interface", () => {
      const widget: IBaseWidget = {
        name: "test",
        type: "number",
        value: 42,
        y: 0,
        options: {},
      }

      // Property should be optional and undefined by default
      expect(widget.parentSubgraphNode).toBeUndefined()

      // Should be able to set it
      widget.parentSubgraphNode = { id: 1 } as any
      expect(widget.parentSubgraphNode).toBeDefined()
    })
  })
})
