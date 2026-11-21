import type { ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';

export default function ByRole({
  guide,
  agency,
}: {
  guide: ReactNode;
  agency: ReactNode;
}) {
  const { user } = useAuth();
  return <>{user?.role === 'GUIDE' ? guide : agency}</>;
}
