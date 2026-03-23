import { createContext, useContext, useState, useEffect, useCallback } from 'react';

// ─── Asset Definitions ───────────────────────────────────────────────────────

const WORLDS = {
  nifty: {
    label: 'Indian Markets',
    assets: [
      { id: 'NIFTY', label: 'Nifty 50', palette: 'default' }
    ]
  },
  commodities: {
    label: 'Commodities',
    assets: [
      { id: 'GOLD',   label: 'Gold (XAU)',       palette: 'gold' },
      { id: 'SILVER', label: 'Silver (XAG)',      palette: 'silver' },
      { id: 'CRUDE',  label: 'Crude Oil (WTI)',   palette: 'oil' },
      { id: 'NATGAS', label: 'Natural Gas',       palette: 'gas' },
      { id: 'COPPER', label: 'Copper (HG)',       palette: 'copper' }
    ]
  },
  crypto: {
    label: 'Crypto Universe',
    assets: [
      { id: 'BTC', label: 'Bitcoin',   palette: 'btc' },
      { id: 'ETH', label: 'Ethereum',  palette: 'eth' },
      { id: 'SOL', label: 'Solana',    palette: 'sol' },
      { id: 'XRP', label: 'Ripple',    palette: 'xrp' },
      { id: 'BNB', label: 'BNB Chain', palette: 'bnb' }
    ]
  }
};

const WorldContext = createContext(null);

export const WorldProvider = ({ children }) => {
  const [activeWorld, setActiveWorld] = useState(() =>
    localStorage.getItem('TRADO_WORLD') || 'nifty'
  );
  const [selectedAsset, setSelectedAsset] = useState(() =>
    localStorage.getItem('TRADO_ASSET') || 'NIFTY'
  );
  const [transitioning, setTransitioning] = useState(false);

  // Persist
  useEffect(() => {
    localStorage.setItem('TRADO_WORLD', activeWorld);
    localStorage.setItem('TRADO_ASSET', selectedAsset);
  }, [activeWorld, selectedAsset]);

  // Apply world class to html element
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('world-nifty', 'world-commodities', 'world-crypto');
    root.classList.add(`world-${activeWorld}`);

    // Apply asset palette
    const world = WORLDS[activeWorld];
    const asset = world?.assets.find(a => a.id === selectedAsset);
    const palette = asset?.palette || 'default';
    root.setAttribute('data-palette', palette);
  }, [activeWorld, selectedAsset]);

  const switchWorld = useCallback((worldId) => {
    if (worldId === activeWorld) return;
    setTransitioning(true);
    setTimeout(() => {
      setActiveWorld(worldId);
      const firstAsset = WORLDS[worldId]?.assets[0]?.id;
      if (firstAsset) setSelectedAsset(firstAsset);
      setTimeout(() => setTransitioning(false), 600);
    }, 800);
  }, [activeWorld]);

  const switchAsset = useCallback((assetId) => {
    setSelectedAsset(assetId);
  }, []);

  const worldConfig = WORLDS[activeWorld];
  const currentAsset = worldConfig?.assets.find(a => a.id === selectedAsset) || worldConfig?.assets[0];

  return (
    <WorldContext.Provider value={{
      activeWorld,
      selectedAsset,
      worldConfig,
      currentAsset,
      transitioning,
      worlds: WORLDS,
      switchWorld,
      switchAsset
    }}>
      {children}
    </WorldContext.Provider>
  );
};

export const useWorld = () => {
  const ctx = useContext(WorldContext);
  if (!ctx) throw new Error('useWorld must be inside WorldProvider');
  return ctx;
};
