import type { CanvasColour, ConnectingLink, Dictionary, INodeInputSlot, INodeOutputSlot, INodeSlot, ISlotType, Point } from "./interfaces"
import type { IWidget } from "./types/widgets"
import type { LinkId } from "./LLink"
import { LinkDirection, RenderShape } from "./types/globalEnums"
import { LabelPosition, SlotShape, SlotType } from "./draw"
import { type LGraphNode, LiteGraph } from "./litegraph"

export interface ConnectionColorContext {
  default_connection_color: {
    input_off: string
    input_on: string
    output_off: string
    output_on: string
  }
  default_connection_color_byType: Dictionary<CanvasColour>
  default_connection_color_byTypeOff: Dictionary<CanvasColour>
}

interface IDrawOptions {
  pos: Point
  colorContext: ConnectionColorContext
  labelColor?: CanvasColour
  labelPosition?: LabelPosition
  horizontal?: boolean
  lowQuality?: boolean
  renderText?: boolean
  doStroke?: boolean
  highlight?: boolean
}

export abstract class NodeSlot implements INodeSlot {
  name: string
  localized_name?: string
  label?: string
  type: ISlotType
  dir?: LinkDirection
  removable?: boolean
  shape?: RenderShape
  color_off?: CanvasColour
  color_on?: CanvasColour
  locked?: boolean
  nameLocked?: boolean
  pos?: Point
  widget?: IWidget

  constructor(slot: INodeSlot) {
    Object.assign(this, slot)
    this.name = slot.name
    this.type = slot.type
  }

  /**
   * Whether this slot is a valid target for a dragging link.
   * @param link - The link to check against.
   */
  abstract isValidTarget(link: ConnectingLink | null): boolean

  /**
   * Whether this slot is the one that the mouse is currently over.
   * @param node - The node to check against.
   */
  abstract isMouseOver(node: LGraphNode): boolean

  /**
   * Whether this slot is an input slot.
   */
  abstract isInputSlot(): boolean

  /**
   * The label to display in the UI.
   */
  get renderingLabel(): string {
    return this.label || this.localized_name || this.name || ""
  }

  abstract isConnected(): boolean

  connectedColor(context: ConnectionColorContext): CanvasColour {
    return this.color_on ||
      context.default_connection_color_byType[this.type] ||
      context.default_connection_color.output_on
  }

  disconnectedColor(context: ConnectionColorContext): CanvasColour {
    return this.color_off ||
      context.default_connection_color_byTypeOff[this.type] ||
      context.default_connection_color_byType[this.type] ||
      context.default_connection_color.output_off
  }

  renderingColor(context: ConnectionColorContext): CanvasColour {
    return this.isConnected()
      ? this.connectedColor(context)
      : this.disconnectedColor(context)
  }

