import { Inject, Injectable } from '@nestjs/common';
import { ReadingBasicInfoResponse } from '../dtos/response/reading-basic.response';
import { InterfaceReadingRepository } from '../../domain/contracts/reading.interface.repository';

@Injectable()
export class FindBasicReadingUseCase {
  constructor(
    @Inject('ReadingRepository')
    private readonly readingRepository: InterfaceReadingRepository,
  ) {}

  async execute(cadastralKey: string): Promise<ReadingBasicInfoResponse[]> {
    if (!cadastralKey) {
      throw new Error('Cadastral key is required');
    }
    return this.readingRepository.findReadingBasicInfo(cadastralKey);
  }
}
