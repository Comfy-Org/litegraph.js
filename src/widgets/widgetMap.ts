import type { LGraphNode } from "@/LGraphNode"
import type { IBaseWidget, IWidget } from "@/types/widgets"

import { BaseWidget } from "./BaseWidget"
import { BooleanWidget } from "./BooleanWidget"
import { ButtonWidget } from "./ButtonWidget"
import { ComboWidget } from "./ComboWidget"
import { KnobWidget } from "./KnobWidget"
import { NumberWidget } from "./NumberWidget"
import { SliderWidget } from "./SliderWidget"
import { TextWidget } from "./TextWidget"

export function toConcreteWidget(widget: IWidget, node: LGraphNode): BaseWidget | undefined {
  if (widget instanceof BaseWidget) return widget

  switch (widget.type) {
  case "button": return new ButtonWidget(widget, node)
  case "toggle": return new BooleanWidget(widget, node)
  case "slider": return new SliderWidget(widget, node)
  case "knob": return new KnobWidget(widget, node)
  case "combo": return new ComboWidget(widget, node)
  case "number": return new NumberWidget(widget, node)
  case "string": return new TextWidget(widget, node)
  case "text": return new TextWidget(widget, node)
  }
}

type WidgetConstructor = {
  new (plain: IBaseWidget, node: LGraphNode): BaseWidget
}

export const WIDGET_TYPE_MAP: Record<string, WidgetConstructor> = {
  // @ts-expect-error https://github.com/Comfy-Org/litegraph.js/issues/616
  button: ButtonWidget,
  // @ts-expect-error #616
  toggle: BooleanWidget,
  // @ts-expect-error #616
  slider: SliderWidget,
  // @ts-expect-error #616
  knob: KnobWidget,
  // @ts-expect-error #616
  combo: ComboWidget,
  // @ts-expect-error #616
  number: NumberWidget,
  // @ts-expect-error #616
  string: TextWidget,
  // @ts-expect-error #616
  text: TextWidget,
}
