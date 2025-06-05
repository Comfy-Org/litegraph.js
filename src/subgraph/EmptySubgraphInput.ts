import type { SubgraphInputNode } from "./SubgraphInputNode"
import type { INodeInputSlot, Point } from "@/interfaces"
import type { LGraphNode } from "@/LGraphNode"
import type { RerouteId } from "@/Reroute"

import { LLink } from "@/LLink"
import { zeroUuid } from "@/utils/uuid"

import { SubgraphInput } from "./SubgraphInput"

/**
 * A virtual slot that simply creates a new input slot when connected to.
 */
export class EmptySubgraphInput extends SubgraphInput {
  declare parent: SubgraphInputNode

  constructor(parent: SubgraphInputNode) {
    super({
      id: zeroUuid,
      name: "",
      type: "",
    }, parent)
  }

  override connect(slot: INodeInputSlot, node: LGraphNode, afterRerouteId?: RerouteId): LLink | undefined {
    const input = this.parent.subgraph.addInput(slot.name, String(slot.type))
    return input.connect(slot, node, afterRerouteId)
  }

  override get labelPos(): Point {
    const [x, y, , height] = this.boundingRect
    return [x, y + height * 0.5]
  }
}
