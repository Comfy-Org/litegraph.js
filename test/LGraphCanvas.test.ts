import { lgTest } from "./lgTest"
import { expect, describe, vi } from "vitest"
import { LGraphCanvas } from "@/LGraphCanvas"
import { LinkRenderType } from "@/types/globalEnums"

describe("Link rendering", () => {
  lgTest("should not draw link mouseover effect when links are hidden", () => {
    const mockCtx = {
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 100 })),
    } as unknown as CanvasRenderingContext2D

    const mockLink = {} as any

    const mockCanvas: Partial<LGraphCanvas> = {
      links_render_mode: LinkRenderType.HIDDEN_LINK,
    } as LGraphCanvas

    // Directly call the method that draws link mouseover effects and tooltips
    const drawLinkTooltip = LGraphCanvas.prototype.drawLinkTooltip
    drawLinkTooltip.call(mockCanvas, mockCtx, mockLink)

    // Verify that no text rendering was attempted
    expect(mockCtx.fillText).not.toHaveBeenCalled()
  })
})
