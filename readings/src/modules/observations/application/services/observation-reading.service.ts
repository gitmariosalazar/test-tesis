import { Inject, Injectable } from "@nestjs/common";
import { InterfaceObservationReadingUseCase } from "../usecases/observation-reading.use-case.interface";
import { InterfaceObservationReadingRepository } from "../../domain/contracts/observation-reading.interface.repository";
import { CreateObservationReadingRequest } from "../../domain/schemas/dto/request/create-observatio-reading.request";
import { ObservationReadingResponse } from "../../domain/schemas/dto/response/observation-reading.response";
import { ObservationReadingModel } from "../../domain/schemas/model/observation-reading.model";
import { ObservationReadingMapper } from "../mappers/observation-reading.mapper";
import { RpcException } from "@nestjs/microservices";
import { ObservationDetailsResponse } from "../../domain/schemas/dto/response/observation-dedtails.response";
import { validateFields } from "../../../../shared/validators/fields.validators";
import { statusCode } from "../../../../settings/environments/status-code";

@Injectable()
export class ObservationReadingService implements InterfaceObservationReadingUseCase {
  constructor(
    @Inject('ObservationReadingRepository')
    private readonly observationRepository: InterfaceObservationReadingRepository,
  ) { }

  async getObservations(): Promise<ObservationDetailsResponse[]> {
    try {
      return await this.observationRepository.getObservations();
    } catch (error) {
      throw error;
    }
  }

  async createObservationReading(observation: CreateObservationReadingRequest): Promise<ObservationReadingResponse> {
    try {

      const requiredFields: string[] = ['readingId', 'observationTitle', 'observationDetails'];

      const missingFieldsMessages: string[] = validateFields(observation, requiredFields);
      if (missingFieldsMessages.length > 0) {
        throw new RpcException({
          statusCode: statusCode.BAD_REQUEST,
          message: missingFieldsMessages
        })
      }

      const observationModel: ObservationReadingModel = ObservationReadingMapper.fromCreateObservationReadingToModel(observation);

      const createdObservation = await this.observationRepository.createObservationReading(observationModel);
      return createdObservation;
    } catch (error) {
      throw error;
    }
  }
  async getObservationsByReadingId(readingId: number): Promise<ObservationReadingResponse[]> {
    try {
      return await this.observationRepository.getObservationsByReadingId(readingId);
    } catch (error) {
      throw error;
    }
  }

  async getObservationDetailsByCadastralKey(cadastralKey: string): Promise<ObservationDetailsResponse[]> {
    try {

      if (!cadastralKey || cadastralKey.trim() === '') {
        throw new RpcException({
          statusCode: statusCode.BAD_REQUEST,
          message: ['The cadastralKey is required']
        })
      }

      const result: ObservationDetailsResponse[] = await this.observationRepository.getObservationDetailsByCadastralKey(cadastralKey);

      if (result.length === 0) {
        throw new RpcException({
          statusCode: statusCode.NOT_FOUND,
          message: `No observation details found for cadastralKey: ${cadastralKey}`
        });
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

}