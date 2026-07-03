import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { AiEngineService } from './ai-engine.service'
import { RunAiTaskInput } from './ai-engine.types'
import {
  CreateAiDesignRecommendationDto,
  CreateAiMarketMatchDto,
  CreateAiPricePredictionDto,
  CreateAiServiceMetricDto,
} from './create-ai-engine.dto'
import { Permissions } from '../common/decorators/permissions.decorator'
import { PermissionsGuard } from '../common/guards/permissions.guard'
import { FeatureFlag, FeatureFlagGuard } from '../common/feature-flag.guard'

// AI engine is a phase-2 module: disabled by default, behind AI_ENGINE_ENABLED.
@Controller('ai-engine')
@UseGuards(FeatureFlagGuard, PermissionsGuard)
@FeatureFlag('AI_ENGINE_ENABLED')
@Permissions('VIEW_REPORTS')
export class AiEngineController {
  constructor(private readonly aiEngineService: AiEngineService) {}

  @Get('providers')
  async findProviders() {
    return this.aiEngineService.findProviders()
  }

  @Post('rerun')
  async rerunAll(@Body() body: { userId?: string }) {
    return this.aiEngineService.rerunAll(body.userId ?? null)
  }

  @Post('chat')
  async chat(@Body() body: RunAiTaskInput) {
    return this.aiEngineService.chat(body)
  }

  @Post('code')
  async code(@Body() body: RunAiTaskInput) {
    return this.aiEngineService.code(body)
  }

  @Post('architecture')
  async architecture(@Body() body: RunAiTaskInput) {
    return this.aiEngineService.runTask({ ...body, task: 'architecture' })
  }

  @Post('kyc-document')
  async kycDocument(@Body() body: RunAiTaskInput) {
    return this.aiEngineService.analyzeDocument(body)
  }

  @Post('safety-check')
  async safetyCheck(@Body() body: RunAiTaskInput) {
    return this.aiEngineService.safetyCheck(body)
  }

  @Post('marketing-image')
  async marketingImage(@Body() body: RunAiTaskInput) {
    return this.aiEngineService.runTask({ ...body, task: 'marketing_image' })
  }

  @Post('vector-asset')
  async vectorAsset(@Body() body: RunAiTaskInput) {
    return this.aiEngineService.runTask({ ...body, task: 'vector_asset' })
  }

  @Post('product-image')
  async productImage(@Body() body: RunAiTaskInput) {
    return this.aiEngineService.runTask({ ...body, task: 'product_image' })
  }

  @Post('image-workflow')
  async imageWorkflow(@Body() body: RunAiTaskInput) {
    return this.aiEngineService.runTask({ ...body, task: 'image_workflow' })
  }

  @Post('generate-content')
  async generateContent(@Body() body: RunAiTaskInput) {
    return this.aiEngineService.generateContent(body)
  }

  @Post('analyze')
  async analyze(@Body() body: RunAiTaskInput) {
    return this.aiEngineService.runTask({ ...body, task: 'analysis' })
  }

  @Post('text')
  async text(@Body() body: RunAiTaskInput) {
    return this.aiEngineService.runTask({ ...body, task: 'text' })
  }

  @Post('image-to-text')
  async imageToText(@Body() body: RunAiTaskInput) {
    return this.aiEngineService.runTask({ ...body, task: 'image_to_text' })
  }

  @Post('notification')
  async notification(@Body() body: RunAiTaskInput) {
    return this.aiEngineService.runTask({ ...body, task: 'notification' })
  }

  @Post('daily-notification')
  async dailyNotification(@Body() body: RunAiTaskInput) {
    return this.aiEngineService.createDailyNotification(body)
  }

  @Post('content')
  async content(@Body() body: RunAiTaskInput) {
    return this.aiEngineService.runTask({ ...body, task: 'content' })
  }

  @Post('rag')
  async rag(@Body() body: RunAiTaskInput) {
    return this.aiEngineService.runTask({ ...body, task: 'rag' })
  }

  @Post('summarize')
  async summarize(@Body() body: RunAiTaskInput) {
    return this.aiEngineService.runTask({ ...body, task: 'summary' })
  }

  @Post('image')
  async image(@Body() body: RunAiTaskInput) {
    return this.aiEngineService.runTask({ ...body, task: 'image_generation' })
  }

  @Get('predictions')
  async findPredictions() {
    return this.aiEngineService.findPredictions()
  }

  @Get('predictions/user/:userId')
  async findPredictionsByUser(@Param('userId') userId: string) {
    return this.aiEngineService.findPredictionsByUser(userId)
  }

  @Post('predictions')
  async createPrediction(@Body() body: CreateAiPricePredictionDto) {
    return this.aiEngineService.createPrediction(body)
  }

  @Post('predictions/rerun')
  async rerunPrediction(@Body() body: { targetId?: string | null }) {
    return this.aiEngineService.rerunPrediction(body.targetId ?? null)
  }

  @Get('recommendations/user/:userId')
  async findRecommendations(@Param('userId') userId: string) {
    return this.aiEngineService.findRecommendations(userId)
  }

  @Post('recommendations')
  async createRecommendation(@Body() body: CreateAiDesignRecommendationDto) {
    return this.aiEngineService.createRecommendation(body)
  }

  @Post('recommendations/rerun')
  async rerunRecommendation(@Body() body: { userId?: string }) {
    return this.aiEngineService.rerunRecommendation(body.userId)
  }

  @Get('matches')
  async findMatches() {
    return this.aiEngineService.findMatches()
  }

  @Post('matches')
  async createMatch(@Body() body: CreateAiMarketMatchDto) {
    return this.aiEngineService.createMatch(body)
  }

  @Post('matches/rerun')
  async rerunMatch() {
    return this.aiEngineService.rerunMatch()
  }

  @Patch('matches/:id/status')
  async updateMatchStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.aiEngineService.updateMatchStatus(id, body.status)
  }

  @Get('metrics')
  async findMetrics() {
    return this.aiEngineService.findMetrics()
  }

  @Post('metrics')
  async createMetric(@Body() body: CreateAiServiceMetricDto) {
    return this.aiEngineService.createMetric(body)
  }

  @Post('metrics/rerun')
  async rerunMetric() {
    return this.aiEngineService.rerunMetric()
  }
}
