import type { Subgraph } from "./Subgraph"
import type { SubgraphInput } from "./SubgraphInput"
import type { SubgraphOutput } from "./SubgraphOutput"
import type { DefaultConnectionColors, Point, Positionable, ReadOnlyRect } from "@/interfaces"
import type { NodeId } from "@/LGraphNode"
import type { ExportedSubgraphIONode, Serialisable } from "@/types/serialisation"

import { Rectangle } from "@/infrastructure/Rectangle"
import { isPointInRect, snapPoint } from "@/measure"

export abstract class SubgraphIONodeBase implements Positionable, Serialisable<ExportedSubgraphIONode> {
  static margin = 10
  static defaultWidth = 100
  static roundedRadius = 10

  readonly #boundingRect: Rectangle = new Rectangle()

  abstract readonly id: NodeId

  get boundingRect(): Rectangle {
    return this.#boundingRect
  }

  selected: boolean = false
  pinned: boolean = false

  get pos() {
    return this.boundingRect.pos
  }

  set pos(value) {
    this.boundingRect.pos = value
  }

  get size() {
    return this.boundingRect.size
  }

  set size(value) {
    this.boundingRect.size = value
  }

  abstract readonly slots: SubgraphInput[] | SubgraphOutput[]

  constructor(
    /** The subgraph that this node belongs to. */
    readonly subgraph: Subgraph,
  ) {}

  move(deltaX: number, deltaY: number): void {
    this.pos[0] += deltaX
    this.pos[1] += deltaY
  }

  /** @inheritdoc */
  snapToGrid(snapTo: number): boolean {
    return this.pinned ? false : snapPoint(this.pos, snapTo)
  }

  containsPoint(point: Point): boolean {
    return this.boundingRect.containsPoint(point)
  }

  abstract get slotAnchorX(): number

  /** Arrange the slots in this node. */
  arrange(): void {
    const { defaultWidth, roundedRadius } = SubgraphIONodeBase
    const [, y] = this.boundingRect
    const x = this.slotAnchorX
    const { size } = this

    let maxWidth = 0
    let currentY = y + roundedRadius

    for (const slot of this.slots) {
      const [slotWidth, slotHeight] = slot.measure()
      slot.arrange([x, currentY, slotWidth, slotHeight])

      currentY += slotHeight
      if (slotWidth > maxWidth) maxWidth = slotWidth
    }

    size[0] = (maxWidth || defaultWidth) + 2 * roundedRadius
    size[1] = currentY - y + roundedRadius
  }

  abstract draw(ctx: CanvasRenderingContext2D, colorContext: DefaultConnectionColors): void

  /** @internal Leaves ctx dirty. */
  drawSlots(ctx: CanvasRenderingContext2D, colorContext: DefaultConnectionColors): void {
    ctx.fillStyle = "#AAA"
    ctx.font = "12px Arial"
    ctx.textBaseline = "middle"

    for (const slot of this.slots) {
      slot.draw({ ctx, colorContext })
      slot.drawLabel(ctx)
    }
  }

  configure(data: ExportedSubgraphIONode): void {
    this.#boundingRect.set(data.bounding)
    this.pinned = data.pinned ?? false
  }

  asSerialisable(): ExportedSubgraphIONode {
    return {
      id: this.id,
      bounding: serialiseRect(this.boundingRect),
      pinned: this.pinned ? true : undefined,
    }
  }
}

function serialiseRect(rect: ReadOnlyRect): [number, number, number, number] {
  return [rect[0], rect[1], rect[2], rect[3]]
}
