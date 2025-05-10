import type { ReadOnlyRect } from "@/interfaces"
import type { LGraph } from "@/LGraph"
import type { LLink, ResolvedConnection } from "@/LLink"
import type { Subgraph } from "@/subgraph/Subgraph"
import type { SubgraphNode } from "@/subgraph/SubgraphNode"
import type { ExportedSubgraph, ISerialisedGraph, SerialisableGraph } from "@/types/serialisation"

export interface LGraphEventMap {
  "configuring": {
    /** The data that was used to configure the graph. */
    data: ISerialisedGraph | SerialisableGraph
    /** If `true`, the graph will be cleared prior to adding the configuration. */
    clearGraph: boolean
  }
  "configured": never

  "subgraph-created": Subgraph

  /** Dispatched when a group of items are converted to a subgraph. */
  "convert-to-subgraph": {
    /** The type of subgraph to create. */
    subgraph: Subgraph
    /** The boundary around every item that was moved into the subgraph. */
    bounds: ReadOnlyRect
    /** The raw data that was used to create the subgraph. */
    exportedSubgraph: ExportedSubgraph
    /** The links that were used to create the subgraph. */
    boundaryLinks: LLink[]
    /** Links that go from outside the subgraph in, via an input on the subgraph node. */
    resolvedInputLinks: ResolvedConnection[]
    /** Links that go from inside the subgraph out, via an output on the subgraph node. */
    resolvedOutputLinks: ResolvedConnection[]
    /** The floating links that were used to create the subgraph. */
    boundaryFloatingLinks: LLink[]
    /** The internal links that were used to create the subgraph. */
    internalLinks: LLink[]
    /** The subgraph node created in the parent graph. */
    subgraphNode: SubgraphNode | undefined
  }

  "open-subgraph": {
    subgraph: Subgraph
    closingGraph: LGraph | Subgraph
  }
}
