import { useState } from 'react';
import {
  attendHelpRequest,
  listHelpRequests,
  type HelpRequest,
  type HelpStatus,
} from '../../api/adminCases';
import { useAction } from '../../hooks/useAction';
import { useCaseList } from '../../hooks/useCaseList';
import { dateTime, tourDay } from '../../lib/format';
import type { Column } from '../../ui/DataTable';
import ErrorState from '../../ui/ErrorState';
import Facts from '../../ui/Facts';
import { Field } from '../../ui/Field';
import FilterChips from '../../ui/FilterChips';
import Modal from '../../ui/Modal';
import PageHeader from '../../ui/PageHeader';
import StatusBadge from '../../ui/StatusBadge';
import { useToast } from '../../ui/Toast';
import CaseTable from './CaseTable';

const COLUMNS: Column<HelpRequest>[] = [
  {
    key: 'code',
    header: 'Reserva',
    nowrap: true,
    render: (row) => row.bookingCode,
  },
  { key: 'tourist', header: 'Turista', render: (row) => row.touristName ?? '' },
  {
    key: 'provider',
    header: 'Proveedor',
    render: (row) => row.providerName ?? '',
  },
  { key: 'route', header: 'Ruta', render: (row) => row.routeNameEs ?? '' },
  {
    key: 'date',
    header: 'Recibido',
    nowrap: true,
    render: (row) => dateTime(row.createdAt),
  },
  {
    key: 'status',
    header: 'Estado',
    render: (row) =>
      row.status === 'OPEN' ? (
        <StatusBadge tone="warning">Por atender</StatusBadge>
      ) : (
        <StatusBadge tone="muted">Atendido</StatusBadge>
      ),
  },
];

function HelpModal({
  help,
  onClose,
  onDone,
}: {
  help: HelpRequest;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [note, setNote] = useState('');
  const { busy, error, run } = useAction();
  const isOpen = help.status === 'OPEN';
  return (
    <Modal
      title={`Pedido de ayuda ${help.bookingCode}`}
      onClose={onClose}
      footer={
        isOpen ? (
          <>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Volver
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || note.trim().length < 5}
              onClick={() =>
                void run(async () => {
                  await attendHelpRequest(help.id, note.trim());
                  await onDone();
                })
              }
            >
              Registrar atención
            </button>
          </>
        ) : undefined
      }
    >
      <div>
        <p className="small muted">Lo que informa el turista</p>
        <p>{help.description}</p>
      </div>
      <Facts
        items={[
          { label: 'Ruta', value: help.routeNameEs ?? '' },
          { label: 'Tour', value: tourDay(help.tourDate) },
          { label: 'Turista', value: help.touristName ?? '' },
          { label: 'Teléfono', value: help.touristPhone ?? 'Sin dato' },
          { label: 'Correo', value: help.touristEmail ?? 'Sin dato' },
          { label: 'Proveedor', value: help.providerName ?? '' },
          {
            label: 'Teléfono del proveedor',
            value: help.providerPhone ?? 'Sin dato',
          },
          { label: 'Recibido', value: dateTime(help.createdAt) },
        ]}
      />
      {isOpen ? (
        <>
          <p className="notice">
            El proveedor no recibe este aviso. Decide tú cómo intervenir. Este
            pedido no mueve dinero ni aplica sanciones.
          </p>
          <Field
            label="Cómo se atendió"
            rows={3}
            maxLength={1000}
            value={note}
            onChange={setNote}
            hint="El turista recibirá este texto."
          />
        </>
      ) : (
        <Facts
          items={[
            { label: 'Atendido', value: dateTime(help.attendedAt) },
            { label: 'Respuesta', value: help.adminNote ?? '' },
          ]}
        />
      )}
      {error && <ErrorState message={error} />}
    </Modal>
  );
}

export default function AdminHelpPage() {
  const toast = useToast();
  const [open, setOpen] = useState<HelpRequest | null>(null);
  const { filter, setFilter, page, setPage, list } = useCaseList(
    (status: HelpStatus, current) => listHelpRequests(status, current),
    'OPEN',
  );
  return (
    <div className="page-stack">
      <PageHeader
        title="Ayuda en ruta"
        intro="Turistas que necesitan apoyo mientras están en el tour."
      />
      <FilterChips
        label="Estado"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'OPEN', label: 'Por atender' },
          { value: 'ATTENDED', label: 'Atendidos' },
        ]}
      />
      <CaseTable
        caption="Pedidos de ayuda durante el tour"
        columns={COLUMNS}
        list={list}
        page={page}
        onPage={setPage}
        onOpen={setOpen}
        emptyTitle="No hay pedidos de ayuda en este estado."
      />
      {open && (
        <HelpModal
          help={open}
          onClose={() => setOpen(null)}
          onDone={async () => {
            setOpen(null);
            await list.reload();
            toast('Atención registrada. Avisamos al turista.');
          }}
        />
      )}
    </div>
  );
}
