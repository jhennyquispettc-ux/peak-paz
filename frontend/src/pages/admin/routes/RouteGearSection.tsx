import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  deleteGear,
  saveGear,
  type GearCategory,
  type RouteDetail,
  type RouteGear,
} from '../../../api/adminManage';
import { useAction } from '../../../hooks/useAction';
import ConfirmDialog from '../../../ui/ConfirmDialog';
import DataTable, { type Column } from '../../../ui/DataTable';
import EmptyState from '../../../ui/EmptyState';
import ErrorState from '../../../ui/ErrorState';
import { Field, SelectField } from '../../../ui/Field';
import Modal from '../../../ui/Modal';
import { useToast } from '../../../ui/Toast';
import { GEAR_CATEGORIES, optionalNumber, optionsOf } from './routeLabels';

function GearModal({
  routeId,
  gear,
  onClose,
  onSaved,
}: {
  routeId: string;
  gear: RouteGear | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [category, setCategory] = useState<GearCategory>(
    gear?.category ?? 'EQUIPMENT',
  );
  const [descriptionEs, setDescriptionEs] = useState(gear?.descriptionEs ?? '');
  const [descriptionEn, setDescriptionEn] = useState(gear?.descriptionEn ?? '');
  const [weight, setWeight] = useState(
    gear?.estimatedWeightG?.toString() ?? '',
  );
  const [isRequired, setIsRequired] = useState(gear?.isRequired ?? false);
  const { busy, error, run } = useAction();
  const valid =
    descriptionEs.trim().length >= 2 && descriptionEn.trim().length >= 2;
  return (
    <Modal
      title={gear ? 'Editar equipo' : 'Agregar equipo'}
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
            onClick={() =>
              void run(async () => {
                await saveGear(routeId, gear?.id ?? null, {
                  category,
                  descriptionEs: descriptionEs.trim(),
                  descriptionEn: descriptionEn.trim(),
                  estimatedWeightG: optionalNumber(weight),
                  isRequired,
                });
                await onSaved();
              })
            }
          >
            Guardar equipo
          </button>
        </>
      }
    >
      <SelectField
        label="Categoría"
        value={category}
        options={optionsOf(GEAR_CATEGORIES)}
        onChange={setCategory}
      />
      <Field
        label="Descripción en español"
        value={descriptionEs}
        maxLength={200}
        onChange={setDescriptionEs}
      />
      <Field
        label="Descripción en inglés"
        value={descriptionEn}
        maxLength={200}
        onChange={setDescriptionEn}
      />
      <Field
        label="Peso estimado en gramos"
        type="number"
        min={1}
        max={50000}
        value={weight}
        onChange={setWeight}
      />
      <label className="check-row">
        <input
          type="checkbox"
          checked={isRequired}
          onChange={(event) => setIsRequired(event.target.checked)}
        />
        Es obligatorio
      </label>
      {error && <ErrorState message={error} />}
    </Modal>
  );
}

export default function RouteGearSection({
  route,
  onChanged,
}: {
  route: RouteDetail;
  onChanged: () => Promise<void>;
}) {
  const toast = useToast();
  const [editing, setEditing] = useState<RouteGear | 'new' | null>(null);
  const [removing, setRemoving] = useState<RouteGear | null>(null);
  const columns = useMemo<Column<RouteGear>[]>(
    () => [
      {
        key: 'category',
        header: 'Categoría',
        render: (row) => GEAR_CATEGORIES[row.category],
      },
      { key: 'item', header: 'Equipo', render: (row) => row.descriptionEs },
      {
        key: 'weight',
        header: 'Peso',
        nowrap: true,
        render: (row) =>
          row.estimatedWeightG === null ? '' : `${row.estimatedWeightG} g`,
      },
      {
        key: 'required',
        header: 'Obligatorio',
        render: (row) => (row.isRequired ? 'Sí' : 'No'),
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
  return (
    <section className="page-stack">
      <div className="section-head">
        <p className="muted">Lo que el turista debería llevar.</p>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setEditing('new')}
        >
          <Plus aria-hidden="true" />
          Agregar equipo
        </button>
      </div>
      {route.gearRecommendations.length === 0 ? (
        <div className="card">
          <EmptyState title="Esta ruta todavía no tiene equipo recomendado." />
        </div>
      ) : (
        <DataTable
          caption="Equipo recomendado"
          columns={columns}
          rows={route.gearRecommendations}
          rowKey={(row) => row.id}
        />
      )}
      {editing && (
        <GearModal
          routeId={route.id}
          gear={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await onChanged();
            toast('Equipo guardado.');
          }}
        />
      )}
      {removing && (
        <ConfirmDialog
          title="Quitar equipo"
          confirmLabel="Quitar equipo"
          destructive
          onClose={() => setRemoving(null)}
          onConfirm={async () => {
            await deleteGear(route.id, removing.id);
            await onChanged();
            toast('Equipo quitado.');
          }}
        >
          <p>
            Vas a quitar <strong>{removing.descriptionEs}</strong> de esta ruta.
          </p>
        </ConfirmDialog>
      )}
    </section>
  );
}
