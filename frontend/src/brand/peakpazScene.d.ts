export function createPeakPazScene(
  svg: SVGSVGElement | null,
  options: { variant?: string; tagline?: boolean; onDone?: () => void },
): { play: () => void; destroy: () => void };
