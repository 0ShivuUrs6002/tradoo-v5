import { useWorld } from './WorldProvider';

export const WorldTransition = () => {
  const { transitioning } = useWorld();

  return (
    <div className={`world-transition-overlay${transitioning ? ' active' : ''}`}>
      <div className="burst-circle" />
      {/* Particle rings */}
      <div className="transition-ring ring-1" />
      <div className="transition-ring ring-2" />
      <div className="transition-ring ring-3" />
      {/* Center flash */}
      <div className="transition-flash" />
    </div>
  );
};
