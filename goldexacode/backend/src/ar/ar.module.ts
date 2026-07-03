import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ArController } from './ar.controller'
import { ArService } from './ar.service'
import { ArModel } from './ar-model.entity'
import { ArPreview } from './ar-preview.entity'

@Module({
  imports: [TypeOrmModule.forFeature([ArModel, ArPreview])],
  controllers: [ArController],
  providers: [ArService],
})
export class ArModule {}
