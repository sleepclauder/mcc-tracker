import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Map from './Map';

const mockMap = {
  on: vi.fn(),
  getCenter: vi.fn(() => [37.617, 55.755]),
  destroy: vi.fn(),
};
const MockMarker = vi.fn(() => ({ on: vi.fn(), destroy: vi.fn() }));

vi.mock('@2gis/mapgl', () => ({
  load: vi.fn(() => Promise.resolve({
    Map: vi.fn(() => mockMap),
    Marker: MockMarker,
  })),
}));

import { load } from '@2gis/mapgl';

const merchants = [
  { YANDEX_FIRM_ID: 'spb_001', NAME: 'Пятёрочка', ADDRESS: 'Невский пр., 88', LAT: 59.93, LON: 30.36, LAST_MCC: null, VOTES_TOTAL: 0 },
  { YANDEX_FIRM_ID: 'spb_002', NAME: 'Магнит',    ADDRESS: 'ул. Рубинштейна, 15', LAT: 59.92, LON: 30.34, LAST_MCC: '5411', VOTES_TOTAL: 3 },
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
    MockMarker.mockImplementation(() => ({ on: vi.fn(), destroy: vi.fn() }));
  });

  it('renders container div', () => {
    const { container } = renderMap();
    expect(container.querySelector('div')).toBeTruthy();
  });

  it('calls load() on mount', async () => {
    renderMap();
    await vi.waitFor(() => expect(load).toHaveBeenCalled());
  });

  it('registers moveend listener', async () => {
    renderMap();
    await vi.waitFor(() => expect(mockMap.on).toHaveBeenCalledWith('moveend', expect.any(Function)));
  });

  it('calls onCenterChange with lat/lon on moveend', async () => {
    const onCenterChange = vi.fn();
    mockMap.getCenter.mockReturnValue([37.617, 55.755]);
    renderMap({ onCenterChange });
    await vi.waitFor(() => expect(mockMap.on).toHaveBeenCalled());
    const handler = mockMap.on.mock.calls.find(([e]) => e === 'moveend')[1];
    handler();
    expect(onCenterChange).toHaveBeenCalledWith(55.755, 37.617);
  });

  it('creates markers for each merchant', async () => {
    renderMap({ merchants });
    await vi.waitFor(() => expect(MockMarker).toHaveBeenCalledTimes(2));
  });

  it('destroys map on unmount', async () => {
    const { unmount } = renderMap();
    await vi.waitFor(() => expect(mockMap.on).toHaveBeenCalled());
    unmount();
    expect(mockMap.destroy).toHaveBeenCalled();
  });
});
