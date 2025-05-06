import type { LGraphNode } from "@/LGraphNode"
import type {
  IBaseWidget,
  IBooleanWidget,
  IButtonWidget,
  IComboWidget,
  IKnobWidget,
  INumericWidget,
  ISliderWidget,
  IStringWidget,
  IWidget,
} from "@/types/widgets"

import { BaseWidget } from "./BaseWidget"
import { BooleanWidget } from "./BooleanWidget"
import { ButtonWidget } from "./ButtonWidget"
import { ComboWidget } from "./ComboWidget"
import { KnobWidget } from "./KnobWidget"
import { LegacyWidget } from "./LegacyWidget"
import { NumberWidget } from "./NumberWidget"
import { SliderWidget } from "./SliderWidget"
import { TextWidget } from "./TextWidget"

/**
 * Convert a widget POJO to a proper widget instance.
 * @param widget The POJO to convert.
 * @param node The node the widget belongs to.
 * @param wrapLegacyWidgets Whether to wrap legacy widgets in a `LegacyWidget` instance.
 * @returns A concrete widget instance.
 * @remarks This function uses type assertions based on discriminated union of {@link IBaseWidget.type}.
 * This is not a type-safe operation, and care should be taken when refactoring.
 */
export function toConcreteWidget(widget: IWidget | IBaseWidget, node: LGraphNode, wrapLegacyWidgets?: true): BaseWidget
export function toConcreteWidget(widget: IWidget | IBaseWidget, node: LGraphNode, wrapLegacyWidgets: false): BaseWidget | undefined
export function toConcreteWidget(widget: IWidget | IBaseWidget, node: LGraphNode, wrapLegacyWidgets = true): BaseWidget | undefined {
  if (widget instanceof BaseWidget) return widget

  // Assertions: TypeScript has no concept of "all strings except X"
  switch (widget.type) {
  case "button": return new ButtonWidget(widget as IButtonWidget, node)
  case "toggle": return new BooleanWidget(widget as IBooleanWidget, node)
  case "slider": return new SliderWidget(widget as ISliderWidget, node)
  case "knob": return new KnobWidget(widget as IKnobWidget, node)
  case "combo": return new ComboWidget(widget as IComboWidget, node)
  case "number": return new NumberWidget(widget as INumericWidget, node)
  case "string": return new TextWidget(widget as IStringWidget, node)
  case "text": return new TextWidget(widget as IStringWidget, node)
  default: {
    if (wrapLegacyWidgets) return new LegacyWidget(widget, node)
  }
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
