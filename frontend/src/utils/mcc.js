export const MCC_LABELS = {
  '5411': 'Продукты',
  '5912': 'Аптека',
  '5812': 'Ресторан',
  '5814': 'Фастфуд',
  '5541': 'АЗС',
  '5311': 'Универмаг',
  '5999': 'Прочее',
};

export const MCC_ICONS = {
  '5411': '🛒',
  '5912': '💊',
  '5812': '🍽',
  '5814': '🍔',
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
  '5814': '#f4511e',
  '5541': '#1e88e5',
  '5311': '#8e24aa',
  '5999': '#607d8b',
};


export function userLocationIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="18" fill="#f9a825" stroke="white" stroke-width="3"/>
    <text x="20" y="27" text-anchor="middle" font-size="20" font-family="Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif">🦆</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

export function markerIcon(mcc) {
  const color = MARKER_COLORS[mcc] || '#455a64';
  const icon = MCC_ICONS[mcc] || '🏷';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
    <circle cx="18" cy="18" r="16" fill="${color}" stroke="white" stroke-width="2.5"/>
    <text x="18" y="24" text-anchor="middle" font-size="16" font-family="Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif">${icon}</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
