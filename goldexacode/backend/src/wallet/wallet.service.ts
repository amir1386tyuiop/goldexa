import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { ConfigService } from '@nestjs/config'
import { DataSource, EntityManager, Repository } from 'typeorm'
import { Wallet } from './wallet.entity'
import { WalletTransaction, WalletTransactionType } from './wallet-transaction.entity'
import { GoldPricingService } from '../gold-pricing/gold-pricing.service'
import { GoldPriceType } from '../gold-pricing/gold-price.entity'
import { AuditLogger } from '../common/audit-logger.service'
import {
  CreateWalletDto,
  WalletDepositDto,
  WalletGoldBuyDto,
  WalletGoldSellDto,
  WalletPaymentDto,
  WalletTransactionDto,
} from './create-wallet.dto'

/**
 * Wallet ledger rules (financial core):
 * - Every mutation runs inside a single DB transaction with a pessimistic
 *   write-lock on the wallet row, so concurrent buys/sells cannot race.
 * - `amount` always carries the signed RIAL impact on the balance, so the
 *   golden invariant holds: wallet.balance === SUM(transactions.amount).
 * - `amountGrams` carries the signed gold impact, so:
 *   wallet.goldBalanceGrams === SUM(transactions.amount_grams).
 * - Buying gold debits rials and credits grams; selling does the reverse,
 *   both priced from the live gold price with a configurable spread.
 */
