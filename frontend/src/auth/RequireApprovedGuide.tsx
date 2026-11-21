import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { api } from '../api/client';
import LoadingState from '../ui/LoadingState';
import { useAuth } from './AuthContext';

type GateState = 'checking' | 'allowed' | 'blocked';

export default function RequireApprovedGuide() {
  const { user } = useAuth();
  const isGuide = user?.role === 'GUIDE';
  const [state, setState] = useState<GateState>('checking');

  useEffect(() => {
    if (!isGuide) return;
    let active = true;
    api<{ verificationStatus: string }>('/guides/me')
      .then((profile) => {
        if (active) {
          setState(
            profile.verificationStatus === 'APPROVED' ? 'allowed' : 'blocked',
          );
        }
      })
      .catch(() => {
        if (active) setState('blocked');
      });
    return () => {
      active = false;
    };
  }, [isGuide]);

  if (!isGuide) return <Outlet />;
  if (state === 'checking') return <LoadingState />;
  if (state === 'blocked') return <Navigate to="/mi-verificacion" replace />;
  return <Outlet />;
}
