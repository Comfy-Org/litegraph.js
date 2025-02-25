import { describe } from "vitest"
import { LGraph } from "@/litegraph"
import { test } from "./testExtensions"

describe("LGraph (constructor only)", () => {
  test("Matches previous snapshot", ({ expect, minimalSerialisableGraph, basicSerialisableGraph }) => {
    const minLGraph = new LGraph(minimalSerialisableGraph)
    expect(minLGraph).toMatchSnapshot("minLGraph")

    const basicLGraph = new LGraph(basicSerialisableGraph)
    expect(basicLGraph).toMatchSnapshot("basicLGraph")
  })
})
