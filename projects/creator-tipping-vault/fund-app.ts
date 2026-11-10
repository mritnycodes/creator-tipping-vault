import 'dotenv/config';
import algosdk from 'algosdk';
import { AlgorandClient } from '@algorandfoundation/algokit-utils';
import { AlgoAmount } from '@algorandfoundation/algokit-utils/types/amount';

const APP_ID = BigInt(775685206);

async function main() {
  const algorand = AlgorandClient.testNet();
  const deployer = await algorand.account.fromEnvironment('CREATOR');
  algorand.setSignerFromAccount(deployer);

  const appAddress = algosdk.getApplicationAddress(APP_ID).toString();
  console.log('App address:', appAddress);

  const res = await algorand.send.payment({
    sender: deployer.addr,
    receiver: appAddress,
    amount: AlgoAmount.Algos(0.5),
  });
  console.log('Funded app. Transaction ID:', res.txIds[0]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
