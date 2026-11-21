import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  deletePoint,
  savePoint,
  type PointType,
  type RouteDetail,
  type RoutePoint,
} from '../../../api/adminManage';
import { useAction } from '../../../hooks/useAction';
import ConfirmDialog from '../../../ui/ConfirmDialog';
import DataTable, { type Column } from '../../../ui/DataTable';
import EmptyState from '../../../ui/EmptyState';
import ErrorState from '../../../ui/ErrorState';
import { Field, SelectField } from '../../../ui/Field';
import Modal from '../../../ui/Modal';
import { useToast } from '../../../ui/Toast';
import {
  optionalNumber,
  optionalText,
  optionsOf,
  POINT_TYPES,
} from './routeLabels';

function PointModal({
  routeId,
  point,
  onClose,
  onSaved,
}: {
  routeId: string;
  point: RoutePoint | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [type, setType] = useState<PointType>(point?.type ?? 'VIEWPOINT');
  const [form, setForm] = useState({
    nameEs: point?.nameEs ?? '',
    nameEn: point?.nameEn ?? '',
    descriptionEs: point?.descriptionEs ?? '',
    descriptionEn: point?.descriptionEn ?? '',
    latitude: point ? String(point.latitude) : '',
    longitude: point ? String(point.longitude) : '',
    altitudeM: point?.altitudeM?.toString() ?? '',
    stageOrder: point?.stageOrder?.toString() ?? '',
    dayNumber: point?.dayNumber?.toString() ?? '',
    minutesFromPrevious: point?.minutesFromPrevious?.toString() ?? '',
  });
  const [isStop, setIsStop] = useState(point?.isItineraryStop ?? false);
  const [isOvernight, setIsOvernight] = useState(point?.isOvernight ?? false);
  const { busy, error, run } = useAction();
  const bind = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (value: string) =>
      setForm((current) => ({ ...current, [key]: value })),
  });
  const valid =
    form.nameEs.trim().length >= 2 &&
    form.nameEn.trim().length >= 2 &&
    form.latitude.trim() !== '' &&
    form.longitude.trim() !== '' &&
    (!isStop || (form.stageOrder !== '' && form.dayNumber !== ''));

  const submit = () =>
    run(async () => {
      await savePoint(routeId, point?.id ?? null, {
        type,
        nameEs: form.nameEs.trim(),
        nameEn: form.nameEn.trim(),
        descriptionEs: optionalText(form.descriptionEs),
        descriptionEn: optionalText(form.descriptionEn),
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        altitudeM: optionalNumber(form.altitudeM),
        isItineraryStop: isStop,
        isOvernight: isStop && isOvernight,
        ...(isStop
          ? {
              stageOrder: optionalNumber(form.stageOrder),
              dayNumber: optionalNumber(form.dayNumber),
              minutesFromPrevious: optionalNumber(form.minutesFromPrevious),
            }
          : {}),
      });
      await onSaved();
    });

  return (
    <Modal
      title={point ? 'Editar parada' : 'Agregar parada'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Volver
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!valid || busy}
            onClick={() => void submit()}
          >
            Guardar parada
          </button>
        </>
      }
    >
      <SelectField
        label="Tipo"
        value={type}
        options={optionsOf(POINT_TYPES)}
        onChange={setType}
      />
      <div className="form-grid">
        <Field label="Nombre en español" maxLength={120} {...bind('nameEs')} />
        <Field label="Nombre en inglés" maxLength={120} {...bind('nameEn')} />
        <Field label="Latitud" type="number" step="any" {...bind('latitude')} />
        <Field
          label="Longitud"
          type="number"
          step="any"
          {...bind('longitude')}
        />
        <Field
          label="Altitud en m"
          type="number"
          min={0}
          max={7000}
          {...bind('altitudeM')}
        />
      </div>
      <Field
        label="Descripción en español"
        rows={2}
        maxLength={2000}
        {...bind('descriptionEs')}
      />
      <Field
        label="Descripción en inglés"
        rows={2}
        maxLength={2000}
        {...bind('descriptionEn')}
      />
      <label className="check-row">
        <input
          type="checkbox"
          checked={isStop}
          onChange={(event) => setIsStop(event.target.checked)}
        />
        Forma parte del itinerario
      </label>
      {isStop && (
        <>
          <div className="form-grid form-grid-3">
            <Field
              label="Orden"
              type="number"
              min={1}
              {...bind('stageOrder')}
            />
            <Field label="Día" type="number" min={1} {...bind('dayNumber')} />
            <Field
              label="Minutos desde la anterior"
              type="number"
              min={0}
              max={1440}
              {...bind('minutesFromPrevious')}
            />
          </div>
          <label className="check-row">
            <input
              type="checkbox"
              checked={isOvernight}
              onChange={(event) => setIsOvernight(event.target.checked)}
            />
            Se pasa la noche aquí
          </label>
        </>
      )}
      {error && <ErrorState message={error} />}
    </Modal>
  );
}

export default function RoutePointsSection({
  route,
  onChanged,
}: {
  route: RouteDetail;
  onChanged: () => Promise<void>;
}) {
  const toast = useToast();
  const [editing, setEditing] = useState<RoutePoint | 'new' | null>(null);
  const [removing, setRemoving] = useState<RoutePoint | null>(null);
  const columns = useMemo<Column<RoutePoint>[]>(
    () => [
      {
        key: 'order',
        header: 'Orden',
        render: (row) => row.stageOrder ?? 'Fuera',
      },
      { key: 'name', header: 'Nombre', render: (row) => row.nameEs },
      { key: 'type', header: 'Tipo', render: (row) => POINT_TYPES[row.type] },
      { key: 'day', header: 'Día', render: (row) => row.dayNumber ?? '' },
      {
        key: 'altitude',
        header: 'Altitud',
        nowrap: true,
        render: (row) => (row.altitudeM === null ? '' : `${row.altitudeM} m`),
      },
      {
        key: 'action',
        header: 'Acción',
        align: 'right',
        render: (row) => (
          <span className="row-actions">
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => setEditing(row)}
            >
              Editar
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => setRemoving(row)}
            >
              Quitar
            </button>
          </span>
        ),
      },
    ],
    [],
  );
  const points = [...route.pointsOfInterest].sort(
    (a, b) => (a.stageOrder ?? 9999) - (b.stageOrder ?? 9999),
  );
  const stops = points.filter((point) => point.isItineraryStop).length;
  return (
    <section className="page-stack">
      <div className="section-head">
        <p className="muted">
          {stops} paradas en el itinerario. Se necesitan al menos 2 para
          publicar.
        </p>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setEditing('new')}
        >
          <Plus aria-hidden="true" />
          Agregar parada
        </button>
      </div>
      {points.length === 0 ? (
        <div className="card">
          <EmptyState title="Esta ruta todavía no tiene paradas." />
        </div>
      ) : (
        <DataTable
          caption="Paradas de la ruta"
          columns={columns}
          rows={points}
          rowKey={(row) => row.id}
        />
      )}
      {editing && (
        <PointModal
          routeId={route.id}
          point={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await onChanged();
            toast('Parada guardada.');
          }}
        />
      )}
      {removing && (
        <ConfirmDialog
          title="Quitar parada"
          confirmLabel="Quitar parada"
          destructive
          onClose={() => setRemoving(null)}
          onConfirm={async () => {
            await deletePoint(route.id, removing.id);
            await onChanged();
            toast('Parada quitada.');
          }}
        >
          <p>
            Vas a quitar <strong>{removing.nameEs}</strong> de esta ruta.
          </p>
        </ConfirmDialog>
      )}
    </section>
  );
}
