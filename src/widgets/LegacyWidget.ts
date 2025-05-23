import type { LGraphNode } from "@/LGraphNode"
import type { IBaseWidget } from "@/types/widgets"

import { LiteGraph } from "@/litegraph"

import { BaseWidget, type DrawWidgetOptions } from "./BaseWidget"

/**
 * Wraps a legacy POJO custom widget, so that all widgets may be called via the same internal interface.
 *
 * Support will eventually be removed.
 * @remarks Expect this class to undergo breaking changes without warning.
 */
export class LegacyWidget<TWidget extends IBaseWidget = IBaseWidget> extends BaseWidget<TWidget> implements IBaseWidget {
  draw?(
    ctx: CanvasRenderingContext2D,
    node: LGraphNode,
    widget_width: number,
    y: number,
    H: number,
    lowQuality?: boolean,
  ): void

  override drawWidget(ctx: CanvasRenderingContext2D, options: DrawWidgetOptions) {
    const H = LiteGraph.NODE_WIDGET_HEIGHT
    this.draw?.(ctx, this.node, options.width, this.y, H, !!options.showText)
  }

  override onClick() {
    console.warn("Custom widget wrapper onClick was just called. Handling for third party widgets is done via LGraphCanvas - the mouse callback.")
  }
}
