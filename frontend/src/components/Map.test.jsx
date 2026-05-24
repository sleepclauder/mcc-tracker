import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Map, { createMerchantMarkerEl } from './Map';

const { mockMap, MockMarker, mockNavigate } = vi.hoisted(() => {
  const mockMap = {
    on: vi.fn(),
    getCenter: vi.fn(() => ({ lng: 30.36, lat: 59.93 })),
    getZoom: vi.fn(() => 18),
    easeTo: vi.fn(),
    remove: vi.fn(),
    getStyle: vi.fn(() => ({ layers: [] })),
    setLayoutProperty: vi.fn(),
    setLayerZoomRange: vi.fn(),
  };
  const MockMarker = vi.fn(() => ({
    setLngLat: vi.fn().mockReturnThis(),
    addTo: vi.fn().mockReturnThis(),
    remove: vi.fn(),
  }));
  const mockNavigate = vi.fn();
  return { mockMap, MockMarker, mockNavigate };
});

vi.mock('maplibre-gl', () => ({
  default: {
    Map: vi.fn(() => mockMap),
    Marker: MockMarker,
  },
}));

vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}));

vi.mock('react-router-dom', async (orig) => ({
  ...(await orig()),
  useNavigate: () => mockNavigate,
}));

import maplibregl from 'maplibre-gl';

const merchants = [
  { YANDEX_FIRM_ID: 'spb_001', NAME: 'Пятёрочка', ADDRESS: 'Невский пр., 88', LAT: 59.93, LON: 30.36, LAST_MCC: null, VOTES_TOTAL: 0 },
  { YANDEX_FIRM_ID: 'spb_002', NAME: 'Магнит', ADDRESS: 'ул. Рубинштейна, 15', LAT: 59.92, LON: 30.34, LAST_MCC: '5411', VOTES_TOTAL: 3 },
];

function renderMap(props = {}) {
  return render(
    <MemoryRouter>
      <Map {...props} />
    </MemoryRouter>
  );
}

// Trigger the map 'load' event so renderClusters fires via that path too
function fireMapLoad() {
  const loadCall = mockMap.on.mock.calls.find(([e]) => e === 'load');
  loadCall?.[1]();
}

describe('Map — базовое поведение', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockMarker.mockImplementation(() => ({
      setLngLat: vi.fn().mockReturnThis(),
      addTo: vi.fn().mockReturnThis(),
      remove: vi.fn(),
    }));
    mockMap.getCenter.mockReturnValue({ lng: 30.36, lat: 59.93 });
    mockMap.getZoom.mockReturnValue(18);
    mockMap.getStyle.mockReturnValue({ layers: [] });
    maplibregl.Map.mockReturnValue(mockMap);
  });

  it('renders container div', () => {
    const { container } = renderMap();
    expect(container.querySelector('div')).toBeTruthy();
  });

  it('creates maplibregl.Map on mount', async () => {
    renderMap();
    await vi.waitFor(() => expect(maplibregl.Map).toHaveBeenCalled());
  });

  it('registers moveend listener', async () => {
    renderMap();
    await vi.waitFor(() => expect(mockMap.on).toHaveBeenCalledWith('moveend', expect.any(Function)));
  });

  it('calls onCenterChange with lat/lon on moveend', async () => {
    const onCenterChange = vi.fn();
    mockMap.getCenter.mockReturnValue({ lng: 30.36, lat: 59.93 });
    renderMap({ onCenterChange });
    await vi.waitFor(() => expect(mockMap.on).toHaveBeenCalled());
    const handler = mockMap.on.mock.calls.find(([e]) => e === 'moveend')[1];
    handler();
    expect(onCenterChange).toHaveBeenCalledWith(59.93, 30.36);
  });

  it('creates markers for merchants at high zoom', async () => {
    mockMap.getZoom.mockReturnValue(18);
    renderMap({ merchants });
    await vi.waitFor(() => expect(MockMarker).toHaveBeenCalledTimes(2));
  });

  it('calls easeTo when flyTo prop changes', async () => {
    const { rerender } = renderMap();
    await vi.waitFor(() => expect(mockMap.on).toHaveBeenCalled());
    rerender(
      <MemoryRouter>
        <Map flyTo={{ lat: 59.93, lon: 30.32 }} />
      </MemoryRouter>
    );
    expect(mockMap.easeTo).toHaveBeenCalledWith({ center: [30.32, 59.93] });
  });

  it('removes map on unmount', async () => {
    const { unmount } = renderMap();
    await vi.waitFor(() => expect(mockMap.on).toHaveBeenCalled());
    unmount();
    expect(mockMap.remove).toHaveBeenCalled();
  });
});

