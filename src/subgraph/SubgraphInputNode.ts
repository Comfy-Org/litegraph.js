import type { DefaultConnectionColors, Positionable } from "@/interfaces"
import type { NodeId } from "@/LGraphNode"

import { SUBGRAPH_INPUT_ID } from "@/constants"

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
