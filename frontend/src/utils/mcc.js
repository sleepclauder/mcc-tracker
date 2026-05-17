export const MCC_LABELS = {
  '5411': 'Продукты',
  '5912': 'Аптека',
  '5812': 'Ресторан',
  '5541': 'АЗС',
  '5311': 'Универмаг',
  '5999': 'Прочее',
};

export const MCC_ICONS = {
  '5411': '🛒',
  '5912': '💊',
  '5812': '🍽',
  '5541': '⛽',
  '5311': '🏬',
  '5999': '🏷',
};

export function mccLabel(code) {
  if (!code) return '—';
  return MCC_LABELS[code] ? `${MCC_LABELS[code]} (${code})` : code;
}
