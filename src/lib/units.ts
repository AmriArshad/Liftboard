// The model stores kg and km; these convert for display only.

import type { Unit } from './parse/types'

export const KG_PER_LB = 0.45359237
export const KM_PER_MILE = 1.609344

export function fromKg(kg: number, unit: Unit): number {
  return unit === 'lb' ? kg / KG_PER_LB : kg
}
