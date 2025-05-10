import type { Positionable, Rect } from "@/interfaces"
import type { LGraph } from "@/LGraph"
import type { ISerialisedNode, SerialisableLLink, SubgraphIO } from "@/types/serialisation"

import { LGraphGroup } from "@/LGraphGroup"
import { LGraphNode } from "@/LGraphNode"
import { createUuidv4, LiteGraph } from "@/litegraph"
import { LLink, type ResolvedConnection } from "@/LLink"
import { shallowCloneCommonProps } from "@/node/slotUtils"
import { Reroute } from "@/Reroute"

export interface FilteredItems {
  nodes: Set<LGraphNode>
  reroutes: Set<Reroute>
  groups: Set<LGraphGroup>
}

export function splitPositionables(items: Iterable<Positionable>): FilteredItems {
  const nodes = new Set<LGraphNode>()
  const reroutes = new Set<Reroute>()
  const groups = new Set<LGraphGroup>()

  for (const item of items) {
    switch (true) {
    case item instanceof LGraphNode:
      nodes.add(item)
      break
    case item instanceof LGraphGroup:
      groups.add(item)
      break
    case item instanceof Reroute:
      reroutes.add(item)
      break
    }
  }

  return {
    nodes,
    reroutes,
    groups,
  }
}

interface BoundaryLinks {
  boundaryLinks: LLink[]
  boundaryFloatingLinks: LLink[]
  internalLinks: LLink[]
  boundaryInputLinks: LLink[]
  boundaryOutputLinks: LLink[]
}

export function getBoundaryLinks(graph: LGraph, items: Set<Positionable>): BoundaryLinks {
  const internalLinks: LLink[] = []
  const boundaryLinks: LLink[] = []
  const boundaryInputLinks: LLink[] = []
  const boundaryOutputLinks: LLink[] = []
  const boundaryFloatingLinks: LLink[] = []
  const visited = new Set<Positionable>()

  for (const item of items) {
    if (visited.has(item)) continue
    visited.add(item)

    // Nodes
    if (item instanceof LGraphNode) {
      const node = item

      // Inputs
      if (node.inputs) {
        for (const input of node.inputs) {
          addFloatingLinks(input._floatingLinks)

          const resolved = LLink.resolve(input.link, graph)
          if (!resolved) continue

          // Output end of this link is outside the items set
          const { link, outputNode } = resolved
          if (outputNode) {
            if (!items.has(outputNode)) {
              boundaryInputLinks.push(link)
            } else {
              internalLinks.push(link)
            }
          }
        }
      }

      // Outputs
      if (node.outputs) {
        for (const output of node.outputs) {
          addFloatingLinks(output._floatingLinks)

          if (!output.links) continue

          const many = LLink.resolveMany(output.links, graph)
          for (const { link, inputNode } of many) {
            if (inputNode && !items.has(inputNode)) {
              // Input end of this link is outside the items set
              boundaryOutputLinks.push(link)
            }
            // Internal links are discovered on input side.
          }
        }
      }
    } else if (item instanceof Reroute) {
      // Reroutes
      const reroute = item

      // TODO: This reroute should be on one side of the boundary.  We should mark the reroute that is on each side of the boundary.
      // TODO: This could occur any number of times on a link; each time should be marked as a separate boundary.
      // TODO: e.g. A link with 3 reroutes, the first and last reroute are in `items`, but the middle reroute is not. This will be two "in" and two "out" boundaries.
      const results = LLink.resolveMany(reroute.linkIds, graph)
      for (const { link } of results) {
        const reroutes = LLink.getReroutes(graph, link)
        const reroutesOutside = reroutes.filter(reroute => !items.has(reroute))

        // for (const reroute of reroutes) {
        //   // TODO: Do the checks here.
        // }

        const { inputNode, outputNode } = link.resolve(graph)

        if (
          reroutesOutside.length ||
          (inputNode && !items.has(inputNode)) ||
          (outputNode && !items.has(outputNode))
        ) {
          boundaryLinks.push(link)
        }
      }
    }
  }

  return { boundaryLinks, boundaryFloatingLinks, internalLinks, boundaryInputLinks, boundaryOutputLinks }

  /**
   * Adds any floating links that cross the boundary.
   * @param floatingLinks The floating links to check
   */
  function addFloatingLinks(floatingLinks: Set<LLink> | undefined): void {
    if (!floatingLinks) return

    for (const link of floatingLinks) {
      const crossesBoundary = LLink
        .getReroutes(graph, link)
        .some(reroute => !items.has(reroute))

      if (crossesBoundary) boundaryFloatingLinks.push(link)
    }
  }
}

export function multiClone(nodes: Iterable<LGraphNode>): ISerialisedNode[] {
  const clonedNodes: ISerialisedNode[] = []

  // Selectively clone - keep IDs & links
  for (const node of nodes) {
    const newNode = LiteGraph.createNode(node.type)
    if (!newNode) {
      console.warn("Failed to create node", node.type)
      continue
    }

    // Must be cloned; litegraph "serialize" is mostly shallow clone
    const data = LiteGraph.cloneObject(node.serialize())
    newNode.configure(data)

    clonedNodes.push(newNode.serialize())
  }

  return clonedNodes
}

export function mapSubgraphInputsAndLinks(resolvedInputLinks: ResolvedConnection[], links: SerialisableLLink[]): SubgraphIO[] {
  const inputs: SubgraphIO[] = []

  for (const resolved of resolvedInputLinks) {
    const { link, input } = resolved
    if (!input) continue

    // Link
    const linkData = link.asSerialisable()
    linkData.origin_id = -10
    linkData.origin_slot = inputs.length
    links.push(linkData)

    // Subgraph input slot
    const cloned = structuredClone(shallowCloneCommonProps(input))
    const inputData = Object.assign(cloned, {
      id: createUuidv4(),
      boundingRect: [0, 0, 0, 0] satisfies Rect,
      type: String(cloned.type),
      links: undefined,
      linkIds: [linkData.id],
    }) satisfies SubgraphIO

    inputs.push(inputData)
  }
  return inputs
}

export function mapSubgraphOutputsAndLinks(resolvedOutputLinks: ResolvedConnection[], links: SerialisableLLink[]): SubgraphIO[] {
  const outputs: SubgraphIO[] = []

  for (const resolved of resolvedOutputLinks) {
    const { link, output } = resolved
    if (!output) continue

    // Link
    const linkData = link.asSerialisable()
    linkData.target_id = -20
    linkData.target_slot = outputs.length
    links.push(linkData)

    // Subgraph output slot
    const cloned = structuredClone(shallowCloneCommonProps(output))
    const outputData = Object.assign(cloned, {
      id: createUuidv4(),
      boundingRect: [0, 0, 0, 0] satisfies Rect,
      type: String(cloned.type),
      links: undefined,
      linkIds: [linkData.id],
    }) satisfies SubgraphIO

    outputs.push(outputData)
  }
  return outputs
}
