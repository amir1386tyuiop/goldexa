import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common'
import { SmartVaultService } from './smart-vault.service'
import {
  CreateAssetSnapshotDto,
  CreatePriceAlertDto,
  CreateSmartVaultAssetDto,
} from './create-smart-vault.dto'

@Controller('smart-vault')
export class SmartVaultController {
  constructor(private readonly smartVaultService: SmartVaultService) {}

  @Get('assets/user/:userId')
  async findAssets(@Param('userId') userId: string) {
    return this.smartVaultService.findAssets(userId)
  }

  @Get('assets/:id')
  async findAsset(@Param('id') id: string) {
    return this.smartVaultService.findAsset(id)
  }

  @Post('assets')
  async createAsset(@Body() body: CreateSmartVaultAssetDto) {
    return this.smartVaultService.createAsset(body)
  }

  @Get('assets/:id/snapshots')
  async findSnapshots(@Param('id') id: string) {
    return this.smartVaultService.findSnapshots(id)
  }

  @Post('snapshots')
  async createSnapshot(@Body() body: CreateAssetSnapshotDto) {
    return this.smartVaultService.createSnapshot(body)
  }

  @Get('alerts/user/:userId')
  async findAlerts(@Param('userId') userId: string) {
    return this.smartVaultService.findAlerts(userId)
  }

  @Post('alerts')
  async createAlert(@Body() body: CreatePriceAlertDto) {
    return this.smartVaultService.createAlert(body)
  }

  @Patch('alerts/:id/disable')
  async disableAlert(@Param('id') id: string) {
    return this.smartVaultService.disableAlert(id)
  }
}
