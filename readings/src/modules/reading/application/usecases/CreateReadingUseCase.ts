import { Inject, Injectable } from '@nestjs/common';
import { CreateReadingRequest } from '../dtos/request/create-reading.request';
import { ReadingResponse } from '../dtos/response/reading.response';
import { InterfaceReadingRepository } from '../../domain/contracts/reading.interface.repository';
import { Reading } from '../../domain/entities/Reading';
import { ReadingCreatedEvent } from '../../domain/events/ReadingCreatedEvent';
import { ReadingMapper } from '../mappers/reading.mapper';
// import { EventBus } from ... (We will need an event bus interface)

@Injectable()
export class CreateReadingUseCase {
  constructor(
    @Inject('ReadingRepository')
    private readonly readingRepository: InterfaceReadingRepository,
    // @Inject('EventBus') private readonly eventBus: EventBus
  ) {}

  async execute(request: CreateReadingRequest): Promise<ReadingResponse> {
    // 1. Validation Logic (could be delegated to a domain service or Value Objects)
    // ... validation from original service ...

    // 2. Map DTO to Entity
    // Note: We need a Mapper. For now manual or using the existing mapper if refactored.
    const reading = new Reading(
      0, // ID
      request.connectionId,
      new Date(), // Date
      '', // Time
      request.sector,
      request.account,
      request.cadastralKey,
      request.readingValue ?? 0,
      request.sewerRate ?? 0,
      request.previousReading ?? 0,
      request.currentReading ?? 0,
      request.rentalIncomeCode ?? 0,
      request.novelty ?? '',
      request.incomeCode ?? 0,
      request.typeNoveltyReadingId ?? 1,
      request.previousMonthReading ?? '',
    );

    // 3. Persist
    const savedReading = await this.readingRepository.createReading(reading);

    if (!savedReading) {
      throw new Error('Failed to create reading');
    }

    // 4. Publish Event
    // this.eventBus.publish(new ReadingCreatedEvent(...));

    // 5. Return DTO
    // 5. Return DTO
    return ReadingMapper.fromReadingEntityToReadingResponse(savedReading);
  }
}
