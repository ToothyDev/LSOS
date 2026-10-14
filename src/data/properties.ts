// Properties LSOS supports and the upgrades that change their trackers (decision 004, 011).
// Each tracker issue adds its property here, with a source for every upgrade it lists.

/** One option of a choice upgrade, e.g. what a nightclub technician is assigned to. */
export interface UpgradeOption {
  id: string
  label: string
}

export type Upgrade =
  /** Bought or not, e.g. an equipment upgrade. */
  | { kind: 'toggle'; id: string; label: string }
  /** One of several options; the first one is the default, e.g. "Not hired". */
  | { kind: 'choice'; id: string; label: string; options: readonly UpgradeOption[] }

export interface Property {
  /** Stable id, saved in user data: never change or reuse it. */
  id: string
  label: string
  upgrades: readonly Upgrade[]
  source: string
  checked: string
}

export const PROPERTIES: readonly Property[] = []
