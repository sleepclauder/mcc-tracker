import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Map from './Map';

const { mockMap, MockMarker } = vi.hoisted(() => {
  const mockMap = {
    on: vi.fn(),
    getCenter: vi.fn(() => ({ lng: 30.36, lat: 59.93 })),
    getZoom: vi.fn(() => 18),
    easeTo: vi.fn(),
    remove: vi.fn(),
  };
  const MockMarker = vi.fn(() => ({
    setLngLat: vi.fn().mockReturnThis(),
    addTo: vi.fn().mockReturnThis(),
    remove: vi.fn(),
  }));
  return { mockMap, MockMarker };
});

vi.mock('maplibre-gl', () => ({
  default: {
    Map: vi.fn(() => mockMap),
    Marker: MockMarker,
  },
}));

vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}));

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

describe('Map', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockMarker.mockImplementation(() => ({
      setLngLat: vi.fn().mockReturnThis(),
      addTo: vi.fn().mockReturnThis(),
      remove: vi.fn(),
    }));
    mockMap.getCenter.mockReturnValue({ lng: 30.36, lat: 59.93 });
    mockMap.getZoom.mockReturnValue(18);
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
