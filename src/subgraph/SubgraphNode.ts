import type { SubgraphOutput } from "./SubgraphOutput"
import type { ISubgraphInput } from "@/interfaces"
import type { BaseLGraph, LGraph } from "@/LGraph"
import type { INodeInputSlot, INodeOutputSlot, ISlotType } from "@/litegraph"
import type { GraphOrSubgraph, Subgraph } from "@/subgraph/Subgraph"
import type { SubgraphInput } from "@/subgraph/SubgraphInput"
import type { ExportedSubgraphInstance } from "@/types/serialisation"
import type { UUID } from "@/utils/uuid"

import { RecursionError } from "@/infrastructure/RecursionError"
import { LGraphNode } from "@/LGraphNode"
import { LLink } from "@/LLink"

import { type ExecutableLGraphNode, ExecutableNodeDTO } from "./ExecutableNodeDTO"

/**
 * An instance of a {@link Subgraph}, displayed as a node on the containing (parent) graph.
 */
export class SubgraphNode extends LGraphNode implements BaseLGraph {
  declare inputs: (INodeInputSlot & { _subgraphSlot: SubgraphInput })[]
  declare outputs: (INodeOutputSlot & { _subgraphSlot: SubgraphOutput })[]

  override readonly type: UUID
  override readonly isVirtualNode = true as const

  get rootGraph(): LGraph {
    return this.graph.rootGraph
  }

  override get displayType(): string {
    return "Subgraph node"
  }

  override isSubgraphNode(): this is SubgraphNode {
    return true
  }

  constructor(
    /** The (sub)graph that contains this subgraph instance. */
    override readonly graph: GraphOrSubgraph,
    /** The definition of this subgraph; how its nodes are configured, etc. */
    readonly subgraph: Subgraph,
    instanceData: ExportedSubgraphInstance,
  ) {
    super(subgraph.name, subgraph.id)

    this.type = subgraph.id
    this.configure(instanceData)
  }

  /**
   * Ensures the subgraph slot is in the params before adding the input as normal.
   * @param name The name of the input slot.
   * @param type The type of the input slot.
   * @param inputProperties Properties that are directly assigned to the created input. Default: a new, empty object.
   * @returns The new input slot.
   * @remarks Assertion is required to instantiate empty generic POJO.
   */
  override addInput<TInput extends Partial<ISubgraphInput>>(name: string, type: ISlotType, inputProperties: TInput = {} as TInput): INodeInputSlot & TInput {
    if (!inputProperties._subgraphSlot) {
      console.warn("addInput for SubgraphNode must be called with a subgraph input.")
      const lastInput = this.subgraph.inputs.at(-1)
      if (!lastInput) throw new Error("No subgraph inputs found")

      inputProperties._subgraphSlot = lastInput
    }

    // Bypasses type narrowing on this.inputs
    return super.addInput(name, type, inputProperties)
  }

  override getInputLink(slot: number): LLink | null {
    // Output side: the link from inside the subgraph
    const innerLink = this.subgraph.outputNode.slots[slot].getLinks().at(0)
    if (!innerLink) {
      console.warn(`SubgraphNode.getInputLink: no inner link found for slot ${slot}`)
      return null
    }

    const newLink = LLink.create(innerLink)
    newLink.origin_id = `${this.id}:${innerLink.origin_id}`
    newLink.origin_slot = innerLink.origin_slot

    return newLink
  }

  /** @internal Used to flatten the subgraph before execution. */
  getInnerNodes(
    nodes: ExecutableLGraphNode[] = [],
    visited = new WeakSet<SubgraphNode>(),
  ): ExecutableLGraphNode[] {
    if (visited.has(this)) throw new RecursionError("while flattening subgraph")
    visited.add(this)

    for (const node of this.subgraph.nodes) {
      if ("getInnerNodes" in node) {
        node.getInnerNodes(nodes, visited)
      } else {
        // Create minimal DTOs rather than cloning the node
        const aVeryRealNode = new ExecutableNodeDTO(this.graph, this, node)
        nodes.push(aVeryRealNode)
      }
    }
    return nodes
  }

  export(): ExportedSubgraphInstance {
    return {
      id: this.id,
      type: this.subgraph.id,
      pos: this.pos,
      size: this.size,
      flags: this.flags,
      order: this.order,
      mode: this.mode,
      bgcolor: this.bgcolor,
      boxcolor: this.boxcolor,
      color: this.color,
      shape: this.shape,
      title: this.title,
      inputs: this.inputs,
      outputs: this.outputs,
    }
  }
}
