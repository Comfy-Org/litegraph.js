import type { LinkConnectorEventTarget } from "@/infrastructure/LinkConnectorEventTarget"
import type { LinkNetwork, Point } from "@/interfaces"
import type { LGraphNode } from "@/LGraphNode"
import type { INodeInputSlot, INodeOutputSlot, LLink, Reroute } from "@/litegraph"
import type { LinkDirection } from "@/types/globalEnums"

export interface RenderLink {
  /** The type of link being connected. */
  readonly toType: "input" | "output"
  /** The source {@link Point} of the link being connected. */
  readonly fromPos: Point
  /** The direction the link starts off as.  If {@link toType} is `output`, this will be the direction the link input faces. */
  readonly fromDirection: LinkDirection
  /** If set, this will force a dragged link "point" from the cursor in the specified direction. */
  dragDirection: LinkDirection

  /** The network that the link belongs to. */
  readonly network: LinkNetwork
  /** The node that the link is being connected from. */
  readonly node: LGraphNode
  /** The slot that the link is being connected from. */
  readonly fromSlot: INodeOutputSlot | INodeInputSlot
  /** The index of the slot that the link is being connected from. */
  readonly fromSlotIndex: number
  /** The reroute that the link is being connected from. */
  readonly fromReroute?: Reroute

  connectToInput(node: LGraphNode, input: INodeInputSlot, events?: LinkConnectorEventTarget): void
  connectToOutput(node: LGraphNode, output: INodeOutputSlot, events?: LinkConnectorEventTarget): void

  connectToRerouteInput(
    reroute: Reroute,
    { node, input, link }: { node: LGraphNode, input: INodeInputSlot, link: LLink },
    events: LinkConnectorEventTarget,
    originalReroutes: Reroute[],
  ): void

  connectToRerouteOutput(
    reroute: Reroute,
    outputNode: LGraphNode,
    output: INodeOutputSlot,
    events: LinkConnectorEventTarget,
  ): void
}
