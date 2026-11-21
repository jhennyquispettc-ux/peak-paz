import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  listUsers,
  setUserStatus,
  type AdminUser,
  type UserRole,
  type UserStatus,
} from '../../api/adminManage';
import { useAuth } from '../../auth/AuthContext';
import { useResource } from '../../hooks/useResource';
import { dateOnly } from '../../lib/format';
import ConfirmDialog from '../../ui/ConfirmDialog';
import type { Column } from '../../ui/DataTable';
import FilterChips from '../../ui/FilterChips';
import PageHeader from '../../ui/PageHeader';
import StatusBadge from '../../ui/StatusBadge';
import { useToast } from '../../ui/Toast';
import CaseTable from './CaseTable';

type RoleFilter = 'ALL' | UserRole;
type StatusFilter = 'ALL' | UserStatus;

const ROLE_LABELS: Record<UserRole, string> = {
  TOURIST: 'Turista',
  GUIDE: 'Guía',
  AGENCY: 'Agencia',
  ADMIN: 'Administrador',
};

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [role, setRole] = useState<RoleFilter>('ALL');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<AdminUser | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(text.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [text]);

  const list = useResource(
    () =>
      listUsers({
        page,
        role: role === 'ALL' ? undefined : role,
        status: status === 'ALL' ? undefined : status,
        search,
      }),
    [page, role, status, search],
  );

  const columns = useMemo<Column<AdminUser>[]>(
    () => [
      {
        key: 'name',
        header: 'Nombre',
        render: (row) => `${row.firstName} ${row.lastName}`,
      },
      { key: 'email', header: 'Correo', render: (row) => row.email },
      { key: 'role', header: 'Rol', render: (row) => ROLE_LABELS[row.role] },
      {
        key: 'created',
        header: 'Alta',
        nowrap: true,
        render: (row) => dateOnly(row.createdAt),
      },
      {
        key: 'status',
        header: 'Estado',
        render: (row) =>
          row.status === 'ACTIVE' ? (
            <StatusBadge tone="success">Activa</StatusBadge>
          ) : (
            <StatusBadge tone="danger">Suspendida</StatusBadge>
          ),
      },
      {
        key: 'action',
        header: 'Acción',
        align: 'right',
        render: (row) =>
          row.id === me?.id ? null : (
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => setTarget(row)}
            >
              {row.status === 'ACTIVE' ? 'Suspender' : 'Reactivar'}
            </button>
          ),
      },
    ],
    [me?.id],
  );

  const suspending = target?.status === 'ACTIVE';

  return (
    <div className="page-stack">
      <PageHeader
        title="Usuarios"
        intro="Busca cuentas y controla su acceso a la plataforma."
      />
      <div className="toolbar">
        <div className="search-box">
          <Search aria-hidden="true" />
          <input
            type="search"
            aria-label="Buscar por nombre o correo"
            placeholder="Buscar por nombre o correo"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </div>
        <FilterChips
          label="Estado de la cuenta"
          value={status}
          onChange={(next) => {
            setStatus(next);
            setPage(1);
          }}
          options={[
            { value: 'ALL', label: 'Todas' },
            { value: 'ACTIVE', label: 'Activas' },
            { value: 'SUSPENDED', label: 'Suspendidas' },
          ]}
        />
      </div>
      <FilterChips
        label="Rol"
        value={role}
        onChange={(next) => {
          setRole(next);
          setPage(1);
        }}
        options={[
          { value: 'ALL', label: 'Todos los roles' },
          { value: 'TOURIST', label: 'Turistas' },
          { value: 'GUIDE', label: 'Guías' },
          { value: 'AGENCY', label: 'Agencias' },
          { value: 'ADMIN', label: 'Administradores' },
        ]}
      />
      <CaseTable
        caption="Usuarios de la plataforma"
        columns={columns}
        list={list}
        page={page}
        onPage={setPage}
        emptyTitle="No encontramos cuentas con esos filtros."
      />
      {target && (
        <ConfirmDialog
          title={suspending ? 'Suspender cuenta' : 'Reactivar cuenta'}
          confirmLabel={suspending ? 'Suspender cuenta' : 'Reactivar cuenta'}
          destructive={suspending}
          onClose={() => setTarget(null)}
          onConfirm={async () => {
            await setUserStatus(target.id, suspending ? 'SUSPENDED' : 'ACTIVE');
            await list.reload();
            toast(suspending ? 'Cuenta suspendida.' : 'Cuenta reactivada.');
          }}
        >
          <p>
            Cuenta de{' '}
            <strong>
              {target.firstName} {target.lastName}
            </strong>{' '}
            ({target.email}).
          </p>
          <p className="notice">
            {suspending
              ? 'La persona no podrá ingresar hasta que reactives su cuenta.'
              : 'Si es un proveedor con strikes activos, anula primero los que fueron un error en la sección Strikes.'}
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}
