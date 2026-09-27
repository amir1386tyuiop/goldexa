import { CommunityService } from './community.service'
import { DesignPostStatus } from './design-post.entity'
import { DesignChallenge } from './design-challenge.entity'
import { DesignPost } from './design-post.entity'
import { ChallengeReward } from '../community-extensions/challenge-reward.entity'

describe('CommunityService', () => {
  const users = { findOneBy: jest.fn() }
  const badges = { findOneBy: jest.fn(), create: jest.fn((value) => value), save: jest.fn(async (value) => value) }
  const rewards = { findOneBy: jest.fn(), create: jest.fn((value) => value), save: jest.fn(async (value) => ({ ...value, id: value.id || 'reward-1' })) }
  const wallet = {
    creditCommunityReward: jest.fn(async () => ({ id: 'tx-reward' })),
    creditCommunityRewardInManager: jest.fn(async () => ({ id: 'tx-reward', rewardId: 'reward-1' })),
    ensureWalletForUser: jest.fn(async () => undefined),
    auditCommunityReward: jest.fn(async () => undefined),
  }
  const dataSource = { transaction: jest.fn() }

  it('returns comments for a post in chronological order', async () => {
    const comments = { find: jest.fn().mockResolvedValue([{ id: 'c1', postId: 'p1', body: 'عالی است' }]) }
    const service = new CommunityService(
      {} as never,
      {} as never,
      comments as never,
      {} as never,
      users as never,
      badges as never,
      rewards as never,
      wallet as never,
      dataSource as never,
    )

    await expect(service.findComments('p1')).resolves.toEqual([{ id: 'c1', postId: 'p1', body: 'عالی است' }])
    expect(comments.find).toHaveBeenCalledWith({ where: { postId: 'p1' }, order: { createdAt: 'ASC' } })
  })

  it('returns only published posts to the public feed', async () => {
    const posts = { find: jest.fn().mockResolvedValue([]) }
    const service = new CommunityService({} as never, posts as never, {} as never, {} as never, users as never, badges as never, rewards as never, wallet as never, dataSource as never)

    await service.findPosts()

    expect(posts.find).toHaveBeenCalledWith({ where: { status: DesignPostStatus.PUBLISHED }, order: { createdAt: 'DESC' } })
  })

  it('uses the authenticated user name from the database when creating a post', async () => {
    const posts = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    }
    users.findOneBy.mockResolvedValue({ id: 'u1', name: 'نام واقعی' })
    const service = new CommunityService(
      {} as never,
      posts as never,
      {} as never,
      {} as never,
      users as never,
      badges as never,
      rewards as never,
      wallet as never,
      dataSource as never,
    )

    await service.createPost({
      userId: 'u1',
      userName: 'نام جعلی',
      title: 'طرح',
      description: 'توضیح',
    })

    expect(posts.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', userName: 'نام واقعی' }))
  })

  it('uses the authenticated user name from the database when creating a comment', async () => {
    const posts = { findOneBy: jest.fn().mockResolvedValue({ id: 'p1', commentsCount: 0 }), save: jest.fn() }
    const comments = { create: jest.fn((value) => value), save: jest.fn(async (value) => value) }
    users.findOneBy.mockResolvedValue({ id: 'u1', name: 'نام واقعی' })
    const service = new CommunityService(
      {} as never,
      posts as never,
      comments as never,
      {} as never,
      users as never,
      badges as never,
      rewards as never,
      wallet as never,
      dataSource as never,
    )

    await service.addComment('p1', { userId: 'u1', userName: 'نام جعلی', body: 'نظر' })

    expect(comments.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', userName: 'نام واقعی' }))
  })

  it('awards a challenge reward and badge idempotently when setting a winner', async () => {
    const challenge = { id: 'c1', title: 'چالش تابستان', rewardType: 'wallet_credit', rewardValue: 500000, status: 'active' }
    const challenges = { findOneBy: jest.fn().mockResolvedValue(challenge), findOne: jest.fn().mockResolvedValue(challenge), save: jest.fn(async (value) => value) }
    const posts = { findOneBy: jest.fn().mockResolvedValue({ id: 'p1', userId: 'u1', challengeId: 'c1' }) }
    rewards.findOneBy.mockResolvedValue(null)
    badges.findOneBy.mockResolvedValue(null)
    const manager = {
      getRepository: jest.fn((entity: unknown) => entity === DesignChallenge ? challenges : entity === DesignPost ? posts : entity === ChallengeReward ? rewards : badges),
    }
    dataSource.transaction.mockImplementation(async (callback: (value: unknown) => unknown) => callback(manager))
    const service = new CommunityService(challenges as never, posts as never, {} as never, {} as never, users as never, badges as never, rewards as never, wallet as never, dataSource as never)

    await service.setWinner('c1', 'p1')

    expect(rewards.create).toHaveBeenCalledWith(expect.objectContaining({ challengeId: 'c1', postId: 'p1', userId: 'u1', rewardType: 'wallet_credit', rewardValue: 500000 }))
    expect(badges.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', name: 'برنده چالش: چالش تابستان' }))
    expect(wallet.creditCommunityRewardInManager).toHaveBeenCalledWith(manager, 'u1', expect.anything(), 500000, expect.stringContaining('چالش تابستان'))
    expect(wallet.auditCommunityReward).toHaveBeenCalledWith(expect.objectContaining({ id: 'tx-reward' }), 'u1', 500000)
  })
})
