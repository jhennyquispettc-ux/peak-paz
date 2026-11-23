import { useState, type FormEvent } from 'react';
import type {
  AutonomyLevel,
  RouteDetail,
  RouteDifficulty,
  RoutePayload,
} from '../../../api/adminManage';
import { useAction } from '../../../hooks/useAction';
import ErrorState from '../../../ui/ErrorState';
import { Field, SelectField } from '../../../ui/Field';
import { AUTONOMY, DIFFICULTY, optionalText, optionsOf } from './routeLabels';

const TEXT_DEFAULTS = {
  nameEs: '',
  nameEn: '',
  descriptionEs: '',
  descriptionEn: '',
  howToGetThereEs: '',
  howToGetThereEn: '',
  bestSeasonEs: '',
  bestSeasonEn: '',
  emergencyContacts: '',
  startTimeFrom: '06:00',
  startTimeTo: '09:00',
  days: '1',
  distanceKm: '',
  elevationGainM: '',
  elevationLossM: '',
  maxAltitudeM: '',
  startLatitude: '',
  startLongitude: '',
  privatePrice: '',
  privateMaxPeople: '5',
  groupMinPrice: '',
  groupMaxPeople: '12',
};

type FormValues = typeof TEXT_DEFAULTS;

function toForm(route: RouteDetail | null): FormValues {
  if (!route) return TEXT_DEFAULTS;
  return {
    nameEs: route.nameEs,
    nameEn: route.nameEn,
    descriptionEs: route.descriptionEs,
    descriptionEn: route.descriptionEn,
    howToGetThereEs: route.howToGetThereEs,
    howToGetThereEn: route.howToGetThereEn,
    bestSeasonEs: route.bestSeasonEs ?? '',
    bestSeasonEn: route.bestSeasonEn ?? '',
    emergencyContacts: route.emergencyContacts,
    startTimeFrom: route.startTimeFrom.slice(0, 5),
    startTimeTo: route.startTimeTo.slice(0, 5),
    days: String(route.days),
    distanceKm: String(route.distanceKm),
    elevationGainM: String(route.elevationGainM),
    elevationLossM: String(route.elevationLossM),
    maxAltitudeM: String(route.maxAltitudeM),
    startLatitude: String(route.startLatitude),
    startLongitude: String(route.startLongitude),
    privatePrice: String(route.privatePrice),
    privateMaxPeople: String(route.privateMaxPeople),
    groupMinPrice: String(route.groupMinPrice),
    groupMaxPeople: String(route.groupMaxPeople),
  };
}

