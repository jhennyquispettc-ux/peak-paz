import type { Difficulty } from '../api/types';
import { useI18n } from '../i18n/I18nContext';

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  EASY: 'Fácil',
  MODERATE: 'Moderado',
  HARD: 'Difícil',
};

const DIFFICULTY_LABELS_EN: Record<Difficulty, string> = {
  EASY: 'Easy',
  MODERATE: 'Moderate',
  HARD: 'Hard',
};

const MOUNTAINS: Record<Difficulty, number> = { EASY: 1, MODERATE: 2, HARD: 3 };

export default function DifficultyBadge({
  difficulty,
}: {
  difficulty: Difficulty;
}) {
  const { locale, pick } = useI18n();
  const label =
    locale === 'en'
      ? DIFFICULTY_LABELS_EN[difficulty]
      : DIFFICULTY_LABELS[difficulty];
  return (
    <span
      className="badge"
      aria-label={`${pick('Dificultad', 'Difficulty')} ${label}`}
    >
      <span className="mountains">
        {Array.from({ length: MOUNTAINS[difficulty] }, (_, index) => (
          <svg key={index} className="icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
          </svg>
        ))}
      </span>
      {label}
    </span>
  );
}
