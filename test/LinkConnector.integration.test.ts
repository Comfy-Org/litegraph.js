import { describe, expect, vi } from "vitest"

import { LinkConnector } from "@/canvas/LinkConnector"
import { LGraph } from "@/LGraph"
import { LGraphNode } from "@/LGraphNode"
import { LLink } from "@/LLink"
import { Reroute, type RerouteId } from "@/Reroute"

import { test as baseTest } from "./testExtensions"

interface TestContext {
  graph: LGraph
  connector: LinkConnector
  setConnectingLinks: ReturnType<typeof vi.fn>
  createTestNode: (id: number) => LGraphNode
  reroutesBeforeTest: [rerouteId: RerouteId, reroute: Reroute][]
  validateIntegrityNoChanges: () => void
  getNextLinkIds: (linkIds: Set<number>) => number[]
}

const test = baseTest.extend<TestContext>({
  reroutesBeforeTest: async ({ reroutesComplexGraph }, use) => {
    await use([...reroutesComplexGraph.reroutes])
  },

  graph: async ({ reroutesComplexGraph }, use) => {
    const ctx = vi.fn(() => ({ measureText: vi.fn(() => ({ width: 10 })) }))
    for (const node of reroutesComplexGraph.nodes) {
      node.updateArea(ctx() as unknown as CanvasRenderingContext2D)
    }
    await use(reroutesComplexGraph)
  },
  setConnectingLinks: async ({}, use: (mock: ReturnType<typeof vi.fn>) => Promise<void>) => {
    const mock = vi.fn()
    await use(mock)
  },
  connector: async ({ setConnectingLinks }, use) => {
    const connector = new LinkConnector(setConnectingLinks)
    await use(connector)
  },
  createTestNode: async ({ graph }, use) => {
    await use((id): LGraphNode => {
      const node = new LGraphNode("test")
      node.id = id
      graph.add(node)
      return node
    })
  },

  validateIntegrityNoChanges: async ({ graph, reroutesBeforeTest }, use) => {
    await use(() => {
      expect(graph.floatingLinks.size).toBe(1)
      expect([...graph.reroutes]).toEqual(reroutesBeforeTest)

      // Only the original reroute should be floating
      const reroutesExceptOne = [...graph.reroutes.values()].filter(reroute => reroute.id !== 1)
      for (const reroute of reroutesExceptOne) {
        expect(reroute.floating).toBeUndefined()
      }
    })
  },

  getNextLinkIds: async ({ graph }, use) => {
    await use((linkIds) => {
      const indexes = [...new Array(linkIds.size).keys()]
      return indexes.map(index => graph.last_link_id + index + 1)
    })
  },
})

