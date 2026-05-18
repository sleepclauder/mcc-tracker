import { useEffect } from 'react';
import { CheckCircle } from './Icons';

export default function Toast({ message, onDone, type = 'success' }) {
  useEffect(() => {
    const t = setTimeout(onDone, type === 'error' ? 5000 : 3000);
    return () => clearTimeout(t);
  }, [onDone, type]);

  return (
    <div className={`toast${type === 'error' ? ' toast--error' : ''}`}>
      {type === 'error' ? '⚠️' : <CheckCircle size={18} />}
      <span>{message}</span>
    </div>
  );
}
