import { useSearchParams } from 'react-router-dom';
import AdminVerificationPage from '../AdminVerificationPage';
import AgencyReviewPanel from './AgencyReviewPanel';

export default function AdminVerificationsPage() {
  const [params, setParams] = useSearchParams();
  const showAgencies = params.get('vista') === 'agencias';
  return (
    <div className="page-stack">
      <div className="view-tabs" role="group" aria-label="Tipo de proveedor">
        <button
          type="button"
          aria-pressed={!showAgencies}
          onClick={() => setParams({})}
        >
          Guías
        </button>
        <button
          type="button"
          aria-pressed={showAgencies}
          onClick={() => setParams({ vista: 'agencias' })}
        >
          Agencias
        </button>
      </div>
      {showAgencies ? <AgencyReviewPanel /> : <AdminVerificationPage />}
    </div>
  );
}
