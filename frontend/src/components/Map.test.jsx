import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import Map from './Map';

const mockMap = {
  on: vi.fn(),
  getCenter: vi.fn(() => [37.617, 55.755]),
  destroy: vi.fn(),
};

vi.mock('@2gis/mapgl', () => ({
  load: vi.fn(() => Promise.resolve({
    Map: vi.fn(() => mockMap),
  })),
}));

import { load } from '@2gis/mapgl';

describe('Map', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders container div', () => {
    const { container } = render(<Map />);
    expect(container.querySelector('div')).toBeTruthy();
  });

  it('calls load() on mount', async () => {
    render(<Map />);
    await vi.waitFor(() => expect(load).toHaveBeenCalled());
  });

  it('registers moveend listener', async () => {
    render(<Map />);
    await vi.waitFor(() => expect(mockMap.on).toHaveBeenCalledWith('moveend', expect.any(Function)));
  });

  it('calls onCenterChange with lat/lon on moveend', async () => {
    const onCenterChange = vi.fn();
    mockMap.getCenter.mockReturnValue([37.617, 55.755]);

    render(<Map onCenterChange={onCenterChange} />);
    await vi.waitFor(() => expect(mockMap.on).toHaveBeenCalled());

    const moveendHandler = mockMap.on.mock.calls.find(([event]) => event === 'moveend')[1];
    moveendHandler();

    expect(onCenterChange).toHaveBeenCalledWith(55.755, 37.617);
  });

  it('destroys map on unmount', async () => {
    const { unmount } = render(<Map />);
    await vi.waitFor(() => expect(mockMap.on).toHaveBeenCalled());
    unmount();
    expect(mockMap.destroy).toHaveBeenCalled();
  });
});
