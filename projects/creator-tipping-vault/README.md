# CreatorTippingVault

An Algorand smart contract (TealScript + AlgoKit) that automates content tipping and revenue splitting on-chain.

## What it does

Anyone can tip a post by sending ALGO to the contract. The contract splits the tip with inner transactions:

| Recipient | Share |
|---|---|
| Primary creator | 85% |
| Co-creator / editor | 10% |
| Community treasury | 5% (remainder, so no rounding dust is lost) |

Cumulative tips per post ID are stored in box storage.

## Methods

- `createApplication(primary, coCreator, treasury)`: sets the three recipients at creation.
- `tip(postId, payTxn)`: takes a payment to the app address in the same group, splits it, and adds it to the post total.
- `getPostTotalTips(postId)`: returns the cumulative tips for a post.

## TestNet deployment

- App ID: `775685206`
- App address: `RLV546HZUFL2W6Y5BONFNF3EBN5FF4G36E7J7DSTQAJJ7IEVIV3CDZGY2M`
- Explorer: https://lora.algokit.io/testnet/application/775685206
- Example tip transaction: `B45CMOO4ELCBUY6KKD77VJP3JAU46ZXREEMGRPREYSZ3C2QP2HHQ`
- Example post box: `post_002` (total 1,000,000 microALGO)

## Calling `tip`

1. Send a payment to the app address, grouped before the app call.
2. Add an extra fee of 3000 microALGO to cover the three inner payments.
3. Include the post's box (ABI-encoded string) in the box references.
4. Include the co-creator and treasury addresses in the account references.
5. Each recipient account must hold the 0.1 ALGO minimum balance.

The contract must hold some ALGO to pay for new boxes.

## Project layout

- `contracts/CreatorTippingVault.algo.ts`: contract source
- `contracts/artifacts/CreatorTippingVault.arc56.json`: ARC-56 app spec
- `contracts/clients/`: generated TypeScript client
- `__test__/CreatorTippingVault.test.ts`: Jest tests (LocalNet)
- `scripts/`: TestNet deploy and split-check scripts
- `deploy.ts`, `fund-app.ts`, `test-tip.ts`: helper scripts

## Run it

```bash
npm install
algokit localnet start
npm run build
npx jest
```

TestNet scripts need a `.env` with `CREATOR_MNEMONIC`, `COCREATOR_MNEMONIC` and `TREASURY_MNEMONIC` for throwaway TestNet accounts. Never commit `.env`.

## Test results

5 Jest tests pass on LocalNet: the 85/10/5 split, box total, accumulation across tips, separate totals per post, and rejection of a payment not sent to the contract. A 1 ALGO tip on TestNet gave +100,000 microALGO to the co-creator and +50,000 to the treasury.

## Limitations

- Challenge prototype: not audited and not production-ready.
- Recipients are fixed at creation and cannot be changed.
- Callers must supply account and box references themselves.
- There is no withdrawal or refund path.