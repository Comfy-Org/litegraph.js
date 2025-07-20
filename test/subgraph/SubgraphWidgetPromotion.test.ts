import { describe, expect, it, vi } from "vitest"

import { LGraph } from "@/LGraph"
import { Subgraph } from "@/subgraph/Subgraph"
import { SubgraphNode } from "@/subgraph/SubgraphNode"
import { BaseWidget } from "@/widgets/BaseWidget"
import type { IBaseWidget } from "@/types/widgets"

describe("SubgraphWidgetPromotion", () => {
  function createTestSetup() {
    const rootGraph = new LGraph()
    const subgraph = new Subgraph(rootGraph, {
      id: "test-subgraph",
      name: "Test Subgraph",
      nodes: [],
      links: [],
      version: 1,
      state: 0,
      revision: 0,
      inputNode: { pos: [0, 0] },
      outputNode: { pos: [200, 0] },
      inputs: [],
      outputs: [],
      widgets: [],
      groups: [],
      config: {},
      extra: {},
    })

    const subgraphNode = new SubgraphNode(rootGraph, subgraph, {
      id: 1,
      type: subgraph.id,
      pos: [100, 100],
      size: [200, 100],
    })

    return { rootGraph, subgraph, subgraphNode }
  }

  describe("parentSubgraphNode property", () => {
    it("should set parentSubgraphNode for all promoted widgets", () => {
      const { subgraph, subgraphNode } = createTestSetup()
      
      // Add an input that will get a widget
      const input = subgraph.addInput("test_input", "number")
      
      // Create a mock widget
      const mockWidget: IBaseWidget = {
        name: "test_widget",
        type: "number",
        value: 42,
        y: 0,
        options: {},
        createCopyForNode: vi.fn().mockImplementation(function(this: IBaseWidget, node) {
          return {
            ...this,
            node,
            parentSubgraphNode: undefined,
          }
        }),
      }

      // Simulate connecting a widget to the input
      input._widget = mockWidget
      
      // Trigger widget promotion by reconfiguring
      subgraphNode.configure({
        id: 1,
        type: subgraph.id,
        pos: [100, 100],
        size: [200, 100],
      })

      // Check that the promoted widget has parentSubgraphNode set
      const promotedWidget = subgraphNode.widgets[0]
      expect(promotedWidget).toBeDefined()
      expect(promotedWidget.parentSubgraphNode).toBe(subgraphNode)
    })

    it("should set parentSubgraphNode for DOM widgets", () => {
      const { subgraph, subgraphNode } = createTestSetup()
      
      const input = subgraph.addInput("dom_input", "string")
      
      // Create a mock DOM widget
      const mockDOMWidget: IBaseWidget & { element: HTMLElement } = {
        name: "dom_widget",
        type: "custom",
        value: "test",
        y: 0,
        options: {},
        element: document.createElement("div"),
        isDOMWidget: () => true,
        createCopyForNode: vi.fn().mockImplementation(function(this: IBaseWidget, node) {
          return {
            ...this,
            node,
            parentSubgraphNode: undefined,
          }
        }),
      }

      input._widget = mockDOMWidget
      
      subgraphNode.configure({
        id: 1,
        type: subgraph.id,
        pos: [100, 100],
        size: [200, 100],
      })

      const promotedWidget = subgraphNode.widgets[0]
      expect(promotedWidget).toBeDefined()
      expect(promotedWidget.parentSubgraphNode).toBe(subgraphNode)
    })
  })

  describe("widget-promoted event", () => {
    it("should dispatch widget-promoted event when widget is added", () => {
      const { subgraph, subgraphNode } = createTestSetup()
      
      const promotedHandler = vi.fn()
      subgraph.events.addEventListener("widget-promoted", promotedHandler)
      
      const input = subgraph.addInput("test_input", "number")
      const mockWidget: IBaseWidget = {
        name: "test_widget",
        type: "number",
        value: 42,
        y: 0,
        options: {},
        createCopyForNode: vi.fn().mockImplementation(function(this: IBaseWidget, node) {
          return {
            ...this,
            node,
            parentSubgraphNode: undefined,
          }
        }),
      }
      
      input._widget = mockWidget
      
      subgraphNode.configure({
        id: 1,
        type: subgraph.id,
        pos: [100, 100],
        size: [200, 100],
      })

      expect(promotedHandler).toHaveBeenCalledTimes(1)
      expect(promotedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: {
            widget: expect.objectContaining({
              name: "test_input", // Name gets overridden to match input
              parentSubgraphNode: subgraphNode,
            }),
            subgraphNode: subgraphNode,
          },
        })
      )
    })
  })

  describe("widget-unpromoted event", () => {
    it("should dispatch widget-unpromoted event when widget is removed by name", () => {
      const { subgraph, subgraphNode } = createTestSetup()
      
      // Set up a promoted widget first
      const input = subgraph.addInput("test_input", "number")
      const mockWidget: IBaseWidget = {
        name: "test_widget",
        type: "number",
        value: 42,
        y: 0,
        options: {},
        createCopyForNode: vi.fn().mockImplementation(function(this: IBaseWidget, node) {
          return {
            ...this,
            node,
            parentSubgraphNode: undefined,
          }
        }),
      }
      
      input._widget = mockWidget
      subgraphNode.configure({
        id: 1,
        type: subgraph.id,
        pos: [100, 100],
        size: [200, 100],
      })

      // Now listen for unpromoted event
      const unpromotedHandler = vi.fn()
      subgraph.events.addEventListener("widget-unpromoted", unpromotedHandler)
      
      // Remove the widget
      subgraphNode.removeWidgetByName("test_input")
      
      expect(unpromotedHandler).toHaveBeenCalledTimes(1)
      expect(unpromotedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: {
            widget: expect.objectContaining({
              name: "test_input",
            }),
            subgraphNode: subgraphNode,
          },
        })
      )
    })

    it("should dispatch widget-unpromoted event when widget is removed directly", () => {
      const { subgraph, subgraphNode } = createTestSetup()
      
      // Set up a promoted widget
      const input = subgraph.addInput("test_input", "number")
      const mockWidget: IBaseWidget = {
        name: "test_widget",
        type: "number",
        value: 42,
        y: 0,
        options: {},
        createCopyForNode: vi.fn().mockImplementation(function(this: IBaseWidget, node) {
          return {
            ...this,
            node,
            parentSubgraphNode: undefined,
          }
        }),
      }
      
      input._widget = mockWidget
      subgraphNode.configure({
        id: 1,
        type: subgraph.id,
        pos: [100, 100],
        size: [200, 100],
      })

      const promotedWidget = subgraphNode.widgets[0]
      
      const unpromotedHandler = vi.fn()
      subgraph.events.addEventListener("widget-unpromoted", unpromotedHandler)
      
      // Remove the widget directly
      subgraphNode.ensureWidgetRemoved(promotedWidget)
      
      expect(unpromotedHandler).toHaveBeenCalledTimes(1)
      expect(unpromotedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: {
            widget: promotedWidget,
            subgraphNode: subgraphNode,
          },
        })
      )
    })

    it("should dispatch widget-unpromoted events for all widgets when subgraph node is removed", () => {
      const { subgraph, subgraphNode } = createTestSetup()
      
      // Set up multiple promoted widgets
      const input1 = subgraph.addInput("input1", "number")
      const input2 = subgraph.addInput("input2", "string")
      
      const mockWidget1: IBaseWidget = {
        name: "widget1",
        type: "number",
        value: 42,
        y: 0,
        options: {},
        createCopyForNode: vi.fn().mockImplementation(function(this: IBaseWidget, node) {
          return {
            ...this,
            node,
            parentSubgraphNode: undefined,
          }
        }),
      }
      
      const mockWidget2: IBaseWidget = {
        name: "widget2",
        type: "string",
        value: "test",
        y: 0,
        options: {},
        createCopyForNode: vi.fn().mockImplementation(function(this: IBaseWidget, node) {
          return {
            ...this,
            node,
            parentSubgraphNode: undefined,
          }
        }),
      }
      
      input1._widget = mockWidget1
      input2._widget = mockWidget2
      
      subgraphNode.configure({
        id: 1,
        type: subgraph.id,
        pos: [100, 100],
        size: [200, 100],
      })

      const unpromotedHandler = vi.fn()
      subgraph.events.addEventListener("widget-unpromoted", unpromotedHandler)
      
      // Remove the subgraph node
      subgraphNode.onRemoved()
      
      expect(unpromotedHandler).toHaveBeenCalledTimes(2)
      
      // Check that parentSubgraphNode was cleared
      subgraphNode.widgets.forEach(widget => {
        expect(widget.parentSubgraphNode).toBeUndefined()
      })
    })
  })

  describe("AbortController cleanup", () => {
    it("should handle missing abort method gracefully", () => {
      const { subgraph, subgraphNode } = createTestSetup()
      
      // Add an input with a mock controller that doesn't have abort
      const input = subgraph.addInput("test", "number")
      const subgraphInput = subgraphNode.inputs[0]
      
      // Mock a controller without abort method
      subgraphInput._listenerController = { someOtherProp: true } as any
      
      // This should not throw
      expect(() => {
        subgraphNode.onRemoved()
      }).not.toThrow()
    })
  })
})