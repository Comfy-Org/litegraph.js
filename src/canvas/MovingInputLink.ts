import type { LinkNetwork, Point } from "@/interfaces"
import type { LGraphNode } from "@/LGraphNode"
import type { INodeOutputSlot } from "@/litegraph"
import type { LLink } from "@/LLink"
import type { Reroute } from "@/Reroute"

import { LinkDirection } from "@/types/globalEnums"

import { MovingLinkBase } from "./MovingLinkBase"

export class MovingInputLink extends MovingLinkBase {
  readonly toType = "input"

  readonly node: LGraphNode
  readonly fromSlot: INodeOutputSlot
  readonly fromPos: Point
  readonly fromDirection: LinkDirection
  readonly fromSlotIndex: number

  constructor(network: LinkNetwork, link: LLink, fromReroute?: Reroute, dragDirection: LinkDirection = LinkDirection.LEFT) {
    super(network, link, "input", fromReroute, dragDirection)

    this.node = this.outputNode
    this.fromSlot = this.outputSlot
    this.fromPos = fromReroute?.pos ?? this.outputPos
    this.fromDirection = LinkDirection.NONE
    this.fromSlotIndex = this.outputIndex
  }
}
