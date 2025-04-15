export enum BadgePosition {
  TopLeft = "top-left",
  TopRight = "top-right",
}

export interface LGraphBadgeOptions {
  text: string
  fgColor?: string
  bgColor?: string
  fontSize?: number
  padding?: number
  height?: number
  cornerRadius?: number
  iconUnicode?: string
  iconFontFamily?: string
  iconColor?: string
  iconBgColor?: string
  iconFontSize?: number
  verticalOffset?: number
}

export class LGraphBadge {
  text: string
  fgColor: string
  bgColor: string
  fontSize: number
  padding: number
  height: number
  cornerRadius: number
  iconUnicode?: string
  iconFontFamily: string
  iconColor?: string
  iconBgColor?: string
  iconFontSize?: number
  verticalOffset?: number

  constructor({
    text,
    fgColor = "white",
    bgColor = "#0F1F0F",
    fontSize = 12,
    padding = 6,
    height = 20,
    cornerRadius = 5,
    iconUnicode,
    iconFontFamily = "PrimeIcons",
    iconColor,
    iconBgColor,
    iconFontSize,
    verticalOffset = 0,
  }: LGraphBadgeOptions) {
    this.text = text
    this.fgColor = fgColor
    this.bgColor = bgColor
    this.fontSize = fontSize
    this.padding = padding
    this.height = height
    this.cornerRadius = cornerRadius
    this.iconUnicode = iconUnicode
    this.iconFontFamily = iconFontFamily
    this.iconColor = iconColor
    this.iconBgColor = iconBgColor
    this.iconFontSize = iconFontSize ?? fontSize
    this.verticalOffset = verticalOffset
  }

  get visible() {
    return this.text.length > 0 || !!this.iconUnicode
  }

  getWidth(ctx: CanvasRenderingContext2D) {
    if (!this.visible) return 0
    const { font } = ctx
    let iconWidth = 0
    if (this.iconUnicode) {
      ctx.font = `${this.iconFontSize}px '${this.iconFontFamily}'`
      iconWidth = ctx.measureText(this.iconUnicode).width + this.padding
    }
    ctx.font = `${this.fontSize}px sans-serif`
    const textWidth = ctx.measureText(this.text).width
    ctx.font = font
    return iconWidth + textWidth + this.padding * 2
  }

  draw(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
  ): void {
    if (!this.visible) return

    const { fillStyle } = ctx
    ctx.font = `${this.fontSize}px sans-serif`
    const badgeWidth = this.getWidth(ctx)
    const badgeX = 0

    // Draw badge background
    ctx.fillStyle = this.bgColor
    ctx.beginPath()
    if (ctx.roundRect) {
      ctx.roundRect(x + badgeX, y, badgeWidth, this.height, this.cornerRadius)
    } else {
      // Fallback for browsers that don't support roundRect
      ctx.rect(x + badgeX, y, badgeWidth, this.height)
    }
    ctx.fill()

    let drawX = x + badgeX + this.padding
    const centerY = y + this.height / 2 + (this.verticalOffset ?? 0)

    // Draw icon if present
    if (this.iconUnicode) {
      ctx.save()
      ctx.font = `${this.iconFontSize}px '${this.iconFontFamily}'`
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'center'
      const iconRadius = (this.iconFontSize ?? 0) / 2 + 2
      // Draw icon background circle if iconBgColor is set
      if (this.iconBgColor) {
        ctx.beginPath()
        ctx.arc(drawX + iconRadius, centerY, iconRadius, 0, 2 * Math.PI)
        ctx.fillStyle = this.iconBgColor
        ctx.fill()
      }
      // Draw icon
      if (this.iconColor) ctx.fillStyle = this.iconColor
      ctx.fillText(this.iconUnicode, drawX + iconRadius, centerY)
      ctx.restore()
      drawX += iconRadius * 2 + this.padding / 2
    }

    // Draw badge text
    if (this.text) {
      ctx.save()
      ctx.font = `${this.fontSize}px sans-serif`
      ctx.fillStyle = this.fgColor
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'left'
      ctx.fillText(this.text, drawX, centerY + 1)
      ctx.restore()
    }

    ctx.fillStyle = fillStyle
  }
}
