// services/walletService.js

const { db: getDb, FieldValue } = require('../config/firebase');
const {
  TRANSACTION_TYPES,
  WITHDRAWAL_STATUS,
  MIN_WITHDRAWAL_THB,
  createTransactionDocument,
  createWithdrawalDocument,
  calculateSellerPayout,
} = require('../models/walletModel');

const db = getDb();

const USERS_COL        = 'users';
const TRANSACTIONS_COL = 'transactions';
const WITHDRAWALS_COL  = 'withdrawalRequests';


// Get Balance
const getWallet = async (sellerId) => {
  const userDoc = await db.collection(USERS_COL).doc(sellerId).get();
  if (!userDoc.exists) throw new Error('USER_NOT_FOUND');

  const user = userDoc.data();

  // Sum pending withdrawals so UI can show "pending" amount
  const pendingSnap = await db
    .collection(WITHDRAWALS_COL)
    .where('sellerId', '==', sellerId)
    .where('status', '==', WITHDRAWAL_STATUS.PENDING)
    .get();

  const pendingAmount = pendingSnap.docs.reduce(
    (sum, d) => sum + (d.data().amount || 0), 0
  );

  return {
    initialized:      user.walletInitialized === true || (user.sellerBalance > 0) || (user.sellerTotalEarned > 0),
    balance:          parseFloat((user.sellerBalance     || 0).toFixed(2)),
    totalEarned:      parseFloat((user.sellerTotalEarned || 0).toFixed(2)),
    totalWithdrawn:   parseFloat((user.sellerTotalWithdrawn || 0).toFixed(2)),
    pendingWithdrawal: parseFloat(pendingAmount.toFixed(2)),
    available:        parseFloat(
      Math.max(0, (user.sellerBalance || 0) - pendingAmount).toFixed(2)
    ),
  };
};

// Create Wallet
const initializeWallet = async (sellerId) => {
  const userRef = db.collection(USERS_COL).doc(sellerId);
  const userDoc = await userRef.get();
  if (!userDoc.exists) throw new Error('USER_NOT_FOUND');
 
  const user = userDoc.data();
  if (user.walletInitialized) {
    // Already set up — just return current state
    return getWallet(sellerId);
  }
 
  await userRef.update({
    walletInitialized:    true,
    sellerBalance:        user.sellerBalance        ?? 0,
    sellerTotalEarned:    user.sellerTotalEarned    ?? 0,
    sellerTotalWithdrawn: user.sellerTotalWithdrawn ?? 0,
    updatedAt:            new Date().toISOString(),
  });
 
  console.log(`[wallet] Wallet initialized for seller: ${sellerId}`);
  return getWallet(sellerId);
};

// Create seller credit after image sold
const creditSellerForSale = async ({ sellerId, orderId, imageId, imageName, salePrice }) => {
  const { gross, platformFee, net } = calculateSellerPayout(salePrice);

  const userRef = db.collection(USERS_COL).doc(sellerId);

  // Run balance update + transaction write in a Firestore transaction
  await db.runTransaction(async (txn) => {
    const userSnap = await txn.get(userRef);
    if (!userSnap.exists) throw new Error('SELLER_NOT_FOUND');

    const currentBalance = userSnap.data().sellerBalance || 0;
    const newBalance     = parseFloat((currentBalance + net).toFixed(2));
    const totalEarned    = parseFloat(((userSnap.data().sellerTotalEarned || 0) + net).toFixed(2));

    // Update user balance
    txn.update(userRef, {
      sellerBalance:      newBalance,
      sellerTotalEarned:  totalEarned,
      updatedAt:          new Date().toISOString(),
    });

    // Write transaction record
    const txnRef = db.collection(TRANSACTIONS_COL).doc();
    txn.set(txnRef, createTransactionDocument({
      sellerId,
      type:          TRANSACTION_TYPES.SALE,
      amount:        gross,
      platformFee,
      orderId,
      imageId,
      imageName,
      note:          `Sale of "${imageName}"`,
      balanceBefore: currentBalance,
      balanceAfter:  newBalance,
    }));
  });

  console.log(`[wallet] Credited ฿${net} (gross ฿${gross} - fee ฿${platformFee}) to seller: ${sellerId}`);

  // Fire-and-forget notification to seller
  createSaleNotification(sellerId, imageName, net).catch(() => {});

  return { gross, platformFee, net };
};

