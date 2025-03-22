import type {
  Dictionary,
  INodeFlags,
  INodeInputSlot,
  INodeOutputSlot,
  ISlotType,
  Point,
  Size,
} from "../interfaces"
import type { LGraphConfig, LGraphState } from "../LGraph"
import type { IGraphGroupFlags } from "../LGraphGroup"
import type { NodeId, NodeProperty } from "../LGraphNode"
import type { LiteGraph } from "../litegraph"
import type { LinkId, SerialisedLLinkArray } from "../LLink"
import type { FloatingRerouteSlot, RerouteId } from "../Reroute"
import type { TWidgetValue } from "../types/widgets"
import type { RenderShape } from "./globalEnums"
import type { UUID } from "@/utils/uuid"

/**
 * An object that implements custom pre-serialization logic via {@link Serialisable.asSerialisable}.
 */
export interface Serialisable<SerialisableObject> {
  /**
   * Prepares this object for serialization.
   * Creates a partial shallow copy of itself, with only the properties that should be serialised.
   * @returns An object that can immediately be serialized to JSON.
   */
  asSerialisable(): SerialisableObject
}

export interface BaseExportedGraph {
  /** Unique graph ID.  Automatically generated if not provided. */
  id: UUID
  revision: number
}

export interface SerialisableGraph extends BaseExportedGraph {
  /** Schema version.  @remarks Version bump should add to const union, which is used to narrow type during deserialise. */
  version: 0 | 1
  config: LGraphConfig
  state: LGraphState
  groups?: ISerialisedGroup[]
  nodes?: ISerialisedNode[]
  links?: SerialisableLLink[]
  floatingLinks?: SerialisableLLink[]
  reroutes?: SerialisableReroute[]
  extra?: Dictionary<unknown>
}

export type ISerialisableNodeInput = Omit<INodeInputSlot, "_layoutElement" | "widget"> & {
  widget?: { name: string }
}
export type ISerialisableNodeOutput = Omit<INodeOutputSlot, "_layoutElement" | "_data"> & {
  widget?: { name: string }
}

/** Serialised LGraphNode */
export interface ISerialisedNode {
  title?: string
  id: NodeId
  type?: string
  pos?: Point
  size?: Size
  flags?: INodeFlags
  order?: number
  mode?: number
  outputs?: ISerialisableNodeOutput[]
  inputs?: ISerialisableNodeInput[]
  properties?: Dictionary<NodeProperty | undefined>
  shape?: RenderShape
  boxcolor?: string
  color?: string
  bgcolor?: string
  showAdvanced?: boolean
  /**
   * Note: Some custom nodes overrides the `widgets_values` property to an
   * object that has `length` property and index access. It is not safe to call
   * any array methods on it.
   * See example in https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite/blob/8629188458dc6cb832f871ece3bd273507e8a766/web/js/VHS.core.js#L59-L84
   */
  widgets_values?: TWidgetValue[]
}

/**
 * Original implementation from static litegraph.d.ts
 * Maintained for backwards compat
 */
export interface ISerialisedGraph extends BaseExportedGraph {
  last_node_id: NodeId
  last_link_id: number
  nodes: ISerialisedNode[]
  links: SerialisedLLinkArray[]
  floatingLinks?: SerialisableLLink[]
  groups: ISerialisedGroup[]
  config: LGraphConfig
  version: typeof LiteGraph.VERSION
  extra?: Dictionary<unknown> & {
    reroutes?: SerialisableReroute[]
  }
}

/** Serialised LGraphGroup */
export interface ISerialisedGroup {
  id: number
  title: string
  bounding: number[]
  color?: string
  font_size: number
  flags?: IGraphGroupFlags
}

export type TClipboardLink = [
  targetRelativeIndex: number,
  originSlot: number,
  nodeRelativeIndex: number,
  targetSlot: number,
  targetNodeId: NodeId,
]

/** Items copied from the canvas */
export interface ClipboardItems {
  nodes?: ISerialisedNode[]
  groups?: ISerialisedGroup[]
  reroutes?: SerialisableReroute[]
  links?: SerialisableLLink[]
}

/** @deprecated */
export interface IClipboardContents {
  nodes?: ISerialisedNode[]
  links?: TClipboardLink[]
}

export interface SerialisableReroute {
  id: RerouteId
  parentId?: RerouteId
  pos: Point
  linkIds: LinkId[]
  floating?: FloatingRerouteSlot
}

export interface SerialisableLLink {
  /** Link ID */
  id: LinkId
  /** Output node ID */
  origin_id: NodeId
  /** Output slot index */
  origin_slot: number
  /** Input node ID */
  target_id: NodeId
  /** Input slot index */
  target_slot: number
  /** Data type of the link */
  type: ISlotType
  /** ID of the last reroute (from input to output) that this link passes through, otherwise `undefined` */
  parentId?: RerouteId
}
