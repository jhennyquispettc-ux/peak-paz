import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { getGuideMe, updateGuideMe, type GuideMe } from '../../api/guide';
import { DOCUMENTS } from '../../api/verification';
import { useAction } from '../../hooks/useAction';
import { useResource } from '../../hooks/useResource';
import ErrorState from '../../ui/ErrorState';
import Facts from '../../ui/Facts';
import { Field } from '../../ui/Field';
import LoadingState from '../../ui/LoadingState';
import PageHeader from '../../ui/PageHeader';
import StatusBadge from '../../ui/StatusBadge';
import { useToast } from '../../ui/Toast';

function ProfileForm({
  me,
  onSaved,
}: {
  me: GuideMe;
  onSaved: () => Promise<void>;
}) {
  const toast = useToast();
  const [bioEs, setBioEs] = useState(me.bioEs ?? '');
  const [bioEn, setBioEn] = useState(me.bioEn ?? '');
  const [languages, setLanguages] = useState(me.languages.join(', '));
  const [years, setYears] = useState(String(me.yearsExperience));
  const { busy, error, run } = useAction();
  function submit(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      await updateGuideMe({
        ...(bioEs.trim() ? { bioEs: bioEs.trim() } : {}),
        ...(bioEn.trim() ? { bioEn: bioEn.trim() } : {}),
        languages: languages
          .split(',')
          .map((item) => item.trim().toLowerCase())
          .filter(Boolean),
        yearsExperience: Number(years),
      });
      await onSaved();
      toast('Perfil actualizado.');
    });
  }
  return (
    <form className="card form-stack" onSubmit={submit}>
      <h2 className="h3">Perfil público</h2>
      <div className="form-grid">
        <Field
          label="Idiomas, separados por comas"
          required
          value={languages}
          onChange={setLanguages}
        />
        <Field
          label="Años de experiencia"
          type="number"
          min={0}
          max={60}
          step="1"
          required
          value={years}
          onChange={setYears}
        />
        <Field
          label="Presentación en español"
          rows={4}
          value={bioEs}
          onChange={setBioEs}
        />
        <Field
          label="Presentación en inglés"
          rows={4}
          value={bioEn}
          onChange={setBioEn}
        />
      </div>
      {error && <ErrorState message={error} />}
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          Guardar perfil
        </button>
      </div>
    </form>
  );
}

export default function GuideProfilePage() {
  const profile = useResource(getGuideMe, []);
  const me = profile.data;
  return (
    <div className="page-stack">
      <PageHeader title="Perfil" intro="Tus datos y documentos." />
      {profile.error && (
        <ErrorState
          message={profile.error}
          onRetry={() => void profile.reload()}
        />
      )}
      {!me && !profile.error && <LoadingState />}
      {me && (
        <>
          <section className="card form-stack">
            <h2 className="h3">Identidad</h2>
            <Facts
              items={[
                {
                  label: 'Nombre',
                  value: `${me.user.firstName} ${me.user.lastName}`,
                },
                { label: 'Correo', value: me.user.email },
                { label: 'Cédula', value: me.nationalId },
                {
                  label: 'Calificación',
                  value: `${Number(me.ratingAverage).toFixed(1)} de 5, ${me.reviewsCount} reseñas`,
                },
              ]}
            />
          </section>
          <ProfileForm key={me.id} me={me} onSaved={profile.reload} />
          <section className="card form-stack">
            <h2 className="h3">Documentos</h2>
            <ul className="plain-list">
              {DOCUMENTS.map((document) => {
                const file = me.documents.find(
                  (item) => item.type === document.type,
                );
                const missing = me.missingDocuments.includes(document.type);
                return (
                  <li key={document.type}>
                    <span>
                      <strong>{document.label}</strong>
                      <br />
                      <small className="muted">
                        {file?.expiresAt
                          ? `Vence: ${file.expiresAt}`
                          : 'Sin vencimiento declarado'}
                      </small>
                    </span>
                    <StatusBadge tone={missing ? 'warning' : 'success'}>
                      {missing ? 'Falta o vencido' : 'Vigente'}
                    </StatusBadge>
                  </li>
                );
              })}
            </ul>
            <p className="notice">
              Al reemplazar un documento, tu cuenta vuelve a revisión. Mientras
              tanto atiendes tus reservas actuales, pero no recibes solicitudes
              nuevas.
            </p>
            <Link
              to="/mi-verificacion"
              className="btn btn-secondary align-start"
            >
              Gestionar documentos
            </Link>
          </section>
        </>
      )}
    </div>
  );
}
