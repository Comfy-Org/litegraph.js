import type { RenderLink } from "./RenderLink"
import type { LinkConnectorEventTarget } from "@/infrastructure/LinkConnectorEventTarget"
import type { INodeInputSlot, INodeOutputSlot, LinkNetwork, Point } from "@/interfaces"
import type { LGraphNode, NodeId } from "@/LGraphNode"
import type { LLink } from "@/LLink"
import type { Reroute } from "@/Reroute"

import { LinkDirection } from "@/types/globalEnums"

/**
 * Represents an existing link that is currently being dragged by the user from one slot to another.
 *
 * This is a heavier, but short-lived convenience data structure. All refs to MovingRenderLinks should be discarded on drop.
 * @remarks
 * At time of writing, Litegraph is using several different styles and methods to handle link dragging.
 *
 * Once the library has undergone more substantial changes to the way links are managed,
 * many properties of this class will be superfluous and removable.
 */

export abstract class MovingLinkBase implements RenderLink {
  abstract readonly node: LGraphNode
  abstract readonly fromSlot: INodeOutputSlot | INodeInputSlot
  abstract readonly fromPos: Point
  abstract readonly fromDirection: LinkDirection
  abstract readonly fromSlotIndex: number

  readonly outputNodeId: NodeId
  readonly outputNode: LGraphNode
  readonly outputSlot: INodeOutputSlot
  readonly outputIndex: number
  readonly outputPos: Point

  readonly inputNodeId: NodeId
  readonly inputNode: LGraphNode
  readonly inputSlot: INodeInputSlot
  readonly inputIndex: number
  readonly inputPos: Point

  constructor(
    readonly network: LinkNetwork,
    readonly link: LLink,
    readonly toType: "input" | "output",
    readonly fromReroute?: Reroute,
    readonly dragDirection: LinkDirection = LinkDirection.CENTER,
  ) {
    const {
      origin_id: outputNodeId,
      target_id: inputNodeId,
      origin_slot: outputIndex,
      target_slot: inputIndex,
    } = link

    // Store output info
    const outputNode = network.getNodeById(outputNodeId) ?? undefined
    if (!outputNode) throw new Error(`Creating MovingRenderLink for link [${link.id}] failed: Output node [${outputNodeId}] not found.`)

    const outputSlot = outputNode.outputs.at(outputIndex)
    if (!outputSlot) throw new Error(`Creating MovingRenderLink for link [${link.id}] failed: Output slot [${outputIndex}] not found.`)

    this.outputNodeId = outputNodeId
    this.outputNode = outputNode
    this.outputSlot = outputSlot
    this.outputIndex = outputIndex
    this.outputPos = outputNode.getOutputPos(outputIndex)

    // Store input info
    const inputNode = network.getNodeById(inputNodeId) ?? undefined
    if (!inputNode) throw new Error(`Creating DraggingRenderLink for link [${link.id}] failed: Input node [${inputNodeId}] not found.`)

    const inputSlot = inputNode.inputs.at(inputIndex)
    if (!inputSlot) throw new Error(`Creating DraggingRenderLink for link [${link.id}] failed: Input slot [${inputIndex}] not found.`)

    this.inputNodeId = inputNodeId
    this.inputNode = inputNode
    this.inputSlot = inputSlot
    this.inputIndex = inputIndex
    this.inputPos = inputNode.getInputPos(inputIndex)
  }

  abstract connectToInput(node: LGraphNode, input: INodeInputSlot, events?: LinkConnectorEventTarget): void
  abstract connectToOutput(node: LGraphNode, output: INodeOutputSlot, events?: LinkConnectorEventTarget): void
  abstract connectToRerouteInput(reroute: Reroute, { node, input, link }: { node: LGraphNode, input: INodeInputSlot, link: LLink }, events: LinkConnectorEventTarget, originalReroutes: Reroute[]): void
  abstract connectToRerouteOutput(reroute: Reroute, outputNode: LGraphNode, output: INodeOutputSlot, events: LinkConnectorEventTarget): void
}
