export const LED_COLOR = {
  OFF: "OFF",
  RED: "RED",
  GREEN: "GREEN",
  BLUE: "BLUE",
  YELLOW: "YELLOW",
  ORANGE: "ORANGE",
  PURPLE: "PURPLE",
  PINK: "PINK",
  CYAN: "CYAN",
  GRAY: "GRAY",
} as const;

export type LedColorType = (typeof LED_COLOR)[keyof typeof LED_COLOR];
