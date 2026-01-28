import { Inject, Injectable } from '@nestjs/common';
import {
  InterfaceReadingReportRepository,
  ConnectionLastReadingsReport,
} from '../../../domain/contracts/reading-report.interface.repository';

@Injectable()
export class GetConnectionLastReadingsReportUseCase {
  constructor(
    @Inject('ReadingReportRepository')
    private readonly reportRepository: InterfaceReadingReportRepository,
  ) {}

  async execute(
    cadastralKey: string,
    limit: number,
  ): Promise<ConnectionLastReadingsReport[]> {
    if (!cadastralKey) {
      throw new Error('Cadastral Key is required');
    }
    // Default limit 10 as requested
    return this.reportRepository.findLastReadingsByConnection(
      cadastralKey,
      limit,
    );
  }
}
