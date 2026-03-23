import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useWorld } from './WorldProvider';

export const AssetDropdown = () => {
  const { worldConfig, currentAsset, switchAsset, activeWorld } = useWorld();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (activeWorld === 'nifty') return null;

  return (
    <div className="asset-dropdown-wrap" ref={ref}>
      <button className="asset-dropdown-btn" onClick={() => setOpen(!open)}>
        <span style={{ color: 'var(--world-accent, var(--text-primary))', fontSize: 12 }}>
          {currentAsset?.label || 'Select'}
        </span>
        <ChevronDown size={12} style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      {open && (
        <div className="asset-dropdown-menu" style={{
          right: 'auto', left: 0, maxWidth: 'calc(100vw - 32px)', minWidth: 180
        }}>
          {worldConfig.assets.map(a => (
            <button
              key={a.id}
              className={`asset-dropdown-item${a.id === currentAsset?.id ? ' active' : ''}`}
              onClick={() => { switchAsset(a.id); setOpen(false); }}
            >
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: a.id === currentAsset?.id ? 'var(--world-accent, var(--accent-base))' : 'var(--border-light)',
                flexShrink: 0
              }} />
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
