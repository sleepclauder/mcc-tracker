import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MapPage from './pages/MapPage';
import MerchantPage from './pages/MerchantPage';
import LoginPage from './pages/LoginPage';
import AuthGuard from './components/AuthGuard';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/merchant/:yandex_firm_id" element={<MerchantPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </BrowserRouter>
  );
}
