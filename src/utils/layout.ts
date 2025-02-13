import { Point, ReadOnlyRect } from "@/interfaces"

export class LayoutElement<T> {
  public readonly value: T
  public readonly boundingRect: ReadOnlyRect
  public readonly highlight?: boolean
  public readonly invalid?: boolean

  constructor(o: {
    value: T
    boundingRect: ReadOnlyRect
    highlight?: boolean
    invalid?: boolean
  }) {
    Object.assign(this, o)
    this.value = o.value
    this.boundingRect = o.boundingRect
  }

  get center(): Point {
    return [
      this.boundingRect[0] + this.boundingRect[2] / 2,
      this.boundingRect[1] + this.boundingRect[3] / 2,
    ]
  }
}
