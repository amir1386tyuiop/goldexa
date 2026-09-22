import { validate } from 'class-validator'
import { RunAiTaskDto } from './create-ai-engine.dto'
import { NotificationChannel } from '../notifications/notification.entity'

describe('RunAiTaskDto', () => {
  it('accepts bounded, well-formed text requests', async () => {
    const dto = Object.assign(new RunAiTaskDto(), {
      task: 'assistant',
      modelId: 'allowed/model',
      prompt: 'یک طرح انگشتر بساز',
      temperature: 0.4,
      maxTokens: 1200,
      channel: NotificationChannel.IN_APP,
      createDailyNotification: true,
    })

    await expect(validate(dto)).resolves.toHaveLength(0)
  })

  it('rejects unsupported tasks and oversized prompts', async () => {
    const dto = Object.assign(new RunAiTaskDto(), {
      task: 'unsupported',
      prompt: 'x'.repeat(20_001),
      temperature: 3,
    })

    await expect(validate(dto)).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({ property: 'task' }),
      expect.objectContaining({ property: 'prompt' }),
      expect.objectContaining({ property: 'temperature' }),
    ]))
  })
})
