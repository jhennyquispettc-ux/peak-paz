import { TriangleAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { AgencyMe } from '../../api/agency';

export default function AgencyStatusNotice({ agency }: { agency: AgencyMe }) {
  if (agency.verificationStatus === 'PENDING') {
    return (
      <p className="notice notice-info" role="status">
        {agency.missingDocuments.length > 0
          ? 'Carga tus documentos en Perfil para que el administrador revise tu agencia. '
          : 'Tu agencia está en revisión. '}
        Podrás publicar salidas cuando sea aprobada.
      </p>
    );
  }
  if (agency.verificationStatus === 'REJECTED') {
    return (
      <div className="form-error" role="alert">
        <TriangleAlert aria-hidden="true" />
        <span>
          Tu agencia requiere correcciones: {agency.rejectionReason}{' '}
          <Link to="/panel/perfil">Corregir datos</Link>
        </span>
      </div>
    );
  }
  if (agency.missingDocuments.length > 0) {
    return (
      <div className="form-error" role="status">
        <TriangleAlert aria-hidden="true" />
        <span>
          Te faltan documentos o están vencidos. Puedes atender tus salidas
          actuales, pero no publicar nuevas.{' '}
          <Link to="/panel/perfil">Renovar documentos</Link>
        </span>
      </div>
    );
  }
  return null;
}
