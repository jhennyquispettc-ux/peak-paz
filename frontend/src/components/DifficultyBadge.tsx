import type { Difficulty } from '../api/types';

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  EASY: 'Fácil',
  MODERATE: 'Moderado',
  HARD: 'Difícil',
};

const MOUNTAINS: Record<Difficulty, number> = { EASY: 1, MODERATE: 2, HARD: 3 };

export default function DifficultyBadge({
  difficulty,
}: {
  difficulty: Difficulty;
}) {
  return (
    <span
      className="badge"
      aria-label={`Dificultad ${DIFFICULTY_LABELS[difficulty]}`}
    >
      <span className="mountains">
        {Array.from({ length: MOUNTAINS[difficulty] }, (_, index) => (
          <svg key={index} className="icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
          </svg>
        ))}
      </span>
      {DIFFICULTY_LABELS[difficulty]}
    </span>
  );
}
