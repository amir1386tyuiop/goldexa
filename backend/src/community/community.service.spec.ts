import { CommunityService } from './community.service'

describe('CommunityService', () => {
  it('returns comments for a post in chronological order', async () => {
    const comments = { find: jest.fn().mockResolvedValue([{ id: 'c1', postId: 'p1', body: 'عالی است' }]) }
    const service = new CommunityService(
      {} as never,
      {} as never,
      comments as never,
      {} as never,
    )

    await expect(service.findComments('p1')).resolves.toEqual([{ id: 'c1', postId: 'p1', body: 'عالی است' }])
    expect(comments.find).toHaveBeenCalledWith({ where: { postId: 'p1' }, order: { createdAt: 'ASC' } })
  })
})
