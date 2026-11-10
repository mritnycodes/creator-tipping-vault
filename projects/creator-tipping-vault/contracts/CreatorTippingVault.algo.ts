import { Contract } from '@algorandfoundation/tealscript';

export class CreatorTippingVault extends Contract {
  // Global configuration state
  primaryCreator = GlobalStateKey<Address>();
  coCreator = GlobalStateKey<Address>();
  treasury = GlobalStateKey<Address>();

  // Box storage mapping postId -> totalMicroAlgosTipped
  postTips = BoxMap<string, uint64>();

  /**
   * Initialize contract recipients
   */
  createApplication(primary: Address, coCreator: Address, treasury: Address): void {
    this.primaryCreator.value = primary;
    this.coCreator.value = coCreator;
    this.treasury.value = treasury;
  }

  /**
   * Tip a post and split revenue automatically (85% / 10% / 5%)
   */
  tip(postId: string, payTxn: PayTxn): void {
    // 1. Verify tip goes to contract address
    verifyPayTxn(payTxn, {
      receiver: this.app.address,
    });

    const totalAmount = payTxn.amount;
    
    // 2. Calculate split amounts
    const primaryAmount = (totalAmount * 85) / 100;
    const coCreatorAmount = (totalAmount * 10) / 100;
    const treasuryAmount = totalAmount - primaryAmount - coCreatorAmount;

    // 3. Issue inner transactions to distribute funds
    sendPayment({
      receiver: this.primaryCreator.value,
      amount: primaryAmount,
    });

    sendPayment({
      receiver: this.coCreator.value,
      amount: coCreatorAmount,
    });

    sendPayment({
      receiver: this.treasury.value,
      amount: treasuryAmount,
    });

    // 4. Update box storage for postId
    if (this.postTips(postId).exists) {
      this.postTips(postId).value = this.postTips(postId).value + totalAmount;
    } else {
      this.postTips(postId).value = totalAmount;
    }
  }

  /**
   * View method to fetch total tips for a specific post
   */
  getPostTotalTips(postId: string): uint64 {
    return this.postTips(postId).value;
  }
}