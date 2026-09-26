import { UserSubscriptionStatus } from './user-subscription.entity'
import { SubscriptionsService } from './subscriptions.service'

describe('SubscriptionsService', () => {
  const repository = () => ({
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
    findBy: jest.fn(),
  })

  it('always starts a user subscription as active', async () => {
    const subscriptions = repository()
    const service = new SubscriptionsService(repository() as never, subscriptions as never, repository() as never)

    const result = await service.createUserSubscription({
      userId: 'user-1',
      planId: 'plan-1',
      startDate: new Date(),
      endDate: new Date(Date.now() + 86_400_000),
      status: UserSubscriptionStatus.CANCELLED,
    })

    expect(result.status).toBe(UserSubscriptionStatus.ACTIVE)
    expect(subscriptions.create).toHaveBeenCalledWith(expect.objectContaining({ status: UserSubscriptionStatus.ACTIVE }))
  })
})
