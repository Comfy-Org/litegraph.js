/** Node slot type - input or output */
export enum NodeSlotType {
  INPUT = 1,
  OUTPUT = 2,
}

/** Shape that an object will render as - used by nodes and slots */
export enum RenderShape {
  /** Rectangle with square corners */
  BOX = 1,
  /** Rounded rectangle */
  ROUND = 2,
  /** Circle is circle */
  CIRCLE = 3,
  /** Two rounded corners: top left & bottom right */
  CARD = 4,
  /** Slot shape: Arrow */
  ARROW = 5,
  /** Slot shape: Grid */
  GRID = 6,
  /** Slot shape: Hollow circle  */
  HollowCircle = 7,
}

/** Bit flags used to indicate what the pointer is currently hovering over. */
export enum CanvasItem {
  /** No items / none */
  Nothing = 0,
  /** At least one node */
  Node = 1,
  /** At least one group */
  Group = 1 << 1,
  /** A reroute (not its path) */
  Reroute = 1 << 2,
  /** The path of a link */
  Link = 1 << 3,
  /** A resize in the bottom-right corner */
  ResizeSe = 1 << 4,
}

/** The direction that a link point will flow towards - e.g. horizontal outputs are right by default */
export enum LinkDirection {
  NONE = 0,
  UP = 1,
  DOWN = 2,
  LEFT = 3,
  RIGHT = 4,
  CENTER = 5,
}

/** The path calculation that links follow */
export enum LinkRenderType {
  HIDDEN_LINK = -1,
  /** Juts out from the input & output a little @see LinkDirection, then a straight line between them */
  STRAIGHT_LINK = 0,
  /** 90° angles, clean and box-like */
  LINEAR_LINK = 1,
  /** Smooth curved links - default */
  SPLINE_LINK = 2,
}

/** The marker in the middle of a link */
export enum LinkMarkerShape {
  /** Do not display markers */
  None = 0,
  /** Circles (default) */
  Circle = 1,
  /** Directional arrows */
  Arrow = 2,
}

export enum TitleMode {
  NORMAL_TITLE = 0,
  NO_TITLE = 1,
  TRANSPARENT_TITLE = 2,
  AUTOHIDE_TITLE = 3,
}

export enum LGraphEventMode {
  ALWAYS = 0,
  ON_EVENT = 1,
  NEVER = 2,
  ON_TRIGGER = 3,
  BYPASS = 4,
}

export enum EaseFunction {
  LINEAR = "linear",
  EASE_IN_QUAD = "easeInQuad",
  EASE_OUT_QUAD = "easeOutQuad",
  EASE_IN_OUT_QUAD = "easeInOutQuad",
}