// ─── createMerchantMarkerEl — юнит-тесты ─────────────────────────────────────

describe('createMerchantMarkerEl', () => {
  it('contains icon div as first child', () => {
    const el = createMerchantMarkerEl('data:img/svg', 'Shop', null);
    expect(el.children[0]).toBeTruthy();
    // children[0] is iconWrapper; icon is its first child
    expect(el.children[0].children[0].style.backgroundImage).toContain('data:img/svg');
  });

  it('shows name label when name is provided', () => {
    const el = createMerchantMarkerEl('data:img/svg', 'Магнит', null);
    expect(el.textContent).toContain('Магнит');
    expect(el.children.length).toBe(2); // icon + label
  });

  it('truncates names longer than 14 chars to 13 + ellipsis', () => {
    const el = createMerchantMarkerEl('data:img/svg', 'Очень длинное название', null);
    expect(el.textContent).toContain('Очень длинное…');
    expect(el.textContent).not.toContain('Очень длинное название');
  });

  it('does not truncate names of exactly 14 chars', () => {
    const name = 'Ровно14символов'; // exactly 15 chars — should truncate
    const name14 = 'Ровно14символ'; // 13 chars — should not truncate
    const el = createMerchantMarkerEl('data:img/svg', name14, null);
    expect(el.textContent).toContain(name14);
    expect(el.textContent).not.toContain('…');
  });

  it('shows cashback badge with percent and bank when cashback provided', () => {
    const el = createMerchantMarkerEl('data:img/svg', 'Магнит', { pct: 5, bank: 'Т-Банк' });
    expect(el.textContent).toContain('5%');
    expect(el.textContent).toContain('Т-Банк');
    expect(el.textContent).toContain('Магнит');
  });

  it('no cashback badge when cashback is null', () => {
    const el = createMerchantMarkerEl('data:img/svg', 'Магнит', null);
    expect(el.textContent).not.toContain('%');
  });

  it('no label rendered when name is empty string', () => {
    const el = createMerchantMarkerEl('data:img/svg', '', null);
    expect(el.children.length).toBe(1); // only icon
  });

  it('no label rendered when name is null', () => {
    const el = createMerchantMarkerEl('data:img/svg', null, null);
    expect(el.children.length).toBe(1);
  });
});

// ─── Маркер мерчанта: метка и кэшбэк (интеграция) ────────────────────────────

describe('merchant marker label and cashback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockMarker.mockImplementation(() => ({
      setLngLat: vi.fn().mockReturnThis(),
      addTo: vi.fn().mockReturnThis(),
      remove: vi.fn(),
    }));
    mockMap.getCenter.mockReturnValue({ lng: 30.36, lat: 59.93 });
    mockMap.getZoom.mockReturnValue(18);
    mockMap.getStyle.mockReturnValue({ layers: [] });
    maplibregl.Map.mockReturnValue(mockMap);
  });

  it('merchant marker element contains the merchant name', async () => {
    renderMap({ merchants });
    await vi.waitFor(() => expect(MockMarker).toHaveBeenCalledTimes(2));

    const merchantCalls = MockMarker.mock.calls.filter(c => c[0].anchor === 'top');
    const allText = merchantCalls.map(c => c[0].element.textContent).join('|');
    expect(allText).toContain('Магнит');
    expect(allText).toContain('Пятёрочка');
  });

  it('shows cashback badge on marker when merchantCashback prop provided', async () => {
    const cashbackMap = { 'spb_002': { pct: 7, bank: 'Т-Банк' } };
    renderMap({ merchants, merchantCashback: cashbackMap });
    await vi.waitFor(() => expect(MockMarker).toHaveBeenCalledTimes(2));

    const merchantCalls = MockMarker.mock.calls.filter(c => c[0].anchor === 'top');
    const magnetEl = merchantCalls.find(c => c[0].element.textContent.includes('Магнит'))?.[0].element;
    expect(magnetEl).toBeTruthy();
    expect(magnetEl.textContent).toContain('7%');
  });

  it('no cashback badge on marker without matching merchantCashback entry', async () => {
    renderMap({ merchants, merchantCashback: {} });
    await vi.waitFor(() => expect(MockMarker).toHaveBeenCalledTimes(2));

    const merchantCalls = MockMarker.mock.calls.filter(c => c[0].anchor === 'top');
    merchantCalls.forEach(c => {
      expect(c[0].element.textContent).not.toContain('%');
    });
  });
});

