import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common'
import { CustomBuilderService } from './custom-builder.service'
import {
  CreateCustomBuilderQuoteDto,
  CreateGemstoneDto,
  CreateJewelryDesignDto,
  CreateJewelryDesignVersionDto,
} from './create-custom-builder.dto'

@Controller('custom-builder')
export class CustomBuilderController {
  constructor(private readonly customBuilderService: CustomBuilderService) {}

  @Get('designs')
  async findDesigns() {
    return this.customBuilderService.findDesigns()
  }

  @Get('designs/user/:userId')
  async findDesignsByUser(@Param('userId') userId: string) {
    return this.customBuilderService.findDesignsByUser(userId)
  }

  @Get('designs/:id')
  async findDesign(@Param('id') id: string) {
    return this.customBuilderService.findDesign(id)
  }

  @Post('designs')
  async createDesign(@Body() body: CreateJewelryDesignDto) {
    return this.customBuilderService.createDesign(body)
  }

  @Get('designs/:id/versions')
  async findDesignVersions(@Param('id') id: string) {
    return this.customBuilderService.findDesignVersions(id)
  }

  @Post('designs/:id/versions')
  async createDesignVersion(
    @Param('id') id: string,
    @Body() body: CreateJewelryDesignVersionDto,
  ) {
    return this.customBuilderService.createDesignVersion(id, body)
  }

  @Patch('designs/:id/status')
  async updateDesignStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.customBuilderService.updateDesignStatus(id, body.status)
  }

  @Get('gemstones')
  async findGemstones() {
    return this.customBuilderService.findGemstones()
  }

  @Post('gemstones')
  async createGemstone(@Body() body: CreateGemstoneDto) {
    return this.customBuilderService.createGemstone(body)
  }

  @Get('quotes')
  async findQuotes() {
    return this.customBuilderService.findQuotes()
  }

  @Get('quotes/user/:userId')
  async findQuotesByUser(@Param('userId') userId: string) {
    return this.customBuilderService.findQuotesByUser(userId)
  }

  @Post('quotes')
  async createQuote(@Body() body: CreateCustomBuilderQuoteDto) {
    return this.customBuilderService.createQuote(body)
  }

  @Patch('quotes/:id/status')
  async updateQuoteStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.customBuilderService.updateQuoteStatus(id, body.status)
  }
}