// Load Transaction
const getTransactions = async (sellerId, { limit = 20, startAfter = null } = {}) => {
  let query = db
    .collection(TRANSACTIONS_COL)
    .where('sellerId', '==', sellerId)
    .orderBy('createdAt', 'desc')
    .limit(limit);

  if (startAfter) {
    const cursor = await db.collection(TRANSACTIONS_COL).doc(startAfter).get();
    if (cursor.exists) query = query.startAfter(cursor);
  }

  const snap = await query.get();
  return snap.docs.map((d) => ({ txnId: d.id, ...d.data() }));
};

// Withdrawal Request
const requestWithdrawal = async (sellerId, { amount, bankName, accountNumber, accountName, note }) => {
  if (amount < MIN_WITHDRAWAL_THB) {
    throw new Error(`BELOW_MINIMUM:${MIN_WITHDRAWAL_THB}`);
  }

  const wallet = await getWallet(sellerId);

  if (amount > wallet.available) {
    throw new Error('INSUFFICIENT_BALANCE');
  }

  // Fetch seller name
  const userDoc = await db.collection(USERS_COL).doc(sellerId).get();
  const sellerName = userDoc.data()?.username || 'Unknown';

  const ref = db.collection(WITHDRAWALS_COL).doc();
  await ref.set(createWithdrawalDocument({
    sellerId,
    sellerName,
    amount,
    bankName,
    accountNumber,
    accountName,
    note,
  }));

  console.log(`[wallet] Withdrawal request ฿${amount} from seller: ${sellerId}`);
  return { withdrawalId: ref.id, amount, status: WITHDRAWAL_STATUS.PENDING };
};

// Cancel request
const cancelWithdrawal = async (withdrawalId, sellerId) => {
  const ref  = db.collection(WITHDRAWALS_COL).doc(withdrawalId);
  const snap = await ref.get();

  if (!snap.exists) throw new Error('WITHDRAWAL_NOT_FOUND');

  const data = snap.data();
  if (data.sellerId !== sellerId) throw new Error('FORBIDDEN');
  if (data.status !== WITHDRAWAL_STATUS.PENDING) throw new Error('CANNOT_CANCEL');

  await ref.update({
    status:    WITHDRAWAL_STATUS.CANCELLED,
    updatedAt: new Date().toISOString(),
  });
};

