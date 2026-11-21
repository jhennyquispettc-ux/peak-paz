import type {
  AutonomyLevel,
  GearCategory,
  PointType,
  RouteDifficulty,
  SpeciesKind,
} from '../../../api/adminManage';

export const DIFFICULTY: Record<RouteDifficulty, string> = {
  EASY: 'Fácil',
  MODERATE: 'Moderado',
  HARD: 'Difícil',
};

export const AUTONOMY: Record<AutonomyLevel, string> = {
  SELF_GUIDED: 'Se puede ir sin guía',
  GUIDE_RECOMMENDED: 'Guía recomendado',
  GUIDE_REQUIRED: 'Guía obligatorio',
};

export const POINT_TYPES: Record<PointType, string> = {
  START: 'Inicio',
  END: 'Fin',
  CAMPSITE: 'Campamento',
  SHELTER: 'Refugio',
  WATER: 'Agua',
  VIEWPOINT: 'Mirador',
  DANGER: 'Peligro',
  RUINS: 'Ruinas',
  TRANSPORT: 'Transporte',
};

export const GEAR_CATEGORIES: Record<GearCategory, string> = {
  FOOD: 'Comida',
  WATER: 'Agua',
  CLOTHING: 'Ropa',
  EQUIPMENT: 'Equipo',
  FIRST_AID: 'Primeros auxilios',
};

export const SPECIES_KINDS: Record<SpeciesKind, string> = {
  FLORA: 'Flora',
  FAUNA: 'Fauna',
};

export function optionsOf<T extends string>(labels: Record<T, string>) {
  return (Object.keys(labels) as T[]).map((value) => ({
    value,
    label: labels[value],
  }));
}

export function optionalNumber(value: string) {
  return value.trim() === '' ? undefined : Number(value);
}

export function optionalText(value: string) {
  const text = value.trim();
  return text === '' ? undefined : text;
}
