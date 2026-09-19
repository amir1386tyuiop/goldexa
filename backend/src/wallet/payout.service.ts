import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { UserBankAccount } from '../users/user-bank-account.entity'
import { WalletService } from './wallet.service'
import { PayoutRequest, PayoutRequestStatus } from './payout-request.entity'
import { CreatePayoutDto, ResolvePayoutDto } from './create-payout.dto'

@Injectable()
export class PayoutService {
  constructor(
    @InjectRepository(PayoutRequest) private readonly payoutRepository: Repository<PayoutRequest>,
    @InjectRepository(UserBankAccount) private readonly bankRepository: Repository<UserBankAccount>,
    private readonly dataSource: DataSource,
    private readonly walletService: WalletService,
  ) {}

  async findByUser(userId: string): Promise<PayoutRequest[]> {
    return this.payoutRepository.find({ where: { userId }, order: { createdAt: 'DESC' } })
  }

  async create(userId: string, data: CreatePayoutDto): Promise<PayoutRequest> {
    const key = data.idempotencyKey?.trim()
    if (!key) throw new BadRequestException('کلید idempotency الزامی است')
    const repeated = await this.payoutRepository.findOneBy({ idempotencyKey: key })
    if (repeated) {
      if (repeated.userId !== userId) throw new ForbiddenException('کلید idempotency متعلق به کاربر دیگری است')
      return repeated
    }

    const account = data.bankAccountId
      ? await this.bankRepository.findOneBy({ id: data.bankAccountId, userId })
      : await this.bankRepository.findOneBy({ userId, isDefault: true })
    if (!account) throw new BadRequestException('حساب بانکی معتبر و پیش‌فرض پیدا نشد')
    const amount = Number(data.amount)
    if (!Number.isFinite(amount) || amount < 1000) throw new BadRequestException('مبلغ برداشت نامعتبر است')

    await this.walletService.ensureWalletForUser(userId)
    return this.dataSource.transaction(async (manager) => {
      const request = manager.create(PayoutRequest, {
        userId,
        bankAccountId: account.id,
        amount,
        status: PayoutRequestStatus.PENDING,
        idempotencyKey: key,
        providerReference: null,
        failureReason: null,
        reviewedBy: null,
        reviewedAt: null,
        paidAt: null,
      })
      await manager.save(request)
      await this.walletService.holdPayout(userId, request.id, amount, manager)
      return request
    })
  }

  async resolve(id: string, adminId: string, status: PayoutRequestStatus, data: ResolvePayoutDto): Promise<PayoutRequest> {
    if (![PayoutRequestStatus.APPROVED, PayoutRequestStatus.PAID, PayoutRequestStatus.REJECTED, PayoutRequestStatus.FAILED].includes(status)) {
      throw new BadRequestException('وضعیت نهایی برداشت نامعتبر است')
    }
    return this.dataSource.transaction(async (manager) => {
      const request = await manager.findOne(PayoutRequest, { where: { id }, lock: { mode: 'pessimistic_write' } })
      if (!request) throw new NotFoundException('درخواست برداشت پیدا نشد')
      if ([PayoutRequestStatus.PAID, PayoutRequestStatus.REJECTED, PayoutRequestStatus.FAILED].includes(request.status)) {
        if (request.status === status) return request
        throw new BadRequestException('درخواست برداشت قبلاً نهایی شده است')
      }
      if (status === PayoutRequestStatus.APPROVED && request.status !== PayoutRequestStatus.PENDING) {
        throw new BadRequestException('فقط درخواست در انتظار بررسی قابل تأیید است')
      }
      if (status === PayoutRequestStatus.PAID && ![PayoutRequestStatus.APPROVED, PayoutRequestStatus.PROCESSING].includes(request.status)) {
        throw new BadRequestException('فقط برداشت تأییدشده قابل علامت‌گذاری به‌عنوان پرداخت‌شده است')
      }
      if ([PayoutRequestStatus.REJECTED, PayoutRequestStatus.FAILED].includes(status)) {
        await this.walletService.refundPayout(request.userId, request.id, Number(request.amount), manager)
      }
      request.status = status
      request.reviewedBy = adminId
      request.reviewedAt = new Date()
      request.failureReason = data.reason?.trim() || request.failureReason
      request.providerReference = data.providerReference?.trim() || request.providerReference
      if (status === PayoutRequestStatus.PAID) request.paidAt = new Date()
      return manager.save(request)
    })
  }
}
