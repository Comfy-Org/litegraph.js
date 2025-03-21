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
  validateIntegrityFloatingRemoved: () => void
  getNextLinkIds: (linkIds: Set<number>, expectedExtraLinks?: number) => number[]
  readonly floatingReroute: Reroute
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

  validateIntegrityNoChanges: async ({ graph, reroutesBeforeTest, expect }, use) => {
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

  validateIntegrityFloatingRemoved: async ({ graph, reroutesBeforeTest, expect }, use) => {
    await use(() => {
      expect(graph.floatingLinks.size).toBe(0)
      expect([...graph.reroutes]).toEqual(reroutesBeforeTest)

      for (const reroute of graph.reroutes.values()) {
        expect(reroute.floating).toBeUndefined()
      }
    })
  },

  getNextLinkIds: async ({ graph }, use) => {
    await use((linkIds, expectedExtraLinks = 0) => {
      const indexes = [...new Array(linkIds.size + expectedExtraLinks).keys()]
      return indexes.map(index => graph.last_link_id + index + 1)
    })
  },

  floatingReroute: async ({ graph, expect }, use) => {
    const floatingReroute = graph.reroutes.get(1)!
    expect(floatingReroute.floating).toEqual({ slotType: "output" })
    await use(floatingReroute)
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
      const floatingReroute = LLink.getReroutes(graph, floatingLink)[0]

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

  describe("Floating links", () => {
    test("Removed when connecting from reroute to input", ({ graph, connector, floatingReroute }) => {
      const disconnectedNode = graph.getNodeById(9)!
      const canvasX = disconnectedNode.pos[0]
      const canvasY = disconnectedNode.pos[1]

      connector.dragFromReroute(graph, floatingReroute)
      connector.dropLinks(graph, { canvasX, canvasY } as any)

      expect(graph.floatingLinks.size).toBe(0)
      expect(floatingReroute.floating).toBeUndefined()
    })

    test("Removed when connecting from reroute to another reroute", ({ graph, connector, floatingReroute, validateIntegrityFloatingRemoved }) => {
      const reroute8 = graph.reroutes.get(8)!
      const canvasX = reroute8.pos[0]
      const canvasY = reroute8.pos[1]

      connector.dragFromReroute(graph, floatingReroute)
      connector.dropLinks(graph, { canvasX, canvasY } as any)

      expect(graph.floatingLinks.size).toBe(0)
      expect(floatingReroute.floating).toBeUndefined()
      expect(reroute8.floating).toBeUndefined()

      validateIntegrityFloatingRemoved()
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

  type ReconnectTestData = {
    /** Drag link from this reroute */
    fromRerouteId: number
    /** Drop link on this reroute */
    toRerouteId: number
    /** Reroute IDs that should be removed from the resultant reroute chain */
    shouldBeRemoved: number[]
    /** Reroutes that should have NONE of the link IDs that toReroute has */
    shouldHaveLinkIdsRemoved: number[]
    /** Whether to test floating inputs */
    testFloatingInputs?: true
    /** Number of expected extra links to be created */
    expectedExtraLinks?: number
  }

  test.for<ReconnectTestData>([
    {
      fromRerouteId: 10,
      toRerouteId: 15,
      shouldBeRemoved: [14],
      shouldHaveLinkIdsRemoved: [13, 8, 6, 7],
    },
    {
      fromRerouteId: 8,
      toRerouteId: 2,
      shouldBeRemoved: [4],
      shouldHaveLinkIdsRemoved: [],
    },
    {
      fromRerouteId: 3,
      toRerouteId: 12,
      shouldBeRemoved: [11],
      shouldHaveLinkIdsRemoved: [10, 13, 14, 15, 8, 6, 7],
    },
    {
      fromRerouteId: 15,
      toRerouteId: 7,
      shouldBeRemoved: [8, 6],
      shouldHaveLinkIdsRemoved: [],
    },
    {
      fromRerouteId: 1,
      toRerouteId: 7,
      shouldBeRemoved: [8, 6],
      shouldHaveLinkIdsRemoved: [],
    },
    {
      fromRerouteId: 1,
      toRerouteId: 10,
      shouldBeRemoved: [],
      shouldHaveLinkIdsRemoved: [],
    },
    {
      fromRerouteId: 4,
      toRerouteId: 8,
      shouldBeRemoved: [],
      shouldHaveLinkIdsRemoved: [],
      testFloatingInputs: true,
      expectedExtraLinks: 2,
    },
    {
      fromRerouteId: 2,
      toRerouteId: 12,
      shouldBeRemoved: [11],
      shouldHaveLinkIdsRemoved: [],
      testFloatingInputs: true,
      expectedExtraLinks: 1,
    },
  ])("Connecting from reroutes to another reroute should disconnect intermediate reroutes", (
    { fromRerouteId, toRerouteId, shouldBeRemoved, shouldHaveLinkIdsRemoved, testFloatingInputs, expectedExtraLinks },
    { graph, connector, getNextLinkIds },
  ) => {
    if (testFloatingInputs) {
      // Start by disconnecting the output of the 3x3 array of reroutes
      graph.getNodeById(4)!.disconnectOutput(0)
    }

    const fromReroute = graph.reroutes.get(fromRerouteId)!
    const toReroute = graph.reroutes.get(toRerouteId)!
    const nextLinkIds = getNextLinkIds(toReroute.linkIds, expectedExtraLinks)

    const originalParentChain = LLink.getReroutes(graph, toReroute)

    const sortAndJoin = (numbers: Iterable<number>) => [...numbers].sort().join(",")
    const hasIdenticalLinks = (a: Reroute, b: Reroute) =>
      sortAndJoin(a.linkIds) === sortAndJoin(b.linkIds) &&
      sortAndJoin(a.floatingLinkIds) === sortAndJoin(b.floatingLinkIds)

    // Sanity check shouldBeRemoved
    const reroutesWithIdenticalLinkIds = originalParentChain.filter(parent => hasIdenticalLinks(parent, toReroute))
    expect(reroutesWithIdenticalLinkIds.map(reroute => reroute.id)).toEqual(shouldBeRemoved)

    connector.dragFromReroute(graph, fromReroute)

    const dropEvent = { canvasX: toReroute.pos[0], canvasY: toReroute.pos[1] } as any
    connector.dropLinks(graph, dropEvent)

    const newParentChain = LLink.getReroutes(graph, toReroute)
    for (const rerouteId of shouldBeRemoved) {
      expect(originalParentChain.map(reroute => reroute.id)).toContain(rerouteId)
      expect(newParentChain.map(reroute => reroute.id)).not.toContain(rerouteId)
    }

    expect([...toReroute.linkIds.values()]).toEqual(nextLinkIds)

    // Parent reroutes should have lost the links or been removed
    for (const rerouteId of shouldBeRemoved) {
      const reroute = graph.reroutes.get(rerouteId)!
      expect(reroute).toBeUndefined()
    }

    for (const rerouteId of shouldHaveLinkIdsRemoved) {
      const reroute = graph.reroutes.get(rerouteId)!
      for (const linkId of toReroute.linkIds) {
        expect(reroute.linkIds).not.toContain(linkId)
      }
    }

    // Validate all links in a reroute share the same origin
    for (const reroute of graph.reroutes.values()) {
      for (const linkId of reroute.linkIds) {
        const link = graph.links.get(linkId)
        expect(link?.origin_id).toEqual(reroute.origin_id)
        expect(link?.origin_slot).toEqual(reroute.origin_slot)
      }
      for (const linkId of reroute.floatingLinkIds) {
        if (reroute.origin_id === undefined) continue

        const link = graph.floatingLinks.get(linkId)
        expect(link?.origin_id).toEqual(reroute.origin_id)
        expect(link?.origin_slot).toEqual(reroute.origin_slot)
      }
    }
  })

  test.for([
    { from: 8, to: 13 },
    { from: 7, to: 13 },
    { from: 6, to: 13 },
    { from: 13, to: 10 },
    { from: 14, to: 10 },
    { from: 15, to: 10 },
    { from: 14, to: 13 },
    { from: 10, to: 10 },
  ])("Connecting reroutes to invalid targets should do nothing", (
    { from, to },
    { graph, connector, validateIntegrityNoChanges },
  ) => {
    const listener = vi.fn()
    connector.listenUntilReset("link-created", listener)

    const fromReroute = graph.reroutes.get(from)!
    const toReroute = graph.reroutes.get(to)!

    const dropEvent = { canvasX: toReroute.pos[0], canvasY: toReroute.pos[1] } as any

    connector.dragFromReroute(graph, fromReroute)
    connector.dropLinks(graph, dropEvent)

    expect(listener).not.toHaveBeenCalled()

    validateIntegrityNoChanges()
  })
})
