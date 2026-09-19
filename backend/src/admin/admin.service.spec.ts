import { AdminService } from './admin.service'

/* eslint-disable @typescript-eslint/no-explicit-any */

function queryBuilder(rawOne: unknown, rawMany?: unknown[]) {
  return {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue(rawOne),
    getRawMany: jest.fn().mockResolvedValue(rawMany || []),
  }
}

describe('AdminService financial reports', () => {
  it('reports valid order value, refunds and net value separately', async () => {
    const service = Object.create(AdminService.prototype) as any
    service.paymentTransactionRepository = { createQueryBuilder: () => queryBuilder({ total: '1500', count: '2' }) }
    service.orderRepository = { createQueryBuilder: jest.fn()
      .mockReturnValueOnce(queryBuilder({ total: '2200', count: '3' }))
      .mockReturnValueOnce(queryBuilder(null, [{ status: 'paid', count: '2' }])) }
    service.refundRepository = { createQueryBuilder: () => queryBuilder({ total: '250', count: '1' }) }
    service.escrowRepository = { createQueryBuilder: () => queryBuilder({ total: '40' }) }
    service.auctionRepository = { createQueryBuilder: () => queryBuilder({ total: '15', gross: '500', count: '1' }) }
    service.payoutRepository = { createQueryBuilder: () => queryBuilder({ total: '100', count: '1' }) }

    const report = await service.getReports()

    expect(report.revenue).toEqual(expect.objectContaining({
      totalPaidPayments: 1500,
      totalOrderValue: 2200,
      refunds: 250,
      refundCount: 1,
      netOrderValue: 1950,
      totalPlatformCommission: 55,
      paidPayouts: 100,
    }))
    expect(report.ordersByStatus).toEqual([{ status: 'paid', count: 2 }])
  })
})
