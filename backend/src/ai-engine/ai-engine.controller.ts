import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common'
import { Request } from 'express'
import { AiEngineService } from './ai-engine.service'
import {
  CreateAiDesignRecommendationDto,
  CreateAiMarketMatchDto,
  CreateAiPricePredictionDto,
  CreateAiServiceMetricDto,
  ExecuteAiMatchDto,
  ExecuteAiPredictionDto,
  ExecuteAiRecommendationDto,
  RunAiTaskDto,
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
  async chat(@Body() body: RunAiTaskDto, @Req() request: Request & { user: JwtUser }) {
    return this.aiEngineService.chat({ ...body, userId: request.user.sub })
  }

  @Post('code')
  @Permissions('VIEW_REPORTS')
  async code(@Body() body: RunAiTaskDto) {
    return this.aiEngineService.code(body)
  }

  @Post('architecture')
  @Permissions('VIEW_REPORTS')
  async architecture(@Body() body: RunAiTaskDto) {
    return this.aiEngineService.runTask({ ...body, task: 'architecture' })
  }

  @Post('kyc-document')
  @Permissions('VIEW_REPORTS')
  async kycDocument(@Body() body: RunAiTaskDto) {
    return this.aiEngineService.analyzeDocument(body)
  }

  @Post('safety-check')
  @Permissions('VIEW_REPORTS')
  async safetyCheck(@Body() body: RunAiTaskDto) {
    return this.aiEngineService.safetyCheck(body)
  }

  @Post('marketing-image')
  @Permissions('VIEW_REPORTS')
  async marketingImage(@Body() body: RunAiTaskDto) {
    return this.aiEngineService.runTask({ ...body, task: 'marketing_image' })
  }

  @Post('vector-asset')
  @Permissions('VIEW_REPORTS')
  async vectorAsset(@Body() body: RunAiTaskDto) {
    return this.aiEngineService.runTask({ ...body, task: 'vector_asset' })
  }

  @Post('product-image')
  @Permissions('VIEW_REPORTS')
  async productImage(@Body() body: RunAiTaskDto) {
    return this.aiEngineService.runTask({ ...body, task: 'product_image' })
  }

  @Post('image-workflow')
  @Permissions('VIEW_REPORTS')
  async imageWorkflow(@Body() body: RunAiTaskDto) {
    return this.aiEngineService.runTask({ ...body, task: 'image_workflow' })
  }

  @Post('generate-content')
  @Permissions('VIEW_REPORTS')
  async generateContent(@Body() body: RunAiTaskDto) {
    return this.aiEngineService.generateContent(body)
  }

  @Post('analyze')
  @Permissions('VIEW_REPORTS')
  async analyze(@Body() body: RunAiTaskDto) {
    return this.aiEngineService.runTask({ ...body, task: 'analysis' })
  }

  @Post('text')
  @Permissions('VIEW_REPORTS')
  async text(@Body() body: RunAiTaskDto) {
    return this.aiEngineService.runTask({ ...body, task: 'text' })
  }

  @Post('image-to-text')
  @Permissions('VIEW_REPORTS')
  async imageToText(@Body() body: RunAiTaskDto) {
    return this.aiEngineService.runTask({ ...body, task: 'image_to_text' })
  }

  @Post('notification')
  @Permissions('VIEW_REPORTS')
  async notification(@Body() body: RunAiTaskDto) {
    return this.aiEngineService.runTask({ ...body, task: 'notification' })
  }

  @Post('daily-notification')
  @Permissions('VIEW_REPORTS')
  async dailyNotification(@Body() body: RunAiTaskDto) {
    return this.aiEngineService.createDailyNotification(body)
  }

  @Post('content')
  @Permissions('VIEW_REPORTS')
  async content(@Body() body: RunAiTaskDto) {
    return this.aiEngineService.runTask({ ...body, task: 'content' })
  }

  @Post('rag')
  @Permissions('VIEW_REPORTS')
  async rag(@Body() body: RunAiTaskDto) {
    return this.aiEngineService.runTask({ ...body, task: 'rag' })
  }

  @Post('summarize')
  @Permissions('VIEW_REPORTS')
  async summarize(@Body() body: RunAiTaskDto) {
    return this.aiEngineService.runTask({ ...body, task: 'summary' })
  }

  @Post('image')
  @Permissions('VIEW_REPORTS')
  async image(@Body() body: RunAiTaskDto) {
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
