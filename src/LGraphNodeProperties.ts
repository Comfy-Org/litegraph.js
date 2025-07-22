import type { LGraphNode } from "./LGraphNode"

/**
 * Configuration for tracking property changes
 */
export interface PropertyConfig {
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
  { path: "flags.collapsed", type: "boolean" },
]

/**
 * Manages node properties with optional change tracking and instrumentation.
 */
export class LGraphNodeProperties {
  /** The node this property manager belongs to */
  node: LGraphNode

  /** Properties being tracked for changes */
  trackedProperties: PropertyConfig[]

  /** Set of property paths that have been instrumented */
  #instrumentedPaths = new Set<string>()

  constructor(node: LGraphNode, config: { trackedProperties?: PropertyConfig[] } = {}) {
    this.node = node
    this.trackedProperties = config.trackedProperties || [...DEFAULT_TRACKED_PROPERTIES]

    // Initialize instrumentation
    this.#setupInstrumentation()
  }

  /**
   * Sets up property instrumentation for all tracked properties
   */
  #setupInstrumentation(): void {
    for (const config of this.trackedProperties) {
      this.#instrumentProperty(config)
    }
  }

  /**
   * Instruments a single property to track changes
   */
  #instrumentProperty(config: PropertyConfig): void {
    const parts = config.path.split(".")

    // Ensure nested path exists
    if (parts.length > 1) {
      this.#ensureNestedPath(config.path)
    }

    // Get the parent object and property name
    let targetObject: any = this.node
    let propertyName = parts[0]

    if (parts.length > 1) {
      // Navigate to parent object for nested properties
      for (let i = 0; i < parts.length - 1; i++) {
        targetObject = targetObject[parts[i]]
      }
      propertyName = parts.at(-1)!
    }

    const hasProperty = Object.prototype.hasOwnProperty.call(targetObject, propertyName)
    const currentValue = targetObject[propertyName]

    if (!hasProperty) {
      // Property doesn't exist yet - create it with instrumentation
      let value = config.defaultValue ?? undefined
      Object.defineProperty(targetObject, propertyName, {
        get: () => value,
        set: (newValue: any) => {
          const oldValue = value
          value = newValue
          this.#emitPropertyChange(config.path, oldValue, newValue)
        },
        enumerable: false,
        configurable: true,
      })
    } else {
      // Property exists - replace with instrumented version
      Object.defineProperty(
        targetObject,
        propertyName,
        this.#createInstrumentedDescriptor(config.path, currentValue),
      )
    }

    this.#instrumentedPaths.add(config.path)
  }

  /**
   * Creates a property descriptor that emits change events
   */
  #createInstrumentedDescriptor(propertyPath: string, initialValue: any): PropertyDescriptor {
    let value = initialValue

    return {
      get: () => value,
      set: (newValue: any) => {
        const oldValue = value
        value = newValue
        this.#emitPropertyChange(propertyPath, oldValue, newValue)
      },
      enumerable: true,
      configurable: true,
    }
  }

  /**
   * Emits a property change event if the node is connected to a graph
   */
  #emitPropertyChange(propertyPath: string, oldValue: any, newValue: any): void {
    if (oldValue !== newValue && this.node.graph) {
      this.node.graph.trigger("node:property:changed", {
        nodeId: this.node.id,
        property: propertyPath,
        oldValue,
        newValue,
      })
    }
  }

  /**
   * Ensures parent objects exist for nested properties
   */
  #ensureNestedPath(path: string): void {
    const parts = path.split(".")
    let current: any = this.node

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
   * Adds a new property to track
   * @param config The property configuration
   */
  addTrackedProperty(config: PropertyConfig): void {
    // Check if property is already tracked
    if (this.#instrumentedPaths.has(config.path)) {
      return
    }

    this.trackedProperties.push(config)
    this.#instrumentProperty(config)
  }

  /**
   * Removes tracking for a property
   * @param path The property path to stop tracking
   */
  removeTrackedProperty(path: string): void {
    this.trackedProperties = this.trackedProperties.filter(p => p.path !== path)
    this.#instrumentedPaths.delete(path)
    // Note: We can't easily remove the instrumentation without affecting the property
  }

  /**
   * Gets the value of a property by path
   * @param path The property path (e.g., "flags.collapsed")
   */
  getProperty(path: string): any {
    const parts = path.split(".")
    let current: any = this.node

    for (const part of parts) {
      if (current == null) return undefined
      current = current[part]
    }

    return current
  }

  /**
   * Sets the value of a property by path
   * @param path The property path
   * @param value The value to set
   */
  setProperty(path: string, value: any): void {
    const parts = path.split(".")
    let current: any = this.node

    // Navigate to parent object
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      if (!current[part]) {
        current[part] = {}
      }
      current = current[part]
    }

    // Set the property
    const propertyName = parts.at(-1)!
    current[propertyName] = value
  }

  /**
   * Gets all tracked properties and their current values
   */
  getAllTrackedValues(): Record<string, any> {
    const result: Record<string, any> = {}

    for (const config of this.trackedProperties) {
      result[config.path] = this.getProperty(config.path)
    }

    return result
  }

  /**
   * Checks if a property is being tracked
   */
  isTracked(path: string): boolean {
    return this.#instrumentedPaths.has(path)
  }

  /**
   * Gets the list of currently tracked properties
   */
  getTrackedProperties(): PropertyConfig[] {
    return [...this.trackedProperties]
  }

  /**
   * Static method to get default tracked properties
   */
  static getDefaultTrackedProperties(): PropertyConfig[] {
    return [...DEFAULT_TRACKED_PROPERTIES]
  }

  /**
   * Static method to extend default tracked properties globally
   */
  static addDefaultTrackedProperty(config: PropertyConfig): void {
    const exists = DEFAULT_TRACKED_PROPERTIES.some(p => p.path === config.path)
    if (!exists) {
      DEFAULT_TRACKED_PROPERTIES.push(config)
    }
  }
}
