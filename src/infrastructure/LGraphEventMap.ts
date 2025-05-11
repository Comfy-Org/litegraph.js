import type { ISerialisedGraph, SerialisableGraph } from "@/types/serialisation"

export interface LGraphEventMap {
  configuring: {
    /** The data that was used to configure the graph. */
    data: ISerialisedGraph | SerialisableGraph
    /** If `true`, the graph will be cleared prior to adding the configuration. */
    clearGraph: boolean
  }
  configured: never
}
