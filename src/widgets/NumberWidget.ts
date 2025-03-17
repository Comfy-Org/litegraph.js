import type { LGraphCanvas } from "@/LGraphCanvas"
import type { LGraphNode } from "@/LGraphNode"
import type { CanvasMouseEvent } from "@/types/events"
import type { INumericWidget, IWidgetOptions } from "@/types/widgets"

import { getWidgetStep } from "@/utils/widget"

import { BaseWidget, type DrawWidgetOptions } from "./BaseWidget"

export class NumberWidget extends BaseWidget implements INumericWidget {
  // INumberWidget properties
  declare type: "number"
  declare value: number | number[]
  declare options: IWidgetOptions<number> & {
    fields?: {
      labels?: string[]
      count?: number
      separator?: string
    }
  }

  constructor(widget: INumericWidget) {
    super(widget)
    this.type = "number"

    // Initialize multiple values if fields option is present
    if (widget.options?.fields?.count) {
      const count = Math.min(Math.max(2, widget.options.fields.count), 4)
      this.value = Array.isArray(widget.value)
        ? widget.value.slice(0, count)
        : new Array(count).fill(widget.value || 0)
    } else {
      this.value = widget.value
    }
  }

  override setValue(v: number | number[], options?: {
    e: CanvasMouseEvent
    node: LGraphNode
    canvas: LGraphCanvas
  }) {
    const oldValue = this.value

    // Preserve multi-field state when setting values
    if (this.options?.fields?.count) {
      const count = this.options.fields.count
      if (Array.isArray(v)) {
        this.value = v.slice(0, count)
      } else {
        // If setting a single value but we're in multi-field mode,
        // preserve the array structure
        if (Array.isArray(this.value)) {
          const newValues = [...this.value]
          newValues[0] = v
          this.value = newValues
        } else {
          this.value = new Array(count).fill(v)
        }
      }
    } else {
      this.value = Array.isArray(v) ? v[0] : v
    }

    // Handle property binding
    if (
      options?.node &&
      this.options?.property &&
      options.node.properties[this.options.property] !== undefined
    ) {
      options.node.setProperty(this.options.property, this.value)
    }

    // Call callback if exists
    if (options?.canvas) {
      const pos = options.canvas.graph_mouse
      this.callback?.(this.value, options.canvas, options.node, pos, options.e)
    }

    // Notify widget change
    if (options?.node) {
      options.node.onWidgetChanged?.(this.name ?? "", this.value, oldValue, this)
      if (options.node.graph) options.node.graph._version++
    }
  }

  /**
   * Draws the widget
   * @param ctx The canvas context
   * @param options The options for drawing the widget
   */
  override drawWidget(ctx: CanvasRenderingContext2D, {
    y,
    width,
    show_text = true,
    margin = 15,
  }: DrawWidgetOptions) {
    const originalTextAlign = ctx.textAlign
    const originalStrokeStyle = ctx.strokeStyle
    const originalFillStyle = ctx.fillStyle
    const { height } = this

    // Handle multi-field drawing
    if (this.options?.fields?.count && Array.isArray(this.value)) {
      const count = this.value.length
      const fieldWidth = (width - margin * 2) / count
      const labels = this.options.fields.labels || []

      for (let i = 0; i < count; i++) {
        const fieldX = margin + (fieldWidth * i)

        // Draw field background
        ctx.textAlign = "left"
        ctx.strokeStyle = this.outline_color
        ctx.fillStyle = this.background_color
        ctx.beginPath()

        if (show_text) {
          ctx.roundRect(fieldX, y, fieldWidth - margin, height, [height * 0.5])
        } else {
          ctx.rect(fieldX, y, fieldWidth - margin, height)
        }
        ctx.fill()

        if (show_text) {
          if (!this.disabled) {
            ctx.stroke()
            // Draw arrows for each field
            ctx.fillStyle = this.text_color
            // Left arrow
            ctx.beginPath()
            ctx.moveTo(fieldX + 16, y + 5)
            ctx.lineTo(fieldX + 6, y + height * 0.5)
            ctx.lineTo(fieldX + 16, y + height - 5)
            ctx.fill()
            // Right arrow
            ctx.beginPath()
            ctx.moveTo(fieldX + fieldWidth - margin - 16, y + 5)
            ctx.lineTo(fieldX + fieldWidth - margin - 6, y + height * 0.5)
            ctx.lineTo(fieldX + fieldWidth - margin - 16, y + height - 5)
            ctx.fill()
          }

          // Draw label
          ctx.fillStyle = this.secondary_text_color
          const label = labels[i] || `${this.label || this.name}${i + 1}`
          const labelX = fieldX + margin + 5
          ctx.fillText(label, labelX, y + height * 0.7)

          // Draw value
          ctx.fillStyle = this.text_color
          ctx.textAlign = "right"
          ctx.fillText(
            Number(this.value[i]).toFixed(
              this.options.precision !== undefined ? this.options.precision : 3,
            ),
            fieldX + fieldWidth - margin - 20,
            y + height * 0.7,
          )
        }
      }
    } else {
      // Original single field drawing code
      ctx.textAlign = "left"
      ctx.strokeStyle = this.outline_color
      ctx.fillStyle = this.background_color
      ctx.beginPath()

      if (show_text)
        ctx.roundRect(margin, y, width - margin * 2, height, [height * 0.5])
      else
        ctx.rect(margin, y, width - margin * 2, height)
      ctx.fill()

      if (show_text) {
        if (!this.disabled) {
          ctx.stroke()
          // Draw left arrow
          ctx.fillStyle = this.text_color
          ctx.beginPath()
          ctx.moveTo(margin + 16, y + 5)
          ctx.lineTo(margin + 6, y + height * 0.5)
          ctx.lineTo(margin + 16, y + height - 5)
          ctx.fill()
          // Draw right arrow
          ctx.beginPath()
          ctx.moveTo(width - margin - 16, y + 5)
          ctx.lineTo(width - margin - 6, y + height * 0.5)
          ctx.lineTo(width - margin - 16, y + height - 5)
          ctx.fill()
        }

        // Draw label
        ctx.fillStyle = this.secondary_text_color
        const label = this.label || this.name
        if (label != null) {
          ctx.fillText(label, margin * 2 + 5, y + height * 0.7)
        }

        // Draw value
        ctx.fillStyle = this.text_color
        ctx.textAlign = "right"
        ctx.fillText(
          Number(this.value).toFixed(
            this.options.precision !== undefined
              ? this.options.precision
              : 3,
          ),
          width - margin * 2 - 20,
          y + height * 0.7,
        )
      }
    }

    // Restore original context attributes
    ctx.textAlign = originalTextAlign
    ctx.strokeStyle = originalStrokeStyle
    ctx.fillStyle = originalFillStyle
  }

