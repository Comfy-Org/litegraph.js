import type { ISlotType } from "@/interfaces"

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
  createTestNode: (id: number, slotType?: ISlotType) => LGraphNode
  reroutesBeforeTest: [rerouteId: RerouteId, reroute: Reroute][]
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
    await use((id: number): LGraphNode => {
      const node = new LGraphNode("test")
      node.id = id
      graph.add(node)
      return node
    })
  },
})

describe("LinkConnector", () => {
  describe("Moving Input Links", () => {
    test("should handle moving input links", ({ graph, connector }) => {
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

    test("should handle connecting from floating reroutes", ({ graph, connector, reroutesBeforeTest }) => {
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

      // Floating link / reroute floating property should be cleared
      expect(floatingReroute.floating).toBeUndefined()
      expect(graph.floatingLinks.size).toBe(0)

      // Check graph integrity
      expect(graph.floatingLinks.size).toBe(0)
      expect([...graph.reroutes]).toEqual(reroutesBeforeTest)

      for (const reroute of graph.reroutes.values()) {
        expect(reroute.floating).toBeUndefined()
      }
    })

    test("should drop floating links when both sides are disconnected", ({ graph, reroutesBeforeTest }) => {
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

      expect(graph.reroutes.size).toBe(reroutesBeforeTest.length - 1)
    })
  })
})
