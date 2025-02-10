import type { LayoutRect } from "../types/layout"

export function computeBounds(elements: LayoutRect[]): LayoutRect {
  if (elements.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }

  const minX = Math.min(...elements.map(e => e.x))
  const minY = Math.min(...elements.map(e => e.y))
  const maxX = Math.max(...elements.map(e => e.x + e.width))
  const maxY = Math.max(...elements.map(e => e.y + e.height))

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}
