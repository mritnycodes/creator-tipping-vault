/// <reference types="jest" />
import algosdk from 'algosdk';
import { AlgorandClient } from '@algorandfoundation/algokit-utils';
import { AlgoAmount } from '@algorandfoundation/algokit-utils/types/amount';
import {
  CreatorTippingVaultClient,
  CreatorTippingVaultFactory,
} from '../contracts/clients/CreatorTippingVaultClient';

const algorand = AlgorandClient.defaultLocalNet();

let appClient: CreatorTippingVaultClient;
let tipper: Awaited<ReturnType<typeof algorand.account.random>>;
let primary: Awaited<ReturnType<typeof algorand.account.random>>;
let coCreator: Awaited<ReturnType<typeof algorand.account.random>>;
let treasury: Awaited<ReturnType<typeof algorand.account.random>>;

const boxKey = (postId: string) => algosdk.ABIType.from('string').encode(postId);

const balanceOf = async (addr: string | algosdk.Address) =>
  Number((await algorand.account.getInformation(addr.toString())).balance.microAlgos);

const sendTip = async (postId: string, microAlgos: number, receiver?: string) => {
  const payTxn = await algorand.createTransaction.payment({
    sender: tipper.addr,
    receiver: receiver ?? appClient.appAddress,
    amount: AlgoAmount.MicroAlgos(microAlgos),
  });
  return appClient.send.tip({
    args: { postId, payTxn },
    sender: tipper.addr,
    extraFee: AlgoAmount.MicroAlgos(3000),
    boxReferences: [boxKey(postId)],
    accountReferences: [primary.addr, coCreator.addr, treasury.addr],
  });
};

const readTotal = async (postId: string) => {
  const res = await appClient.send.getPostTotalTips({
    args: { postId },
    boxReferences: [boxKey(postId)],
  });
  return res.return?.toString();
};

beforeAll(async () => {
  const dispenser = await algorand.account.localNetDispenser();
  algorand.setSignerFromAccount(dispenser);

  tipper = algorand.account.random();
  primary = algorand.account.random();
  coCreator = algorand.account.random();
  treasury = algorand.account.random();
  for (const acct of [tipper, primary, coCreator, treasury]) {
    algorand.setSignerFromAccount(acct);
    await algorand.send.payment({
      sender: dispenser.addr,
      receiver: acct.addr,
      amount: AlgoAmount.Algos(10),
    });
  }

  const factory = algorand.client.getTypedAppFactory(CreatorTippingVaultFactory, {
    defaultSender: primary.addr,
  });
  const created = await factory.send.create.createApplication({
    args: {
      primary: primary.addr.toString(),
      coCreator: coCreator.addr.toString(),
      treasury: treasury.addr.toString(),
    },
  });
  appClient = created.appClient;

  // The app needs ALGO to cover box storage
  await algorand.send.payment({
    sender: dispenser.addr,
    receiver: appClient.appAddress,
    amount: AlgoAmount.Algos(1),
  });
});

describe('CreatorTippingVault', () => {
  test('splits a 1 ALGO tip 85 / 10 / 5', async () => {
    const before = [
      await balanceOf(primary.addr),
      await balanceOf(coCreator.addr),
      await balanceOf(treasury.addr),
    ];

    await sendTip('post_a', 1_000_000);

    const after = [
      await balanceOf(primary.addr),
      await balanceOf(coCreator.addr),
      await balanceOf(treasury.addr),
    ];

    expect(after[0] - before[0]).toBe(850_000);
    expect(after[1] - before[1]).toBe(100_000);
    expect(after[2] - before[2]).toBe(50_000);
  });

  test('records the tip total in box storage', async () => {
    expect(await readTotal('post_a')).toBe('1000000');
  });

  test('accumulates totals across tips to the same post', async () => {
    await sendTip('post_b', 400_000);
    await sendTip('post_b', 600_000);
    expect(await readTotal('post_b')).toBe('1000000');
  });

  test('keeps separate totals for different posts', async () => {
    await sendTip('post_d', 250_000);
    await sendTip('post_e', 125_000);
    expect(await readTotal('post_d')).toBe('250000');
    expect(await readTotal('post_e')).toBe('125000');
  });

  test('rejects a payment that is not sent to the contract', async () => {
    const stranger = algorand.account.random();
    await expect(sendTip('post_c', 1_000_000, stranger.addr.toString())).rejects.toThrow();
  });
});
