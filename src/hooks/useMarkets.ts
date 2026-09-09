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

      if (diffMs <= 0) {
        setTimeRemaining('Resolving...');
        setProgressPercent(0);
        useMarketStore.getState().checkAndRolloverMarkets();
        return;
      }

      // Revalue dynamic market probabilities and active position cashouts smoothly every second
      useMarketStore.getState().tickLiveOddsAndPositions();

      const totalSecs = Math.floor(diffMs / 1000);
      const days = Math.floor(totalSecs / 86400);
      const hours = Math.floor((totalSecs % 86400) / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h ${mins}m`);
      } else if (hours > 0) {
        setTimeRemaining(
          `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        );
      } else {
        setTimeRemaining(
          `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        );
      }

      const totalWindowMs = selectedMarket.marketId.includes('1h')
        ? 60 * 60 * 1000
        : selectedMarket.marketId.includes('4h')
        ? 4 * 60 * 60 * 1000
        : 15 * 60 * 1000;
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
