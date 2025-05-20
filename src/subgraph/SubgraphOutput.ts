import type { Point, ReadOnlyRect } from "@/interfaces"

import { SubgraphSlot } from "./SubgraphSlotBase"

/**
 * An output "slot" from a subgraph to a parent graph.
 *
 * IMPORTANT: A subgraph "output" is both an output AND an input.  It creates an extra link connection point between
 * a parent graph and a subgraph, so is conceptually similar to a reroute.
 *
 * This can be a little confusing, but is easier to visualise when imagining editing a subgraph.
 * You have "Subgraph Outputs", because they go from inside the subgraph and out, but links to them come from "node outputs".
 *
 * Functionally, however, when editing a subgraph, that "subgraph output" is the "target" or "input side" of a link.
 */
export class SubgraphOutput extends SubgraphSlot {
  get labelPos(): Point {
    const [x, y, , height] = this.boundingRect
    return [x + height, y + height * 0.5]
  }

  override arrange(rect: ReadOnlyRect): void {
    const [left, top, width, height] = rect
    const { boundingRect: b, pos } = this

    b[0] = left
    b[1] = top
    b[2] = width
    b[3] = height

    pos[0] = left + height * 0.5
    pos[1] = top + height * 0.5
  }
}
