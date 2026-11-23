import { useState } from 'react';
import { listBookings, type AdminBooking } from '../../api/adminManage';
import { useResource } from '../../hooks/useResource';
import { BOOKING_STATUS, type BookingStatus } from '../../lib/bookingStatus';
import { dateTime, money, tourDay } from '../../lib/format';
import type { Column } from '../../ui/DataTable';
import Facts from '../../ui/Facts';
import { SelectField } from '../../ui/Field';
import FilterChips from '../../ui/FilterChips';
import Modal from '../../ui/Modal';
import PageHeader from '../../ui/PageHeader';
import StatusBadge from '../../ui/StatusBadge';
import CaseTable from './CaseTable';

type TypeFilter = 'ALL' | 'PRIVATE' | 'GROUP';
type StatusFilter = 'ALL' | BookingStatus;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'Todos los estados' },
  ...(Object.keys(BOOKING_STATUS) as BookingStatus[]).map((value) => ({
    value,
    label: BOOKING_STATUS[value].label,
  })),
];

function providerOf(row: AdminBooking) {
  if (row.agency) return row.agency.legalName;
  return row.guide
    ? `${row.guide.firstName} ${row.guide.lastName}`
    : 'Sin proveedor';
}

const COLUMNS: Column<AdminBooking>[] = [
  { key: 'code', header: 'Código', nowrap: true, render: (row) => row.code },
  {
    key: 'type',
    wideOnly: true,
    header: 'Tipo',
    render: (row) => (row.type === 'GROUP' ? 'Grupal' : 'Privada'),
  },
  { key: 'route', header: 'Ruta', render: (row) => row.route.nameEs },
  {
    key: 'tourist',
    header: 'Turista',
    render: (row) => `${row.tourist.firstName} ${row.tourist.lastName}`,
  },
  {
    key: 'provider',
    header: 'Proveedor',
    wideOnly: true,
    render: providerOf,
  },
  {
    key: 'date',
    header: 'Tour',
    nowrap: true,
    render: (row) => tourDay(row.tourDate),
  },
  {
    key: 'amount',
    header: 'Monto',
    align: 'right',
    nowrap: true,
    render: (row) => money(row.totalAmount),
  },
  {
    key: 'status',
    header: 'Estado',
    render: (row) => (
      <StatusBadge tone={BOOKING_STATUS[row.status].tone}>
        {BOOKING_STATUS[row.status].label}
      </StatusBadge>
    ),
  },
];

export default function AdminBookingsPage() {
  const [type, setType] = useState<TypeFilter>('ALL');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<AdminBooking | null>(null);
  const list = useResource(
    () =>
      listBookings({
        page,
        type: type === 'ALL' ? undefined : type,
        status: status === 'ALL' ? undefined : status,
      }),
    [page, type, status],
  );
  return (
    <div className="page-stack">
      <PageHeader
        title="Reservas"
        intro="Consulta todas las reservas de la plataforma y su estado."
      />
      <div className="toolbar">
        <FilterChips
          label="Tipo de reserva"
          value={type}
          onChange={(next) => {
            setType(next);
            setPage(1);
          }}
          options={[
            { value: 'ALL', label: 'Todas' },
            { value: 'PRIVATE', label: 'Privadas' },
            { value: 'GROUP', label: 'Grupales' },
          ]}
        />
        <SelectField
          label="Estado"
          value={status}
          options={STATUS_OPTIONS}
          onChange={(next) => {
            setStatus(next);
            setPage(1);
          }}
        />
      </div>
      <CaseTable
        caption="Reservas de la plataforma"
        columns={COLUMNS}
        list={list}
        page={page}
        onPage={setPage}
        onOpen={setOpen}
        emptyTitle="No hay reservas con esos filtros."
      />
      {open && (
        <Modal title={`Reserva ${open.code}`} onClose={() => setOpen(null)}>
          <span>
            <StatusBadge tone={BOOKING_STATUS[open.status].tone}>
              {BOOKING_STATUS[open.status].label}
            </StatusBadge>
          </span>
          <Facts
            items={[
              { label: 'Ruta', value: open.route.nameEs },
              {
                label: 'Tipo',
                value: open.type === 'GROUP' ? 'Salida grupal' : 'Tour privado',
              },
              { label: 'Tour', value: tourDay(open.tourDate, open.startTime) },
              { label: 'Personas', value: open.peopleCount },
              { label: 'Monto', value: money(open.totalAmount) },
              { label: 'Proveedor', value: providerOf(open) },
              {
                label: 'Turista',
                value: `${open.tourist.firstName} ${open.tourist.lastName}`,
              },
              { label: 'País', value: open.tourist.country ?? 'Sin dato' },
              { label: 'Correo', value: open.tourist.email ?? 'Sin dato' },
              { label: 'Teléfono', value: open.tourist.phone ?? 'Sin dato' },
              { label: 'Creada', value: dateTime(open.createdAt) },
              { label: 'Confirmada', value: dateTime(open.confirmedAt) },
              { label: 'Reconfirmó', value: dateTime(open.reconfirmedAt) },
              {
                label: 'Inicio del guía',
                value: dateTime(open.guideStartedAt),
              },
              {
                label: 'Inicio del turista',
                value: dateTime(open.touristStartedAt),
              },
              ...(open.cancelledAt
                ? [
                    { label: 'Cancelada', value: dateTime(open.cancelledAt) },
                    {
                      label: 'Motivo',
                      value: open.cancellationReason ?? 'Sin motivo',
                    },
                  ]
                : []),
            ]}
          />
        </Modal>
      )}
    </div>
  );
}
