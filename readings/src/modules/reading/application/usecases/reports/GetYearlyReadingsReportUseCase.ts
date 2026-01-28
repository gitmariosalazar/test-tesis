import { Inject, Injectable } from '@nestjs/common';
import {
  InterfaceReadingReportRepository,
  YearlyReadingsReport,
} from '../../../domain/contracts/reading-report.interface.repository';

@Injectable()
export class GetYearlyReadingsReportUseCase {
  constructor(
    @Inject('ReadingReportRepository')
    private readonly reportRepository: InterfaceReadingReportRepository,
  ) {}

  async execute(year: number): Promise<YearlyReadingsReport> {
    if (!year || year < 2000 || year > 2100) {
      throw new Error('Valid year is required');
    }
    return this.reportRepository.findYearlyReport(year);
  }
}
