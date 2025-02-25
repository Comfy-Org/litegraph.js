import { describe } from "vitest"
import { LGraph } from "@/litegraph"
import { test } from "./testExtensions"

describe("LGraph configure()", () => {
  test("LGraph matches previous snapshot (normal configure() usage)", ({ expect, minimalSerialisableGraph, basicSerialisableGraph }) => {
    const configuredMinGraph = new LGraph()
    configuredMinGraph.configure(minimalSerialisableGraph)
    expect(configuredMinGraph).toMatchSnapshot("configuredMinGraph")

    const configuredBasicGraph = new LGraph()
    configuredBasicGraph.configure(basicSerialisableGraph)
    expect(configuredBasicGraph).toMatchSnapshot("configuredBasicGraph")
  })
})
