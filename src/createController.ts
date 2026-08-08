import { APCMiniMK2Manager } from "./apcMiniMk2/APCMiniMK2Manager";
import type { APCMiniMK2Controller, APCMiniMK2Options } from "./types";

/**
 * Create an APC mini mk2 controller instance.
 *
 * @example
 * ```typescript
 * const controller = createController({
 *   mapping: [
 *     { key: "kick", type: "toggle", targets: [{ row: 0, col: 0 }], defaultValue: false },
 *   ],
 * });
 * await controller.init();
 *
 * // In your render loop:
 * controller.update(currentBeat);
 * const isKickOn = controller.booleanValue("kick");
 * ```
 */
export function createController<TKey extends string = string>(options: APCMiniMK2Options<TKey>): APCMiniMK2Controller<TKey> {
  return new APCMiniMK2Manager<TKey>(options);
}
