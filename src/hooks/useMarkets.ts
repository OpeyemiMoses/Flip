import { useEffect, useState } from 'react';
import { useMarketStore } from '../store/marketStore';
import { BinaryMarket } from '../services/dreamdex';

export function useMarkets() {
  const { markets, selectedMarketId, setSelectedMarketId, updateMarketProbabilities } =
    useMarketStore();

  const selectedMarket = markets.find((m) => m.marketId === selectedMarketId) || markets[0];

  // Time remaining calculation for the selected market
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(100);

  useEffect(() => {
    if (!selectedMarket) return;

    const interval = setInterval(() => {
      const expiry =
        selectedMarket.expiryDate instanceof Date
          ? selectedMarket.expiryDate.getTime()
          : new Date(selectedMarket.expiryDate || Date.now()).getTime();
      const now = Date.now();
      const diffMs = Math.max(0, expiry - now);

      const mins = Math.floor(diffMs / 60000);
      const secs = Math.floor((diffMs % 60000) / 1000);

      setTimeRemaining(
        `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      );

      // Total 15m window assumed for progress calculation
      const totalWindowMs = 15 * 60 * 1000;
      const progress = Math.min(Math.max((diffMs / totalWindowMs) * 100, 0), 100);
      setProgressPercent(progress);
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedMarket]);

  return {
    markets,
    selectedMarket,
    selectedMarketId,
    setSelectedMarketId,
    timeRemaining,
    progressPercent,
    updateMarketProbabilities,
  };
}
