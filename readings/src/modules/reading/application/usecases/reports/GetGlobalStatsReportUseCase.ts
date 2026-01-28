import { Inject, Injectable } from '@nestjs/common';
import {
  InterfaceReadingReportRepository,
  GlobalStatsReport,
} from '../../../domain/contracts/reading-report.interface.repository';

@Injectable()
export class GetGlobalStatsReportUseCase {
  constructor(
    @Inject('ReadingReportRepository')
    private readonly reportRepository: InterfaceReadingReportRepository,
  ) {}

  async execute(month: string): Promise<GlobalStatsReport> {
    if (!month) {
      throw new Error('Month is required (YYYY-MM)');
    }
    return this.reportRepository.findGlobalStats(month);
  }
}
