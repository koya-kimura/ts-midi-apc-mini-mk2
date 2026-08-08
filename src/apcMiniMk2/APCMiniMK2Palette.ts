import { LED_COLOR, type LedColorType } from "../core/LedPalette";

export const APC_MINI_MK2_PALETTE: Record<LedColorType, number> = {
  [LED_COLOR.OFF]: 0,
  [LED_COLOR.RED]: 5,
  [LED_COLOR.GREEN]: 21,
  [LED_COLOR.BLUE]: 37,
  [LED_COLOR.YELLOW]: 13,
  [LED_COLOR.ORANGE]: 60,
  [LED_COLOR.PURPLE]: 53,
  [LED_COLOR.PINK]: 56,
  [LED_COLOR.CYAN]: 32,
  [LED_COLOR.GRAY]: 71,
};

export type APCMiniLedColorKey = keyof typeof APC_MINI_MK2_PALETTE;
