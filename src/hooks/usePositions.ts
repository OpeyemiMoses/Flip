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
      (p) => p.userAddress && p.userAddress.toLowerCase() === normalized
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
        const payout =
          updated.cashoutPayoutUSD !== undefined
            ? updated.cashoutPayoutUSD
            : updated.currentValueUSD;
        const freshBal = TradingEngine.getPortfolioBalance(userAddress || undefined);
        setUserBalance(freshBal);
        refreshPositions();
        useMarketStore.getState().refreshBalances();

        const isWonClaim = updated.status === 'CLAIMED';
        const pnl = updated.unrealizedPnLUSD;
        const isProfit = pnl >= 0;
        addToast({
          type: 'success',
          title: isWonClaim ? 'Winnings Claimed!' : isProfit ? 'Settled with Profit!' : 'Settlement Confirmed',
          message: isWonClaim
            ? `Claimed $${payout.toFixed(2)} USDso (+$${Math.max(0, pnl).toFixed(2)} profit). Rewards credited directly to your balance.`
            : `Cashed out $${payout.toFixed(2)} USDso (${isProfit ? '+' : ''}$${pnl.toFixed(2)}). Collateral settled directly to your wallet.`,
          txHash: updated.txHash,
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
    positions: userPositions,
    allPositions: positions,
    activePositions,
    historyPositions,
    stats,
    cashOut,
    refreshPositions,
  };
}