  override onClick(options: {
    e: CanvasMouseEvent
    node: LGraphNode
    canvas: LGraphCanvas
  }) {
    const { e, node, canvas } = options
    const x = e.canvasX - node.pos[0]
    const width = this.width || node.size[0]

    if (this.options?.fields?.count && Array.isArray(this.value)) {
      const count = this.value.length
      const fieldWidth = (width - 30) / count
      const fieldIndex = Math.floor((x - 15) / fieldWidth)

      if (fieldIndex >= 0 && fieldIndex < count) {
        const fieldX = x - (fieldWidth * fieldIndex + 15)
        const delta = fieldX < 40 ? -1 : (fieldX > fieldWidth - 40 ? 1 : 0)

        if (delta) {
          // Handle arrow clicks for the specific field
          const newValues = [...this.value]
          let newValue = newValues[fieldIndex] + delta * getWidgetStep(this.options)

          if (this.options.min != null && newValue < this.options.min) {
            newValue = this.options.min
          }
          if (this.options.max != null && newValue > this.options.max) {
            newValue = this.options.max
          }

          newValues[fieldIndex] = newValue
          this.setValue(newValues, options)
          return
        }

        // Handle center click - show prompt for specific field
        canvas.prompt(`Value ${fieldIndex + 1}`, this.value[fieldIndex], (v: string) => {
          if (/^[\d\s()*+/-]+|\d+\.\d+$/.test(v)) {
            try {
              v = eval(v)
            } catch {}
          }
          const newValue = Number(v)
          if (!isNaN(newValue)) {
            const newValues = Array.isArray(this.value) ? [...this.value] : [this.value]
            newValues[fieldIndex] = newValue
            this.setValue(newValues, options)
          }
        }, e)
      }
    } else {
      // Original single field click handling code...
      const delta = x < 40 ? -1 : (x > width - 40 ? 1 : 0)

      if (delta) {
        let newValue = Number(this.value) + delta * getWidgetStep(this.options)
        if (this.options.min != null && newValue < this.options.min) {
          newValue = this.options.min
        }
        if (this.options.max != null && newValue > this.options.max) {
          newValue = this.options.max
        }
        this.setValue(newValue, options)
        return
      }

      canvas.prompt("Value", this.value, (v: string) => {
        if (/^[\d\s()*+/-]+|\d+\.\d+$/.test(v)) {
          try {
            v = eval(v)
          } catch {}
        }
        const newValue = Number(v)
        if (!isNaN(newValue)) {
          this.setValue(newValue, options)
        }
      }, e)
    }
  }

  /**
   * Handles drag events for the number widget
   * @param options The options for handling the drag event
   */
  override onDrag(options: {
    e: CanvasMouseEvent
    node: LGraphNode
    canvas: LGraphCanvas
  }) {
    const { e, node, canvas } = options
    const width = this.width || node.width
    const x = e.canvasX - node.pos[0]

    if (Array.isArray(this.value)) {
      const count = this.value.length
      const fieldWidth = (width - 30) / count
      const fieldIndex = Math.floor((x - 15) / fieldWidth)

      if (fieldIndex >= 0 && fieldIndex < count) {
        const fieldX = x - (fieldWidth * fieldIndex + 15)
        const delta = fieldX < 40 ? -1 : (fieldX > fieldWidth - 40 ? 1 : 0)

        if (delta && (fieldX > -3 && fieldX < fieldWidth + 3)) return

        const newValues = [...this.value]
        if (e.deltaX) {
          newValues[fieldIndex] += e.deltaX * getWidgetStep(this.options)
        }

        if (this.options.min != null) {
          newValues[fieldIndex] = Math.max(newValues[fieldIndex], this.options.min)
        }
        if (this.options.max != null) {
          newValues[fieldIndex] = Math.min(newValues[fieldIndex], this.options.max)
        }

        this.setValue(newValues, { e, node, canvas })
      }
    } else {
      // Original single field drag handling
      const delta = x < 40
        ? -1
        : (x > width - 40
          ? 1
          : 0)

      if (delta && (x > -3 && x < width + 3)) return

      let newValue = this.value
      if (e.deltaX) newValue += e.deltaX * getWidgetStep(this.options)

      if (this.options.min != null && newValue < this.options.min) {
        newValue = this.options.min
      }
      if (this.options.max != null && newValue > this.options.max) {
        newValue = this.options.max
      }
      if (newValue !== this.value) {
        this.setValue(newValue, { e, node, canvas })
      }
    }
  }
}
