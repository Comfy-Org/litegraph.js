import type { Subgraph } from "./Subgraph"
import type { SubgraphInput } from "./SubgraphInput"
import type { SubgraphOutput } from "./SubgraphOutput"
import type { DefaultConnectionColors, Hoverable, Point, Positionable } from "@/interfaces"
import type { NodeId } from "@/LGraphNode"
import type { CanvasColour, CanvasPointerEvent } from "@/litegraph"
import type { ExportedSubgraphIONode, Serialisable } from "@/types/serialisation"

import { Rectangle } from "@/infrastructure/Rectangle"
import { snapPoint } from "@/measure"

export abstract class SubgraphIONodeBase implements Positionable, Hoverable, Serialisable<ExportedSubgraphIONode> {
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

  isPointerOver: boolean = false

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

  protected get sideLineWidth(): number {
    return this.isPointerOver ? 2.5 : 2
  }

  protected get sideStrokeStyle(): CanvasColour {
    return this.isPointerOver ? "white" : "#efefef"
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

  // #region Hoverable

  containsPoint(point: Point): boolean {
    return this.boundingRect.containsPoint(point)
  }

  abstract get slotAnchorX(): number

  onPointerMove(e: CanvasPointerEvent): void {
    const containsPoint = this.boundingRect.containsXy(e.canvasX, e.canvasY)
    if (containsPoint) {
      if (!this.isPointerOver) this.onPointerEnter()

      for (const slot of this.slots) {
        slot.onPointerMove(e)
      }
    } else if (this.isPointerOver) {
      this.onPointerLeave()
    }
  }

  onPointerEnter() {
    this.isPointerOver = true
  }

  onPointerLeave() {
    this.isPointerOver = false

    for (const slot of this.slots) {
      slot.isPointerOver = false
    }
  }

  // #endregion Hoverable

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

  draw(ctx: CanvasRenderingContext2D, colorContext: DefaultConnectionColors): void {
    const { lineWidth, strokeStyle, fillStyle, font, textBaseline } = ctx
    this.drawProtected(ctx, colorContext)
    Object.assign(ctx, { lineWidth, strokeStyle, fillStyle, font, textBaseline })
  }

  /** @internal Leaves {@link ctx} dirty. */
  protected abstract drawProtected(ctx: CanvasRenderingContext2D, colorContext: DefaultConnectionColors): void

  /** @internal Leaves {@link ctx} dirty. */
  protected drawSlots(ctx: CanvasRenderingContext2D, colorContext: DefaultConnectionColors): void {
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
      bounding: this.boundingRect.export(),
      pinned: this.pinned ? true : undefined,
    }
  }
}
