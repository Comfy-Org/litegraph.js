import { beforeEach, describe, expect, it, vi } from "vitest"

import { LiteGraph } from "@/litegraph"

describe("LiteGraph.cloneObject", () => {
  beforeEach(() => {
    // Reset debug state
    LiteGraph.debug = false
  })

  it("should handle null and undefined", () => {
    expect(LiteGraph.cloneObject(null)).toBe(null)
    expect(LiteGraph.cloneObject()).toBe(null)
  })

  it("should clone simple objects", () => {
    const obj = { a: 1, b: "test", c: true }
    const cloned = LiteGraph.cloneObject(obj)

    expect(cloned).toEqual(obj)
    expect(cloned).not.toBe(obj)
  })

  it("should preserve Date objects", () => {
    const date = new Date("2024-01-01")
    const obj = { timestamp: date }
    
    const cloned = LiteGraph.cloneObject(obj)
    expect(cloned.timestamp).toBeInstanceOf(Date)
    expect(cloned.timestamp.getTime()).toBe(date.getTime())
  })

  it("should preserve RegExp objects", () => {
    const regex = /test/gi
    const obj = { pattern: regex }
    
    const cloned = LiteGraph.cloneObject(obj)
    expect(cloned.pattern).toBeInstanceOf(RegExp)
    expect(cloned.pattern.source).toBe("test")
    expect(cloned.pattern.flags).toBe("gi")
  })

  it("should preserve undefined values", () => {
    const obj = { defined: "value", undefined: undefined }
    
    const cloned = LiteGraph.cloneObject(obj)
    expect(cloned.undefined).toBe(undefined)
    expect("undefined" in cloned).toBe(true)
  })

  it("should handle circular references", () => {
    const obj: any = { name: "test" }
    obj.self = obj
    
    const cloned = LiteGraph.cloneObject(obj)
    expect(cloned.name).toBe("test")
    expect(cloned.self).toBe(cloned) // Circular reference preserved
    expect(cloned).not.toBe(obj) // But it's still a clone
  })


  it("should handle the target parameter correctly", () => {
    const source = { a: 1, b: 2 }
    const target = { c: 3 }

    const result = LiteGraph.cloneObject(source, target)

    expect(result).toBe(target) // Should return the target object
    expect(result.a).toBe(1)
    expect(result.b).toBe(2)
    expect(result.c).toBe(3) // Original target property preserved
  })

  it("should clone typical node flags correctly", () => {
    const flags = {
      collapsed: false,
      pinned: true,
      selected: false,
    }

    const cloned = LiteGraph.cloneObject(flags)
    expect(cloned).toEqual(flags)
    expect(cloned).not.toBe(flags)
  })

  it("should clone typical node properties correctly", () => {
    const properties = {
      value: 42,
      name: "test node",
      enabled: true,
      nested: {
        array: [1, 2, 3],
        object: { x: 10, y: 20 },
      },
    }

    const cloned = LiteGraph.cloneObject(properties)
    expect(cloned).toEqual(properties)
    expect(cloned).not.toBe(properties)
    expect(cloned.nested).not.toBe(properties.nested)
    expect(cloned.nested.array).not.toBe(properties.nested.array)
  })
})
