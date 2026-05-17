import { useEffect } from 'react';
import { CheckCircle } from './Icons';

export default function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="toast">
      <CheckCircle size={18} />
      <span>{message}</span>
    </div>
  );
}
