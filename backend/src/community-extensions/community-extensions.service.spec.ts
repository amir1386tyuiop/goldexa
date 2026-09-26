import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { CommunityExtensionsService } from './community-extensions.service'

describe('CommunityExtensionsService', () => {
  const repository = {
    findBy: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
    remove: jest.fn(async (value) => value),
  }

  beforeEach(() => jest.clearAllMocks())

  function createService() {
    return new CommunityExtensionsService(repository as never, repository as never, repository as never, repository as never)
  }

  it('rejects an empty save target', async () => {
    await expect(createService().save({ userId: 'u1' })).rejects.toBeInstanceOf(BadRequestException)
    expect(repository.findOneBy).not.toHaveBeenCalled()
  })

  it('rejects duplicate saves for the same user and post', async () => {
    repository.findOneBy.mockResolvedValue({ id: 's1', userId: 'u1', postId: 'p1' })

    await expect(createService().save({ userId: 'u1', postId: 'p1' })).rejects.toBeInstanceOf(BadRequestException)
  })

  it('removes only a save owned by the authenticated user', async () => {
    const save = { id: 's1', userId: 'u1', postId: 'p1' }
    repository.findOneBy.mockResolvedValue(save)

    await expect(createService().removeSave('s1', 'u1')).resolves.toBeUndefined()
    expect(repository.remove).toHaveBeenCalledWith(save)
  })

  it('rejects deleting another user save or a missing save', async () => {
    repository.findOneBy.mockResolvedValue({ id: 's1', userId: 'u1' })
    await expect(createService().removeSave('s1', 'u2')).rejects.toBeInstanceOf(ForbiddenException)

    repository.findOneBy.mockResolvedValue(null)
    await expect(createService().removeSave('missing', 'u1')).rejects.toBeInstanceOf(NotFoundException)
  })
})
