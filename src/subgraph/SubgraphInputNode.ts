import type { SubgraphInput } from "./SubgraphInput"
import type { LinkConnector } from "@/canvas/LinkConnector"
import type { CanvasPointer } from "@/CanvasPointer"
import type { DefaultConnectionColors, INodeInputSlot, ISlotType, Positionable } from "@/interfaces"
import type { LGraphNode, NodeId } from "@/LGraphNode"
import type { RerouteId } from "@/Reroute"
import type { CanvasPointerEvent } from "@/types/events"

import { SUBGRAPH_INPUT_ID } from "@/constants"
import { LLink } from "@/LLink"

import { SubgraphIONodeBase } from "./SubgraphIONodeBase"

export class SubgraphInputNode extends SubgraphIONodeBase implements Positionable {
  readonly id: NodeId = SUBGRAPH_INPUT_ID

  get slots() {
    return this.subgraph.inputs
  }

  get slotAnchorX() {
    const [x, , width] = this.boundingRect
    return x + width - SubgraphIONodeBase.roundedRadius
  }

  override onPointerDown(e: CanvasPointerEvent, pointer: CanvasPointer, linkConnector: LinkConnector): void {
    for (const slot of this.slots) {
      if (slot.boundingRect.containsXy(e.canvasX, e.canvasY)) {
        pointer.onDragStart = () => {
          linkConnector.dragNewFromSubgraphInput(this.subgraph, this, slot)
        }
        pointer.onDragEnd = (eUp) => {
          linkConnector.dropLinks(this.subgraph, eUp)
        }
        pointer.finally = () => {
          linkConnector.reset(true)
        }
      }
    }
  }

  canConnectTo(inputNode: LGraphNode, input: INodeInputSlot, fromSlot: SubgraphInput): boolean {
    return inputNode.canConnectTo(this, input, fromSlot)
  }

  connectSlots(fromSlot: SubgraphInput, inputNode: LGraphNode, input: INodeInputSlot, afterRerouteId: RerouteId | undefined): LLink {
    const { subgraph } = this

    const outputIndex = this.slots.indexOf(fromSlot)
    const inputIndex = inputNode.inputs.indexOf(input)

    if (outputIndex === -1 || inputIndex === -1) throw new Error("Invalid slot indices.")

    return new LLink(
      ++subgraph.state.lastLinkId,
      input.type || fromSlot.type,
      this.id,
      outputIndex,
      inputNode.id,
      inputIndex,
      afterRerouteId,
    )
  }

  // #region Legacy LGraphNode compatibility

  connectByType(
    slot: number,
    target_node: LGraphNode,
    target_slotType: ISlotType,
    optsIn?: { afterRerouteId?: RerouteId },
  ): LLink | undefined {
    const inputSlot = target_node.findInputByType(target_slotType)
    if (!inputSlot) return

    return this.slots[slot].connect(inputSlot.slot, target_node, optsIn?.afterRerouteId)
  }

  findOutputSlot(name: string): SubgraphInput | undefined {
    return this.slots.find(output => output.name === name)
  }

  // #endregion Legacy LGraphNode compatibility

  override drawProtected(ctx: CanvasRenderingContext2D, colorContext: DefaultConnectionColors): void {
    const { roundedRadius } = SubgraphIONodeBase
    const transform = ctx.getTransform()

    const [x, y, width, height] = this.boundingRect
    ctx.translate(x, y)

    // Draw top rounded part
    ctx.strokeStyle = this.sideStrokeStyle
    ctx.lineWidth = this.sideLineWidth
    ctx.beginPath()
    ctx.arc(width - roundedRadius, roundedRadius, roundedRadius, Math.PI * 1.5, 0)

    // Straight line to bottom
    ctx.moveTo(width, roundedRadius)
    ctx.lineTo(width, height - roundedRadius)

    // Bottom rounded part
    ctx.arc(width - roundedRadius, height - roundedRadius, roundedRadius, 0, Math.PI * 0.5)
    ctx.stroke()

    // Restore context
    ctx.setTransform(transform)

    this.drawSlots(ctx, colorContext)
  }
}
