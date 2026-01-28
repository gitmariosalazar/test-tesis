import { Inject, Injectable } from '@nestjs/common';
import {
  InterfaceReadingReportRepository,
  DailyStatsReport,
} from '../../../domain/contracts/reading-report.interface.repository';

@Injectable()
export class GetDailyStatsReportUseCase {
  constructor(
    @Inject('ReadingReportRepository')
    private readonly reportRepository: InterfaceReadingReportRepository,
  ) {}

  async execute(month: string): Promise<DailyStatsReport[]> {
    if (!month) {
      throw new Error('Month is required (YYYY-MM)');
    }
    console.log(month);
    return this.reportRepository.findDailyStats(month);
  }
}