describe("LinkConnector Integration", () => {
  describe("Moving input links", () => {
    test("Should move input links", ({ graph, connector }) => {
      const nextLinkId = graph.last_link_id + 1

      const hasInputNode = graph.getNodeById(2)!
      const disconnectedNode = graph.getNodeById(9)!

      connector.moveInputLink(graph, hasInputNode.inputs[0])
      expect(connector.state.connectingTo).toBe("input")
      expect(connector.state.draggingExistingLinks).toBe(true)
      expect(connector.renderLinks.length).toBe(1)
      expect(connector.inputLinks.length).toBe(1)

      const canvasX = disconnectedNode.pos[0] + disconnectedNode.size[0] / 2
      const canvasY = disconnectedNode.pos[1] + 16
      const dropEvent = { canvasX, canvasY } as any

      connector.dropLinks(graph, dropEvent)
      expect(connector.renderLinks.length).toBe(0)
      expect(connector.inputLinks.length).toBe(0)

      expect(disconnectedNode.inputs[0].link).toBe(nextLinkId)
    })

    test("Should connect from floating reroutes", ({ graph, connector, reroutesBeforeTest }) => {
      const nextLinkId = graph.last_link_id + 1

      const floatingLink = graph.floatingLinks.values().next().value!
      expect(floatingLink).toBeInstanceOf(LLink)
      const floatingReroute = graph.reroutes.get(floatingLink.parentId!)!

      const disconnectedNode = graph.getNodeById(9)!
      connector.dragFromReroute(graph, floatingReroute)

      expect(connector.state.connectingTo).toBe("input")
      expect(connector.state.draggingExistingLinks).toBe(false)
      expect(connector.renderLinks.length).toBe(1)
      expect(connector.inputLinks.length).toBe(0)

      const canvasX = disconnectedNode.pos[0] + disconnectedNode.size[0] / 2
      const canvasY = disconnectedNode.pos[1] + 16
      const dropEvent = { canvasX, canvasY } as any

      connector.dropLinks(graph, dropEvent)
      expect(connector.renderLinks.length).toBe(0)
      expect(connector.inputLinks.length).toBe(0)

      // New link should have been created
      expect(disconnectedNode.inputs[0].link).toBe(nextLinkId)

      // Check graph integrity
      expect(graph.floatingLinks.size).toBe(0)
      expect([...graph.reroutes]).toEqual(reroutesBeforeTest)

      // All reroute floating property should be cleared
      for (const reroute of graph.reroutes.values()) {
        expect(reroute.floating).toBeUndefined()
      }
    })

    test("Should drop floating links when both sides are disconnected", ({ graph, reroutesBeforeTest }) => {
      expect(graph.floatingLinks.size).toBe(1)

      const floatingOutNode = graph.getNodeById(1)!
      floatingOutNode.disconnectOutput(0)

      // Should have lost one reroute
      expect(graph.reroutes.size).toBe(reroutesBeforeTest.length - 1)
      expect(graph.reroutes.get(1)).toBeUndefined()

      // The two normal links should now be floating
      expect(graph.floatingLinks.size).toBe(2)

      graph.getNodeById(2)!.disconnectInput(0, true)
      expect(graph.floatingLinks.size).toBe(1)

      graph.getNodeById(3)!.disconnectInput(0, false)
      expect(graph.floatingLinks.size).toBe(0)

      // Removed 4 reroutes
      expect(graph.reroutes.size).toBe(9)

      // All four nodes should have no links
      for (const nodeId of [1, 2, 3, 9]) {
        const { inputs: [input], outputs: [output] } = graph.getNodeById(nodeId)!

        expect(input.link).toBeNull()
        expect(output.links?.length).toBeOneOf([0, undefined])

        expect(input._floatingLinks?.size).toBeOneOf([0, undefined])
        expect(output._floatingLinks?.size).toBeOneOf([0, undefined])
      }
    })
  })

  describe("Moving output links", () => {
    test("Should move output links", ({ graph, connector }) => {
      const nextLinkIds = [graph.last_link_id + 1, graph.last_link_id + 2]

      const hasOutputNode = graph.getNodeById(1)!
      const disconnectedNode = graph.getNodeById(9)!

      connector.moveOutputLink(graph, hasOutputNode.outputs[0])
      expect(connector.state.connectingTo).toBe("output")
      expect(connector.state.draggingExistingLinks).toBe(true)
      expect(connector.renderLinks.length).toBe(3)
      expect(connector.outputLinks.length).toBe(2)
      expect(connector.floatingLinks.length).toBe(1)

      const canvasX = disconnectedNode.pos[0] + disconnectedNode.size[0] / 2
      const canvasY = disconnectedNode.pos[1] + 16
      const dropEvent = { canvasX, canvasY } as any

      connector.dropLinks(graph, dropEvent)
      expect(connector.renderLinks.length).toBe(0)
      expect(connector.outputLinks.length).toBe(0)

      expect(disconnectedNode.outputs[0].links).toEqual(nextLinkIds)
    })

    test("Should connect to floating reroutes from outputs", ({ graph, connector, reroutesBeforeTest }) => {
      const nextLinkIds = [graph.last_link_id + 1, graph.last_link_id + 2]

      const floatingOutNode = graph.getNodeById(1)!
      floatingOutNode.disconnectOutput(0)

      // Should have lost one reroute
      expect(graph.reroutes.size).toBe(reroutesBeforeTest.length - 1)
      expect(graph.reroutes.get(1)).toBeUndefined()

      // The two normal links should now be floating
      expect(graph.floatingLinks.size).toBe(2)

      const disconnectedNode = graph.getNodeById(9)!
      connector.dragNewFromOutput(graph, disconnectedNode, disconnectedNode.outputs[0])

      expect(connector.state.connectingTo).toBe("input")
      expect(connector.state.draggingExistingLinks).toBe(false)
      expect(connector.renderLinks.length).toBe(1)
      expect(connector.outputLinks.length).toBe(0)
      expect(connector.floatingLinks.length).toBe(0)

      const floatingLink = graph.floatingLinks.values().next().value!
      expect(floatingLink).toBeInstanceOf(LLink)
      const floatingReroute = graph.reroutes.get(floatingLink.parentId!)!

      const canvasX = floatingReroute.pos[0]
      const canvasY = floatingReroute.pos[1]
      const dropEvent = { canvasX, canvasY } as any

      connector.dropLinks(graph, dropEvent)
      expect(connector.renderLinks.length).toBe(0)
      expect(connector.outputLinks.length).toBe(0)

      // New link should have been created
      expect(disconnectedNode.outputs[0].links).toEqual(nextLinkIds)

      // Check graph integrity
      expect(graph.floatingLinks.size).toBe(0)
      expect([...graph.reroutes]).toEqual(reroutesBeforeTest.slice(1))

      for (const reroute of graph.reroutes.values()) {
        expect(reroute.floating).toBeUndefined()
      }
    })

    test("Should drop floating links when both sides are disconnected", ({ graph, reroutesBeforeTest }) => {
      expect(graph.floatingLinks.size).toBe(1)

      graph.getNodeById(2)!.disconnectInput(0, true)
      expect(graph.floatingLinks.size).toBe(1)

      // Only the original reroute should be floating
      const reroutesExceptOne = [...graph.reroutes.values()].filter(reroute => reroute.id !== 1)
      for (const reroute of reroutesExceptOne) {
        expect(reroute.floating).toBeUndefined()
      }

      graph.getNodeById(3)!.disconnectInput(0, true)
      expect([...graph.reroutes]).toEqual(reroutesBeforeTest)

      // The normal link should now be floating
      expect(graph.floatingLinks.size).toBe(2)
      expect(graph.reroutes.get(3)!.floating).toEqual({ slotType: "output" })

      const floatingOutNode = graph.getNodeById(1)!
      floatingOutNode.disconnectOutput(0)

      // Should have lost one reroute
      expect(graph.reroutes.size).toBe(9)
      expect(graph.reroutes.get(1)).toBeUndefined()

      // Removed 4 reroutes
      expect(graph.reroutes.size).toBe(9)

      // All four nodes should have no links
      for (const nodeId of [1, 2, 3, 9]) {
        const { inputs: [input], outputs: [output] } = graph.getNodeById(nodeId)!

        expect(input.link).toBeNull()
        expect(output.links?.length).toBeOneOf([0, undefined])

        expect(input._floatingLinks?.size).toBeOneOf([0, undefined])
        expect(output._floatingLinks?.size).toBeOneOf([0, undefined])
      }
    })
  })

  type TestData = {
    /** Drop link on this reroute */
    targetRerouteId: number
    /** Parent reroutes of the target reroute */
    parentIds: number[]
    /** Number of links before the drop */
    linksBefore: number[]
    /** Number of links after the drop */
    linksAfter: (number | undefined)[]
    /** Whether to run the integrity check */
    runIntegrityCheck: boolean
  }

  test.for<TestData>([
    {
      targetRerouteId: 8,
      parentIds: [13, 10],
      linksBefore: [3, 4],
      linksAfter: [1, 2],
      runIntegrityCheck: true,
    },
    {
      targetRerouteId: 7,
      parentIds: [6, 8, 13, 10],
      linksBefore: [2, 2, 3, 4],
      linksAfter: [undefined, undefined, 1, 2],
      runIntegrityCheck: false,
    },
    {
      targetRerouteId: 6,
      parentIds: [8, 13, 10],
      linksBefore: [2, 3, 4],
      linksAfter: [undefined, 1, 2],
      runIntegrityCheck: false,
    },
    {
      targetRerouteId: 13,
      parentIds: [10],
      linksBefore: [4],
      linksAfter: [1],
      runIntegrityCheck: true,
    },
  ])("Should allow reconnect from output to any reroute", (
    { targetRerouteId, parentIds, linksBefore, linksAfter, runIntegrityCheck },
    { graph, connector, validateIntegrityNoChanges, getNextLinkIds },
  ) => {
    const linkCreatedCallback = vi.fn()
    connector.listenUntilReset("link-created", linkCreatedCallback)

    const disconnectedNode = graph.getNodeById(9)!

    // Parent reroutes of the target reroute
    for (const [index, parentId] of parentIds.entries()) {
      const reroute = graph.reroutes.get(parentId)!
      expect(reroute.linkIds.size).toBe(linksBefore[index])
    }

    connector.dragNewFromOutput(graph, disconnectedNode, disconnectedNode.outputs[0])
    const targetReroute = graph.reroutes.get(targetRerouteId)!
    const nextLinkIds = getNextLinkIds(targetReroute.linkIds)

    const dropEvent = { canvasX: targetReroute.pos[0], canvasY: targetReroute.pos[1] } as any
    connector.dropLinks(graph, dropEvent)

    expect(disconnectedNode.outputs[0].links).toEqual(nextLinkIds)
    expect([...targetReroute.linkIds.values()]).toEqual(nextLinkIds)

    // Parent reroutes should have lost the links or been removed
    for (const [index, parentId] of parentIds.entries()) {
      const reroute = graph.reroutes.get(parentId)!
      if (linksAfter[index] === undefined) {
        expect(reroute).toBeUndefined()
      } else {
        expect(reroute.linkIds.size).toBe(linksAfter[index])
      }
    }

    expect(linkCreatedCallback).toHaveBeenCalledTimes(nextLinkIds.length)

    if (runIntegrityCheck) {
      validateIntegrityNoChanges()
    }
  })

  test("Should drop floating links when both sides are disconnected", ({ graph, connector, reroutesBeforeTest, validateIntegrityNoChanges }) => {
    const floatingOutNode = graph.getNodeById(1)!
    connector.moveOutputLink(graph, floatingOutNode.outputs[0])

    const manyOutputsNode = graph.getNodeById(4)!
    const dropEvent = { canvasX: manyOutputsNode.pos[0], canvasY: manyOutputsNode.pos[1] } as any
    connector.dropLinks(graph, dropEvent)

    const output = manyOutputsNode.outputs[0]
    expect(output.links!.length).toBe(6)
    expect(output._floatingLinks!.size).toBe(1)

    validateIntegrityNoChanges()

    // Move again
    connector.moveOutputLink(graph, manyOutputsNode.outputs[0])

    const disconnectedNode = graph.getNodeById(9)!
    dropEvent.canvasX = disconnectedNode.pos[0]
    dropEvent.canvasY = disconnectedNode.pos[1]
    connector.dropLinks(graph, dropEvent)

    const newOutput = disconnectedNode.outputs[0]
    expect(newOutput.links!.length).toBe(6)
    expect(newOutput._floatingLinks!.size).toBe(1)

    validateIntegrityNoChanges()

    disconnectedNode.disconnectOutput(0)

    expect(newOutput._floatingLinks!.size).toBe(0)
    expect(graph.floatingLinks.size).toBe(6)

    // The final reroutes should all be floating
    for (const reroute of graph.reroutes.values()) {
      if ([3, 7, 15, 12].includes(reroute.id)) {
        expect(reroute.floating).toEqual({ slotType: "input" })
      } else {
        expect(reroute.floating).toBeUndefined()
      }
    }

    // Removed one reroute
    expect(graph.reroutes.size).toBe(reroutesBeforeTest.length - 1)

    // Original nodes should have no links
    for (const nodeId of [1, 4]) {
      const { inputs: [input], outputs: [output] } = graph.getNodeById(nodeId)!

      expect(input.link).toBeNull()
      expect(output.links?.length).toBeOneOf([0, undefined])

      expect(input._floatingLinks?.size).toBeOneOf([0, undefined])
      expect(output._floatingLinks?.size).toBeOneOf([0, undefined])
    }
  })
})
