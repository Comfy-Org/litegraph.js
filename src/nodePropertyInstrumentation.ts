import type { LGraphNode } from "./LGraphNode"

/**
 * Configuration for tracking property changes
 */
interface PropertyConfig {
  /** The property path (e.g., "title" or "flags.collapsed") */
  path: string
  /** Initial value or getter function */
  defaultValue?: any
  /** Type of the property for validation (optional) */
  type?: "string" | "boolean" | "number" | "object"
}

/**
 * Default properties to track - can be extended or overridden
 */
const DEFAULT_TRACKED_PROPERTIES: PropertyConfig[] = [
  { path: "title", type: "string" },
  { path: "flags.collapsed", defaultValue: false, type: "boolean" },
]

/**
 * Creates a property descriptor that emits change events
 */
function createInstrumentedProperty(
  node: LGraphNode,
  propertyPath: string,
  initialValue: any,
): PropertyDescriptor {
  let value = initialValue

  return {
    get() {
      return value
    },
    set(newValue: any) {
      const oldValue = value
      value = newValue
      if (oldValue !== newValue && node.graph) {
        node.graph.trigger("node:property:changed", {
          nodeId: node.id,
          property: propertyPath,
          oldValue,
          newValue,
        })
      }
    },
    enumerable: true,
    configurable: true,
  }
}

/**
 * Ensures parent objects exist for nested properties
 */
function ensureNestedPath(obj: any, path: string): void {
  const parts = path.split(".")
  let current = obj

  // Create all parent objects except the last property
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    if (!current[part]) {
      current[part] = {}
    }
    current = current[part]
  }
}

/**
 * Instruments a node to emit events when specific properties change.
 * Uses Object.defineProperty to intercept property assignments without
 * affecting performance of hot-path properties.
 * @param node The node to instrument
 * @param trackedProperties Array of properties to track (defaults to DEFAULT_TRACKED_PROPERTIES)
 */
export function instrumentNodeProperties(
  node: LGraphNode,
  trackedProperties: PropertyConfig[] = DEFAULT_TRACKED_PROPERTIES,
): void {
  for (const config of trackedProperties) {
    const parts = config.path.split(".")

    // Ensure nested path exists
    if (parts.length > 1) {
      ensureNestedPath(node, config.path)
    }

    // Get the parent object and property name
    let targetObject: any = node
    let propertyName = parts[0]

    if (parts.length > 1) {
      // Navigate to parent object for nested properties
      for (let i = 0; i < parts.length - 1; i++) {
        targetObject = targetObject[parts[i]]
      }
      propertyName = parts.at(-1)!
    }

    // Get initial value
    const currentValue = targetObject[propertyName]
    const initialValue = currentValue !== undefined
      ? currentValue
      : config.defaultValue

    // Create and apply the property descriptor
    Object.defineProperty(
      targetObject,
      propertyName,
      createInstrumentedProperty(node, config.path, initialValue),
    )
  }
}

/**
 * Helper function to add additional tracked properties to the default set
 */
export function addTrackedProperty(config: PropertyConfig): void {
  // Check if property is already tracked
  const exists = DEFAULT_TRACKED_PROPERTIES.some(p => p.path === config.path)
  if (!exists) {
    DEFAULT_TRACKED_PROPERTIES.push(config)
  }
}

/**
 * Helper function to get the current set of tracked properties
 */
export function getTrackedProperties(): PropertyConfig[] {
  return [...DEFAULT_TRACKED_PROPERTIES]
}
