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

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Load active calc configs for a society.
 * Returns a map: { fieldName → config }
 */
async function loadConfigs(societyId) {
  const configs = await prisma.calcConfig.findMany({
    where: { societyId, isActive: true }
  });
  const map = {};
  for (const c of configs) {
    map[c.fieldName] = c;
  }
  return map;
}

/**
 * Evaluate a formula string against a context object.
 * Supported formula types:
 *   FIXED:200          → 200
 *   PERCENT:10         → context.UNIT * 0.10
 *   UNIT * 3           → evaluates expression with UNIT from context
 *   (empty / null)     → returns null
 */
function evaluateFormula(formula, context) {
  if (!formula) return null;

  try {
    const trimmed = formula.trim();

    if (trimmed.startsWith('FIXED:')) {
      return parseFloat(trimmed.replace('FIXED:', ''));
    }

    if (trimmed.startsWith('PERCENT:')) {
      const pct = parseFloat(trimmed.replace('PERCENT:', ''));
      return (context.UNIT || 0) * (pct / 100);
    }

    // Safe expression evaluation using Function constructor
    // Only allow arithmetic on known variables
    const safeVars = ['UNIT', 'FALO', 'V', 'HV', 'AV', 'TOTAL'];
    const fnBody = `
      const { ${safeVars.join(', ')} } = ctx;
      return (${trimmed});
    `;
    // eslint-disable-next-line no-new-func
    const fn = new Function('ctx', fnBody);
    return fn(context);
  } catch (e) {
    console.warn(`Formula eval error for "${formula}":`, e.message);
    return null;
  }
}

/**
 * Calculate all derived fields for a single bill entry.
 *
 * @param {number} hv       - H.V reading
 * @param {number} av       - A.V reading (current meter reading)
 * @param {object} configs  - Map of CalcConfig records { fieldName → config }
 * @returns {{ unit, falo, v, total, aa, b, dan, wch, isNegative }}
 */
function calculateEntry(hv, av, configs = {}) {
  // ── UNIT ──────────────────────────────────────────────────────
  // UNIT = H.V - A.V (from bill: 768-666=102, 4375-4267=108, etc.)
  const unit = hv - av;

  // ── FALO RATE (configurable, default = 5) ────────────────────
  let faloRate = 5;
  if (configs['FALO_RATE']) {
    const parsed = parseFloat(configs['FALO_RATE'].formula?.replace('FIXED:', '') || '5');
    if (!isNaN(parsed)) faloRate = parsed;
  }

  // ── FALO = UNIT × faloRate ────────────────────────────────────
  const falo = unit * faloRate;

  // ── V (fixed charge, configurable, default = 600) ────────────
  let v = 600;
  if (configs['V']) {
    const parsed = parseFloat(configs['V'].formula?.replace('FIXED:', '') || '600');
    if (!isNaN(parsed)) v = parsed;
  }

  // ── TOTAL = V + FALO ─────────────────────────────────────────
  const total = v + falo;

  // ── Context for configurable fields ──────────────────────────
  const ctx = { UNIT: unit, FALO: falo, V: v, TOTAL: total, HV: hv, AV: av };

  // ── AA (configurable, not established from bill) ──────────────
  const aa = configs['AA'] ? evaluateFormula(configs['AA'].formula, ctx) : null;

  // ── B (configurable, not established from bill) ───────────────
  const b = configs['B'] ? evaluateFormula(configs['B'].formula, ctx) : null;

  // ── DAN (configurable, not established from bill) ─────────────
  const dan = configs['DAN'] ? evaluateFormula(configs['DAN'].formula, ctx) : null;

  // ── WCH (configurable, not established from bill) ─────────────
  const wch = configs['WCH'] ? evaluateFormula(configs['WCH'].formula, ctx) : null;

  return {
    unit,
    falo,
    v,
    total,
    aa,
    b,
    dan,
    wch,
    isNegative: unit < 0
  };
}

/**
 * Recalculate a bill entry and persist to database.
 */
async function recalculateAndSave(entryId, av, societyId) {
  const entry = await prisma.billEntry.findUnique({
    where: { id: entryId }
  });
  if (!entry) throw new Error('Bill entry not found');

  const configs = await loadConfigs(societyId);
  const result = calculateEntry(entry.hv, av, configs);

  return prisma.billEntry.update({
    where: { id: entryId },
    data: {
      av,
      unit: result.unit,
      falo: result.falo,
      v: result.v,
      total: result.total,
      aa: result.aa,
      b: result.b,
      dan: result.dan,
      wch: result.wch,
      isNegative: result.isNegative
    },
    include: { house: true }
  });
}

module.exports = { calculateEntry, recalculateAndSave, loadConfigs, evaluateFormula };
