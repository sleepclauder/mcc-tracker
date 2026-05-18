// Bank cashback MCC mappings — sourced from mcc-codes.ru + official bank PDFs (May 2026).
// Banks update MCC lists periodically; core categories are stable, verify edge cases in bank app.

export const BANK_CATEGORIES = {
  'Т-Банк': [
    { name: 'Рестораны',    mccs: ['5811','5812','5813'] },
    { name: 'Фастфуд',      mccs: ['5814'] },
    { name: 'Супермаркеты', mccs: ['5297','5298','5411','5412','5422','5441','5451','5462','5499','5715','5921'] },
    { name: 'Аптеки',       mccs: ['5122','5292','5295','5912'] },
    { name: 'АЗС',          mccs: ['5172','5541','5542','5552','5983'] },
  ],
  'Сбер': [
    { name: 'Кафе и рестораны', mccs: ['5462','5811','5812','5813','5814'] },
    { name: 'Супермаркеты',     mccs: ['5309','5311','5331','5411','5412','5422','5441','5451','5499','5921','9751'] },
    { name: 'Аптеки',           mccs: ['5122','5912'] },
    { name: 'АЗС',              mccs: ['5172','5541','5542','5552','5983','9752'] },
  ],
  'Альфа-Банк': [
    { name: 'Рестораны и кафе', mccs: ['5811','5812','5813'] },
    { name: 'Фастфуд',          mccs: ['5814'] },
    { name: 'Супермаркеты',     mccs: ['5310','5311','5331','5411','5422','5441','5451','5462','5499','9751'] },
    { name: 'Аптеки',           mccs: ['5122','5912'] },
    { name: 'АЗС',              mccs: ['5172','5541','5542','5552','5983','9752'] },
  ],
  'ВТБ': [
    { name: 'Рестораны и кафе', mccs: ['5811','5812','5813','5814'] },
    { name: 'Супермаркеты',     mccs: ['5411','5412','5422','5441','5451','5462','5499','9751'] },
    { name: 'Аптеки',           mccs: ['5122','5912'] },
    { name: 'АЗС',              mccs: ['5172','5541','5542','5552','5983','9752'] },
  ],
};

// Default preset rules per bank — suggested categories with 5% as a starting point.
// User adjusts % to match their actual card terms.
export const BANK_PRESETS = {
  'Т-Банк': [
    { mcc_code: '5812', cashback_pct: 5 },
    { mcc_code: '5814', cashback_pct: 5 },
    { mcc_code: '5411', cashback_pct: 5 },
    { mcc_code: '5912', cashback_pct: 5 },
    { mcc_code: '5541', cashback_pct: 5 },
  ],
  'Сбер': [
    { mcc_code: '5812', cashback_pct: 5 },
    { mcc_code: '5814', cashback_pct: 5 },
    { mcc_code: '5411', cashback_pct: 5 },
    { mcc_code: '5912', cashback_pct: 5 },
    { mcc_code: '5541', cashback_pct: 5 },
  ],
  'Альфа-Банк': [
    { mcc_code: '5812', cashback_pct: 5 },
    { mcc_code: '5814', cashback_pct: 5 },
    { mcc_code: '5411', cashback_pct: 5 },
    { mcc_code: '5912', cashback_pct: 5 },
    { mcc_code: '5541', cashback_pct: 5 },
  ],
  'ВТБ': [
    { mcc_code: '5812', cashback_pct: 5 },
    { mcc_code: '5814', cashback_pct: 5 },
    { mcc_code: '5411', cashback_pct: 5 },
    { mcc_code: '5912', cashback_pct: 5 },
    { mcc_code: '5541', cashback_pct: 5 },
  ],
};

// Returns [{bank, category}] for every bank that includes mccCode in an elevated cashback category.
export function getMccBankCoverage(mccCode) {
  const result = [];
  for (const [bank, cats] of Object.entries(BANK_CATEGORIES)) {
    for (const cat of cats) {
      if (cat.mccs.includes(mccCode)) {
        result.push({ bank, category: cat.name });
        break;
      }
    }
  }
  return result;
}

// Returns the category object ({name, mccs}) that a specific bank uses for mccCode, or null.
export function getBankCategoryForMcc(bankName, mccCode) {
  const cats = BANK_CATEGORIES[bankName];
  if (!cats) return null;
  return cats.find(c => c.mccs.includes(mccCode)) ?? null;
}
