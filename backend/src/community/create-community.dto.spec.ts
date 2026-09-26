import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { CreateDesignCommentDto, CreateDesignPostDto } from './create-community.dto'

describe('community DTO validation', () => {
  it('requires bounded title and description for posts', async () => {
    const errors = await validate(plainToInstance(CreateDesignPostDto, { title: '', description: 'x'.repeat(4001) }))

    expect(errors.map((error) => error.property)).toEqual(expect.arrayContaining(['title', 'description']))
  })

  it('bounds comment content', async () => {
    const errors = await validate(plainToInstance(CreateDesignCommentDto, { body: 'x'.repeat(1001) }))

    expect(errors.map((error) => error.property)).toContain('body')
  })
})
