import { Controller, Get, Post } from "@nestjs/common";
import { ObservationReadingService } from "../../application/services/observation-reading.service";
import { CreateObservationReadingRequest } from "../../domain/schemas/dto/request/create-observatio-reading.request";
import { Payload } from "@nestjs/microservices/decorators/payload.decorator";
import { MessagePattern } from "@nestjs/microservices";

@Controller('observation-reading')
export class ObservationReadingController {
  constructor(
    private readonly observationReadingService: ObservationReadingService
  ) { }

  @Post('create-observation-reading')
  @MessagePattern('observation-reading.create-observation-reading')
  async createObservationReading(@Payload() observationRequest: CreateObservationReadingRequest) {
    return this.observationReadingService.createObservationReading(observationRequest);
  }

  @Get('get-observations-by-reading-id')
  @MessagePattern('observation-reading.get-observations-by-reading-id')
  async getObservationsByReadingId(@Payload() data: { readingId: number }) {
    return this.observationReadingService.getObservationsByReadingId(data.readingId);
  }

  @Get('get-observation-details-by-cadastral-key')
  @MessagePattern('observation-reading.get-observation-details-by-cadastral-key')
  async getObservationDetailsByCadastralKey(@Payload() data: { cadastralKey: string }) {
    return this.observationReadingService.getObservationDetailsByCadastralKey(data.cadastralKey);
  }

  @Get('get-observations')
  @MessagePattern('observation-reading.get-observations')
  async getObservations() {
    return this.observationReadingService.getObservations();
  }

}