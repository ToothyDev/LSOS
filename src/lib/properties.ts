// Which properties the user owns and which upgrades they bought (decision 011).
import type { Property, Upgrade } from '../data/properties'

/**
 * A toggle upgrade is saved as true/false, a choice upgrade as the chosen option's id, a count
 * as a whole number.
 */
export type UpgradeValue = boolean | string | number

export interface PropertySettings {
  owned: boolean
  upgrades: Record<string, UpgradeValue>
}

/** Settings by property id. A property without an entry is not owned and has no upgrades. */
export type OwnedProperties = Record<string, PropertySettings>

export function isOwned(owned: OwnedProperties, propertyId: string): boolean {
  return owned[propertyId]?.owned ?? false
}

/** The properties of `catalog` the user owns, in catalog order. */
export function ownedProperties(
  catalog: readonly Property[],
  owned: OwnedProperties,
): readonly Property[] {
  return catalog.filter((property) => isOwned(owned, property.id))
}

/**
 * The saved value of an upgrade, or its default: not bought, or the first option. A saved value
 * that does not fit the upgrade (an option that no longer exists) also reads as the default.
 */
export function upgradeValue(
  owned: OwnedProperties,
  propertyId: string,
  upgrade: Upgrade,
): UpgradeValue {
  const saved = owned[propertyId]?.upgrades[upgrade.id]
  if (upgrade.kind === 'toggle') return saved === true
  if (upgrade.kind === 'count') {
    const fits =
      typeof saved === 'number' &&
      Number.isInteger(saved) &&
      saved >= 0 &&
      (upgrade.max === undefined || saved <= upgrade.max)
    return fits ? saved : upgrade.default
  }
  return upgrade.options.some((option) => option.id === saved)
    ? (saved as string)
    : (upgrade.options[0]?.id ?? '')
}

/** Marks a property owned or not. Upgrades are kept, so owning it again restores them. */
export function setOwned(
  owned: OwnedProperties,
  propertyId: string,
  value: boolean,
): OwnedProperties {
  return { ...owned, [propertyId]: { upgrades: {}, ...owned[propertyId], owned: value } }
}

export function setUpgrade(
  owned: OwnedProperties,
  propertyId: string,
  upgradeId: string,
  value: UpgradeValue,
): OwnedProperties {
  const current = owned[propertyId] ?? { owned: false, upgrades: {} }
  return {
    ...owned,
    [propertyId]: { ...current, upgrades: { ...current.upgrades, [upgradeId]: value } },
  }
}

/**
 * Checks saved settings. Entries are kept even for properties this LSOS does not list, so an
 * import into an older copy of LSOS loses nothing.
 * Returns an error message if the shape is wrong.
 */
export function parseOwnedProperties(data: unknown): OwnedProperties | string {
  if (!isRecord(data)) return 'The properties section is missing.'
  const result: OwnedProperties = {}
  for (const [id, entry] of Object.entries(data)) {
    if (!isRecord(entry) || typeof entry.owned !== 'boolean' || !isRecord(entry.upgrades)) {
      return `The saved settings for property "${id}" are not readable.`
    }
    const upgrades: Record<string, UpgradeValue> = {}
    for (const [upgradeId, value] of Object.entries(entry.upgrades)) {
      const isNumber = typeof value === 'number' && Number.isFinite(value)
      if (typeof value !== 'boolean' && typeof value !== 'string' && !isNumber) {
        return `The saved upgrade "${upgradeId}" of property "${id}" is not readable.`
      }
      upgrades[upgradeId] = value as UpgradeValue
    }
    result[id] = { owned: entry.owned, upgrades }
  }
  return result
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
