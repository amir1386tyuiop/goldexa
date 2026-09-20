import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'
import { randomUUID } from 'crypto'

export interface ZarinpalRequestResult {
  authority: string
  paymentUrl: string
  mock: boolean
}

export interface ZarinpalVerifyResult {
  success: boolean
  refId: string | null
  code: number
  message: string
  mock: boolean
}

export interface ZarinpalRefundResult {
  success: boolean
  refundId: string | null
  code: number
  message: string
  mock: boolean
}

/**
 * ZarinPal payment gateway adapter.
 *
 * Real mode is used when ZARINPAL_MERCHANT_ID is configured; otherwise the
 * service runs in MOCK mode so the full request→pay→verify flow works locally
 * without real credentials. Swapping in a real merchant id later requires no
 * code change. Amounts are sent to ZarinPal in Rial.
 */
@Injectable()
export class ZarinpalService {
  private readonly logger = new Logger(ZarinpalService.name)

  constructor(private readonly config: ConfigService) {}

  private get merchantId(): string | undefined {
    return this.config.get<string>('ZARINPAL_MERCHANT_ID')
  }

  private get baseUrl(): string {
    const sandbox = String(this.config.get('ZARINPAL_SANDBOX') ?? 'true').toLowerCase() === 'true'
    return sandbox ? 'https://sandbox.zarinpal.com/pg/v4/payment' : 'https://api.zarinpal.com/pg/v4/payment'
  }

  private get startPayBase(): string {
    const sandbox = String(this.config.get('ZARINPAL_SANDBOX') ?? 'true').toLowerCase() === 'true'
    return sandbox ? 'https://sandbox.zarinpal.com/pg/StartPay' : 'https://www.zarinpal.com/pg/StartPay'
  }

  get isMock(): boolean {
    return String(this.config.get('PAYMENT_MODE') ?? '').toLowerCase() === 'mock'
      || (!this.merchantId && this.config.get<string>('NODE_ENV') !== 'production')
  }

  /** Convert تومان→ریال for the gateway (ZarinPal expects Rial). */
  private toRial(tomanAmount: number): number {
    return Math.round(Number(tomanAmount) * 10)
  }

  async requestPayment(params: {
    amount: number
    description: string
    callbackUrl: string
    mobile?: string
    email?: string
  }): Promise<ZarinpalRequestResult> {
    if (!this.merchantId && !this.isMock) {
      throw new Error('درگاه پرداخت در محیط production پیکربندی نشده است')
    }
    if (this.isMock) {
      const authority = `MOCK-${randomUUID()}`
      return { authority, paymentUrl: `${this.startPayBase}/${authority}`, mock: true }
    }

    const { data } = await axios.post(
      `${this.baseUrl}/request.json`,
      {
        merchant_id: this.merchantId,
        amount: this.toRial(params.amount),
        description: params.description,
        callback_url: params.callbackUrl,
        metadata: { mobile: params.mobile, email: params.email },
      },
      { timeout: 10000 },
    )

    const code = data?.data?.code
    const authority = data?.data?.authority
    if (code !== 100 || !authority) {
      this.logger.warn(`ZarinPal request failed: ${JSON.stringify(data?.errors ?? data)}`)
      throw new Error('درخواست پرداخت از درگاه ناموفق بود')
    }

    return { authority, paymentUrl: `${this.startPayBase}/${authority}`, mock: false }
  }

  async verifyPayment(params: { authority: string; amount: number }): Promise<ZarinpalVerifyResult> {
    if (this.isMock || params.authority.startsWith('MOCK-')) {
      // In mock mode every returned authority is treated as a successful pay.
      return { success: true, refId: `MOCKREF-${Date.now()}`, code: 100, message: 'پرداخت آزمایشی تأیید شد', mock: true }
    }

    const { data } = await axios.post(
      `${this.baseUrl}/verify.json`,
      { merchant_id: this.merchantId, amount: this.toRial(params.amount), authority: params.authority },
      { timeout: 10000 },
    )

    const code = data?.data?.code
    const refId = data?.data?.ref_id ?? null
    // 100 = verified now, 101 = already verified (idempotent success).
    const success = code === 100 || code === 101
    return {
      success,
      refId: refId ? String(refId) : null,
      code: Number(code ?? -1),
      message: success ? 'پرداخت تأیید شد' : 'تأیید پرداخت ناموفق بود',
      mock: false,
    }
  }

  /** Provider-backed refund. The merchant must explicitly configure its refund endpoint. */
  async refundPayment(params: { authority: string; amount: number; referenceId?: string | null }): Promise<ZarinpalRefundResult> {
    const endpoint = this.config.get<string>('ZARINPAL_REFUND_ENDPOINT')
    if (this.isMock || params.authority.startsWith('MOCK-')) {
      throw new Error('بازپرداخت آنلاین در حالت mock مجاز نیست')
    }
    if (!endpoint || !this.merchantId) {
      throw new Error('provider بازپرداخت زرین‌پال پیکربندی نشده است')
    }

    const { data } = await axios.post(
      endpoint,
      {
        merchant_id: this.merchantId,
        authority: params.authority,
        amount: this.toRial(params.amount),
        reference_id: params.referenceId ?? undefined,
      },
      { timeout: 10000 },
    )
    const code = Number(data?.data?.code ?? data?.code ?? -1)
    const refundId = data?.data?.refund_id ?? data?.data?.ref_id ?? data?.refund_id ?? null
    const success = code === 100 || code === 101
    return {
      success,
      refundId: refundId ? String(refundId) : null,
      code,
      message: success ? 'بازپرداخت توسط provider تأیید شد' : 'بازپرداخت توسط provider ناموفق بود',
      mock: false,
    }
  }
}
