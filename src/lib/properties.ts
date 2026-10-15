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
  /** Shut down from its laptop: owned, but it makes nothing (issue #38). Absent means running. */
  shutDown?: boolean
}

/** Settings by property id. A property without an entry is not owned and has no upgrades. */
export type OwnedProperties = Record<string, PropertySettings>

export function isOwned(owned: OwnedProperties, propertyId: string): boolean {
  return owned[propertyId]?.owned ?? false
}

/** Whether the property is marked shut down. Only a property that can be shut down is marked. */
export function isShutDown(owned: OwnedProperties, propertyId: string): boolean {
  return owned[propertyId]?.shutDown ?? false
}

/** Owned and not shut down: what makes a business produce and count for others (issue #38). */
export function isRunning(owned: OwnedProperties, propertyId: string): boolean {
  return isOwned(owned, propertyId) && !isShutDown(owned, propertyId)
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

/** Short summary of the bought upgrades, e.g. "Equipment, Technician: Cash". */
export function upgradeSummary(owned: OwnedProperties, property: Property): string {
  const parts = property.upgrades.flatMap((upgrade) => {
    const value = upgradeValue(owned, property.id, upgrade)
    if (upgrade.kind === 'toggle') return value === true ? [upgrade.label] : []
    if (upgrade.kind === 'count') return [`${upgrade.label}: ${value}`]
    if (upgrade.summary === false || value === upgrade.options[0]?.id) return []
    const option = upgrade.options.find((o) => o.id === value)
    return option ? [`${upgrade.label}: ${option.label}`] : []
  })
  return parts.length > 0 ? parts.join(', ') : 'No upgrades'
}

/** Marks a property owned or not. Upgrades are kept, so owning it again restores them. */
export function setOwned(
  owned: OwnedProperties,
  propertyId: string,
  value: boolean,
): OwnedProperties {
  return { ...owned, [propertyId]: { upgrades: {}, ...owned[propertyId], owned: value } }
}

/** Marks a business shut down or running. Kept apart from owned, like the upgrades. */
export function setShutDown(
  owned: OwnedProperties,
  propertyId: string,
  value: boolean,
): OwnedProperties {
  const current = owned[propertyId] ?? { owned: false, upgrades: {} }
  return { ...owned, [propertyId]: { ...current, shutDown: value } }
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
    if (entry.shutDown !== undefined && typeof entry.shutDown !== 'boolean') {
      return `The saved shut-down setting of property "${id}" is not true or false.`
    }
    result[id] = { owned: entry.owned, upgrades }
    if (entry.shutDown !== undefined) result[id].shutDown = entry.shutDown
  }
  return result
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
