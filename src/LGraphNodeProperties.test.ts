import type { PropertyConfig } from "./LGraphNodeProperties"

import { beforeEach, describe, expect, it, vi } from "vitest"

import { LGraphNodeProperties } from "./LGraphNodeProperties"

describe("LGraphNodeProperties", () => {
  let mockNode: any
  let mockGraph: any

  beforeEach(() => {
    mockGraph = {
      trigger: vi.fn(),
    }

    mockNode = {
      id: 123,
      title: "Test Node",
      flags: {},
      graph: mockGraph,
    }
  })

  describe("constructor", () => {
    it("should initialize with default tracked properties", () => {
      const propManager = new LGraphNodeProperties(mockNode)
      const tracked = propManager.getTrackedProperties()

      expect(tracked).toHaveLength(2)
      expect(tracked).toContainEqual({ path: "title", type: "string" })
      expect(tracked).toContainEqual({ path: "flags.collapsed", type: "boolean" })
    })

    it("should initialize with custom tracked properties", () => {
      const customProps: PropertyConfig[] = [
        { path: "customProp", type: "string" },
        { path: "nested.prop", type: "number" },
      ]

      const propManager = new LGraphNodeProperties(mockNode, { trackedProperties: customProps })
      const tracked = propManager.getTrackedProperties()

      expect(tracked).toEqual(customProps)
    })
  })

  describe("property tracking", () => {
    it("should track changes to existing properties", () => {
      new LGraphNodeProperties(mockNode)

      mockNode.title = "New Title"

      expect(mockGraph.trigger).toHaveBeenCalledWith("node:property:changed", {
        nodeId: mockNode.id,
        property: "title",
        oldValue: "Test Node",
        newValue: "New Title",
      })
    })

    it("should track changes to nested properties", () => {
      new LGraphNodeProperties(mockNode)

      mockNode.flags.collapsed = true

      expect(mockGraph.trigger).toHaveBeenCalledWith("node:property:changed", {
        nodeId: mockNode.id,
        property: "flags.collapsed",
        oldValue: undefined,
        newValue: true,
      })
    })

    it("should not emit events when value doesn't change", () => {
      new LGraphNodeProperties(mockNode)

      mockNode.title = "Test Node"
      mockNode.title = "Test Node" // Same value

      expect(mockGraph.trigger).toHaveBeenCalledTimes(0)
    })

    it("should not emit events when node has no graph", () => {
      mockNode.graph = null
      new LGraphNodeProperties(mockNode)

      // Should not throw
      expect(() => {
        mockNode.title = "New Title"
      }).not.toThrow()
    })
  })

  describe("addTrackedProperty", () => {
    it("should add new tracked properties dynamically", () => {
      const propManager = new LGraphNodeProperties(mockNode, { trackedProperties: [] })

      propManager.addTrackedProperty({ path: "color", type: "string" })
      mockNode.color = "#FF0000"

      expect(mockGraph.trigger).toHaveBeenCalledWith("node:property:changed", {
        nodeId: mockNode.id,
        property: "color",
        oldValue: undefined,
        newValue: "#FF0000",
      })
    })

    it("should not add duplicate tracked properties", () => {
      const propManager = new LGraphNodeProperties(mockNode)
      const initialCount = propManager.getTrackedProperties().length

      propManager.addTrackedProperty({ path: "title", type: "string" })

      expect(propManager.getTrackedProperties()).toHaveLength(initialCount)
    })
  })

  describe("property access methods", () => {
    it("should get property values by path", () => {
      const propManager = new LGraphNodeProperties(mockNode)
      mockNode.title = "Test Title"
      mockNode.flags.collapsed = true

      expect(propManager.getProperty("title")).toBe("Test Title")
      expect(propManager.getProperty("flags.collapsed")).toBe(true)
      expect(propManager.getProperty("nonexistent")).toBeUndefined()
    })

    it("should set property values by path", () => {
      const propManager = new LGraphNodeProperties(mockNode)

      propManager.setProperty("title", "New Title")
      propManager.setProperty("flags.collapsed", true)
      propManager.setProperty("deep.nested.prop", "value")

      expect(mockNode.title).toBe("New Title")
      expect(mockNode.flags.collapsed).toBe(true)
      expect(mockNode.deep.nested.prop).toBe("value")
    })

    it("should get all tracked values", () => {
      const propManager = new LGraphNodeProperties(mockNode)
      mockNode.title = "Test Title"
      mockNode.flags.collapsed = true

      const values = propManager.getAllTrackedValues()

      expect(values).toEqual({
        "title": "Test Title",
        "flags.collapsed": true,
      })
    })
  })

  describe("isTracked", () => {
    it("should correctly identify tracked properties", () => {
      const propManager = new LGraphNodeProperties(mockNode)

      expect(propManager.isTracked("title")).toBe(true)
      expect(propManager.isTracked("flags.collapsed")).toBe(true)
      expect(propManager.isTracked("untracked")).toBe(false)
    })
  })

  describe("static methods", () => {
    it("should get default tracked properties", () => {
      const defaults = LGraphNodeProperties.getDefaultTrackedProperties()

      expect(defaults).toContainEqual({ path: "title", type: "string" })
      expect(defaults).toContainEqual({ path: "flags.collapsed", type: "boolean" })
    })

    it("should allow extending default tracked properties", () => {
      const initialDefaults = LGraphNodeProperties.getDefaultTrackedProperties()
      const initialLength = initialDefaults.length

      LGraphNodeProperties.addDefaultTrackedProperty({ path: "testProp", type: "string" })

      const newDefaults = LGraphNodeProperties.getDefaultTrackedProperties()
      expect(newDefaults).toHaveLength(initialLength + 1)
      expect(newDefaults).toContainEqual({ path: "testProp", type: "string" })

      // Clean up - remove the added property
      const index = newDefaults.findIndex(p => p.path === "testProp")
      if (index !== -1) {
        newDefaults.splice(index, 1)
      }
    })
  })

  describe("property instrumentation edge cases", () => {
    it("should handle properties with default values", () => {
      new LGraphNodeProperties(mockNode, {
        trackedProperties: [{ path: "newProp", defaultValue: "default", type: "string" }],
      })

      expect(mockNode.newProp).toBe("default")
    })

    it("should handle deeply nested property creation", () => {
      new LGraphNodeProperties(mockNode, {
        trackedProperties: [{ path: "a.b.c.d", type: "string" }],
      })

      expect(mockNode.a.b.c).toBeDefined()

      mockNode.a.b.c.d = "deep value"
      expect(mockNode.a.b.c.d).toBe("deep value")
    })
  })
})
