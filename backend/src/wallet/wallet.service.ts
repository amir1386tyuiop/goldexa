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

type LedgerParams = {
  userId: string
  type: WalletTransactionType
  rialDelta: number
  goldDelta?: number
  orderId?: string | null
  escrowId?: string | null
  description?: string | null
}

const MAX_RIAL_DELTA = Number('9999999999999.99')
const MAX_GOLD_DELTA = Number('9999999999999.9999')

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
    return (await this.findByUser(data.userId)) as Wallet
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

  /** Ensures internal modules can prepare a wallet before an atomic ledger flow. */
  async ensureWalletForUser(userId: string): Promise<void> {
    if (!userId) throw new BadRequestException('شناسه کاربر نامعتبر است')
    await this.ensureWallet(userId)
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
  private validateDelta(params: LedgerParams): void {
    if (!Number.isFinite(params.rialDelta) || !Number.isFinite(params.goldDelta ?? 0)) {
      throw new BadRequestException('مبلغ تراکنش نامعتبر است')
    }
    if (params.rialDelta === 0 && (params.goldDelta ?? 0) === 0) {
      throw new BadRequestException('تراکنش نمی‌تواند صفر باشد')
    }
    if (Math.abs(params.rialDelta) > MAX_RIAL_DELTA || Math.abs(params.goldDelta ?? 0) > MAX_GOLD_DELTA) {
      throw new BadRequestException('مبلغ تراکنش بیش از حد مجاز است')
    }
  }

  /**
   * Applies a ledger entry using the caller's transaction manager. This is
   * deliberately separate from the HTTP-facing methods: order checkout can
   * debit the wallet and reserve inventory in one database transaction.
   */
  private async applyLedgerInManager(manager: EntityManager, params: LedgerParams): Promise<WalletTransaction> {
    this.validateDelta(params)

    const wallet = await manager.findOne(Wallet, {
      where: { userId: params.userId },
      lock: { mode: 'pessimistic_write' },
    })
    if (!wallet) {
      throw new BadRequestException('کیف پول یافت نشد')
    }
    if (!wallet.isActive) {
      throw new BadRequestException('کیف پول فعال نیست')
    }

    // The wallet row lock serializes payments for the same user. Checking the
    // order reference while holding that lock makes retries idempotent without
    // ever charging the same order twice.
    if (
      (params.type === WalletTransactionType.PAYMENT || params.type === WalletTransactionType.REFUND) &&
      params.orderId
    ) {
      const existing = await manager.findOne(WalletTransaction, {
        where: { userId: params.userId, orderId: params.orderId, type: params.type },
      })
      if (existing) {
        if (Number(existing.amount) !== params.rialDelta || Number(existing.amountGrams ?? 0) !== (params.goldDelta ?? 0)) {
          throw new BadRequestException('تراکنش تکراری با مبلغ متفاوت است')
        }
        return existing
      }
    }

    if (
      [
        WalletTransactionType.ESCROW_HOLD,
        WalletTransactionType.ESCROW_RELEASE,
        WalletTransactionType.REFUND,
      ].includes(params.type) &&
      params.escrowId
    ) {
      const existing = await manager.findOne(WalletTransaction, {
        where: { userId: params.userId, escrowId: params.escrowId, type: params.type },
      })
      if (existing) {
        if (Number(existing.amount) !== params.rialDelta || Number(existing.amountGrams ?? 0) !== (params.goldDelta ?? 0)) {
          throw new BadRequestException('تراکنش escrow تکراری با مبلغ متفاوت است')
        }
        return existing
      }
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
  }

  private async applyLedger(params: LedgerParams): Promise<WalletTransaction> {
    await this.ensureWallet(params.userId)

    const transaction = await this.dataSource.transaction((manager) => this.applyLedgerInManager(manager, params))
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
    if (!data.orderId) {
      throw new BadRequestException('شناسه سفارش برای پرداخت الزامی است')
    }
    if (!Number.isFinite(Number(data.amount)) || Number(data.amount) <= 0) {
      throw new BadRequestException('مبلغ پرداخت باید بیشتر از صفر باشد')
    }
    return this.applyLedger({
      userId: data.userId,
      type: WalletTransactionType.PAYMENT,
      rialDelta: -Math.abs(Number(data.amount)),
      orderId: data.orderId ?? null,
      description: data.description ?? 'پرداخت از کیف پول',
    })
  }

  /** Internal checkout primitive. The manager must belong to an open transaction. */
  async payOrderWithWallet(
    userId: string,
    orderId: string,
    amount: number,
    manager: EntityManager,
  ): Promise<WalletTransaction> {
    if (!orderId || !Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('اطلاعات پرداخت کیف پول نامعتبر است')
    }
    const transaction = await this.applyLedgerInManager(manager, {
      userId,
      type: WalletTransactionType.PAYMENT,
      rialDelta: -Math.abs(amount),
      orderId,
      description: 'پرداخت سفارش از کیف پول',
    })
    await this.audit.record({
      userId,
      action: 'WALLET_PAYMENT',
      entityType: 'wallet_transaction',
      entityId: transaction.id,
      metadata: { rialDelta: -Math.abs(amount), orderId },
    })
    return transaction
  }

  /** Internal refund primitive; duplicate refunds for one order are idempotent. */
  async refundOrderToWallet(
    userId: string,
    orderId: string,
    amount: number,
    manager: EntityManager,
  ): Promise<WalletTransaction> {
    if (!orderId || !Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('اطلاعات بازپرداخت کیف پول نامعتبر است')
    }
    return this.applyLedgerInManager(manager, {
      userId,
      type: WalletTransactionType.REFUND,
      rialDelta: Math.abs(amount),
      orderId,
      description: 'بازپرداخت سفارش به کیف پول',
    })
  }

  /** Debits the buyer exactly once when escrow enters HELD. */
  async holdEscrow(
    buyerId: string,
    escrowId: string,
    amount: number,
    manager: EntityManager,
  ): Promise<WalletTransaction> {
    if (!escrowId || !Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('اطلاعات قفل escrow نامعتبر است')
    }
    return this.applyLedgerInManager(manager, {
      userId: buyerId,
      type: WalletTransactionType.ESCROW_HOLD,
      rialDelta: -Math.abs(amount),
      escrowId,
      description: 'قفل مبلغ پرداخت امانی',
    })
  }

  /** Credits the seller exactly once when escrow is released. */
  async releaseEscrow(
    sellerId: string,
    escrowId: string,
    amount: number,
    manager: EntityManager,
  ): Promise<WalletTransaction> {
    if (!escrowId || !Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('اطلاعات آزادسازی escrow نامعتبر است')
    }
    return this.applyLedgerInManager(manager, {
      userId: sellerId,
      type: WalletTransactionType.ESCROW_RELEASE,
      rialDelta: Math.abs(amount),
      escrowId,
      description: 'واریز مبلغ آزادشده escrow به فروشنده',
    })
  }

  /** Credits the buyer exactly once when escrow is refunded. */
  async refundEscrow(
    buyerId: string,
    escrowId: string,
    amount: number,
    manager: EntityManager,
  ): Promise<WalletTransaction> {
    if (!escrowId || !Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('اطلاعات بازپرداخت escrow نامعتبر است')
    }
    return this.applyLedgerInManager(manager, {
      userId: buyerId,
      type: WalletTransactionType.REFUND,
      rialDelta: Math.abs(amount),
      escrowId,
      description: 'بازپرداخت مبلغ escrow به خریدار',
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
    if (data.type === WalletTransactionType.DEPOSIT || data.type === WalletTransactionType.PAYMENT) {
      throw new BadRequestException('برای این نوع تراکنش باید از عملیات اختصاصی استفاده شود')
    }
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
