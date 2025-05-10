import type { Subgraph } from "./Subgraph"
import type { SubgraphInput } from "./SubgraphInput"
import type { SubgraphOutput } from "./SubgraphOutput"
import type { Point, Positionable, ReadOnlyRect } from "@/interfaces"
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
    return isPointInRect(point, this.boundingRect)
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
