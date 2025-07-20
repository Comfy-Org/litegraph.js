import type { LGraphNode } from "./LGraphNode"

/**
 * Instruments a node to emit events when specific properties change.
 * Uses Object.defineProperty to intercept property assignments without
 * affecting performance of hot-path properties.
 */
export function instrumentNodeProperties(node: LGraphNode): void {
  // Track title changes
  let _title = node.title
  Object.defineProperty(node, "title", {
    get() {
      return _title
    },
    set(value: string) {
      const oldValue = _title
      _title = value
      if (oldValue !== value && node.graph) {
        // Emit via graph's trigger mechanism
        node.graph.trigger("node:property:changed", {
          nodeId: node.id,
          property: "title",
          oldValue,
          newValue: value,
        })
      }
    },
    enumerable: true,
    configurable: true,
  })

  // Ensure flags object exists
  if (!node.flags) {
    node.flags = {}
  }

  // Track flags.collapsed changes
  let _collapsed = node.flags.collapsed || false
  Object.defineProperty(node.flags, "collapsed", {
    get() {
      return _collapsed
    },
    set(value: boolean) {
      const oldValue = _collapsed
      _collapsed = value
      if (oldValue !== value && node.graph) {
        node.graph.trigger("node:property:changed", {
          nodeId: node.id,
          property: "flags.collapsed",
          oldValue,
          newValue: value,
        })
      }
    },
    enumerable: true,
    configurable: true,
  })
}
