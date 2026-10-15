// Accessibility settings (issue #55, decision 030): motion and the scan-line overlay.

/** `system` follows the device's reduced-motion setting; `reduce` and `full` override it. */
export type MotionSetting = 'system' | 'reduce' | 'full'

export interface AccessibilitySettings {
  motion: MotionSetting
  /** The full-screen scan-line overlay of the theme. */
  scanlines: boolean
}

export const MOTION_SETTINGS: readonly MotionSetting[] = ['system', 'reduce', 'full']

export function defaultAccessibility(): AccessibilitySettings {
  return { motion: 'system', scanlines: true }
}

/** Whether to leave out animations, given the setting and the device's `prefers-reduced-motion`. */
export function reducesMotion(motion: MotionSetting, systemReduces: boolean): boolean {
  return motion === 'system' ? systemReduces : motion === 'reduce'
}

export function parseAccessibility(data: unknown): AccessibilitySettings | string {
  if (typeof data !== 'object' || data === null || Array.isArray(data))
    return 'The accessibility section is missing.'
  const { motion, scanlines } = data as Record<string, unknown>
  if (!MOTION_SETTINGS.includes(motion as MotionSetting) || typeof scanlines !== 'boolean')
    return 'The saved accessibility settings are not readable.'
  return { motion: motion as MotionSetting, scanlines }
}
