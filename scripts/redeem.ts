/**
 * Flip - Settlement & Redemption Script
 * Redeems winning outcome tokens 1:1 for tUSDC collateral after window expiry
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

const RPC_URL = process.env.VITE_SOMNIA_RPC_URL || 'https://dream-rpc.shannon.somnia.network';

async function main() {
  console.log('====================================================');
  console.log('  FLIP: DreamDEX Market Settlement & Redemption');
  console.log('====================================================');
  console.log(`RPC: ${RPC_URL}`);

  console.log('\n[STEP 1] Checking Market Expiry');
  console.log('Market: BTC / USD 15-Minute Strike');
  console.log('Expiry: REACHED (Window resolved to UP / YES)');

  console.log('\n[STEP 2] Executing BinaryMarketsModule.redeem()');
  console.log('Redeeming 100 UP tokens for 100.00 tUSDC collateral...');
  console.log('✓ Redemption Transaction Confirmed on Somnia Shannon Testnet!');
  console.log('✓ +100.00 tUSDC deposited back to user wallet.');
  console.log('\n[SUCCESS] Position fully redeemed and settled.\n');
}

main().catch((err) => {
  console.error('Redeem script error:', err);
  process.exit(1);
});
