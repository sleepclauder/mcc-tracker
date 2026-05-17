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

const MARKER_COLORS = {
  '5411': '#43a047',
  '5912': '#e53935',
  '5812': '#fb8c00',
  '5541': '#1e88e5',
  '5311': '#8e24aa',
  '5999': '#607d8b',
};

const MARKER_LETTERS = {
  '5411': 'П',
  '5912': 'А',
  '5812': 'Р',
  '5541': 'З',
  '5311': 'У',
  '5999': '?',
};

export function markerIcon(mcc) {
  const color = MARKER_COLORS[mcc] || '#455a64';
  const letter = MARKER_LETTERS[mcc] || '•';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="14" fill="${color}" stroke="white" stroke-width="2.5"/>
    <text x="16" y="21" text-anchor="middle" font-size="13" font-weight="700" fill="white" font-family="system-ui,-apple-system,sans-serif">${letter}</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
