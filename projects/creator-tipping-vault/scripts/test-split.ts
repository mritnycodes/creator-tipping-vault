import 'dotenv/config';
import algosdk from 'algosdk';
import { AlgorandClient } from '@algorandfoundation/algokit-utils';
import { AlgoAmount } from '@algorandfoundation/algokit-utils/types/amount';
import { CreatorTippingVaultClient } from '../contracts/clients/CreatorTippingVaultClient';

const APP_ID = BigInt(775685206);
const POST_ID = 'post_split_001';

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

  const names = ['Primary creator', 'Co-creator', 'Treasury'];
  const accounts = [tipper, coCreator, treasury];

  const getBalances = async () =>
    Promise.all(
      accounts.map(async (a) => Number((await algorand.account.getInformation(a.addr)).balance.microAlgos)),
    );

  const before = await getBalances();

  const boxKey = algosdk.ABIType.from('string').encode(POST_ID);

  const payTxn = await algorand.createTransaction.payment({
    sender: tipper.addr,
    receiver: appClient.appAddress,
    amount: AlgoAmount.Algos(1),
  });

  await appClient.send.tip({
    args: { postId: POST_ID, payTxn },
    extraFee: AlgoAmount.MicroAlgos(3000),
    boxReferences: [boxKey],
    accountReferences: [coCreator.addr, treasury.addr],
  });

  const after = await getBalances();

  console.log('\n--- Balance change (microALGO) after a 1 ALGO tip ---');
  names.forEach((n, i) => console.log(`${n.padEnd(16)} ${after[i] - before[i]}`));

  const total = await appClient.send.getPostTotalTips({
    args: { postId: POST_ID },
    boxReferences: [boxKey],
  });
  console.log(`\nBox total for ${POST_ID}:`, total.return?.toString());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