@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private transactionRepository: Repository<WalletTransaction>,
    private readonly dataSource: DataSource,
    private readonly goldPricing: GoldPricingService,
    private readonly configService: ConfigService,
    private readonly audit: AuditLogger,
  ) {}

  async findByUser(userId: string): Promise<Wallet | null> {
    return this.walletRepository.findOneBy({ userId })
  }

  async create(data: CreateWalletDto): Promise<Wallet> {
    await this.ensureWallet(data.userId)
    const wallet = await this.findByUser(data.userId)
    if (wallet && data.goldBalanceGrams && Number(wallet.goldBalanceGrams) === 0) {
      wallet.goldBalanceGrams = data.goldBalanceGrams
      return this.walletRepository.save(wallet)
    }
    return wallet as Wallet
  }

  /** Idempotently makes sure a wallet row exists (unique on user_id). */
  private async ensureWallet(userId: string): Promise<void> {
    const existing = await this.walletRepository.findOneBy({ userId })
    if (existing) return
    try {
      await this.walletRepository.save(
        this.walletRepository.create({ userId, balance: 0, goldBalanceGrams: 0, isActive: true }),
      )
    } catch {
      // concurrent insert hit the unique constraint — the row now exists, ignore.
    }
  }

  private getSpreadPercent(): number {
    const value = Number(this.configService.get<string>('GOLD_TRADE_SPREAD_PERCENT'))
    return Number.isFinite(value) && value >= 0 ? value : 2
  }

  /** Live 18k gold price per gram, sourced only from the pricing module. */
  private async getGoldPricePerGram(): Promise<number> {
    const price = await this.goldPricing.getPriceByType(GoldPriceType.GOLD_18)
    const value = Number(price?.value ?? 0)
    if (!value || value <= 0) {
      throw new BadRequestException('قیمت لحظه‌ای طلا در دسترس نیست')
    }
    return value
  }

  /**
   * Atomically applies a signed rial/gold delta and appends a ledger row.
   * The wallet row is locked for the duration so balances can't race.
   */
  private async applyLedger(params: {
    userId: string
    type: WalletTransactionType
    rialDelta: number
    goldDelta?: number
    orderId?: string | null
    escrowId?: string | null
    description?: string | null
  }): Promise<WalletTransaction> {
    await this.ensureWallet(params.userId)

    const transaction = await this.dataSource.transaction(async (manager: EntityManager) => {
      const wallet = await manager.findOne(Wallet, {
        where: { userId: params.userId },
        lock: { mode: 'pessimistic_write' },
      })
      if (!wallet) {
        throw new BadRequestException('کیف پول یافت نشد')
      }

      const newBalance = Number(wallet.balance) + params.rialDelta
      const newGold = Number(wallet.goldBalanceGrams) + (params.goldDelta ?? 0)

      if (newBalance < 0) {
        throw new BadRequestException('موجودی ریالی کیف پول کافی نیست')
      }
      if (newGold < 0) {
        throw new BadRequestException('موجودی طلای کیف پول کافی نیست')
      }

      wallet.balance = newBalance
      wallet.goldBalanceGrams = newGold
      await manager.save(wallet)

      const tx = manager.create(WalletTransaction, {
        walletId: wallet.id,
        userId: params.userId,
        type: params.type,
        amount: params.rialDelta,
        amountGrams: params.goldDelta ?? 0,
        orderId: params.orderId ?? null,
        escrowId: params.escrowId ?? null,
        description: params.description ?? null,
      })
      return manager.save(tx)
    })

    await this.audit.record({
      userId: params.userId,
      action: `WALLET_${params.type.toUpperCase()}`,
      entityType: 'wallet_transaction',
      entityId: transaction.id,
      metadata: { rialDelta: params.rialDelta, goldDelta: params.goldDelta ?? 0, orderId: params.orderId ?? null },
    })

    return transaction
  }

  async deposit(data: WalletDepositDto): Promise<WalletTransaction> {
    if (Number(data.amount) <= 0) {
      throw new BadRequestException('مبلغ واریز باید بیشتر از صفر باشد')
    }
    return this.applyLedger({
      userId: data.userId,
      type: WalletTransactionType.DEPOSIT,
      rialDelta: Math.abs(Number(data.amount)),
      description: data.description ?? 'شارژ کیف پول',
    })
  }

  async payment(data: WalletPaymentDto): Promise<WalletTransaction> {
    return this.applyLedger({
      userId: data.userId,
      type: WalletTransactionType.PAYMENT,
      rialDelta: -Math.abs(Number(data.amount)),
      orderId: data.orderId ?? null,
      description: data.description ?? 'پرداخت از کیف پول',
    })
  }

  async buyGold(data: WalletGoldBuyDto): Promise<WalletTransaction> {
    const grams = Number(data.amountGrams)
    if (!Number.isFinite(grams) || grams <= 0) {
      throw new BadRequestException('مقدار طلا باید بیشتر از صفر باشد')
    }

    const base = await this.getGoldPricePerGram()
    const buyPricePerGram = base * (1 + this.getSpreadPercent() / 100)
    const rialCost = Math.round(grams * buyPricePerGram)

    return this.applyLedger({
      userId: data.userId,
      type: WalletTransactionType.BUY,
      rialDelta: -rialCost,
      goldDelta: grams,
      orderId: data.orderId ?? null,
      description:
        data.description ?? `خرید ${grams} گرم طلا به نرخ هر گرم ${rialCost ? Math.round(buyPricePerGram).toLocaleString('fa-IR') : 0}`,
    })
  }

  async sellGold(data: WalletGoldSellDto): Promise<WalletTransaction> {
    const grams = Number(data.amountGrams)
    if (!Number.isFinite(grams) || grams <= 0) {
      throw new BadRequestException('مقدار طلا باید بیشتر از صفر باشد')
    }

    const base = await this.getGoldPricePerGram()
    const sellPricePerGram = base * (1 - this.getSpreadPercent() / 100)
    const rialProceeds = Math.round(grams * sellPricePerGram)

    return this.applyLedger({
      userId: data.userId,
      type: WalletTransactionType.SELL,
      rialDelta: rialProceeds,
      goldDelta: -grams,
      orderId: data.orderId ?? null,
      description:
        data.description ?? `فروش ${grams} گرم طلا به نرخ هر گرم ${Math.round(sellPricePerGram).toLocaleString('fa-IR')}`,
    })
  }

  /** Generic ledger entry used by other modules (refund, escrow, ...). */
  async createTransaction(data: WalletTransactionDto): Promise<WalletTransaction> {
    return this.applyLedger({
      userId: data.userId,
      type: data.type,
      rialDelta: Number(data.amount),
      orderId: data.orderId ?? null,
      escrowId: data.escrowId ?? null,
      description: data.description ?? null,
    })
  }

  async findTransactions(userId: string): Promise<WalletTransaction[]> {
    return this.transactionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    })
  }

  /**
   * Reconciliation: the stored wallet balances must always equal the sum of
   * the immutable ledger. Exposed so the balance can be audited at any time.
   */
  async reconcile(userId: string) {
    const wallet = await this.findByUser(userId)
    const transactions = await this.transactionRepository.findBy({ userId })

    const ledgerBalance = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0)
    const ledgerGold = transactions.reduce((sum, tx) => sum + Number(tx.amountGrams ?? 0), 0)

    const walletBalance = Number(wallet?.balance ?? 0)
    const walletGold = Number(wallet?.goldBalanceGrams ?? 0)

    return {
      userId,
      walletBalance,
      ledgerBalance,
      balanceMatch: Math.abs(walletBalance - ledgerBalance) < 0.01,
      walletGold,
      ledgerGold,
      goldMatch: Math.abs(walletGold - ledgerGold) < 0.0001,
      transactionCount: transactions.length,
    }
  }
}
