import React from 'react';

export interface WithdrawToWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWithdrawSuccess?: (amountUSD: number, txHash: string) => void;
}

/**
 * @deprecated FLIP is 100% non-custodial. Payouts and cash-outs settle directly to the user's Web3 wallet.
 */
export const WithdrawToWalletModal: React.FC<WithdrawToWalletModalProps> = () => null;
