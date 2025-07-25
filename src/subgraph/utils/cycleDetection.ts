import type { LGraphNode } from "@/LGraphNode"
import type { SubgraphNode } from "@/subgraph/SubgraphNode"

import { RecursionError } from "@/infrastructure/RecursionError"

/**
 * Validates that a set of nodes doesn't contain circular references during subgraph creation.
 * This prevents creating subgraphs that would cause infinite recursion during execution.
 * @param nodes Nodes to check for cycles
 * @param targetSubgraph Optional: the subgraph these nodes will be added to
 * @throws RecursionError if cycle detected
 */
export function validateNoSubgraphCycles(
  nodes: LGraphNode[],
  targetSubgraph?: any, // Using any to avoid circular dependency
): void {
  // Check if any of the nodes being added is a subgraph that contains the target
  for (const node of nodes) {
    if (node.isSubgraphNode?.()) {
      const subgraphNode = node as SubgraphNode
      if (targetSubgraph && containsSubgraph(subgraphNode.subgraph, targetSubgraph)) {
        throw new RecursionError(
          `Circular reference detected: Cannot add node ${node.id} (${node.title || "untitled"}) ` +
          `because its subgraph would contain its parent subgraph`,
        )
      }
    }
  }
}

/**
 * Checks if a subgraph contains another subgraph (directly or indirectly).
 * @param container The potential container subgraph
 * @param target The target subgraph to search for
 * @returns true if container contains target
 */
function containsSubgraph(container: any, target: any): boolean {
  if (container === target) return true

  // Check all nodes in the container
  for (const node of container.nodes.values()) {
    if (node.isSubgraphNode?.()) {
      const subgraphNode = node as SubgraphNode
      if (subgraphNode.subgraph === target || containsSubgraph(subgraphNode.subgraph, target)) {
        return true
      }
    }
  }

  return false
}

/**
 * Validates that adding nodes to a subgraph won't create cycles.
 * @param nodes Nodes being added
 * @param targetSubgraph The subgraph they're being added to
 * @throws RecursionError if adding would create a cycle
 */
export function validateSubgraphAddition(
  nodes: LGraphNode[],
  targetSubgraph: any,
): void {
  validateNoSubgraphCycles(nodes, targetSubgraph)
}
