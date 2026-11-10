import 'dotenv/config';
import algosdk from 'algosdk';
import { AlgorandClient } from '@algorandfoundation/algokit-utils';
import { AlgoAmount } from '@algorandfoundation/algokit-utils/types/amount';
import { CreatorTippingVaultClient } from './contracts/clients/CreatorTippingVaultClient';

const APP_ID = BigInt(775685206);
const POST_ID = process.argv[2] ?? 'post_001';

async function main() {
  const algorand = AlgorandClient.testNet();
  const tipper = await algorand.account.fromEnvironment('CREATOR');
  const coCreator = await algorand.account.fromEnvironment('COCREATOR');
  const treasury = await algorand.account.fromEnvironment('TREASURY');
  algorand.setSignerFromAccount(tipper);

  const appClient = algorand.client.getTypedAppClientById(CreatorTippingVaultClient, {
    appId: APP_ID,
    defaultSender: tipper.addr,
  });

  const boxKey = algosdk.ABIType.from('string').encode(POST_ID);

  const payTxn = await algorand.createTransaction.payment({
    sender: tipper.addr,
    receiver: appClient.appAddress,
    amount: AlgoAmount.Algos(1),
  });

  const result = await appClient.send.tip({
    args: { postId: POST_ID, payTxn },
    extraFee: AlgoAmount.MicroAlgos(3000),
    boxReferences: [boxKey],
    accountReferences: [coCreator.addr, treasury.addr],
  });
  console.log('Tip successful! Transaction IDs:', result.txIds.join(', '));

  const total = await appClient.send.getPostTotalTips({
    args: { postId: POST_ID },
    boxReferences: [boxKey],
  });
  console.log(`Total tips for ${POST_ID} (microALGO):`, total.return?.toString());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
