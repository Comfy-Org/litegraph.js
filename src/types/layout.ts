import type { IWidget } from "@/types/widgets"
import type { NodeInputSlot, NodeOutputSlot } from "@/NodeSlot"

export interface LayoutPoint {
  x: number
  y: number
}

export interface LayoutSize {
  width: number
  height: number
}

export interface LayoutRect extends LayoutPoint, LayoutSize { }

/** Represents the visual state of an element */
export interface VisualState {
  invalid?: boolean
  highlight?: boolean
  selected?: boolean
  active?: boolean
  visible?: boolean
  alpha?: number
  disabled?: boolean
}

/** Represents a single visual element's layout information */
export interface ElementLayout<T = any> extends LayoutRect, VisualState {
  /** Identifies the type of element (e.g., 'slot', 'widget', 'title') */
  type: string
  /** Optional identifier for the element */
  id?: string | number
  /** Additional element-specific data */
  data?: T
}

/** Collection of layouts for a group of related elements */
export interface ElementGroupLayout<T = any> {
  elements: ElementLayout<T>[]
  /** Bounding box containing all elements in the group */
  bounds: LayoutRect
}

/** Complete layout information for a node */
export interface NodeLayout {
  // Core elements
  /** Overall bounding box of the node */
  bounds: LayoutRect

  // Grouped elements
  /** Input slots of the node */
  inputSlots: ElementGroupLayout<NodeInputSlot>
  /** Output slots of the node */
  outputSlots: ElementGroupLayout<NodeOutputSlot>
  /** Widgets of the node */
  widgets: ElementGroupLayout<IWidget>

  // Custom sections can be added as needed
  [key: string]: ElementGroupLayout | ElementLayout | LayoutRect | undefined
}
