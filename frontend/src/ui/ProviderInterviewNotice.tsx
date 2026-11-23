import { useEffect, useState } from 'react';
import {
  MODALITY_LABELS,
  getMyInterviews,
  type Interview,
} from '../api/interviews';

export default function ProviderInterviewNotice() {
  const [interview, setInterview] = useState<Interview | null>(null);

  useEffect(() => {
    let active = true;
    void getMyInterviews()
      .then((result) => {
        if (active) setInterview(result.interviews[0] ?? null);
      })
      .catch(() => {
        if (active) setInterview(null);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!interview) return null;
  return (
    <div className="notice notice-info" role="status">
      <strong>Tienes una entrevista agendada.</strong>{' '}
      {MODALITY_LABELS[interview.modality]},{' '}
      {new Date(interview.scheduledAt).toLocaleString('es-BO', {
        dateStyle: 'short',
        timeStyle: 'short',
      })}
      {' · '}
      {interview.modality === 'VIRTUAL' ? (
        <a href={interview.location} target="_blank" rel="noopener noreferrer">
          Abrir la reunión
        </a>
      ) : (
        <span>Lugar: {interview.location}.</span>
      )}
    </div>
  );
}
