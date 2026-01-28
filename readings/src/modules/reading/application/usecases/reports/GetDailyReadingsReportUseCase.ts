import { Inject, Injectable } from '@nestjs/common';
import {
  InterfaceReadingReportRepository,
  DailyReadingsReport,
} from '../../../domain/contracts/reading-report.interface.repository';

@Injectable()
export class GetDailyReadingsReportUseCase {
  constructor(
    @Inject('ReadingReportRepository')
    private readonly reportRepository: InterfaceReadingReportRepository,
  ) {}

  async execute(date: string): Promise<DailyReadingsReport[]> {
    // Basic date validation could be added here
    if (!date) {
      throw new Error('Date is required (YYYY-MM-DD)');
    }
    return this.reportRepository.findReadingsByDate(date);
  }
}
