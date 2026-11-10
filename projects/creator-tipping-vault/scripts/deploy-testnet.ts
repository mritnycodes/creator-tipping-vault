import 'dotenv/config';
import { AlgorandClient } from '@algorandfoundation/algokit-utils';
import { AlgoAmount } from '@algorandfoundation/algokit-utils/types/amount';
import { CreatorTippingVaultFactory } from '../contracts/clients/CreatorTippingVaultClient';

async function main() {
  const algorand = AlgorandClient.testNet();
  const deployer = await algorand.account.fromEnvironment('CREATOR');
  const coCreator = await algorand.account.fromEnvironment('COCREATOR');
  const treasury = await algorand.account.fromEnvironment('TREASURY');
  algorand.setSignerFromAccount(deployer);

  const factory = algorand.client.getTypedAppFactory(CreatorTippingVaultFactory, {
    defaultSender: deployer.addr,
  });

  const { appClient, result } = await factory.send.create.createApplication({
    args: {
      primary: deployer.addr.toString(),
      coCreator: coCreator.addr.toString(),
      treasury: treasury.addr.toString(),
    },
  });

  // Fund the contract so it can pay for box storage
  await algorand.send.payment({
    sender: deployer.addr,
    receiver: appClient.appAddress,
    amount: AlgoAmount.Algos(0.5),
  });

  console.log('Deployed. App ID:', result.appId.toString());
  console.log('App address:', appClient.appAddress.toString());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
