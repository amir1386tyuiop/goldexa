import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common'
import { Request } from 'express'
import { ArService } from './ar.service'
import { CreateArModelDto, CreateArPreviewDto } from './create-ar.dto'
import { AdminGuard } from '../common/guards/admin.guard'
import { JwtAuthGuard, JwtUser } from '../common/guards/jwt-auth.guard'
import { FeatureFlag, FeatureFlagGuard } from '../common/feature-flag.guard'

@Controller('ar')
@UseGuards(FeatureFlagGuard)
@FeatureFlag('AR_ENABLED')
export class ArController {
  constructor(private readonly arService: ArService) {}

  @Get('models')
  async findModels() {
    return this.arService.findModels()
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('models')
  async createModel(@Body() body: CreateArModelDto) {
    return this.arService.createModel(body)
  }

  @Get('models/:id/previews')
  async findPreviews(@Param('id') id: string) {
    return this.arService.findPreviews(id)
  }

  @UseGuards(JwtAuthGuard)
  @Post('previews')
  async createPreview(@Body() body: CreateArPreviewDto, @Req() req: Request & { user: JwtUser }) {
    return this.arService.createPreview({ ...body, userId: req.user.sub })
  }
}
