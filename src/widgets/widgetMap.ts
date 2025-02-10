// @ts-strict-ignore
import type { IBaseWidget, ICustomWidget, IWidget } from "@/types/widgets"
import { BooleanWidget } from "./BooleanWidget"
import { ButtonWidget } from "./ButtonWidget"
import { ComboWidget } from "./ComboWidget"
import { NumberWidget } from "./NumberWidget"
import { SliderWidget } from "./SliderWidget"
import { TextWidget } from "./TextWidget"
import { BaseWidget } from "./BaseWidget"
import { toClass } from "@/utils/type"
import { CustomWidget } from "./CustomWidget"

type WidgetConstructor = {
  new (plain: IBaseWidget): BaseWidget
}

export const WIDGET_TYPE_MAP: Record<string, WidgetConstructor> = {
  button: ButtonWidget,
  toggle: BooleanWidget,
  slider: SliderWidget,
  combo: ComboWidget,
  number: NumberWidget,
  string: TextWidget,
  text: TextWidget,
}

export function toWidgetClass<T extends IWidget>(plain: T): BaseWidget & T {
  const WidgetClass = WIDGET_TYPE_MAP[plain.type ?? ""]
  if (WidgetClass) {
    return toClass(WidgetClass, plain) as BaseWidget & T
  }
  return new CustomWidget(plain as ICustomWidget) as BaseWidget & T
}