  draw(
    ctx: CanvasRenderingContext2D,
    options: IDrawOptions,
  ) {
    const {
      pos,
      colorContext,
      labelColor = "#AAA",
      labelPosition = LabelPosition.Right,
      horizontal = false,
      lowQuality = false,
      renderText = true,
      highlight = false,
      doStroke: _doStroke = false,
    } = options

    // Save the current fillStyle and strokeStyle
    const originalFillStyle = ctx.fillStyle
    const originalStrokeStyle = ctx.strokeStyle
    const originalLineWidth = ctx.lineWidth

    const slot_type = this.type
    const slot_shape = (
      slot_type === SlotType.Array ? SlotShape.Grid : this.shape
    ) as SlotShape

    ctx.beginPath()
    let doStroke = _doStroke
    let doFill = true

    ctx.fillStyle = this.renderingColor(colorContext)
    ctx.lineWidth = 1
    if (slot_type === SlotType.Event || slot_shape === SlotShape.Box) {
      if (horizontal) {
        ctx.rect(pos[0] - 5 + 0.5, pos[1] - 8 + 0.5, 10, 14)
      } else {
        ctx.rect(pos[0] - 6 + 0.5, pos[1] - 5 + 0.5, 14, 10)
      }
    } else if (slot_shape === SlotShape.Arrow) {
      ctx.moveTo(pos[0] + 8, pos[1] + 0.5)
      ctx.lineTo(pos[0] - 4, pos[1] + 6 + 0.5)
      ctx.lineTo(pos[0] - 4, pos[1] - 6 + 0.5)
      ctx.closePath()
    } else if (slot_shape === SlotShape.Grid) {
      const gridSize = 3
      const cellSize = 2
      const spacing = 3

      for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
          ctx.rect(
            pos[0] - 4 + x * spacing,
            pos[1] - 4 + y * spacing,
            cellSize,
            cellSize,
          )
        }
      }
      doStroke = false
    } else {
      // Default rendering for circle, hollow circle.
      if (lowQuality) {
        ctx.rect(pos[0] - 4, pos[1] - 4, 8, 8)
      } else {
        let radius: number
        if (slot_shape === SlotShape.HollowCircle) {
          doFill = false
          doStroke = true
          ctx.lineWidth = 3
          ctx.strokeStyle = ctx.fillStyle
          radius = highlight ? 4 : 3
        } else {
          // Normal circle
          radius = highlight ? 5 : 4
        }
        ctx.arc(pos[0], pos[1], radius, 0, Math.PI * 2)
      }
    }

    if (doFill) ctx.fill()
    if (!lowQuality && doStroke) ctx.stroke()

    // render slot label
    if (renderText) {
      const text = this.renderingLabel
      if (text) {
        // TODO: Finish impl.  Highlight text on mouseover unless we're connecting links.
        ctx.fillStyle = labelColor

        if (labelPosition === LabelPosition.Right) {
          if (horizontal || this.dir == LinkDirection.UP) {
            ctx.fillText(text, pos[0], pos[1] - 10)
          } else {
            ctx.fillText(text, pos[0] + 10, pos[1] + 5)
          }
        } else {
          if (horizontal || this.dir == LinkDirection.DOWN) {
            ctx.fillText(text, pos[0], pos[1] - 8)
          } else {
            ctx.fillText(text, pos[0] - 10, pos[1] + 5)
          }
        }
      }
    }

    // Restore the original fillStyle and strokeStyle
    ctx.fillStyle = originalFillStyle
    ctx.strokeStyle = originalStrokeStyle
    ctx.lineWidth = originalLineWidth
  }

  drawCollapsed(ctx: CanvasRenderingContext2D, options: { pos: Point }) {
    const [x, y] = options.pos

    // Save original styles
    const originalFillStyle = ctx.fillStyle

    ctx.fillStyle = "#686"
    ctx.beginPath()

    if (this.type === SlotType.Event || this.shape === RenderShape.BOX) {
      ctx.rect(x - 7 + 0.5, y - 4, 14, 8)
    } else if (this.shape === RenderShape.ARROW) {
      // Adjust arrow direction based on whether this is an input or output slot
      const isInput = this instanceof NodeInputSlot
      if (isInput) {
        ctx.moveTo(x + 8, y)
        ctx.lineTo(x - 4, y - 4)
        ctx.lineTo(x - 4, y + 4)
      } else {
        ctx.moveTo(x + 6, y)
        ctx.lineTo(x - 6, y - 4)
        ctx.lineTo(x - 6, y + 4)
      }
      ctx.closePath()
    } else {
      ctx.arc(x, y, 4, 0, Math.PI * 2)
    }
    ctx.fill()

    // Restore original styles
    ctx.fillStyle = originalFillStyle
  }
}

export class NodeInputSlot extends NodeSlot implements INodeInputSlot {
  link: LinkId | null

  constructor(slot: INodeInputSlot) {
    super(slot)
    this.link = slot.link
  }

  override isInputSlot(): boolean {
    return true
  }

  override isConnected(): boolean {
    return this.link != null
  }

  override isValidTarget(link: ConnectingLink | null): boolean {
    if (!link) return true

    return !!link.output && LiteGraph.isValidConnection(this.type, link.output.type)
  }

  override isMouseOver(node: LGraphNode): boolean {
    const inputId = node.mouseOver?.inputId
    if (!inputId) return false

    return node.inputs?.[inputId]?.name === this.name
  }

  override draw(ctx: CanvasRenderingContext2D, options: Omit<IDrawOptions, "doStroke" | "labelPosition">) {
    const originalTextAlign = ctx.textAlign
    ctx.textAlign = options.horizontal ? "center" : "left"

    super.draw(ctx, {
      ...options,
      labelPosition: LabelPosition.Right,
      doStroke: false,
    })

    ctx.textAlign = originalTextAlign
  }
}

export class NodeOutputSlot extends NodeSlot implements INodeOutputSlot {
  links: LinkId[] | null
  _data?: unknown
  slot_index?: number

  constructor(slot: INodeOutputSlot) {
    super(slot)
    this.links = slot.links
    this._data = slot._data
    this.slot_index = slot.slot_index
  }

  override isInputSlot(): boolean {
    return false
  }

  override isValidTarget(link: ConnectingLink | null): boolean {
    if (!link) return true

    return !!link.input && LiteGraph.isValidConnection(this.type, link.input.type)
  }

  override isMouseOver(node: LGraphNode): boolean {
    const outputId = node.mouseOver?.outputId
    if (!outputId) return false

    return node.outputs?.[outputId]?.name === this.name
  }

  override isConnected(): boolean {
    return this.links != null && this.links.length > 0
  }

  override draw(ctx: CanvasRenderingContext2D, options: Omit<IDrawOptions, "doStroke" | "labelPosition">) {
    const originalTextAlign = ctx.textAlign
    const originalStrokeStyle = ctx.strokeStyle
    ctx.textAlign = options.horizontal ? "center" : "right"
    ctx.strokeStyle = "black"

    super.draw(ctx, {
      ...options,
      labelPosition: LabelPosition.Left,
      doStroke: true,
    })

    ctx.textAlign = originalTextAlign
    ctx.strokeStyle = originalStrokeStyle
  }
}
