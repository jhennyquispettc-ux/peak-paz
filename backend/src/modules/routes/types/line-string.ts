export type Position = [number, number] | [number, number, number];

export interface LineString {
  type: 'LineString';
  coordinates: Position[];
}
