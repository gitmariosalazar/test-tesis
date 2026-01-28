import { Inject, Injectable } from '@nestjs/common';
import { UpdateReadingRequest } from '../dtos/request/update-reading.request';
import { ReadingResponse } from '../dtos/response/reading.response';
import { InterfaceReadingRepository } from '../../domain/contracts/reading.interface.repository';
import { Reading } from '../../domain/entities/Reading';
import { ReadingMapper } from '../mappers/reading.mapper';
// import { RpcException } from '@nestjs/microservices'; // Or use Domain Exceptions

@Injectable()
export class UpdateReadingUseCase {
  constructor(
    @Inject('ReadingRepository')
    private readonly readingRepository: InterfaceReadingRepository,
  ) {}

  async execute(
    readingId: number,
    request: UpdateReadingRequest,
  ): Promise<ReadingResponse> {
    const exists = await this.readingRepository.verifyReadingIfExist(readingId);
    if (!exists) {
      throw new Error(`Reading with ID ${readingId} not found!`);
    }

    // Domain logic for consumption calculation
    const baseValue: number = 4.56;
    const consumption: number =
      (request.currentReading ?? 0) - (request.previousReading ?? 0);
    const totalAmount: number = parseFloat(
      (consumption * baseValue).toFixed(2),
    );

    // Create updated entity using Mapper or manual creation
    // For now using Mapper logic manually to ensure entity purity
    const toUpdate =
      ReadingMapper.fromUpdateReadingRequestToReadingModel(request);

    // We need to ensure the ID matches and values are correct
    const updatedReading = new Reading(
      readingId,
      toUpdate.connectionId,
      toUpdate.readingDate,
      toUpdate.readingTime,
      toUpdate.sector,
      toUpdate.account,
      toUpdate.cadastralKey,
      totalAmount, // Calculated
      toUpdate.sewerRate,
      toUpdate.previousReading,
      toUpdate.currentReading,
      toUpdate.rentalIncomeCode,
      toUpdate.novelty,
      toUpdate.incomeCode,
      toUpdate.typeNoveltyReadingId,
      toUpdate.currentMonthReading,
    );

    const result = await this.readingRepository.updateCurrentReading(
      readingId,
      updatedReading,
    );

    if (!result) {
      throw new Error(
        `Failed to update reading ${readingId} (Concurrency or not found)`,
      );
    }

    return ReadingMapper.fromReadingEntityToReadingResponse(result);
  }
}
