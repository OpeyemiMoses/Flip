import { useState } from 'react';
import { useMarketStore } from '../store/marketStore';
import { BinaryMarket, SimpleTradeSide } from '../services/dreamdex';
import { TradingEngine, Position } from '../services/tradingEngine';
import confetti from 'canvas-confetti';

export function useTrade() {
  const {
    userBalanceUSD,
    setUserBalance,
    refreshPositions,
    refreshBalances,
    userAddress,
    addToast,
  } = useMarketStore();

  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [lastExecutedPosition, setLastExecutedPosition] = useState<Position | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const placeQuickBet = async (params: {
    market: BinaryMarket;
    side: SimpleTradeSide;
    amountUSD: number;
  }) => {
    const { market, side, amountUSD } = params;
    setError(null);

    if (amountUSD <= 0) {
      const msg = 'Please select a valid bet amount.';
      setError(msg);
      addToast({ type: 'warning', title: 'Invalid Amount', message: msg });
      return null;
    }

    setIsExecuting(true);
    addToast({
      type: 'info',
      title: 'Broadcasting Transaction',
      message: `Prompting wallet for $${amountUSD} ${side} on ${market.underlyingAsset}...`,
    });

    try {
      // Execute on-chain transaction on Somnia Shannon
      const { position, txHash } = await TradingEngine.executeQuickBet({
        market,
        side,
        amountUSD,
        userAddress: userAddress || undefined,
      });

      refreshPositions();
      refreshBalances();
      setLastExecutedPosition(position);
      setLastTxHash(txHash);

      addToast({
        type: 'success',
        title: 'Order Confirmed On-Chain',
        message: `Minted ${position.contractsCount.toFixed(2)} ${side} shares on ${market.underlyingAsset} ($${amountUSD})`,
        txHash,
      });

      // Trigger subtle particle burst on successful bet placement
      try {
        confetti({
          particleCount: 30,
          spread: 60,
          origin: { y: 0.8 },
          colors: side === 'UP' ? ['#00F59B', '#00C880'] : ['#FF3B69', '#E0245E'],
        });
      } catch {
        // Safe fallback if canvas is unavailable
      }

      return { position, txHash };
    } catch (err: any) {
      console.error('Trade execution failed:', err);
      const errMsg = err?.message || 'Failed to execute order on Somnia Shannon.';
      setError(errMsg);
      addToast({
        type: 'error',
        title: 'Transaction Cancelled',
        message: errMsg,
      });
      return null;
    } finally {
      setIsExecuting(false);
    }
  };

  return {
    placeQuickBet,
    isExecuting,
    lastExecutedPosition,
    lastTxHash,
    error,
  };
}
