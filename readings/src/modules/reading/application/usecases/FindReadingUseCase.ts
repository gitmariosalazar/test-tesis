import { Inject, Injectable } from '@nestjs/common';
import { ReadingInfoResponse } from '../dtos/response/reading-basic.response';
// We need a specific repository method or query service for this response type
import { InterfaceReadingRepository } from '../../domain/contracts/reading.interface.repository';

@Injectable()
export class FindReadingUseCase {
  constructor(
    @Inject('ReadingRepository')
    private readonly readingRepository: InterfaceReadingRepository, // Using the old interface for now as it has the specific query method
  ) {}

  async execute(cadastralKey: string): Promise<ReadingInfoResponse[]> {
    if (!cadastralKey) {
      throw new Error('Cadastral key is required');
    }
    return this.readingRepository.findReadingInfo(cadastralKey);
  }
}
