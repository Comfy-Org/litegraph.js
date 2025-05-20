import type { Point, ReadOnlyRect } from "@/interfaces"

import { SubgraphSlot } from "./SubgraphSlotBase"

/**
 * An input "slot" from a parent graph into a subgraph.
 *
 * IMPORTANT: A subgraph "input" is both an input AND an output.  It creates an extra link connection point between
 * a parent graph and a subgraph, so is conceptually similar to a reroute.
 *
 * This can be a little confusing, but is easier to visualise when imagining editing a subgraph.
 * You have "Subgraph Inputs", because they are coming into the subgraph, which then connect to "node inputs".
 *
 * Functionally, however, when editing a subgraph, that "subgraph input" is the "origin" or "output side" of a link.
 */
export class SubgraphInput extends SubgraphSlot {
  get labelPos(): Point {
    const [x, y, , height] = this.boundingRect
    return [x, y + height * 0.5]
  }

  /** For inputs, x is the right edge of the input node. */
  override arrange(rect: ReadOnlyRect): void {
    const [right, top, width, height] = rect
    const { boundingRect: b, pos } = this

    b[0] = right - width
    b[1] = top
    b[2] = width
    b[3] = height

    pos[0] = right - height * 0.5
    pos[1] = top + height * 0.5
  }
}
