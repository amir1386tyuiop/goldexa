import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'
import { JwtAuthGuard, JwtUser } from '../common/guards/jwt-auth.guard'
import { GroupBuyingService } from './group-buying.service'
import {
  AddGroupBuyingItemDto,
  CreateGroupBuyingGroupDto,
  FinalizeGroupBuyingDto,
  JoinGroupBuyingDto,
  PayGroupBuyingShareDto,
} from './create-group-buying.dto'

type AuthenticatedRequest = Request & { user: JwtUser }

@Controller('group-buying')
@UseGuards(JwtAuthGuard)
export class GroupBuyingController {
  constructor(private readonly groupBuyingService: GroupBuyingService) {}

  @Get()
  async findAll() {
    return this.groupBuyingService.findAll()
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.groupBuyingService.findOne(id)
  }

  @Post()
  async create(@Body() body: CreateGroupBuyingGroupDto, @Req() req: AuthenticatedRequest) {
    return this.groupBuyingService.createGroup({ ...body, leaderId: req.user.sub })
  }

  @Post(':id/items')
  async addItem(@Param('id') id: string, @Body() body: AddGroupBuyingItemDto, @Req() req: AuthenticatedRequest) {
    return this.groupBuyingService.addItem(id, body, req.user.sub)
  }

  @Post(':id/join')
  async join(@Param('id') id: string, @Body() body: JoinGroupBuyingDto, @Req() req: AuthenticatedRequest) {
    return this.groupBuyingService.join(id, { ...body, userId: req.user.sub })
  }

  @Patch(':id/members/:memberId/pay')
  async payShare(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() body: PayGroupBuyingShareDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.groupBuyingService.payShare(id, memberId, body, req.user.sub)
  }

  @Post(':id/finalize')
  async finalize(@Param('id') id: string, @Body() body: FinalizeGroupBuyingDto, @Req() req: AuthenticatedRequest) {
    return this.groupBuyingService.finalizeGroup(id, body.address, req.user.sub)
  }
}
