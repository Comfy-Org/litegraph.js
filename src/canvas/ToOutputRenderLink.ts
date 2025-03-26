import type { RenderLink } from "./RenderLink"
import type { LinkConnectorEventTarget } from "@/infrastructure/LinkConnectorEventTarget"
import type { INodeInputSlot, INodeOutputSlot, LinkNetwork, Point } from "@/interfaces"
import type { LGraphNode } from "@/LGraphNode"
import type { Reroute } from "@/Reroute"

import { LinkDirection } from "@/types/globalEnums"

/** Connecting TO an output slot. */

export class ToOutputRenderLink implements RenderLink {
  readonly toType = "output"
  readonly fromPos: Point
  readonly fromSlotIndex: number
  fromDirection: LinkDirection = LinkDirection.LEFT

  constructor(
    readonly network: LinkNetwork,
    readonly node: LGraphNode,
    readonly fromSlot: INodeInputSlot,
    readonly fromReroute?: Reroute,
    public dragDirection: LinkDirection = LinkDirection.CENTER,
  ) {
    const inputIndex = node.inputs.indexOf(fromSlot)
    if (inputIndex === -1) throw new Error(`Creating render link for node [${this.node.id}] failed: Slot index not found.`)

    this.fromSlotIndex = inputIndex
    this.fromPos = fromReroute
      ? fromReroute.pos
      : this.node.getInputPos(inputIndex)
  }

  canConnectToInput(): false {
    return false
  }

  canConnectToOutput(outputNode: LGraphNode, output: INodeOutputSlot): boolean {
    return this.node.canConnectTo(outputNode, this.fromSlot, output)
  }

  canConnectToReroute(reroute: Reroute): boolean {
    if (reroute.origin_id === this.node.id) return false
    return true
  }

  connectToOutput(node: LGraphNode, output: INodeOutputSlot, events: LinkConnectorEventTarget) {
    const { node: inputNode, fromSlot, fromReroute } = this
    if (!inputNode) return

    const newLink = node.connectSlots(output, inputNode, fromSlot, fromReroute?.id)
    events.dispatch("link-created", newLink)
  }

  connectToRerouteOutput(
    reroute: Reroute,
    outputNode: LGraphNode,
    output: INodeOutputSlot,
    events: LinkConnectorEventTarget,
  ): void {
    const { node: inputNode, fromSlot } = this
    const newLink = outputNode.connectSlots(output, inputNode, fromSlot, reroute?.id)
    events.dispatch("link-created", newLink)
  }

  connectToInput() {
    throw new Error("ToOutputRenderLink cannot connect to an input.")
  }

  connectToRerouteInput() {
    throw new Error("ToOutputRenderLink cannot connect to an input.")
  }
}