// ─── Mobile long-press и short tap ───────────────────────────────────────────

describe('mobile touch — long-press и short tap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockMarker.mockImplementation(() => ({
      setLngLat: vi.fn().mockReturnThis(),
      addTo: vi.fn().mockReturnThis(),
      remove: vi.fn(),
    }));
    mockMap.getCenter.mockReturnValue({ lng: 30.36, lat: 59.93 });
    mockMap.getZoom.mockReturnValue(18);
    mockMap.getStyle.mockReturnValue({ layers: [] });
    maplibregl.Map.mockReturnValue(mockMap);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function getMerchantEl(props = {}) {
    renderMap({ merchants, ...props });
    await vi.waitFor(() => expect(MockMarker).toHaveBeenCalledTimes(2));
    const calls = MockMarker.mock.calls.filter(c => c[0].anchor === 'top');
    return calls[0][0].element;
  }

  it('long press (500ms) calls onMerchantHover with pinned:true', async () => {
    const onMerchantHover = vi.fn();
    const el = await getMerchantEl({ onMerchantHover });

    vi.useFakeTimers();
    fireEvent.touchStart(el, { touches: [{ identifier: 1, clientX: 50, clientY: 60 }] });
    vi.advanceTimersByTime(600);

    expect(onMerchantHover).toHaveBeenCalledWith(
      expect.objectContaining({ pinned: true, x: 50, y: 60 })
    );
  });

  it('short tap (touchend before 500ms) calls navigate to merchant page', async () => {
    const el = await getMerchantEl();

    vi.useFakeTimers();
    fireEvent.touchStart(el, { touches: [{ identifier: 1, clientX: 50, clientY: 60 }] });
    fireEvent.touchEnd(el, { changedTouches: [{ identifier: 1, clientX: 50, clientY: 60 }] });

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringMatching(/^\/merchant\//),
      expect.anything()
    );
  });

  it('short tap does NOT call onMerchantHover', async () => {
    const onMerchantHover = vi.fn();
    const el = await getMerchantEl({ onMerchantHover });

    vi.useFakeTimers();
    fireEvent.touchStart(el, { touches: [{ identifier: 1, clientX: 50, clientY: 60 }] });
    fireEvent.touchEnd(el, { changedTouches: [{ identifier: 1, clientX: 50, clientY: 60 }] });
    vi.advanceTimersByTime(600); // timer already cleared by touchend

    expect(onMerchantHover).not.toHaveBeenCalled();
  });

  it('touchmove cancels long press', async () => {
    const onMerchantHover = vi.fn();
    const el = await getMerchantEl({ onMerchantHover });

    vi.useFakeTimers();
    fireEvent.touchStart(el, { touches: [{ identifier: 1, clientX: 50, clientY: 60 }] });
    fireEvent.touchMove(el);
    vi.advanceTimersByTime(600);

    expect(onMerchantHover).not.toHaveBeenCalled();
  });

  it('long press does NOT call navigate', async () => {
    const el = await getMerchantEl();

    vi.useFakeTimers();
    fireEvent.touchStart(el, { touches: [{ identifier: 1, clientX: 50, clientY: 60 }] });
    vi.advanceTimersByTime(600);
    // touchend after long-press fired (pressTimer is null)
    fireEvent.touchEnd(el, { changedTouches: [{ identifier: 1, clientX: 50, clientY: 60 }] });

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
