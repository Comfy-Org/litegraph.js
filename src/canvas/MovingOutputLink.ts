import type { LinkNetwork, Point } from "@/interfaces"
import type { LGraphNode } from "@/LGraphNode"
import type { INodeInputSlot } from "@/litegraph"
import type { LLink } from "@/LLink"
import type { Reroute } from "@/Reroute"

import { LinkDirection } from "@/types/globalEnums"

import { MovingLinkBase } from "./MovingLinkBase"

export class MovingOutputLink extends MovingLinkBase {
  readonly toType = "output"

  readonly node: LGraphNode
  readonly fromSlot: INodeInputSlot
  readonly fromPos: Point
  readonly fromDirection: LinkDirection
  readonly fromSlotIndex: number

  constructor(network: LinkNetwork, link: LLink, fromReroute?: Reroute, dragDirection: LinkDirection = LinkDirection.RIGHT) {
    super(network, link, "output", fromReroute, dragDirection)

    this.node = this.inputNode
    this.fromSlot = this.inputSlot
    this.fromPos = fromReroute?.pos ?? this.inputPos
    this.fromDirection = LinkDirection.LEFT
    this.fromSlotIndex = this.inputIndex
  }
}
