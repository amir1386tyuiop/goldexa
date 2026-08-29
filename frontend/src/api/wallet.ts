import { api } from './client'

/** Wallet and payment API facade. */
export const walletApi = {
  getWallet: api.getWallet,
  getWalletTransactions: api.getWalletTransactions,
  getPaymentTransactions: api.getPaymentTransactions,
  createPaymentTransaction: api.createPaymentTransaction,
}

export type { CreatePaymentTransactionInput } from './client'
export type { PaymentTransaction, Wallet, WalletTransaction } from '@/types'
