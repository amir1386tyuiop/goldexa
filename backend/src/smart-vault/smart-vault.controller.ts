import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common'
import { Request } from 'express'
import { SmartVaultService } from './smart-vault.service'
import {
  CreateAssetSnapshotDto,
  CreatePriceAlertDto,
  CreateSmartVaultAssetDto,
} from './create-smart-vault.dto'
import { JwtAuthGuard, JwtUser } from '../common/guards/jwt-auth.guard'

type AuthenticatedRequest = Request & { user: JwtUser }

@Controller('smart-vault')
@UseGuards(JwtAuthGuard)
export class SmartVaultController {
  constructor(private readonly smartVaultService: SmartVaultService) {}

  @Get('assets/user/:userId')
  async findAssets(@Req() req: AuthenticatedRequest) {
    return this.smartVaultService.findAssets(req.user.sub)
  }

  @Get('assets/:id')
  async findAsset(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.smartVaultService.findAsset(id, req.user.sub, isAdmin(req.user))
  }

  @Post('assets')
  async createAsset(@Body() body: CreateSmartVaultAssetDto, @Req() req: AuthenticatedRequest) {
    return this.smartVaultService.createAsset({ ...body, userId: req.user.sub })
  }

  @Get('assets/:id/snapshots')
  async findSnapshots(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.smartVaultService.findSnapshots(id, req.user.sub, isAdmin(req.user))
  }

  @Post('snapshots')
  async createSnapshot(@Body() body: CreateAssetSnapshotDto, @Req() req: AuthenticatedRequest) {
    return this.smartVaultService.createSnapshot({ ...body, userId: req.user.sub })
  }

  @Get('alerts/user/:userId')
  async findAlerts(@Req() req: AuthenticatedRequest) {
    return this.smartVaultService.findAlerts(req.user.sub)
  }

  @Post('alerts')
  async createAlert(@Body() body: CreatePriceAlertDto, @Req() req: AuthenticatedRequest) {
    return this.smartVaultService.createAlert({ ...body, userId: req.user.sub })
  }

  @Patch('alerts/:id/disable')
  async disableAlert(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.smartVaultService.disableAlert(id, req.user.sub, isAdmin(req.user))
  }
}

function isAdmin(user: JwtUser): boolean {
  return user.role === 'admin' || user.roleNames?.includes('admin') === true
}
