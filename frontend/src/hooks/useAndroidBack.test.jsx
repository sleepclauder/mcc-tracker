import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAndroidBack } from './useAndroidBack';

const { mockAddListener, mockExitApp, mockNavigate } = vi.hoisted(() => ({
  mockAddListener: vi.fn(),
  mockExitApp: vi.fn(),
  mockNavigate: vi.fn(),
}));

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: mockAddListener,
    exitApp: mockExitApp,
  },
}));

vi.mock('react-router-dom', async (orig) => ({
  ...(await orig()),
  useNavigate: () => mockNavigate,
}));

function renderAt(path, showExitHint = vi.fn()) {
  return renderHook(() => useAndroidBack(showExitHint), {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
    ),
  });
}

async function getHandler(path, showExitHint = vi.fn()) {
  renderAt(path, showExitHint);
  await vi.waitFor(() => expect(mockAddListener).toHaveBeenCalled());
  return mockAddListener.mock.calls[0][1];
}

describe('useAndroidBack', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddListener.mockResolvedValue({ remove: vi.fn() });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('registers backButton listener on mount', async () => {
    renderAt('/');
    await vi.waitFor(() =>
      expect(mockAddListener).toHaveBeenCalledWith('backButton', expect.any(Function))
    );
  });

  it('removes listener on unmount', async () => {
    const removeFn = vi.fn();
    mockAddListener.mockResolvedValue({ remove: removeFn });

    const { unmount } = renderAt('/');
    await vi.waitFor(() => expect(mockAddListener).toHaveBeenCalled());
    // Flush microtasks so the .then(h => { listenerHandle = h }) has run
    unmount();
    // cleanup calls listenerPromise.then(h => h.remove()) — flush the microtask
    await vi.waitFor(() => expect(removeFn).toHaveBeenCalled());
  });

  it('calls navigate(-1) when on a non-root path', async () => {
    const handler = await getHandler('/merchant/123');
    handler({ canGoBack: true });
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('does NOT exit on back press from a non-root path', async () => {
    const handler = await getHandler('/profile');
    handler({ canGoBack: true });
    expect(mockExitApp).not.toHaveBeenCalled();
  });

  it('shows exit hint on first back press from root "/"', async () => {
    const showHint = vi.fn();
    const handler = await getHandler('/', showHint);

    handler({ canGoBack: false });

    expect(showHint).toHaveBeenCalledTimes(1);
    expect(mockExitApp).not.toHaveBeenCalled();
  });

  it('exits app on second back press from root within 2 seconds', async () => {
    const handler = await getHandler('/');

    vi.useFakeTimers();
    handler({ canGoBack: false }); // first press — sets flag
    handler({ canGoBack: false }); // second press immediately — should exit

    expect(mockExitApp).toHaveBeenCalledTimes(1);
  });

  it('does NOT navigate(-1) on first root back press', async () => {
    const handler = await getHandler('/');
    handler({ canGoBack: false });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows hint again (no exit) if second press comes after 2s timeout', async () => {
    const showHint = vi.fn();
    const handler = await getHandler('/', showHint);

    vi.useFakeTimers();
    handler({ canGoBack: false }); // first press
    vi.advanceTimersByTime(2100);  // flag resets
    handler({ canGoBack: false }); // second press after timeout

    expect(mockExitApp).not.toHaveBeenCalled();
    expect(showHint).toHaveBeenCalledTimes(2);
  });

  it('hint is only shown once even if multiple back presses in quick succession exit', async () => {
    const showHint = vi.fn();
    const handler = await getHandler('/', showHint);

    vi.useFakeTimers();
    handler({ canGoBack: false }); // first press — hint
    handler({ canGoBack: false }); // second press — exit, not hint again

    expect(showHint).toHaveBeenCalledTimes(1);
    expect(mockExitApp).toHaveBeenCalledTimes(1);
  });
});