// Load Withdrawal
const getMyWithdrawals = async (sellerId, { limit = 20 } = {}) => {
  const snap = await db
    .collection(WITHDRAWALS_COL)
    .where('sellerId', '==', sellerId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return snap.docs.map((d) => ({ withdrawalId: d.id, ...d.data() }));
};


// Admin Section

// Verify Withdrawal
const processWithdrawal = async (withdrawalId, { status, adminNote, adminUid }) => {
  if (![WITHDRAWAL_STATUS.APPROVED, WITHDRAWAL_STATUS.REJECTED].includes(status)) {
    throw new Error('INVALID_STATUS');
  }

  const ref  = db.collection(WITHDRAWALS_COL).doc(withdrawalId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('WITHDRAWAL_NOT_FOUND');

  const withdrawal = snap.data();
  if (withdrawal.status !== WITHDRAWAL_STATUS.PENDING) throw new Error('NOT_PENDING');

  const now     = new Date().toISOString();
  const userRef = db.collection(USERS_COL).doc(withdrawal.sellerId);

  if (status === WITHDRAWAL_STATUS.APPROVED) {
    // Deduct from balance in a Firestore transaction
    await db.runTransaction(async (txn) => {
      const userSnap = await txn.get(userRef);
      if (!userSnap.exists) throw new Error('SELLER_NOT_FOUND');

      const currentBalance = userSnap.data().sellerBalance || 0;
      const newBalance     = parseFloat((currentBalance - withdrawal.amount).toFixed(2));
      const totalWithdrawn = parseFloat(
        ((userSnap.data().sellerTotalWithdrawn || 0) + withdrawal.amount).toFixed(2)
      );

      if (newBalance < 0) throw new Error('INSUFFICIENT_BALANCE');

      txn.update(userRef, {
        sellerBalance:        newBalance,
        sellerTotalWithdrawn: totalWithdrawn,
        updatedAt:            now,
      });

      // Write withdrawal transaction record
      const txnRef = db.collection(TRANSACTIONS_COL).doc();
      txn.set(txnRef, createTransactionDocument({
        sellerId:      withdrawal.sellerId,
        type:          TRANSACTION_TYPES.WITHDRAWAL,
        amount:        -withdrawal.amount,       // negative = debit
        platformFee:   0,
        orderId:       null,
        imageName:     null,
        note:          `Withdrawal to ${withdrawal.bankName} ${withdrawal.accountNumber}`,
        balanceBefore: currentBalance,
        balanceAfter:  newBalance,
      }));

      txn.update(ref, {
        status:      WITHDRAWAL_STATUS.APPROVED,
        adminNote:   adminNote || null,
        processedBy: adminUid,
        processedAt: now,
        updatedAt:   now,
      });
    });

    // Notify seller
    createWithdrawalNotification(withdrawal.sellerId, withdrawal.amount, 'approved').catch(() => {});
    console.log(`[wallet] Withdrawal APPROVED ฿${withdrawal.amount} for seller: ${withdrawal.sellerId}`);

  } else {
    // Rejected — just update the request status
    await ref.update({
      status:      WITHDRAWAL_STATUS.REJECTED,
      adminNote:   adminNote || 'Request rejected.',
      processedBy: adminUid,
      processedAt: now,
      updatedAt:   now,
    });

    createWithdrawalNotification(withdrawal.sellerId, withdrawal.amount, 'rejected').catch(() => {});
    console.log(`[wallet] Withdrawal REJECTED ฿${withdrawal.amount} for seller: ${withdrawal.sellerId}`);
  }

  return { withdrawalId, status };
};

// Get Pending Withdrawal
const getPendingWithdrawals = async ({ limit = 50, all = false } = {}) => {
  let query = db.collection(WITHDRAWALS_COL).orderBy('createdAt', 'asc').limit(limit);

  if (!all) query = query.where('status', '==', WITHDRAWAL_STATUS.PENDING);

  const snap = await query.get();
  return snap.docs.map((d) => ({ withdrawalId: d.id, ...d.data() }));
};


// Notification Section
const createSaleNotification = async (sellerId, imageName, net) => {
  await db.collection('notifications').add({
    userId:    sellerId,
    type:      'sale',
    title:     'You made a sale! 🎉',
    message:   `Your image "${imageName}" was purchased. ฿${net.toLocaleString('th-TH')} added to your wallet.`,
    isRead:    false,
    createdAt: new Date().toISOString(),
  });
};

const createWithdrawalNotification = async (sellerId, amount, status) => {
  const isApproved = status === 'approved';
  await db.collection('notifications').add({
    userId:    sellerId,
    type:      'withdrawal',
    title:     isApproved ? 'Withdrawal Approved ✓' : 'Withdrawal Rejected',
    message:   isApproved
      ? `Your withdrawal of ฿${amount.toLocaleString('th-TH')} has been processed.`
      : `Your withdrawal of ฿${amount.toLocaleString('th-TH')} was rejected. Please contact support.`,
    isRead:    false,
    createdAt: new Date().toISOString(),
  });
};

module.exports = {
  getWallet,
  initializeWallet,
  creditSellerForSale,
  getTransactions,
  requestWithdrawal,
  cancelWithdrawal,
  getMyWithdrawals,
  processWithdrawal,
  getPendingWithdrawals,
};