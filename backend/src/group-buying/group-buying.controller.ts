import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common'
import { GroupBuyingService } from './group-buying.service'
import {
  AddGroupBuyingItemDto,
  CreateGroupBuyingGroupDto,
  JoinGroupBuyingDto,
  PayGroupBuyingShareDto,
} from './create-group-buying.dto'

@Controller('group-buying')
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
  async create(@Body() body: CreateGroupBuyingGroupDto) {
    return this.groupBuyingService.createGroup(body)
  }

  @Post(':id/items')
  async addItem(@Param('id') id: string, @Body() body: AddGroupBuyingItemDto) {
    return this.groupBuyingService.addItem(id, body)
  }

  @Post(':id/join')
  async join(@Param('id') id: string, @Body() body: JoinGroupBuyingDto) {
    return this.groupBuyingService.join(id, body)
  }

  @Patch(':id/members/:memberId/pay')
  async payShare(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() body: PayGroupBuyingShareDto,
  ) {
    return this.groupBuyingService.payShare(id, memberId, body)
  }
}
