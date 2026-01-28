import { Controller, Get, Post, Put } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UpdateReadingRequest } from '../../application/dtos/request/update-reading.request';
import { CreateReadingRequest } from '../../application/dtos/request/create-reading.request';
import { CreateReadingUseCase } from '../../application/usecases/CreateReadingUseCase';
import { UpdateReadingUseCase } from '../../application/usecases/UpdateReadingUseCase';
import { FindReadingUseCase } from '../../application/usecases/FindReadingUseCase';
import { FindBasicReadingUseCase } from '../../application/usecases/FindBasicReadingUseCase';

@Controller('Readings')
export class ReadingController {
  constructor(
    private readonly createReadingUseCase: CreateReadingUseCase,
    private readonly updateReadingUseCase: UpdateReadingUseCase,
    private readonly findReadingUseCase: FindReadingUseCase,
    private readonly findBasicReadingUseCase: FindBasicReadingUseCase,
  ) {}

  @Get('find-basic-reading/:catastralCode')
  @MessagePattern('reading.find-basic-reading')
  async findBasicReadingByCatastralCode(@Payload() catastralCode: string) {
    return this.findBasicReadingUseCase.execute(catastralCode);
  }

  @Put('update-current-reading/:readingId')
  @MessagePattern('reading.update-current-reading')
  async updateCurrentReading(
    @Payload()
    data: {
      readingId: number;
      readingRequest: UpdateReadingRequest;
    },
  ) {
    return this.updateReadingUseCase.execute(
      data.readingId,
      data.readingRequest,
    );
  }

  @Post('create-reading')
  @MessagePattern('reading.create-reading')
  async createReading(@Payload() readingRequest: CreateReadingRequest) {
    return this.createReadingUseCase.execute(readingRequest);
  }

  @Get('find-reading-info/:cadastralKey')
  @MessagePattern('reading.find-reading-info')
  async findReadingInfoByCadastralKey(@Payload() cadastralKey: string) {
    return this.findReadingUseCase.execute(cadastralKey);
  }
}
