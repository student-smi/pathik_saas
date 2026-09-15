import type { CalcConfig } from '@/types'

/**
 * CALCULATION ENGINE
 * ─────────────────────────────────────────────────────────────────────
 * All formulas are sourced directly from the provided bill.
 *
 * CONFIRMED FORMULAS:
 *   UNIT  = H.V - A.V        (can be negative — must NOT be clamped)
 *   FALO  = UNIT × faloRate  (default faloRate = 5)
 *   V     = fixed (default 600, configurable per society)
 *   TOTAL = V + FALO
 *
 * UNCONFIRMED FIELDS (AA, B, DAN, WCH):
 *   Their formulas are NOT established by the source.
 *   They are handled by CalcConfig records and left null until configured.
 * ─────────────────────────────────────────────────────────────────────
 */

export interface FormulaContext {
  UNIT?: number
  FALO?: number
  V?: number
  HV?: number
  AV?: number
  TOTAL?: number
  [key: string]: number | undefined
}

export interface CalcConfigMap {
  [fieldName: string]: Pick<CalcConfig, 'formula'>
}

export interface CalculatedEntry {
  unit: number
  falo: number
  v: number
  total: number
  aa: number | null
  b: number | null
  dan: number | null
  wch: number | null
  isNegative: boolean
}

const SAFE_VARS = ['UNIT', 'FALO', 'V', 'HV', 'AV', 'TOTAL', 'AA', 'B', 'DAN', 'WCH']

/**
 * Evaluate a formula string against a context object.
 * Supported formula types:
 *   FIXED:200          → 200
 *   PERCENT:10         → context.UNIT * 0.10
 *   UNIT * 3           → evaluates expression with UNIT from context
 *   (empty / null)     → returns null
 */
export function evaluateFormula(
  formula: string | null | undefined,
  context: FormulaContext = {}
): number | null {
  if (!formula) return null

  try {
    const trimmed = formula.trim()
    if (trimmed.length === 0) return null

    if (trimmed.startsWith('FIXED:')) {
      const value = parseFloat(trimmed.slice(6))
      if (Number.isNaN(value)) return null
      return value
    }

    if (trimmed.startsWith('PERCENT:')) {
      const pct = parseFloat(trimmed.slice(8))
      if (Number.isNaN(pct)) return null
      const base = context.UNIT ?? 0
      return base * (pct / 100)
    }

    const contextWithDefaults: Record<string, number> = {}
    for (const v of SAFE_VARS) {
      contextWithDefaults[v] = (context[v] ?? 0) as number
    }

    const fnBody = `
      "use strict";
      const { ${SAFE_VARS.join(', ')} } = ctx;
      return Number(${trimmed});
    `
    // eslint-disable-next-line no-new-func
    const fn = new Function('ctx', fnBody) as (ctx: Record<string, number>) => number
    const result = fn(contextWithDefaults)
    if (typeof result !== 'number' || Number.isNaN(result)) return null
    return result
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn(`Formula eval error for "${formula}":`, msg)
    return null
  }
}

/**
 * Calculate all derived fields for a single bill entry.
 *
 * @param hv      - H.V reading (previous / HV)
 * @param av      - A.V reading (current meter reading)
 * @param configs - Map of CalcConfig records { fieldName → { formula } }
 * @returns CalculatedEntry
 */
export function calculateEntry(
  hv: number,
  av: number | null,
  configs: CalcConfigMap = {}
): CalculatedEntry {
  if (av === null || av === undefined || Number.isNaN(av)) {
    return {
      unit: hv - hv,
      falo: 0,
      v: 600,
      total: 600,
      aa: null,
      b: null,
      dan: null,
      wch: null,
      isNegative: false,
    }
  }

  const unit = hv - av

  let faloRate = 5
  const faloCfg = configs['FALO_RATE']
  if (faloCfg) {
    const fixed = faloCfg.formula?.startsWith('FIXED:')
      ? parseFloat(faloCfg.formula.slice(6))
      : NaN
    if (!Number.isNaN(fixed)) faloRate = fixed
  }

  const falo = unit * faloRate

  let v = 600
  const vCfg = configs['V']
  if (vCfg) {
    const fixed = vCfg.formula?.startsWith('FIXED:')
      ? parseFloat(vCfg.formula.slice(6))
      : NaN
    if (!Number.isNaN(fixed)) v = fixed
  }

  const total = v + falo

  const ctx: FormulaContext = { UNIT: unit, FALO: falo, V: v, TOTAL: total, HV: hv, AV: av }

  const aa = configs['AA'] ? evaluateFormula(configs['AA'].formula, ctx) : null
  const b = configs['B'] ? evaluateFormula(configs['B'].formula, ctx) : null
  const dan = configs['DAN'] ? evaluateFormula(configs['DAN'].formula, ctx) : null
  const wch = configs['WCH'] ? evaluateFormula(configs['WCH'].formula, ctx) : null

  return {
    unit,
    falo,
    v,
    total,
    aa,
    b,
    dan,
    wch,
    isNegative: unit < 0,
  }
}

/**
 * Convert a list of CalcConfig records into a lookup map for use with calculateEntry.
 */
export function configsToMap(
  configs: Array<Pick<CalcConfig, 'fieldName' | 'formula'>>
): CalcConfigMap {
  const map: CalcConfigMap = {}
  for (const c of configs) {
    map[c.fieldName] = { formula: c.formula }
  }
  return map
}
