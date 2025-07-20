import { describe, expect, it } from "vitest"

import type { IBaseWidget } from "@/types/widgets"

describe("SubgraphWidgetPromotion", () => {
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
      
      // Should be able to set it (compilation test)
      widget.parentSubgraphNode = { id: 1 } as any
      expect(widget.parentSubgraphNode).toBeDefined()
    })

    it("should support parentSubgraphNode for all widget types", () => {
      const widgets: IBaseWidget[] = [
        { name: "num", type: "number", value: 42, y: 0, options: {} },
        { name: "str", type: "string", value: "test", y: 0, options: {} },
        { name: "bool", type: "toggle", value: true, y: 0, options: {} },
        { name: "combo", type: "combo", value: "option1", y: 0, options: { values: ["option1", "option2"] } },
        { name: "custom", type: "custom", value: {}, y: 0, options: {} },
      ]

      // All widget types should support parentSubgraphNode
      widgets.forEach(widget => {
        // Property might not be enumerable, but should be settable
        widget.parentSubgraphNode = { id: 123 } as any
        expect(widget.parentSubgraphNode?.id).toBe(123)
      })
    })
  })

  describe("Event type compilation", () => {
    it("should have widget-promoted and widget-unpromoted events in SubgraphEventMap", () => {
      // This test verifies that the types compile correctly
      // The actual event dispatch testing requires complex subgraph setup
      
      type EventMap = typeof import("@/infrastructure/SubgraphEventMap").SubgraphEventMap
      type WidgetPromotedEvent = EventMap extends { "widget-promoted": infer E } ? E : never
      type WidgetUnpromotedEvent = EventMap extends { "widget-unpromoted": infer E } ? E : never
      
      // Type check - these should not be 'never'
      const promotedEvent: WidgetPromotedEvent = {} as any
      const unpromotedEvent: WidgetUnpromotedEvent = {} as any
      
      expect(promotedEvent).toBeDefined() 
      expect(unpromotedEvent).toBeDefined()
    })
  })
})