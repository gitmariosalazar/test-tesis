import { Controller, Get, Post } from "@nestjs/common";
import { PhotoReadingService } from "../../application/services/photo-reading.service";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { CreatePhotoReadingRequest } from "../../domain/schemas/dto/request/create.photo-reading.request";

@Controller('photo-reading')
export class PhotoReadingController {
  constructor(
    private readonly photoReadingService: PhotoReadingService
  ) { }

  @Post('create-photo-reading')
  @MessagePattern('photo-reading.create-photo-reading')
  async createPhotoReading(@Payload() photoReading: CreatePhotoReadingRequest) {
    return this.photoReadingService.createPhotoReading(photoReading);
  }

  @Get('get-photo-readings-by-reading-id')
  @MessagePattern('photo-reading.get-photo-readings-by-reading-id')
  async getPhotoReadingsByReadingId(@Payload() data: { readingId: number }) {
    return this.photoReadingService.getPhotoReadingsByReadingId(data.readingId);
  }

  @Get('get-photo-readings-by-cadastral-key')
  @MessagePattern('photo-reading.get-photo-readings-by-cadastral-key')
  async getPhotoReadingsByCadastralKey(@Payload() data: { cadastralKey: string }) {
    return this.photoReadingService.getPhotoReadingsByCadastralKey(data.cadastralKey);
  }
}