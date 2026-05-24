import { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MapPage from './pages/MapPage';
import MerchantPage from './pages/MerchantPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import AuthGuard from './components/AuthGuard';
import AdminGuard from './components/AdminGuard';
import Toast from './components/Toast';
import { useAndroidBack } from './hooks/useAndroidBack';

function AndroidBackHandler() {
  const [exitToast, setExitToast] = useState(null);
  const showHint = useCallback(() => setExitToast({ message: 'Нажмите ещё раз для выхода', type: 'success' }), []);
  useAndroidBack(showHint);
  return exitToast
    ? <Toast message={exitToast.message} type={exitToast.type} onDone={() => setExitToast(null)} />
    : null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AndroidBackHandler />
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/merchant/:yandex_firm_id" element={<MerchantPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/admin" element={<AdminGuard><AdminPage /></AdminGuard>} />
      </Routes>
    </BrowserRouter>
  );
}
