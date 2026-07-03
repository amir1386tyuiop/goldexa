import { Body, Controller, Get, Param, Post } from '@nestjs/common'
import { ArService } from './ar.service'
import { CreateArModelDto, CreateArPreviewDto } from './create-ar.dto'

@Controller('ar')
export class ArController {
  constructor(private readonly arService: ArService) {}

  @Get('models')
  async findModels() {
    return this.arService.findModels()
  }

  @Post('models')
  async createModel(@Body() body: CreateArModelDto) {
    return this.arService.createModel(body)
  }

  @Get('models/:id/previews')
  async findPreviews(@Param('id') id: string) {
    return this.arService.findPreviews(id)
  }

  @Post('previews')
  async createPreview(@Body() body: CreateArPreviewDto) {
    return this.arService.createPreview(body)
  }
}
