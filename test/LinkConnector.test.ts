import type { MovingRenderLink } from "@/canvas/MovingRenderLink"
import type { LinkNetwork } from "@/interfaces"
import type { ISlotType } from "@/interfaces"

import { describe, expect, vi } from "vitest"

import { LinkConnector } from "@/canvas/LinkConnector"
import { LGraph } from "@/LGraph"
import { LGraphNode } from "@/LGraphNode"
import { LLink } from "@/LLink"
import { Reroute } from "@/Reroute"
import { LinkDirection } from "@/types/globalEnums"

import { test } from "./testExtensions"

function createMockNetwork(): LinkNetwork & { add(node: LGraphNode): void } {
  const graph = new LGraph()
  const floatingLinks = new Map<number, LLink>()
  return {
    links: new Map<number, LLink>(),
    reroutes: new Map<number, Reroute>(),
    floatingLinks,
    getNodeById: (id: number) => graph.getNodeById(id),
    addFloatingLink: (link: LLink) => {
      floatingLinks.set(link.id, link)
      return link
    },
    removeReroute: () => true,
    add: (node: LGraphNode) => graph.add(node),
  }
}

describe("LinkConnector", () => {
  test("should initialize with default state", () => {
    const setConnectingLinks = vi.fn()
    const connector = new LinkConnector(setConnectingLinks)

    expect(connector.state).toEqual({
      connectingTo: undefined,
      multi: false,
      draggingExistingLinks: false,
    })
    expect(connector.renderLinks).toEqual([])
    expect(connector.inputLinks).toEqual([])
    expect(connector.outputLinks).toEqual([])
    expect(connector.hiddenReroutes.size).toBe(0)
  })

  describe("Moving Input Links", () => {
    test("should handle moving input links", () => {
      const setConnectingLinks = vi.fn()
      const connector = new LinkConnector(setConnectingLinks)
      const network = createMockNetwork()

      const sourceNode = new LGraphNode("test")
      sourceNode.id = 1
      const targetNode = new LGraphNode("test")
      targetNode.id = 2

      const slotType: ISlotType = "number"
      sourceNode.addOutput("out", slotType)
      targetNode.addInput("in", slotType)
      network.add(sourceNode)
      network.add(targetNode)

      const link = new LLink(1, slotType, 1, 0, 2, 0)
      network.links.set(link.id, link)
      targetNode.inputs[0].link = link.id

      connector.moveInputLink(network, targetNode.inputs[0])

      expect(connector.state.connectingTo).toBe("input")
      expect(connector.state.draggingExistingLinks).toBe(true)
      expect(connector.inputLinks).toContain(link)
      expect(link._dragging).toBe(true)
    })

    test("should not move input link if already connecting", () => {
      const setConnectingLinks = vi.fn()
      const connector = new LinkConnector(setConnectingLinks)
      const network = createMockNetwork()

      connector.state.connectingTo = "input"

      expect(() => {
        connector.moveInputLink(network, { link: 1 } as any)
      }).toThrow("Already dragging links.")
    })
  })

  describe("Moving Output Links", () => {
    test("should handle moving output links", () => {
      const setConnectingLinks = vi.fn()
      const connector = new LinkConnector(setConnectingLinks)
      const network = createMockNetwork()

      const sourceNode = new LGraphNode("test")
      sourceNode.id = 1
      const targetNode = new LGraphNode("test")
      targetNode.id = 2

      const slotType: ISlotType = "number"
      sourceNode.addOutput("out", slotType)
      targetNode.addInput("in", slotType)
      network.add(sourceNode)
      network.add(targetNode)

      const link = new LLink(1, slotType, 1, 0, 2, 0)
      network.links.set(link.id, link)
      sourceNode.outputs[0].links = [link.id]

      connector.moveOutputLink(network, sourceNode.outputs[0])

      expect(connector.state.connectingTo).toBe("output")
      expect(connector.state.draggingExistingLinks).toBe(true)
      expect(connector.state.multi).toBe(true)
      expect(connector.outputLinks).toContain(link)
      expect(link._dragging).toBe(true)
    })

    test("should not move output link if already connecting", () => {
      const setConnectingLinks = vi.fn()
      const connector = new LinkConnector(setConnectingLinks)
      const network = createMockNetwork()

      connector.state.connectingTo = "output"

      expect(() => {
        connector.moveOutputLink(network, { links: [1] } as any)
      }).toThrow("Already dragging links.")
    })
  })

  describe("Dragging New Links", () => {
    test("should handle dragging new link from output", () => {
      const setConnectingLinks = vi.fn()
      const connector = new LinkConnector(setConnectingLinks)
      const network = createMockNetwork()

      const sourceNode = new LGraphNode("test")
      sourceNode.id = 1
      const slotType: ISlotType = "number"
      sourceNode.addOutput("out", slotType)

      connector.dragNewFromOutput(network, sourceNode, sourceNode.outputs[0])

      expect(connector.state.connectingTo).toBe("input")
      expect(connector.renderLinks.length).toBe(1)
      expect(connector.state.draggingExistingLinks).toBe(false)
    })

    test("should handle dragging new link from input", () => {
      const setConnectingLinks = vi.fn()
      const connector = new LinkConnector(setConnectingLinks)
      const network = createMockNetwork()

      const targetNode = new LGraphNode("test")
      targetNode.id = 1
      const slotType: ISlotType = "number"
      targetNode.addInput("in", slotType)

      connector.dragNewFromInput(network, targetNode, targetNode.inputs[0])

      expect(connector.state.connectingTo).toBe("output")
      expect(connector.renderLinks.length).toBe(1)
      expect(connector.state.draggingExistingLinks).toBe(false)
    })
  })

  describe("Reset", () => {
    test("should reset state and clear links", () => {
      const setConnectingLinks = vi.fn()
      const connector = new LinkConnector(setConnectingLinks)
      const network = createMockNetwork()

      connector.state.connectingTo = "input"
      connector.state.multi = true
      connector.state.draggingExistingLinks = true

      const link = new LLink(1, "number", 1, 0, 2, 0)
      link._dragging = true
      connector.inputLinks.push(link)

      const reroute = new Reroute(1, network)
      reroute.pos = [0, 0]
      reroute._dragging = true
      connector.hiddenReroutes.add(reroute)

      connector.reset()

      expect(connector.state).toEqual({
        connectingTo: undefined,
        multi: false,
        draggingExistingLinks: false,
      })
      expect(connector.renderLinks).toEqual([])
      expect(connector.inputLinks).toEqual([])
      expect(connector.outputLinks).toEqual([])
      expect(connector.hiddenReroutes.size).toBe(0)
      expect(link._dragging).toBeUndefined()
      expect(reroute._dragging).toBeUndefined()
    })
  })

  describe("Event Handling", () => {
    test("should handle event listeners until reset", () => {
      const setConnectingLinks = vi.fn()
      const connector = new LinkConnector(setConnectingLinks)
      const listener = vi.fn()

      connector.listenUntilReset("input-moved", listener)

      const sourceNode = new LGraphNode("test")
      sourceNode.id = 1

      const mockRenderLink = {
        node: sourceNode,
        fromSlot: { name: "out", type: "number" },
        fromPos: [0, 0],
        fromDirection: LinkDirection.RIGHT,
        toType: "input",
        link: new LLink(1, "number", 1, 0, 2, 0),
      } as MovingRenderLink

      connector.events.dispatch("input-moved", mockRenderLink)
      expect(listener).toHaveBeenCalled()

      connector.reset()
      connector.events.dispatch("input-moved", mockRenderLink)
      expect(listener).toHaveBeenCalledTimes(1)
    })
  })

  describe("Export", () => {
    test("should export current state", () => {
      const setConnectingLinks = vi.fn()
      const connector = new LinkConnector(setConnectingLinks)
      const network = createMockNetwork()

      connector.state.connectingTo = "input"
      connector.state.multi = true

      const link = new LLink(1, "number", 1, 0, 2, 0)
      connector.inputLinks.push(link)

      const exported = connector.export(network)

      expect(exported.state).toEqual(connector.state)
      expect(exported.inputLinks).toEqual(connector.inputLinks)
      expect(exported.outputLinks).toEqual(connector.outputLinks)
      expect(exported.renderLinks).toEqual(connector.renderLinks)
      expect(exported.network).toBe(network)
    })
  })

  test("LinkConnector", () => {
    const network = createMockNetwork()
    const setConnectingLinks = vi.fn()
    const connector = new LinkConnector(setConnectingLinks)

    test("initializes state", () => {
      expect(connector.state).toEqual({
        connectingTo: undefined,
        multi: false,
        draggingExistingLinks: false,
      })
    })

    test("moves input link", () => {
      const slotType: ISlotType = "number"
      const node1 = new LGraphNode("test")
      const node2 = new LGraphNode("test")
      node1.id = 1
      node2.id = 2
      node1.addOutput("out", slotType)
      node2.addInput("in", slotType)
      const link = new LLink(1, slotType, node1.id, 0, node2.id, 0)
      network.links.set(link.id, link)

      connector.moveInputLink(network, node2.inputs[0])
      expect(connector.state.connectingTo).toBe("input")
      expect(connector.state.draggingExistingLinks).toBe(true)
      expect(connector.inputLinks).toContain(link)
    })

    test("moves output link", () => {
      const slotType: ISlotType = "number"
      const node1 = new LGraphNode("test")
      const node2 = new LGraphNode("test")
      node1.id = 1
      node2.id = 2
      node1.addOutput("out", slotType)
      node2.addInput("in", slotType)
      const link = new LLink(1, slotType, node1.id, 0, node2.id, 0)
      network.links.set(link.id, link)
      node1.outputs[0].links = [link.id]

      connector.moveOutputLink(network, node1.outputs[0])
      expect(connector.state.connectingTo).toBe("output")
      expect(connector.state.draggingExistingLinks).toBe(true)
      expect(connector.state.multi).toBe(true)
      expect(connector.outputLinks).toContain(link)
    })

    test("drags new link from output", () => {
      const slotType: ISlotType = "number"
      const node = new LGraphNode("test")
      node.id = 1
      node.addOutput("out", slotType)

      connector.dragNewFromOutput(network, node, node.outputs[0])
      expect(connector.state.connectingTo).toBe("input")
      expect(connector.state.draggingExistingLinks).toBe(false)
    })

    test("resets state", () => {
      connector.reset()
      expect(connector.state).toEqual({
        connectingTo: undefined,
        multi: false,
        draggingExistingLinks: false,
      })
    })

    test("handles events", () => {
      const slotType: ISlotType = "number"
      const node1 = new LGraphNode("test")
      const node2 = new LGraphNode("test")
      node1.id = 1
      node2.id = 2
      node1.addOutput("out", slotType)
      node2.addInput("in", slotType)

      // const reroute = new Reroute(1, network, [0, 0], 1, [], [])
      const link = new LLink(1, slotType, node1.id, 0, node2.id, 0)
      network.links.set(link.id, link)

      const onBeforeMoveOutput = vi.fn()
      const onInputMoved = vi.fn()

      connector.events.addEventListener("before-move-output", onBeforeMoveOutput)
      connector.events.addEventListener("input-moved", onInputMoved)

      connector.moveOutputLink(network, node1.outputs[0])
      expect(onBeforeMoveOutput).toHaveBeenCalled()
    })

    test("exports current state", () => {
      const slotType: ISlotType = "number"
      const node = new LGraphNode("test")
      node.id = 1
      node.addOutput("out", slotType)

      connector.dragNewFromOutput(network, node, node.outputs[0])
      expect(connector.state).toEqual({
        connectingTo: "input",
        multi: false,
        draggingExistingLinks: false,
      })
    })
  })
})