export default function RouteDataForm({
  route,
  onSave,
}: {
  route: RouteDetail | null;
  onSave: (payload: RoutePayload) => Promise<void>;
}) {
  const [form, setForm] = useState<FormValues>(() => toForm(route));
  const [difficulty, setDifficulty] = useState<RouteDifficulty>(
    route?.difficulty ?? 'MODERATE',
  );
  const [autonomy, setAutonomy] = useState<AutonomyLevel>(
    route?.autonomyLevel ?? 'GUIDE_RECOMMENDED',
  );
  const { busy, error, run } = useAction();
  const bind = (key: keyof FormValues) => ({
    value: form[key],
    onChange: (value: string) =>
      setForm((current) => ({ ...current, [key]: value })),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    void run(() =>
      onSave({
        nameEs: form.nameEs.trim(),
        nameEn: form.nameEn.trim(),
        descriptionEs: form.descriptionEs.trim(),
        descriptionEn: form.descriptionEn.trim(),
        howToGetThereEs: form.howToGetThereEs.trim(),
        howToGetThereEn: form.howToGetThereEn.trim(),
        bestSeasonEs: optionalText(form.bestSeasonEs),
        bestSeasonEn: optionalText(form.bestSeasonEn),
        emergencyContacts: form.emergencyContacts.trim(),
        difficulty,
        autonomyLevel: autonomy,
        startTimeFrom: form.startTimeFrom.slice(0, 5),
        startTimeTo: form.startTimeTo.slice(0, 5),
        days: Number(form.days),
        distanceKm: Number(form.distanceKm),
        elevationGainM: Number(form.elevationGainM),
        elevationLossM: Number(form.elevationLossM),
        maxAltitudeM: Number(form.maxAltitudeM),
        startLatitude: Number(form.startLatitude),
        startLongitude: Number(form.startLongitude),
        privatePrice: Number(form.privatePrice),
        privateMaxPeople: Number(form.privateMaxPeople),
        groupMinPrice: Number(form.groupMinPrice),
        groupMaxPeople: Number(form.groupMaxPeople),
      }),
    );
  }

  return (
    <form className="card form-stack" onSubmit={submit}>
      <h2 className="h3">Información general</h2>
      <div className="form-grid">
        <Field
          label="Nombre en español"
          required
          maxLength={120}
          {...bind('nameEs')}
        />
        <Field
          label="Nombre en inglés"
          required
          maxLength={120}
          {...bind('nameEn')}
        />
        <SelectField
          label="Dificultad"
          value={difficulty}
          options={optionsOf(DIFFICULTY)}
          onChange={setDifficulty}
        />
        <SelectField
          label="Autonomía"
          value={autonomy}
          options={optionsOf(AUTONOMY)}
          onChange={setAutonomy}
        />
        <Field
          label="Descripción en español"
          rows={4}
          required
          maxLength={5000}
          {...bind('descriptionEs')}
        />
        <Field
          label="Descripción en inglés"
          rows={4}
          required
          maxLength={5000}
          {...bind('descriptionEn')}
        />
      </div>

      <h2 className="h3">Recorrido</h2>
      <div className="form-grid form-grid-3">
        <Field
          label="Días"
          type="number"
          min={1}
          max={15}
          step="1"
          required
          {...bind('days')}
        />
        <Field
          label="Distancia en km"
          type="number"
          min={0.1}
          step="0.1"
          required
          {...bind('distanceKm')}
        />
        <Field
          label="Altitud máxima en m"
          type="number"
          min={0}
          max={7000}
          step="1"
          required
          {...bind('maxAltitudeM')}
        />
        <Field
          label="Desnivel de subida en m"
          type="number"
          min={0}
          step="1"
          required
          {...bind('elevationGainM')}
        />
        <Field
          label="Desnivel de bajada en m"
          type="number"
          min={0}
          step="1"
          required
          {...bind('elevationLossM')}
        />
        <span />
        <Field
          label="Inicio más temprano"
          type="time"
          required
          {...bind('startTimeFrom')}
        />
        <Field
          label="Inicio más tarde"
          type="time"
          required
          {...bind('startTimeTo')}
        />
        <span />
        <Field
          label="Latitud de partida"
          type="number"
          min={-90}
          max={90}
          step="any"
          required
          {...bind('startLatitude')}
        />
        <Field
          label="Longitud de partida"
          type="number"
          min={-180}
          max={180}
          step="any"
          required
          {...bind('startLongitude')}
        />
      </div>

      <h2 className="h3">Precios y cupos</h2>
      <div className="form-grid">
        <Field
          label="Precio del tour privado, en Bs"
          type="number"
          min={0.01}
          step="0.01"
          required
          {...bind('privatePrice')}
        />
        <Field
          label="Máximo de personas en privado"
          type="number"
          min={1}
          max={5}
          step="1"
          required
          {...bind('privateMaxPeople')}
        />
        <Field
          label="Precio mínimo grupal, en Bs"
          type="number"
          min={0.01}
          step="0.01"
          required
          {...bind('groupMinPrice')}
        />
        <Field
          label="Máximo de personas en grupo"
          type="number"
          min={3}
          max={50}
          step="1"
          required
          {...bind('groupMaxPeople')}
        />
      </div>

      <h2 className="h3">Información práctica</h2>
      <div className="form-grid">
        <Field
          label="Cómo llegar, en español"
          rows={3}
          required
          maxLength={3000}
          {...bind('howToGetThereEs')}
        />
        <Field
          label="Cómo llegar, en inglés"
          rows={3}
          required
          maxLength={3000}
          {...bind('howToGetThereEn')}
        />
        <Field
          label="Mejor época, en español"
          maxLength={1000}
          {...bind('bestSeasonEs')}
        />
        <Field
          label="Mejor época, en inglés"
          maxLength={1000}
          {...bind('bestSeasonEn')}
        />
        <Field
          label="Contactos de emergencia"
          rows={2}
          required
          maxLength={1000}
          {...bind('emergencyContacts')}
        />
      </div>

      {error && <ErrorState message={error} />}
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {route ? 'Guardar cambios' : 'Crear ruta'}
        </button>
      </div>
    </form>
  );
}
