import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App } from '@capacitor/app';

// On Android back button:
//   - Any page except "/" → navigate(-1)
//   - "/" (map) first press → show toast hint
//   - "/" (map) second press within 2 s → exit app
export function useAndroidBack(showExitHint) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let exitPending = false;
    let exitTimer = null;

    const listenerPromise = App.addListener('backButton', () => {
      if (location.pathname !== '/') {
        navigate(-1);
        return;
      }

      if (exitPending) {
        clearTimeout(exitTimer);
        App.exitApp();
        return;
      }

      exitPending = true;
      showExitHint?.();
      exitTimer = setTimeout(() => {
        exitPending = false;
      }, 2000);
    });

    return () => {
      clearTimeout(exitTimer);
      listenerPromise.then(h => h.remove());
    };
  }, [location.pathname, navigate, showExitHint]);
}
