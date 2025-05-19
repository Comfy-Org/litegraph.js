import type { DefaultConnectionColors, Positionable } from "@/interfaces"
import type { NodeId } from "@/LGraphNode"

import { SUBGRAPH_OUTPUT_ID } from "@/constants"

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

  override draw(ctx: CanvasRenderingContext2D, colorContext: DefaultConnectionColors): void {
    const { roundedRadius } = SubgraphIONodeBase
    const { lineWidth, strokeStyle, fillStyle, font } = ctx
    const transform = ctx.getTransform()

    const [x, y, , height] = this.boundingRect
    ctx.translate(x, y)

    // Draw bottom rounded part
    ctx.strokeStyle = "white"
    ctx.lineWidth = 2
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

    Object.assign(ctx, { lineWidth, strokeStyle, fillStyle, font })
  }
}
