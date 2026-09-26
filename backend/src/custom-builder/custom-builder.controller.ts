import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common'
import { Request } from 'express'
import { CustomBuilderService } from './custom-builder.service'
import {
  CreateCustomBuilderQuoteDto,
  CreateGemstoneDto,
  CreateJewelryDesignDto,
  CreateJewelryDesignVersionDto,
  CreateJewelryDesignStageDto,
  UpdateJewelryDesignStageDto,
  UpdateCustomBuilderQuoteStatusDto,
  UpdateJewelryDesignStatusDto,
} from './create-custom-builder.dto'
import { JwtAuthGuard, JwtUser } from '../common/guards/jwt-auth.guard'
import { AdminGuard } from '../common/guards/admin.guard'

type AuthenticatedRequest = Request & { user: JwtUser }

@Controller('custom-builder')
export class CustomBuilderController {
  constructor(private readonly customBuilderService: CustomBuilderService) {}

  @Get('designs')
  async findDesigns() { return this.customBuilderService.findDesigns() }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/designs')
  async findAdminDesigns() { return this.customBuilderService.findAllDesignsForAdmin() }

  @UseGuards(JwtAuthGuard)
  @Get('designs/user/:userId')
  async findDesignsByUser(@Req() req: AuthenticatedRequest) { return this.customBuilderService.findDesignsByUser(req.user.sub) }

  @UseGuards(JwtAuthGuard)
  @Get('designs/:id')
  async findDesign(@Param('id') id: string, @Req() req: AuthenticatedRequest) { return this.customBuilderService.findDesign(id, req.user.sub, isAdmin(req.user)) }

  @UseGuards(JwtAuthGuard)
  @Post('designs')
  async createDesign(@Body() body: CreateJewelryDesignDto, @Req() req: AuthenticatedRequest) { return this.customBuilderService.createDesign({ ...body, userId: req.user.sub }) }

  @UseGuards(JwtAuthGuard)
  @Get('designs/:id/versions')
  async findDesignVersions(@Param('id') id: string, @Req() req: AuthenticatedRequest) { return this.customBuilderService.findDesignVersions(id, req.user.sub, isAdmin(req.user)) }

  @UseGuards(JwtAuthGuard)
  @Post('designs/:id/versions')
  async createDesignVersion(@Param('id') id: string, @Body() body: CreateJewelryDesignVersionDto, @Req() req: AuthenticatedRequest) { return this.customBuilderService.createDesignVersion(id, body, req.user.sub, isAdmin(req.user)) }

  @UseGuards(JwtAuthGuard)
  @Get('designs/:id/stages')
  async findDesignStages(@Param('id') id: string, @Req() req: AuthenticatedRequest) { return this.customBuilderService.findDesignStages(id, req.user.sub, isAdmin(req.user)) }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('designs/:id/stages')
  async createDesignStage(@Param('id') id: string, @Body() body: CreateJewelryDesignStageDto) { return this.customBuilderService.createDesignStage(id, body) }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch('designs/:designId/stages/:stageId')
  async updateDesignStage(@Param('designId') designId: string, @Param('stageId') stageId: string, @Body() body: UpdateJewelryDesignStageDto) { return this.customBuilderService.updateDesignStage(designId, stageId, body) }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete('designs/:designId/stages/:stageId')
  async deleteDesignStage(@Param('designId') designId: string, @Param('stageId') stageId: string) { return this.customBuilderService.deleteDesignStage(designId, stageId) }

  @UseGuards(JwtAuthGuard)
  @Patch('designs/:id/status')
  async updateDesignStatus(@Param('id') id: string, @Body() body: UpdateJewelryDesignStatusDto, @Req() req: AuthenticatedRequest) { return this.customBuilderService.updateDesignStatus(id, body.status, req.user.sub, isAdmin(req.user)) }

  @Get('gemstones')
  async findGemstones() { return this.customBuilderService.findGemstones() }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('gemstones')
  async createGemstone(@Body() body: CreateGemstoneDto) { return this.customBuilderService.createGemstone(body) }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('quotes')
  async findQuotes() { return this.customBuilderService.findQuotes() }

  @UseGuards(JwtAuthGuard)
  @Get('quotes/user/:userId')
  async findQuotesByUser(@Req() req: AuthenticatedRequest) { return this.customBuilderService.findQuotesByUser(req.user.sub) }

  @UseGuards(JwtAuthGuard)
  @Post('quotes')
  async createQuote(@Body() body: CreateCustomBuilderQuoteDto, @Req() req: AuthenticatedRequest) { return this.customBuilderService.createQuote({ ...body, userId: req.user.sub }) }

  @UseGuards(JwtAuthGuard)
  @Patch('quotes/:id/status')
  async updateQuoteStatus(@Param('id') id: string, @Body() body: UpdateCustomBuilderQuoteStatusDto, @Req() req: AuthenticatedRequest) { return this.customBuilderService.updateQuoteStatus(id, body.status, req.user.sub, isAdmin(req.user)) }
}

function isAdmin(user: JwtUser): boolean { return user.role === 'admin' || user.roleNames?.includes('admin') === true }
