import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common'
import { Request } from 'express'
import { AiEngineService } from './ai-engine.service'
import { RunAiTaskInput } from './ai-engine.types'
import {
  CreateAiDesignRecommendationDto,
  CreateAiMarketMatchDto,
  CreateAiPricePredictionDto,
  CreateAiServiceMetricDto,
  ExecuteAiMatchDto,
  ExecuteAiPredictionDto,
  ExecuteAiRecommendationDto,
} from './create-ai-engine.dto'
import { Permissions } from '../common/decorators/permissions.decorator'
import { PermissionsGuard } from '../common/guards/permissions.guard'
import { FeatureFlag, FeatureFlagGuard } from '../common/feature-flag.guard'
import { JwtAuthGuard, JwtUser } from '../common/guards/jwt-auth.guard'

// AI engine is a phase-2 module: disabled by default, behind AI_ENGINE_ENABLED.
@Controller('ai-engine')
@UseGuards(FeatureFlagGuard, JwtAuthGuard, PermissionsGuard)
@FeatureFlag('AI_ENGINE_ENABLED')
export class AiEngineController {
  constructor(private readonly aiEngineService: AiEngineService) {}

  @Get('providers')
  async findProviders() {
    return this.aiEngineService.findProviders()
  }

  /** Safe for the UI: only capability/configuration state, never secret values. */
  @Get('providers/status')
  @Permissions('VIEW_REPORTS')
  async providerStatus() {
    return this.aiEngineService.providerStatus()
  }

  @Post('rerun')
  @Permissions('VIEW_REPORTS')
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
  @Permissions('VIEW_REPORTS')
  async findPredictions() {
    return this.aiEngineService.findPredictions()
  }

  @Get('predictions/user/:userId')
  @Permissions('VIEW_REPORTS')
  async findPredictionsByUser(@Param('userId') userId: string) {
    return this.aiEngineService.findPredictionsByUser(userId)
  }

  @Get('predictions/me')
  async findMyPredictions(@Req() request: Request & { user: JwtUser }) {
    return this.aiEngineService.findPredictionsByUser(request.user.sub)
  }

  @Post('predictions')
  @Permissions('VIEW_REPORTS')
  async createPrediction(@Body() body: CreateAiPricePredictionDto) {
    // Direct persistence is intentionally admin-only; user execution is below.
    return this.aiEngineService.createPrediction(body)
  }

  @Post('predictions/execute')
  async executePrediction(@Body() body: ExecuteAiPredictionDto, @Req() request: Request & { user: JwtUser }) {
    return this.aiEngineService.executePrediction(body, request.user.sub)
  }

  @Post('predictions/rerun')
  @Permissions('VIEW_REPORTS')
  async rerunPrediction(@Body() body: { targetId?: string | null }) {
    return this.aiEngineService.rerunPrediction(body.targetId ?? null)
  }

  @Get('recommendations/user/:userId')
  @Permissions('VIEW_REPORTS')
  async findRecommendations(@Param('userId') userId: string) {
    return this.aiEngineService.findRecommendations(userId)
  }

  @Post('recommendations')
  @Permissions('VIEW_REPORTS')
  async createRecommendation(@Body() body: CreateAiDesignRecommendationDto) {
    return this.aiEngineService.createRecommendation(body)
  }

  @Get('recommendations/me')
  async findMyRecommendations(@Req() request: Request & { user: JwtUser }) {
    return this.aiEngineService.findRecommendations(request.user.sub)
  }

  @Post('recommendations/execute')
  async executeRecommendation(@Body() body: ExecuteAiRecommendationDto, @Req() request: Request & { user: JwtUser }) {
    return this.aiEngineService.executeRecommendation(body, request.user.sub)
  }

  @Post('recommendations/rerun')
  @Permissions('VIEW_REPORTS')
  async rerunRecommendation(@Body() body: { userId?: string }) {
    return this.aiEngineService.rerunRecommendation(body.userId)
  }

  @Get('matches')
  @Permissions('VIEW_REPORTS')
  async findMatches() {
    return this.aiEngineService.findMatches()
  }

  @Post('matches')
  @Permissions('VIEW_REPORTS')
  async createMatch(@Body() body: CreateAiMarketMatchDto) {
    return this.aiEngineService.createMatch(body)
  }

  @Post('matches/execute')
  @Permissions('VIEW_REPORTS')
  async executeMatch(@Body() body: ExecuteAiMatchDto, @Req() request: Request & { user: JwtUser }) {
    return this.aiEngineService.executeMatch(body, request.user.sub)
  }

  @Post('matches/rerun')
  @Permissions('VIEW_REPORTS')
  async rerunMatch() {
    return this.aiEngineService.rerunMatch()
  }

  @Patch('matches/:id/status')
  @Permissions('VIEW_REPORTS')
  async updateMatchStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.aiEngineService.updateMatchStatus(id, body.status)
  }

  @Get('metrics')
  @Permissions('VIEW_REPORTS')
  async findMetrics() {
    return this.aiEngineService.findMetrics()
  }

  @Post('metrics')
  @Permissions('VIEW_REPORTS')
  async createMetric(@Body() body: CreateAiServiceMetricDto) {
    return this.aiEngineService.createMetric(body)
  }

  @Post('metrics/rerun')
  @Permissions('VIEW_REPORTS')
  async rerunMetric() {
    return this.aiEngineService.rerunMetric()
  }
}
