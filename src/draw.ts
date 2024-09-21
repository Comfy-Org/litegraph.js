import type { Vector2, INodeSlot } from "../public/litegraph";

export enum SlotType {
  Array = "array",
  Event = -1,
}

export enum SlotShape {
  Box = 1,
  Arrow = 5,
  Grid = 6,
  Circle = 3,
  HollowCircle = 7,
}

export enum SlotDirection {
  Up = 1,
  Right = 2,
  Down = 3,
  Left = 4,
}

export enum LabelPosition {
  Left = "left",
  Right = "right",
}

export function drawSlot(
  ctx: CanvasRenderingContext2D,
  slot: INodeSlot,
  pos: Vector2,
  {
    label_color = "#AAA",
    label_position = LabelPosition.Right,
    horizontal = false,
    low_quality = false,
    render_text = true,
  }: {
    label_color?: string;
    label_position?: LabelPosition;
    horizontal?: boolean;
    low_quality?: boolean;
    render_text?: boolean;
  } = {}
) {
  const slot_type = slot.type as SlotType;
  const slot_shape = (
    slot_type === SlotType.Array ? SlotShape.Grid : slot.shape
  ) as SlotShape;

  ctx.beginPath();
  let doStroke = true;
  let doFill = true;

  if (slot_type === SlotType.Event || slot_shape === SlotShape.Box) {
    if (horizontal) {
      ctx.rect(pos[0] - 5 + 0.5, pos[1] - 8 + 0.5, 10, 14);
    } else {
      ctx.rect(pos[0] - 6 + 0.5, pos[1] - 5 + 0.5, 14, 10);
    }
  } else if (slot_shape === SlotShape.Arrow) {
    ctx.moveTo(pos[0] + 8, pos[1] + 0.5);
    ctx.lineTo(pos[0] - 4, pos[1] + 6 + 0.5);
    ctx.lineTo(pos[0] - 4, pos[1] - 6 + 0.5);
    ctx.closePath();
  } else if (slot_shape === SlotShape.Grid) {
    const gridSize = 3;
    const cellSize = 2;
    const spacing = 3;

    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        ctx.rect(
          pos[0] - 4 + x * spacing,
          pos[1] - 4 + y * spacing,
          cellSize,
          cellSize
        );
      }
    }
    doStroke = false;
  } else {
    // Default rendering for circle, hollow circle.
    if (low_quality) {
      ctx.rect(pos[0] - 4, pos[1] - 4, 8, 8);
    } else {
      ctx.arc(pos[0], pos[1], 4, 0, Math.PI * 2);
      if (slot_shape === SlotShape.HollowCircle) {
        doFill = false;
        ctx.strokeStyle = ctx.fillStyle;
      }
    }
  }

  if (doFill) ctx.fill();
  if (!low_quality && doStroke) ctx.stroke();

  // render slot label
  if (render_text) {
    const text = slot.label != null ? slot.label : slot.name;
    if (text) {
      ctx.fillStyle = label_color;

      if (label_position === LabelPosition.Right) {
        if (horizontal || slot.dir == SlotDirection.Up) {
          ctx.fillText(text, pos[0], pos[1] - 10);
        } else {
          ctx.fillText(text, pos[0] + 10, pos[1] + 5);
        }
      } else {
        if (horizontal || slot.dir == SlotDirection.Down) {
          ctx.fillText(text, pos[0], pos[1] - 8);
        } else {
          ctx.fillText(text, pos[0] - 10, pos[1] + 5);
        }
      }
    }
  }
}
