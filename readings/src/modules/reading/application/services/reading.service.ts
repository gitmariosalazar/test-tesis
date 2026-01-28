import { Inject, Injectable } from '@nestjs/common';
import { InterfaceReadingUseCase } from '../usecases/reading.use-case.interface';
import { InterfaceReadingRepository } from '../../domain/contracts/reading.interface.repository';
import {
  ReadingBasicInfoResponse,
  ReadingInfoResponse,
} from '../../application/dtos/response/reading-basic.response';
import { RpcException } from '@nestjs/microservices';
import { UpdateReadingRequest } from '../../application/dtos/request/update-reading.request';
import { ReadingResponse } from '../../application/dtos/response/reading.response';
import { Reading } from '../../domain/entities/Reading';
import { ReadingMapper } from '../mappers/reading.mapper';
import { CreateReadingRequest } from '../../application/dtos/request/create-reading.request';
import { toZonedTime } from 'date-fns-tz';
import { InterfaceObservationReadingRepository } from '../../../observations/domain/contracts/observation-reading.interface.repository';
import { statusCode } from '../../../../settings/environments/status-code';
import { validateFields } from '../../../../shared/validators/fields.validators';
import { INovelty } from '../usecases/novelty.interface';
import { CreateObservationReadingRequest } from '../../../observations/domain/schemas/dto/request/create-observatio-reading.request';
import { ObservationReadingModel } from '../../../observations/domain/schemas/model/observation-reading.model';
import { ObservationReadingMapper } from '../../../observations/application/mappers/observation-reading.mapper';
import { getTypeCurrentConsumption } from '../../../../shared/types/novelty.type';

@Injectable()
export class ReadingUseCaseService implements InterfaceReadingUseCase {
  constructor(
    @Inject('ReadingRepository')
    private readonly readingRepository: InterfaceReadingRepository,
    @Inject('ObservationReadingRepository')
    private readonly observationRepository: InterfaceObservationReadingRepository,
  ) {}

  async findReadingInfo(cadastralKey: string): Promise<ReadingInfoResponse[]> {
    try {
      if (cadastralKey.trim().length === 0 || !cadastralKey) {
        throw new RpcException({
          statusCode: statusCode.BAD_REQUEST,
          message: `Parameter cadastralKey is required!`,
        });
      }
      const readingFound: ReadingInfoResponse[] =
        await this.readingRepository.findReadingInfo(cadastralKey);

      if (readingFound.length === 0) {
        throw new RpcException({
          statusCode: statusCode.NOT_FOUND,
          message: `Data not found for connection with ID: ${cadastralKey}`,
        });
      }
      return readingFound;
    } catch (error) {
      throw error;
    }
  }

  async verifyReadingIfExist(readingId: number): Promise<boolean> {
    try {
      if (!readingId || isNaN(readingId)) {
        throw new RpcException({
          statusCode: statusCode.BAD_REQUEST,
          message: `Parameter readingId is required!`,
        });
      }
      return this.readingRepository.verifyReadingIfExist(readingId);
    } catch (error) {
      throw error;
    }
  }

