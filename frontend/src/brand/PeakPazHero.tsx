import { useEffect, useRef } from 'react';
import { createPeakPazScene } from './peakpazScene';

interface PeakPazHeroProps {
  variant?: 'full' | 'walk' | 'celebrate';
  tagline?: boolean;
  replayKey?: number;
  className?: string;
}

export default function PeakPazHero({
  variant = 'full',
  tagline = true,
  replayKey = 0,
  className,
}: PeakPazHeroProps) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const scene = createPeakPazScene(ref.current, { variant, tagline });
    return () => scene.destroy();
  }, [variant, tagline, replayKey]);

  return (
    <svg
      ref={ref}
      className={className}
      role="img"
      aria-label="Un guía ayuda a un turista a llegar a la cumbre y juntos forman el logo de Peak Paz"
      viewBox="0 0 320 290"
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  );
}
