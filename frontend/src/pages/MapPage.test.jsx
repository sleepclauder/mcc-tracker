import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MapPage from './MapPage';

// Захватываем проп onMerchantHover из Map для симуляции hover/long-press
const { mapCallbacks } = vi.hoisted(() => ({
  mapCallbacks: { onMerchantHover: null },
}));

vi.mock('../components/Map', () => ({
  default: (props) => {
    mapCallbacks.onMerchantHover = props.onMerchantHover;
    return <div data-testid="map" />;
  },
}));
vi.mock('../components/MerchantList', () => ({ default: () => null }));
vi.mock('../components/Toast', () => ({ default: ({ message }) => <div data-testid="toast">{message}</div> }));

vi.mock('../hooks/useNearbyMerchants', () => ({
  useNearbyMerchants: () => ({ merchants: [], loading: false, error: null }),
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ authenticated: false, userEmail: null, logout: vi.fn() }),
}));

vi.mock('../api/client', () => ({
  default: { get: vi.fn().mockResolvedValue({ data: [] }) },
}));

vi.mock('../utils/auth', () => ({
  getToken: vi.fn(),
  getCurrentUserIsAdmin: vi.fn(() => false),
}));

vi.mock('react-router-dom', async (orig) => ({
  ...(await orig()),
  useNavigate: () => vi.fn(),
}));

const { mockGeolocation } = vi.hoisted(() => ({
  mockGeolocation: {
    requestPermissions: vi.fn(),
    getCurrentPosition: vi.fn(),
  },
}));

vi.mock('@capacitor/geolocation', () => ({
  Geolocation: mockGeolocation,
}));

function renderPage() {
  return render(<MemoryRouter><MapPage /></MemoryRouter>);
}

const sampleMerchant = {
  YANDEX_FIRM_ID: 'abc123',
  NAME: 'Тест Маркет',
  ADDRESS: 'ул. Тестовая, 1',
  LAST_MCC: '5411',
  VOTES_TOTAL: 5,
};

describe('MapPage — геолокация (Capacitor)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockGeolocation.requestPermissions.mockResolvedValue({ location: 'granted' });
    mockGeolocation.getCurrentPosition.mockResolvedValue({
      coords: { latitude: 59.93, longitude: 30.36 },
    });
  });

  it('запрашивает разрешение перед определением позиции', async () => {
    renderPage();
    await waitFor(() => expect(mockGeolocation.requestPermissions).toHaveBeenCalled());
    expect(mockGeolocation.requestPermissions.mock.invocationCallOrder[0])
      .toBeLessThan(mockGeolocation.getCurrentPosition.mock.invocationCallOrder[0]);
  });

  it('при успехе не показывает toast', async () => {
    renderPage();
    await waitFor(() => expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled());
    expect(screen.queryByTestId('toast')).toBeNull();
  });

  it('при ошибке показывает toast с предложением разрешить доступ', async () => {
    mockGeolocation.getCurrentPosition.mockRejectedValue(new Error('denied'));
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('toast').textContent).toMatch(/разрешите доступ/i)
    );
  });

  it('при ошибке requestPermissions показывает toast', async () => {
    mockGeolocation.requestPermissions.mockRejectedValue(new Error('denied'));
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('toast').textContent).toMatch(/разрешите доступ/i)
    );
  });

  it('кнопка геолокации повторно вызывает getCurrentPosition', async () => {
    renderPage();
    await waitFor(() => expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByTitle(/Определить/i));
    await waitFor(() => expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledTimes(2));
  });
});

// ─── Pinned tooltip (long-press / мобильный) ─────────────────────────────────

describe('MapPage — pinned tooltip (мобильный long-press)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mapCallbacks.onMerchantHover = null;
    mockGeolocation.requestPermissions.mockResolvedValue({ location: 'granted' });
    mockGeolocation.getCurrentPosition.mockResolvedValue({
      coords: { latitude: 59.93, longitude: 30.36 },
    });
  });

  async function showPinnedTooltip() {
    renderPage();
    await waitFor(() => expect(mapCallbacks.onMerchantHover).toBeDefined());
    act(() => mapCallbacks.onMerchantHover({ merchant: sampleMerchant, x: 100, y: 100, pinned: true }));
  }

  it('pinned tooltip показывает название мерчанта', async () => {
    await showPinnedTooltip();
    expect(screen.getByText('Тест Маркет')).toBeTruthy();
  });

  it('pinned tooltip показывает кнопку закрытия ×', async () => {
    await showPinnedTooltip();
    expect(screen.getByRole('button', { name: '×' })).toBeTruthy();
  });

  it('кнопка × скрывает tooltip', async () => {
    await showPinnedTooltip();
    fireEvent.click(screen.getByRole('button', { name: '×' }));
    expect(screen.queryByText('Тест Маркет')).toBeNull();
  });

  it('клик по карте (вне tooltip) скрывает pinned tooltip', async () => {
    await showPinnedTooltip();
    // Клик по map-container (не по самому tooltip — stopPropagation не мешает)
    const mapContainer = screen.getByTestId('map').parentElement;
    fireEvent.click(mapContainer);
    expect(screen.queryByText('Тест Маркет')).toBeNull();
  });

  it('обычный hover (не pinned) не показывает кнопку ×', async () => {
    renderPage();
    await waitFor(() => expect(mapCallbacks.onMerchantHover).toBeDefined());
    act(() => mapCallbacks.onMerchantHover({ merchant: sampleMerchant, x: 100, y: 100 }));
    expect(screen.queryByRole('button', { name: '×' })).toBeNull();
    expect(screen.getByText('Тест Маркет')).toBeTruthy();
  });

  it('mouseout (onMerchantHover(null)) убирает обычный tooltip', async () => {
    renderPage();
    await waitFor(() => expect(mapCallbacks.onMerchantHover).toBeDefined());
    act(() => mapCallbacks.onMerchantHover({ merchant: sampleMerchant, x: 100, y: 100 }));
    act(() => mapCallbacks.onMerchantHover(null));
    expect(screen.queryByText('Тест Маркет')).toBeNull();
  });
});
