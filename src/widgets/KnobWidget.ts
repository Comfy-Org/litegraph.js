import type { IKnobWidget, IWidgetKnobOptions } from "@/types/widgets"
import { BaseWidget } from "./BaseWidget"
import type { LGraphNode } from "@/LGraphNode"
import { LGraphCanvas } from "@/LGraphCanvas"
import { CanvasMouseEvent } from "@/types/events"
import { clamp } from "@/litegraph"

export class KnobWidget extends BaseWidget implements IKnobWidget<HTMLElement> {
  declare type: "knob"
  declare value: number
  declare options: IWidgetKnobOptions

  constructor(widget: IKnobWidget<HTMLElement>) {
    super(widget)
    this.type = "knob"
    this.value = widget.value
    this.options = widget.options
  }

  computedHeight?: number
  /**
   * Compute the layout size of the widget.
   * @param node The node this widget belongs to.
   * @returns The layout size of the widget.
   */
  computeLayoutSize(): {
    minHeight: number
    maxHeight?: number
    minWidth: number
    maxWidth?: number
  } {
    return {
      minHeight: 60,
      minWidth: 20,
      maxHeight: 1000000,
      maxWidth: 1000000,
    }
  }

  get height(): number {
    return this.computedHeight || super.height
  }

  drawWidget(
    ctx: CanvasRenderingContext2D,
    options: {
      y: number
      width: number
      show_text?: boolean
      margin?: number
    },
  ): void {
    // Store original context attributes
    const originalTextAlign = ctx.textAlign
    const originalStrokeStyle = ctx.strokeStyle
    const originalFillStyle = ctx.fillStyle

    const { y, width: widget_width, show_text = true, margin = 15 } = options
    const effective_height = this.computedHeight || this.height
    // Draw background
    const size_modifier =
      Math.min(this.computedHeight || this.height, this.width || 20) / 20 // TODO: replace magic numbers
    const arc_center = { x: widget_width / 2, y: effective_height / 2 + y }
    ctx.lineWidth =
      (Math.min(widget_width, effective_height) - margin * size_modifier) / 6
    const arc_size =
      (Math.min(widget_width, effective_height) -
        margin * size_modifier -
        ctx.lineWidth) / 2
    {
      const gradient = ctx.createRadialGradient(
        arc_center.x,
        arc_center.y,
        arc_size + ctx.lineWidth,
        0,
        0,
        arc_size + ctx.lineWidth,
      )
      gradient.addColorStop(0, "rgb(29, 29, 29)")
      gradient.addColorStop(1, "rgb(116, 116, 116)")
      ctx.fillStyle = gradient
    }
    ctx.beginPath()

    {
      ctx.arc(
        arc_center.x,
        arc_center.y,
        arc_size + ctx.lineWidth / 2,
        0,
        Math.PI * 2,
        false,
      )
      ctx.fill()
      ctx.closePath()
    }

    // Draw knob's background
    const arc = {
      start_angle: Math.PI * 0.6,
      end_angle: Math.PI * 2.4,
    }
    ctx.beginPath()
    {
      const gradient = ctx.createRadialGradient(
        arc_center.x,
        arc_center.y,
        arc_size + ctx.lineWidth,
        0,
        0,
        arc_size + ctx.lineWidth,
      )
      gradient.addColorStop(0, "rgb(99, 99, 99)")
      gradient.addColorStop(1, "rgb(36, 36, 36)")
      ctx.strokeStyle = gradient
    }
    ctx.arc(
      arc_center.x,
      arc_center.y,
      arc_size,
      arc.start_angle,
      arc.end_angle,
      false,
    )
    ctx.stroke()
    ctx.closePath()

    const range = this.options.max - this.options.min
    let nvalue = (this.value - this.options.min) / range
    nvalue = clamp(nvalue, 0, 1)

    // Draw value
    ctx.beginPath()
    const gradient = ctx.createConicGradient(
      arc.start_angle,
      arc_center.x,
      arc_center.y,
    )
    gradient.addColorStop(0, "rgb(14, 182, 201)") // TODO: Parametrize these
    gradient.addColorStop(1, "rgb(0, 216, 72)")
    ctx.strokeStyle = gradient
    const value_end_angle =
      (arc.end_angle - arc.start_angle) * nvalue + arc.start_angle
    ctx.arc(
      arc_center.x,
      arc_center.y,
      arc_size,
      arc.start_angle,
      value_end_angle,
      false,
    )
    ctx.stroke()
    ctx.closePath()

    // Draw outline if not disabled
    if (show_text && !this.disabled) {
      ctx.strokeStyle = this.outline_color
      // Draw value
      ctx.beginPath()
      ctx.strokeStyle = this.outline_color
      ctx.arc(
        arc_center.x,
        arc_center.y,
        arc_size + ctx.lineWidth / 2,
        0,
        Math.PI * 2,
        false,
      )
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.closePath()
    }

    // // Draw marker if present
    // if (this.marker != null) {
    //   let marker_nvalue = (this.marker - this.options.min) / range
    //   marker_nvalue = clamp(marker_nvalue, 0, 1)
    //   ctx.fillStyle = this.options.marker_color ?? "#AA9"
    //   ctx.fillRect(
    //     margin + marker_nvalue * (widget_width - margin * 2),
    //     y,
    //     2,
    //     H,
    //   )
    // }

    // Draw text
    if (show_text) {
      ctx.textAlign = "center"
      ctx.fillStyle = this.text_color
      ctx.fillText(
        (this.label || this.name) +
        "\n" +
        Number(this.value).toFixed(
          this.options.precision != null ? this.options.precision : 3,
        ),
        widget_width * 0.5,
        y + effective_height * 0.5,
      )
    }

    // Restore original context attributes
    ctx.textAlign = originalTextAlign
    ctx.strokeStyle = originalStrokeStyle
    ctx.fillStyle = originalFillStyle
  }

  onClick(): void {
    return
  }

  override onDrag(options: {
    e: CanvasMouseEvent
    node: LGraphNode
    canvas: LGraphCanvas
  }): void {
    if (this.options.read_only) return
    const { e } = options
    const size_modifier = Math.min(
      this.computedHeight || this.height,
      this.width || 20,
    )
    const shift_modifier = e.shiftKey ? 0.5 : 1.0 // Consider this for other widgets
    const deltaX = (e.movementX / size_modifier) * shift_modifier
    const step = this.options.step
    // Calculate new value based on drag movement
    // HACK: For some reason, the front-end multiplies step by 10, this brings it down to the advertised value
    // see src/utils/mathUtil.ts@getNumberDefaults
    const deltaValue = (deltaX * step) / 10
    const newValue = clamp(
      this.value + deltaValue,
      this.options.min,
      this.options.max,
    )
    if (newValue !== this.value) {
      this.setValue(newValue, options)
    }
  }
}
