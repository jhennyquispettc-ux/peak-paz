import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  deleteSpecies,
  listSpecies,
  saveSpecies,
  type Species,
  type SpeciesKind,
} from '../../../api/adminManage';
import { useAction } from '../../../hooks/useAction';
import { useResource } from '../../../hooks/useResource';
import ConfirmDialog from '../../../ui/ConfirmDialog';
import DataTable, { type Column } from '../../../ui/DataTable';
import EmptyState from '../../../ui/EmptyState';
import ErrorState from '../../../ui/ErrorState';
import { Field, SelectField } from '../../../ui/Field';
import LoadingState from '../../../ui/LoadingState';
import Modal from '../../../ui/Modal';
import { useToast } from '../../../ui/Toast';
import { optionalText, optionsOf, SPECIES_KINDS } from './routeLabels';

function SpeciesModal({
  species,
  onClose,
  onSaved,
}: {
  species: Species | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [kind, setKind] = useState<SpeciesKind>(species?.kind ?? 'FLORA');
  const [nameEs, setNameEs] = useState(species?.commonNameEs ?? '');
  const [nameEn, setNameEn] = useState(species?.commonNameEn ?? '');
  const [scientific, setScientific] = useState(species?.scientificName ?? '');
  const [photoUrl, setPhotoUrl] = useState(species?.photoUrl ?? '');
  const { busy, error, run } = useAction();
  const valid = nameEs.trim().length >= 2 && nameEn.trim().length >= 2;
  return (
    <Modal
      title={species ? 'Editar especie' : 'Agregar especie'}
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
                await saveSpecies(species?.id ?? null, {
                  kind,
                  commonNameEs: nameEs.trim(),
                  commonNameEn: nameEn.trim(),
                  scientificName: optionalText(scientific),
                  photoUrl: optionalText(photoUrl),
                });
                await onSaved();
              })
            }
          >
            Guardar especie
          </button>
        </>
      }
    >
      <SelectField
        label="Tipo"
        value={kind}
        options={optionsOf(SPECIES_KINDS)}
        onChange={setKind}
      />
      <Field
        label="Nombre en español"
        value={nameEs}
        maxLength={120}
        onChange={setNameEs}
      />
      <Field
        label="Nombre en inglés"
        value={nameEn}
        maxLength={120}
        onChange={setNameEn}
      />
      <Field
        label="Nombre científico"
        value={scientific}
        maxLength={160}
        onChange={setScientific}
      />
      <Field
        label="Enlace https de la foto"
        type="url"
        value={photoUrl}
        maxLength={500}
        onChange={setPhotoUrl}
      />
      {error && <ErrorState message={error} />}
    </Modal>
  );
}

export default function SpeciesCatalogPanel() {
  const toast = useToast();
  const list = useResource(listSpecies, []);
  const [editing, setEditing] = useState<Species | 'new' | null>(null);
  const [removing, setRemoving] = useState<Species | null>(null);
  const columns = useMemo<Column<Species>[]>(
    () => [
      { key: 'name', header: 'Nombre', render: (row) => row.commonNameEs },
      {
        key: 'scientific',
        header: 'Nombre científico',
        render: (row) => row.scientificName ?? '',
      },
      { key: 'kind', header: 'Tipo', render: (row) => SPECIES_KINDS[row.kind] },
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
              Eliminar
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
        <p className="muted">Catálogo que se usa en todas las rutas.</p>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setEditing('new')}
        >
          <Plus aria-hidden="true" />
          Agregar especie
        </button>
      </div>
      {list.error && (
        <ErrorState message={list.error} onRetry={() => void list.reload()} />
      )}
      {!list.data && !list.error && <LoadingState />}
      {list.data?.length === 0 && (
        <div className="card">
          <EmptyState title="El catálogo todavía está vacío." />
        </div>
      )}
      {list.data && list.data.length > 0 && (
        <DataTable
          caption="Catálogo de especies"
          columns={columns}
          rows={list.data}
          rowKey={(row) => row.id}
        />
      )}
      {editing && (
        <SpeciesModal
          species={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await list.reload();
            toast('Especie guardada.');
          }}
        />
      )}
      {removing && (
        <ConfirmDialog
          title="Eliminar especie"
          confirmLabel="Eliminar especie"
          destructive
          onClose={() => setRemoving(null)}
          onConfirm={async () => {
            await deleteSpecies(removing.id);
            await list.reload();
            toast('Especie eliminada.');
          }}
        >
          <p>
            <strong>{removing.commonNameEs}</strong> se quitará del catálogo y
            de las rutas que la usan.
          </p>
        </ConfirmDialog>
      )}
    </section>
  );
}
