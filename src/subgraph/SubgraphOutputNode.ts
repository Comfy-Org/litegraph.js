import type { SubgraphOutput } from "./SubgraphOutput"
import type { LinkConnector } from "@/canvas/LinkConnector"
import type { CanvasPointer } from "@/CanvasPointer"
import type { DefaultConnectionColors, ISlotType, Positionable } from "@/interfaces"
import type { INodeOutputSlot } from "@/interfaces"
import type { LGraphNode, NodeId } from "@/LGraphNode"
import type { LLink } from "@/LLink"
import type { RerouteId } from "@/Reroute"
import type { CanvasPointerEvent } from "@/types/events"

import { SUBGRAPH_OUTPUT_ID } from "@/constants"
import { Rectangle } from "@/infrastructure/Rectangle"

import { SubgraphIONodeBase } from "./SubgraphIONodeBase"

export class SubgraphOutputNode extends SubgraphIONodeBase implements Positionable {
  readonly id: NodeId = SUBGRAPH_OUTPUT_ID

  get slots() {
    return this.subgraph.outputs
  }

  get slotAnchorX() {
    const [x] = this.boundingRect
    return x + SubgraphIONodeBase.roundedRadius
  }

  override onPointerDown(e: CanvasPointerEvent, pointer: CanvasPointer, linkConnector: LinkConnector): void {
    for (const slot of this.slots) {
      const slotBounds = Rectangle.fromCentre(slot.pos, slot.boundingRect.height)

      if (slotBounds.containsXy(e.canvasX, e.canvasY)) {
        pointer.onDragStart = () => {
          linkConnector.dragNewFromSubgraphOutput(this.subgraph, this, slot)
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

  canConnectTo(outputNode: LGraphNode, fromSlot: SubgraphOutput, output: INodeOutputSlot): boolean {
    return outputNode.canConnectTo(this, fromSlot, output)
  }

  connectByTypeOutput(
    slot: number,
    target_node: LGraphNode,
    target_slotType: ISlotType,
    optsIn?: { afterRerouteId?: RerouteId },
  ): LLink | undefined {
    const outputSlot = target_node.findOutputByType(target_slotType)
    if (!outputSlot) return

    return this.slots[slot].connect(outputSlot.slot, target_node, optsIn?.afterRerouteId)
  }

  override drawProtected(ctx: CanvasRenderingContext2D, colorContext: DefaultConnectionColors): void {
    const { roundedRadius } = SubgraphIONodeBase
    const transform = ctx.getTransform()

    const [x, y, , height] = this.boundingRect
    ctx.translate(x, y)

    // Draw bottom rounded part
    ctx.strokeStyle = this.sideStrokeStyle
    ctx.lineWidth = this.sideLineWidth
    ctx.beginPath()
    ctx.arc(roundedRadius, roundedRadius, roundedRadius, Math.PI, Math.PI * 1.5)

    // Straight line to bottom
    ctx.moveTo(0, roundedRadius)
    ctx.lineTo(0, height - roundedRadius)

    // Bottom rounded part
    ctx.arc(roundedRadius, height - roundedRadius, roundedRadius, Math.PI, Math.PI * 0.5, true)
    ctx.stroke()

    // Restore context
    ctx.setTransform(transform)

    this.drawSlots(ctx, colorContext)
  }
}
