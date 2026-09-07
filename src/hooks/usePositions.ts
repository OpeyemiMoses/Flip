import { useMemo } from 'react';
import { useMarketStore } from '../store/marketStore';
import { TradingEngine, Position } from '../services/tradingEngine';

export function usePositions() {
  const {
    positions,
    stats,
    refreshPositions,
    userBalanceUSD,
    setUserBalance,
    userAddress,
    addToast,
  } = useMarketStore();

  // Strictly filter positions for the active connected wallet
  const userPositions = useMemo(() => {
    if (!userAddress) return [];
    const normalized = userAddress.toLowerCase();
    return positions.filter(
      (p) => !p.userAddress || p.userAddress.toLowerCase() === normalized
    );
  }, [positions, userAddress]);

  const activePositions = userPositions.filter((p) => p.status === 'ACTIVE');
  const historyPositions = userPositions.filter((p) => p.status !== 'ACTIVE');

  const cashOut = async (positionId: string): Promise<Position | null> => {
    addToast({
      type: 'info',
      title: 'Settling Position',
      message: 'Broadcasting claim transaction to Somnia BinarySettlement...',
    });

    try {
      const updated = await TradingEngine.cashOutPosition(positionId, userAddress || undefined);
      if (updated) {
        setUserBalance(userBalanceUSD + updated.currentValueUSD);
        refreshPositions();
        addToast({
          type: 'success',
          title: 'Settlement Confirmed',
          message: `Claimed $${updated.currentValueUSD.toFixed(2)} on ${updated.marketTitle}`,
        });
      }
      return updated;
    } catch (err: any) {
      console.warn('Cash out cancelled or failed:', err);
      const errMsg = err?.message || 'Settlement claim cancelled in wallet.';
      addToast({
        type: 'error',
        title: 'Settlement Cancelled',
        message: errMsg,
      });
      return null;
    }
  };

  return {
    positions,
    activePositions,
    historyPositions,
    stats,
    cashOut,
    refreshPositions,
  };
}
