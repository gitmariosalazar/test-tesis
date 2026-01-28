import { Inject, Injectable } from "@nestjs/common";
import { InterfacePhotoReadingUseCase } from "../usecases/photo-reading.use-case.interface";
import { InterfacePhotoReadingRepository } from "../../domain/contracts/photo-reading.interface.repository";
import { CreatePhotoReadingRequest } from "../../domain/schemas/dto/request/create.photo-reading.request";
import { PhotoReadingResponse } from "../../domain/schemas/dto/response/photo-reading.response";
import { RpcException } from "@nestjs/microservices";
import { PhotoReadingMapper } from "../mappers/photo-reading.mapper";
import { PhotoReadingModel } from "../../domain/schemas/model/photo-reading.model";
import { statusCode } from "../../../../settings/environments/status-code";
import { validateFields } from "../../../../shared/validators/fields.validators";

@Injectable()
export class PhotoReadingService implements InterfacePhotoReadingUseCase {
  constructor(
    @Inject('PhotoReadingRepository')
    private readonly photoReadingRepository: InterfacePhotoReadingRepository
  ) { }

  async createPhotoReading(photoReading: CreatePhotoReadingRequest): Promise<PhotoReadingResponse | null> {
    try {

      const requiredFields: string[] = ['readingId', 'photoUrl', 'cadastralKey'];
      const missingFieldMessages: string[] =
        validateFields(photoReading, requiredFields);
      if (missingFieldMessages.length > 0) {
        throw new RpcException({
          statusCode: statusCode.BAD_REQUEST,
          message: missingFieldMessages
        });
      }

      const photoReadingModel: PhotoReadingModel = PhotoReadingMapper.fromCreatePhotoReadingRequestToPhotoReadingModel(photoReading);

      const createdPhotoReading = await this.photoReadingRepository.createPhotoReading(photoReadingModel);

      if (!createdPhotoReading) {
        throw new RpcException({
          statusCode: statusCode.INTERNAL_SERVER_ERROR,
          message: 'Error creating photo reading'
        });
      }

      return createdPhotoReading;
    } catch (error) {
      throw error;
    }
  }

  async getPhotoReadingsByReadingId(readingId: number): Promise<PhotoReadingResponse[]> {
    try {

      if (!readingId || readingId <= 0) {
        throw new RpcException({
          statusCode: statusCode.BAD_REQUEST,
          message: 'Invalid reading ID'
        });
      }

      const photoReadings = await this.photoReadingRepository.getPhotoReadingsByReadingId(readingId);
      if (!photoReadings) {
        throw new RpcException({
          statusCode: statusCode.NOT_FOUND,
          message: 'No photo readings found for this reading ID'
        });
      }

      return photoReadings;
    } catch (error) {
      throw error;
    }
  }

  async getPhotoReadingsByCadastralKey(cadastralKey: string): Promise<PhotoReadingResponse[]> {
    try {
      if (!cadastralKey || cadastralKey.trim() === '') {
        throw new RpcException({
          statusCode: statusCode.BAD_REQUEST,
          message: 'Invalid cadastral key'
        });
      }

      const photoReadings = await this.photoReadingRepository.getPhotoReadingsByCadastralKey(cadastralKey);
      if (!photoReadings) {
        throw new RpcException({
          statusCode: statusCode.NOT_FOUND,
          message: 'No photo readings found for this cadastral key'
        });
      }
      return photoReadings;
    } catch (error) {
      throw error;
    }
  }
}