  async updateCurrentReading(
    readingId: number,
    readinRequest: UpdateReadingRequest,
  ): Promise<ReadingResponse | null> {
    try {
      const requiredFields: string[] = [
        'previousReading',
        'currentReading',
        'rentalIncomeCode',
        'novelty',
        'incomeCode',
        'cadastralKey',
        'connectionId',
        'account',
        'sector',
      ];
      const missingFieldMessages: string[] = validateFields(
        readinRequest,
        requiredFields,
      );

      if (missingFieldMessages.length > 0) {
        throw new RpcException({
          statusCode: statusCode.BAD_REQUEST,
          message: missingFieldMessages,
        });
      }

      const exists: boolean =
        await this.readingRepository.verifyReadingIfExist(readingId);
      if (!exists) {
        throw new RpcException({
          statusCode: statusCode.NOT_FOUND,
          message: `Reading with ID ${readingId} not found!`,
        });
      }

      if (readinRequest.currentReading! < readinRequest.previousReading!) {
        throw new RpcException({
          statusCode: statusCode.BAD_REQUEST,
          message: `The current reading cannot be less than the previous reading!`,
        });
      }

      if (readinRequest.currentReading === readinRequest.previousReading) {
        throw new RpcException({
          statusCode: statusCode.BAD_REQUEST,
          message: `The current reading cannot be equal to the previous reading!`,
        });
      }

      const baseValue: number = 4.56;
      const consumption: number =
        (readinRequest.currentReading ?? 0) -
        (readinRequest.previousReading ?? 0);
      const totalAmount: number = parseFloat(
        (consumption * baseValue).toFixed(2),
      );

      if (totalAmount <= 0) {
        throw new RpcException({
          statusCode: statusCode.INTERNAL_SERVER_ERROR,
          message: `Error calculating total amount for reading with ID ${readingId}!`,
        });
      }

      const toUpdate: Reading =
        ReadingMapper.fromUpdateReadingRequestToReadingModel(readinRequest);
      // Reading is immutable, so we create a new instance or clone with updated value if needed.
      // Since toUpdate is created fresh from mapper, we can just pass the value to mapper or constructor.
      // However, the mapper logic puts 0/default.
      // We should ideally update the mapper or create a copy.
      // For now, let's look at how Reading is defined. It has public readonly props.
      // We can use a helper or just create a new objects.

      // FIX: The original code called setReadingValue(totalAmount).
      // We need to create a new Reading with this value.
      const updatedReading = new Reading(
        toUpdate.id,
        toUpdate.connectionId,
        toUpdate.readingDate,
        toUpdate.readingTime,
        toUpdate.sector,
        toUpdate.account,
        toUpdate.cadastralKey,
        totalAmount, // Calculated amount
        toUpdate.sewerRate,
        toUpdate.previousReading,
        toUpdate.currentReading,
        toUpdate.rentalIncomeCode,
        toUpdate.novelty,
        toUpdate.incomeCode,
        toUpdate.typeNoveltyReadingId,
        toUpdate.currentMonthReading,
      );

      const updatedReadingEntity: Reading | null =
        await this.readingRepository.updateCurrentReading(
          readingId,
          updatedReading,
        );

      if (updatedReadingEntity !== null) {
        const createRequest: CreateReadingRequest = new CreateReadingRequest();
        createRequest.connectionId = readinRequest.connectionId;
        createRequest.cadastralKey = readinRequest.cadastralKey;
        createRequest.incomeCode = readinRequest.incomeCode ?? 0;
        createRequest.account = readinRequest.account;
        createRequest.previousReading = readinRequest.currentReading ?? 0;
        createRequest.sector = readinRequest.sector;
        createRequest.sewerRate = readinRequest.sewerRate ?? 0;

        // Initialize other required fields to avoid validation errors if necessary
        // Assuming strict validation mentioned in createReading (lines 214+) might not apply here if we skip validation
        // or if we rely on default values in mapper.
        // However, we are calling readingRepository.createReading(modelToCreate) directly,
        // passing a Reading Entity.
        // The repository createReading method shouldn't validate DTO fields, but DB constraints apply.

        const modelToCreate: Reading =
          ReadingMapper.fromCreateReadingRequestToReadingModel(createRequest);

        const createdEntity =
          await this.readingRepository.createReading(modelToCreate);

        if (createdEntity === null) {
          throw new RpcException({
            statusCode: statusCode.INTERNAL_SERVER_ERROR,
            message: `Error creating new reading record!`,
          });
        }
        return ReadingMapper.fromReadingEntityToReadingResponse(
          updatedReadingEntity,
        );
      } else {
        throw new RpcException({
          statusCode: statusCode.INTERNAL_SERVER_ERROR,
          message: `Error updating reading with ID ${readingId}!`,
        });
      }
    } catch (error) {
      throw error;
    }
  }
  /**
   * Crea un nuevo registro de lectura y procesa cualquier novedad asociada.
   * @param readingRequest - Objeto con los detalles de la lectura.
   * @returns La respuesta de la lectura creada o null si falla la creación.
   * @throws RpcException si la validación falla o ocurre un error durante el procesamiento.
   */
  async createReading(
    readingRequest: CreateReadingRequest,
  ): Promise<ReadingResponse | null> {
    try {
      const camposRequeridos: string[] = [
        'connectionId',
        'sewerRate',
        'previousReading',
        'incomeCode',
        'cadastralKey',
        'account',
        'sector',
        'readingValue',
        'currentReading',
        'rentalIncomeCode',
        'previousMonthReading',
      ];
      const mensajesFaltantes: string[] = validateFields(
        readingRequest,
        camposRequeridos,
      );
      console.log(
        `[Servicio (01)] Creando lectura para cuenta: `,
        readingRequest,
      );

      const novedadDesdeSolicitud: string | null = readingRequest.novelty;

      if (mensajesFaltantes.length > 0) {
        throw new RpcException({
          statusCode: statusCode.BAD_REQUEST,
          message: mensajesFaltantes,
        });
      }

      // Validar tipos y valores
      if (
        typeof readingRequest.currentReading !== 'number' ||
        readingRequest.currentReading < 0
      ) {
        throw new RpcException({
          statusCode: statusCode.BAD_REQUEST,
          message: 'currentReading debe ser un número no negativo',
        });
      }
      if (
        typeof readingRequest.previousReading !== 'number' ||
        readingRequest.previousReading < 0
      ) {
        throw new RpcException({
          statusCode: statusCode.BAD_REQUEST,
          message: 'previousReading debe ser un número no negativo',
        });
      }
      if (
        readingRequest.averageConsumption === undefined ||
        readingRequest.averageConsumption < 0
      ) {
        throw new RpcException({
          statusCode: statusCode.BAD_REQUEST,
          message: 'averageConsumption debe ser un número no negativo',
        });
      }

      // Procesar fecha y hora
      const ahora: Date = new Date();
      const hora: string = new Intl.DateTimeFormat('es-EC', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'America/Guayaquil',
      }).format(ahora);
      const fechaFormateada: Date = toZonedTime(ahora, 'America/Guayaquil');
      readingRequest.readingTime = hora;
      readingRequest.readingDate = fechaFormateada;

      // Determinar la novedad del consumo
      const consumoActual: INovelty = getTypeCurrentConsumption(
        readingRequest.previousReading,
        readingRequest.currentReading,
        readingRequest.averageConsumption,
      );

      readingRequest.typeNoveltyReadingId = consumoActual.id;
      readingRequest.novelty = consumoActual.title;

      const paraCrear: Reading =
        ReadingMapper.fromCreateReadingRequestToReadingModel(readingRequest);
      const creadoEntity: Reading | null =
        await this.readingRepository.createReading(paraCrear);

      if (creadoEntity === null) {
        throw new RpcException({
          statusCode: statusCode.INTERNAL_SERVER_ERROR,
          message: '¡Error al crear el registro de lectura!',
        });
      }
      const creado: ReadingResponse =
        ReadingMapper.fromReadingEntityToReadingResponse(creadoEntity);

      // Registrar observación si la novedad ingresada no coincide
      if (
        novedadDesdeSolicitud != null &&
        novedadDesdeSolicitud.trim().length > 0 &&
        novedadDesdeSolicitud !== consumoActual.title
      ) {
        console.warn(
          `[Servicio] Advertencia: La novedad desde la solicitud (${novedadDesdeSolicitud}) no coincide con la novedad calculada (${consumoActual.title}). Usando el valor calculado.`,
        );
        const solicitudObservacion: CreateObservationReadingRequest = {
          readingId: creado.readingId,
          observationTitle: `Discrepancia de novedad en lectura ID: ${creado.readingId}`,
          observationDetails: `Novedad ingresada por el lecturista: ${novedadDesdeSolicitud}. Novedad calculada: ${consumoActual.title}. Acción recomendada: ${consumoActual.actionRecommended}`,
        };
        const modeloObservacion: ObservationReadingModel =
          ObservationReadingMapper.fromCreateObservationReadingToModel(
            solicitudObservacion,
          );
        const observacionCreada =
          await this.observationRepository.createObservationReading(
            modeloObservacion,
          );

        if (observacionCreada === null) {
          throw new RpcException({
            statusCode: statusCode.INTERNAL_SERVER_ERROR,
            message: `¡Error al crear la observación para la lectura con ID ${creado.readingId}!`,
          });
        }
      }

      // Registrar observación para cualquier novedad distinta de NORMAL (ID 1)
      if (consumoActual.id !== 1) {
        creado.novelty = consumoActual.title;
        const solicitudObservacion: CreateObservationReadingRequest = {
          readingId: creado.readingId,
          observationTitle: `NOVEDAD DETECTADA EN LECTURA ID: ${creado.readingId}`,
          observationDetails: `${consumoActual.description} Acción recomendada: ${consumoActual.actionRecommended}`,
        };
        const modeloObservacion: ObservationReadingModel =
          ObservationReadingMapper.fromCreateObservationReadingToModel(
            solicitudObservacion,
          );
        const observacionCreada =
          await this.observationRepository.createObservationReading(
            modeloObservacion,
          );

        if (observacionCreada === null) {
          throw new RpcException({
            statusCode: statusCode.INTERNAL_SERVER_ERROR,
            message: `¡Error al crear la observación para la lectura con ID ${creado.readingId}!`,
          });
        }
      }

      return creado;
    } catch (error) {
      const mensajeError =
        error instanceof RpcException
          ? error.message
          : `Error inesperado al crear la lectura: ${error.message}`;
      console.error(mensajeError, error);
      throw error;
    }
  }

  /*
    async createReading(
      readingRequest: CreateReadingRequest,
    ): Promise<ReadingResponse | null> {
      try {
  
        const requiredFields: string[] = ['connectionId', 'sewerRate', 'previousReading', 'incomeCode', 'cadastralKey', 'account', 'sector', 'readingValue', 'currentReading', 'rentalIncomeCode'];
        const missingFieldMessages: string[] = validateFields(readingRequest, requiredFields);
  
        if (missingFieldMessages.length > 0) {
          throw new RpcException({
            statusCode: statusCode.BAD_REQUEST,
            message: missingFieldMessages
          });
        }
  
        const now: Date = new Date();
        const hour: string = new Intl.DateTimeFormat('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
          timeZone: 'America/Guayaquil'
        }).format(now);
        const formatDate: Date = toZonedTime(now, 'America/Guayaquil');
        readingRequest.readingTime = hour;
        readingRequest.readingDate = formatDate;
        readingRequest.readingTime = hour;
        const toCreate: ReadingModel =
          ReadingMapper.fromCreateReadingRequestToReadingModel(readingRequest);
  
        const created: ReadingResponse | null =
          await this.readingRepository.createReading(toCreate);
  
        if (created === null) {
          throw new RpcException({
            statusCode: statusCode.INTERNAL_SERVER_ERROR,
            message: `Error creating new reading record!`,
          });
        }
  
        const currentConsumption: INovelty = await this.getTypeCurrentConsumption(
          readingRequest.previousReading ?? 0,
          readingRequest.currentReading ?? 0,
          readingRequest.averageConsumption ?? 0,
        );
  
        readingRequest.typeNoveltyReadingId = currentConsumption.id;
        readingRequest.novelty = currentConsumption.title;
        if (currentConsumption.id !== 1) {
          created.novelty = getNoveltyById(currentConsumption.id).title;
          const observationRequest: CreateObservationReadingRequest = {
            readingId: created.readingId,
            observationTitle: `NOVELTY DETECTED IN READING ID ${created.readingId}`,
            observationDetails: currentConsumption.description
          }
          const observationModel: ObservationReadingModel = ObservationReadingMapper.fromCreateObservationReadingToModel(observationRequest);
          const createdObservation = await this.observationRepository.createObservationReading(observationModel);
          if (createdObservation === null) {
            throw new RpcException({
              statusCode: statusCode.INTERNAL_SERVER_ERROR,
              message: `Error creating observation for reading with ID ${created.readingId}!`,
            });
          }
        }
  
        return created;
      } catch (error) {
        throw error;
      }
    }
      */

  async findReadingBasicInfo(
    cadastralKey: string,
  ): Promise<ReadingBasicInfoResponse[]> {
    try {
      if (cadastralKey.trim().length === 0 || !cadastralKey) {
        throw new RpcException({
          statusCode: statusCode.BAD_REQUEST,
          message: `Parameter catastralCode is required!`,
        });
      }
      const readingFound: ReadingBasicInfoResponse[] =
        await this.readingRepository.findReadingBasicInfo(cadastralKey);

      if (readingFound.length === 0) {
        throw new RpcException({
          statusCode: statusCode.NOT_FOUND,
          message: `Data not found for connection with ID: ${cadastralKey}`,
        });
      }
      return readingFound;
    } catch (error) {
      throw error;
    }
  }
}
