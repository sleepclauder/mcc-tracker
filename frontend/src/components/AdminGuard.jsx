import { Navigate } from 'react-router-dom';
import { isAuthenticated, getCurrentUserIsAdmin } from '../utils/auth';

export default function AdminGuard({ children }) {
  if (!isAuthenticated() || !getCurrentUserIsAdmin()) {
    return <Navigate to="/" replace />;
  }
  return children;
}
