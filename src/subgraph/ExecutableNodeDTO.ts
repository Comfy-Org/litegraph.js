import type { SubgraphNode } from "./SubgraphNode"
import type { CallbackParams, CallbackReturn } from "@/interfaces"
import type { LGraph } from "@/LGraph"
import type { LGraphNode } from "@/LGraphNode"

import { SUBGRAPH_INPUT_ID } from "@/constants"
import { LLink } from "@/LLink"

/**
 * A subset of {@link LGraphNode}; the members used when assembling the graph for backend execution.
 */
export type ExecutableLGraphNode = Pick<
  LGraphNode,
  "id" |
  "type" |
  "comfyClass" |
  "title" |
  "mode" |
  "inputs" |
  "widgets" |
  "isVirtualNode" |
  "applyToGraph" |
  "getInputNode" |
  "getInputLink"
>

/** Created to represent an **instance** of a node that exists in a subgraph definition. */
export class ExecutableNodeDTO implements ExecutableLGraphNode {
  applyToGraph?(...args: CallbackParams<typeof this.node.applyToGraph>): CallbackReturn<typeof this.node.applyToGraph>

  constructor(
    readonly graph: LGraph,
    readonly subgraphNode: SubgraphNode,
    readonly node: LGraphNode,
  ) {
    // Only create a wrapper if the node has an applyToGraph method
    if (this.node.applyToGraph) {
      this.applyToGraph = (...args: CallbackParams<typeof this.node.applyToGraph>) => {
        return this.node.applyToGraph?.(...args)
      }
    }
  }

  get id() {
    return `${this.subgraphNode.id}:${this.node.id}`
  }

  get type() {
    return this.node.type
  }

  get title() {
    return this.node.title
  }

  get mode() {
    return this.node.mode
  }

  get comfyClass() {
    return this.node.comfyClass
  }

  get isVirtualNode() {
    return this.node.isVirtualNode
  }

  get inputs() {
    return this.node.inputs
  }

  get widgets() {
    return this.node.widgets
  }

  getInputNode(slot: number): LGraphNode | null {
    const { graph, subgraph } = this.subgraphNode

    // Input side: the link from inside the subgraph
    const link = subgraph.getLink(this.inputs[slot].link)
    if (!link) {
      console.debug(`[ExecutableNodeDTO.getInputNode] No link found for slot ${slot}`, this)
      return null
    }

    if (link.origin_id === SUBGRAPH_INPUT_ID) {
      const outerLink = graph.getLink(this.subgraphNode.inputs[link.origin_slot].link)
      if (!outerLink) {
        console.error(`[ExecutableNodeDTO.getInputNode] No link found in parent graph for slot ${slot}`, this)
        return null
      }

      return graph.getNodeById(outerLink.origin_id)
    }

    // Node is in the same subgraph
    return subgraph.getNodeById(link.origin_id)
  }

  /**
   * Creates a virtual link from outside the subgraph to this virtual node instance.
   * @param slot The slot index of the input.
   * @returns The link from the input node to the subgraph node.
   */
  getInputLink(slot: number): LLink | null {
    const { graph, subgraph } = this.subgraphNode

    // Input side: the link from inside the subgraph
    const link = subgraph.getLink(this.inputs[slot].link)
    if (!link) {
      console.debug(`[ExecutableNodeDTO.getInputLink] No link found for slot ${slot}`, this)
      return null
    }
    const newLink = LLink.create(link)
    newLink.target_id = this.id

    // Link comes from outside the subgraph
    if (link.origin_id === SUBGRAPH_INPUT_ID) {
      const outerLink = graph.getLink(this.subgraphNode.inputs[link.origin_slot].link)
      if (!outerLink) {
        console.error(`[ExecutableNodeDTO.getInputLink] No outer link found for slot ${slot}`, this)
        return null
      }

      newLink.origin_id = outerLink.origin_id
      newLink.origin_slot = outerLink.origin_slot

      return newLink
    }

    // Internal link; create virtual IDs
    newLink.origin_id = `${this.subgraphNode.id}:${link.origin_id}`

    return newLink
  }
}
